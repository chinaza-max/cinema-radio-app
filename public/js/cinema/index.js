/*
 * The cinema engine: a Three.js stage that plays "cinema" style movies.
 *
 *   const cine = await createCinema(canvas, { cast: movie.cast });
 *   await cine.show(scene, { seconds: 6 });       // scene = one playback scene (see src/movies/scene-compiler.ts)
 *   cine.setSpeaker('kofi', () => level0to1);     // who is talking and how loud (drives mouths)
 *   cine.setPlaying(false);                       // freeze (also stops rendering, which saves battery)
 *   cine.destroy();                               // always call when leaving the page
 *
 * This module is loaded on demand (dynamic import) so the home page never downloads three.js.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createActor, disposeModels, loadProgress } from './actors.js';
import { buildSet, disposeTree } from './sets.js';

export function parsePlacement(value) {
  const m = /^([a-z][a-z0-9]*):(\d{1,3})(?:>(\d{1,3}))?(?::([a-z]+))?$/.exec(value);
  return m ? { id: m[1], x: +m[2], toX: m[3] === undefined ? null : +m[3], pose: m[4] ?? '' } : null;
}

const WORLD_HALF_WIDTH = 2.7; // x = 0..400 in the movie file becomes -2.7..2.7 metres
const toWorld = (x) => ((x - 200) / 200) * WORLD_HALF_WIDTH;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);

export function pickQuality() {
  const forced = new URLSearchParams(location.search).get('q');
  if (['low', 'medium', 'high'].includes(forced)) return forced;
  const phone = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  if (phone && cores <= 4) return 'low';
  return phone ? 'medium' : 'high';
}

export async function createCinema(canvas, { cast = {}, quality = pickQuality() } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  camera.position.set(0, 1.6, 7);

  // post-processing (skipped on low quality)
  let composer = null;
  let bloom = null;
  let rgb = null;
  const size = { w: 1, h: 1 };
  if (quality !== 'low') {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality === 'high' ? 4 : 0 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.65, 0.9);
    composer.addPass(bloom);
    rgb = new ShaderPass(RGBShiftShader);
    rgb.uniforms.amount.value = 0;
    rgb.enabled = false;
    composer.addPass(rgb);
    composer.addPass(new OutputPass());
  }

  function resize() {
    const box = canvas.parentElement ?? canvas;
    const w = Math.max(2, Math.round(box.clientWidth));
    const h = Math.max(2, Math.round(box.clientHeight));
    if (w === size.w && h === size.h) return;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.fov = 38; // a longer lens than a phone camera: it flatters faces and keeps the set from bending at the edges
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = 3;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);

  // ----------------------------------------------------------- state
  const actors = new Map(); // id -> actor
  const loading = new Map();
  let set = null;
  let setKey = '';
  let shot = null;
  let playing = false;
  let dirty = 3;
  let now = 0;
  let last = performance.now();
  let speaker = { id: '', level: () => 0 };
  let destroyed = false;
  let raf = 0;
  const stage = new THREE.Group();
  scene.add(stage);
  scene.add(new THREE.Group()); // placeholder so scene.children[1] is always the backdrop slot

  function actorFor(id) {
    if (actors.has(id)) return Promise.resolve(actors.get(id));
    if (!loading.has(id)) {
      const member = cast[id];
      loading.set(
        id,
        createActor(id, member ?? { model: 'soldier' }, renderer).then((a) => {
          actors.set(id, a);
          stage.add(a.group);
          a.group.visible = false;
          return a;
        }),
      );
    }
    return loading.get(id);
  }

  function applySet(sc) {
    const key = [sc.p, sc.tm, (sc.pr ?? []).join(','), (sc.fx ?? []).join(',')].join('|');
    if (key === setKey) return;
    setKey = key;
    if (set) {
      scene.remove(set.group, set.backdrop);
      disposeTree(set.group);
      disposeTree(set.backdrop);
    }
    set = buildSet(sc.p, { time: sc.tm, props: sc.pr, fx: sc.fx, quality });
    scene.add(set.group, set.backdrop);
    scene.background = set.background;
    scene.fog = set.fog;
    if (set.flags.haze) scene.fog.far *= 0.45;
    if (bloom) bloom.strength = sc.tm === 'day' ? 0.28 : sc.tm === 'alert' ? 0.7 : 0.55;
    renderer.toneMappingExposure = sc.tm === 'night' ? 1.15 : sc.tm === 'dim' ? 1.2 : 1.0;
    if (rgb) rgb.enabled = set.flags.glitch;
  }

  // ----------------------------------------------------------- camera
  function planShot(type, seconds, focus, centre) {
    const dur = Math.max(3, seconds + 1);
    const fx = focus ? focus.x : centre.x;
    const fh = focus ? focus.headY : 1.5;
    const S = { type, dur, t0: now };
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    switch (type) {
      case 'close':
        S.a = v(fx + 0.35, fh + 0.02, 1.9); S.b = v(fx + 0.15, fh, 1.5); S.la = v(fx, fh - 0.06, 0); S.lb = S.la.clone();
        break;
      case 'low':
        S.a = v(fx * 0.6, 0.3, 4.6); S.b = v(fx * 0.6, 0.45, 3.8); S.la = v(fx, fh * 0.8, 0); S.lb = S.la.clone();
        break;
      case 'high':
        S.a = v(centre.x * 0.5, 5.6, 9.2); S.b = v(centre.x * 0.5, 4.8, 8.2); S.la = v(centre.x, 0.9, -1); S.lb = S.la.clone();
        break;
      case 'in':
        S.a = v(centre.x * 0.6, 1.7, 9.0); S.b = v(centre.x * 0.6, 1.5, 4.4); S.la = v(centre.x, 1.25, 0); S.lb = S.la.clone();
        break;
      case 'out':
        S.a = v(centre.x * 0.6, 1.5, 4.2); S.b = v(centre.x * 0.6, 1.8, 9.4); S.la = v(centre.x, 1.25, 0); S.lb = S.la.clone();
        break;
      case 'l':
        S.a = v(centre.x + 1.8, 1.55, 7.4); S.b = v(centre.x - 1.8, 1.55, 7.2); S.la = v(centre.x, 1.25, 0); S.lb = S.la.clone();
        break;
      case 'r':
        S.a = v(centre.x - 1.8, 1.55, 7.4); S.b = v(centre.x + 1.8, 1.55, 7.2); S.la = v(centre.x, 1.25, 0); S.lb = S.la.clone();
        break;
      case 'orbit':
        S.orbit = { c: v(centre.x, 1.3, -0.5), r: 9 };
        S.la = S.orbit.c.clone();
        break;
      case 'medium':
        S.a = v(fx * 0.8 + 0.25, fh * 0.9, 3.1); S.b = v(fx * 0.8 + 0.1, fh * 0.88, 2.6); S.la = v(fx, fh * 0.82, 0); S.lb = S.la.clone();
        break;
      default: // wide
        S.a = v(centre.x * 0.35, 1.9, 10.8); S.b = v(centre.x * 0.35, 1.8, 9.6); S.la = v(centre.x, 1.3, -1); S.lb = S.la.clone();
    }
    return S;
  }

  function updateCamera() {
    if (!shot) return;
    const k = ease(clamp((now - shot.t0) / shot.dur, 0, 1));
    const sway = 0.012;
    if (shot.orbit) {
      const a = -0.5 + k * 1.0;
      const { c, r } = shot.orbit;
      camera.position.set(c.x + Math.sin(a) * r, 1.9 - k * 0.3, c.z + Math.cos(a) * r);
      camera.lookAt(shot.la);
    } else {
      camera.position.lerpVectors(shot.a, shot.b, k);
      camera.position.x += Math.sin(now * 0.7) * sway;
      camera.position.y += Math.sin(now * 0.9 + 1) * sway;
      camera.lookAt(shot.la.clone().lerp(shot.lb, k));
    }
    set?.backdrop.position.copy(camera.position);
  }

  // ----------------------------------------------------------- public
  async function show(sc, { seconds = 5 } = {}) {
    if (destroyed) return;
    const placements = (sc.c ?? []).map(parsePlacement).filter(Boolean);
    const ready = await Promise.all(placements.map((p) => actorFor(p.id).catch(() => null)));
    if (destroyed) return;

    const placeChanged = !set || sc.p !== setKey.split('|')[0];
    if (placeChanged && playing) {
      canvas.style.opacity = '0';
      await new Promise((r) => setTimeout(r, 160));
    }
    applySet(sc);
    for (const a of actors.values()) a.group.visible = false;
    const many = placements.length >= 3;
    placements.forEach((p, i) => {
      const a = ready[i];
      if (!a) return;
      a.group.visible = true;
      const z = a.spec.face ? -0.4 : many ? (i % 2) * -0.7 : 0;
      a.place({ x: toWorld(p.x), toX: p.toX === null ? null : toWorld(p.toX), z, pose: p.pose, dur: seconds, now });
    });
    const shown = placements.map((p, i) => ready[i]).filter(Boolean);
    const sid = sc.s === 'N' ? '' : sc.s;
    const focus = shown.find((a) => a.id === sid) ?? (shown.length === 1 ? shown[0] : null);
    const cx = shown.length ? shown.reduce((s, a) => s + a.group.position.x, 0) / shown.length : 0;
    shot = planShot(sc.cam ?? 'wide', seconds, focus ? { x: focus.group.position.x, headY: focus.headY } : null, { x: cx });
    updateCamera();
    canvas.parentElement?.classList.toggle('fl', !!sc.fl);
    canvas.style.opacity = '1';
    dirty = 3;
  }

  function setSpeaker(id, levelFn) {
    speaker = { id: id || '', level: levelFn || (() => 0) };
  }

  function setPlaying(v) {
    playing = !!v;
    dirty = 3;
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (destroyed) return;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (!playing && dirty <= 0) return;
    if (playing) now += dt;
    dirty = Math.max(0, dirty - 1);
    const level = speaker.id ? clamp(speaker.level(), 0, 1) : 0;
    for (const a of actors.values()) {
      if (!a.group.visible) continue;
      a.mouth = a.id === speaker.id ? level : 0;
      a.update(playing ? dt : 0.0001, now);
    }
    set?.update(now, dt);
    if (rgb?.enabled) rgb.uniforms.amount.value = Math.max(0, Math.sin(now * 9) * Math.sin(now * 2.3)) * 0.012;
    updateCamera();
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  resize();

  return {
    show,
    setSpeaker,
    setPlaying,
    resize,
    quality,
    /** Load every model the cast uses before play starts, so the first scene does not stutter. */
    async preload(ids, onProgress = () => {}) {
      const keys = ids.map((id) => cast[id]?.model ?? 'soldier');
      const tick = setInterval(() => onProgress(loadProgress(keys)), 120);
      onProgress(loadProgress(keys));
      try {
        const results = await Promise.all(ids.map((id) => actorFor(id).then(() => true, () => false)));
        onProgress(1);
        return results.every(Boolean);
      } finally {
        clearInterval(tick);
      }
    },
    /** For tests and the scene lab. */
    debug: { scene, camera, renderer, actors },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const a of actors.values()) a.dispose();
      if (set) {
        disposeTree(set.group);
        disposeTree(set.backdrop);
      }
      disposeModels();
      envTex.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
