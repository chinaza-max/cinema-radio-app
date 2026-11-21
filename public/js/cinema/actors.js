/*
 * Characters. Each cast member names a `model`; the models are glTF files in /models (see docs/CREDITS.md).
 *
 *   soldier, michelle, avatar   humans on a Mixamo-style skeleton. Soldier owns the Idle/Walk/Run clips and the other
 *                               two borrow them (bones are matched by name), so one set of motion serves all humans.
 *   android, robot              ship their own clips (nod, shake, wave, ...)
 *   hologram                    a head with 52 face blendshapes, drawn as a glowing projection: the ship's mind
 *
 * Gestures that no clip provides (nod, shake, sad, point) are added on top of the playing clip by turning bones a little.
 * Mouths move only where the model has mouth shapes (avatar, hologram); everyone else gets a speaking head-bob.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { hdr } from './gfx.js';

export const MODELS = {
  soldier: { url: '/models/soldier.glb', bytes: 2160468, height: 1.85, flip: true, clips: { idle: 'Idle', walk: 'Walk', run: 'Run' } },
  michelle: { url: '/models/michelle.glb', bytes: 3276888, height: 1.7, borrow: 'soldier' },
  avatar: { url: '/models/avatar.glb', bytes: 1838884, height: 1.78, mouth: ['mouthOpen'], clips: {} },
  android: { url: '/models/android.glb', bytes: 2930032, height: 1.88, clips: { idle: 'idle', walk: 'walk', run: 'run', nod: 'agree', shake: 'headShake', sad: 'sad_pose', sneak: 'sneak_pose' } },
  robot: { url: '/models/robot.glb', bytes: 463988, height: 1.05, clips: { idle: 'Idle', walk: 'Walking', run: 'Running', wave: 'Wave', nod: 'Yes', shake: 'No', fall: 'Death' } },
  hologram: { url: '/models/hologram.glb', bytes: 332808, height: 0.6, face: true },
};

/* ------------------------------------------------------------------ loading */

const cache = new Map();
let loader;

function getLoader(renderer) {
  if (loader) return loader;
  loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ktx = new KTX2Loader().setTranscoderPath('/vendor/three/examples/jsm/libs/basis/').detectSupport(renderer);
  loader.setKTX2Loader(ktx);
  return loader;
}

/** Bytes received so far per model key, so the loading bar can show real progress. */
const received = new Map();

/** Fraction 0..1 of the download of these model keys (a model counts as done once it has arrived). */
export function loadProgress(keys) {
  let have = 0, total = 0;
  for (const k of new Set(keys)) {
    const size = MODELS[k]?.bytes ?? 1e6;
    total += size;
    have += Math.min(size, received.get(k) ?? 0);
  }
  return total ? have / total : 1;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Load (once) and return { scene, animations } for a model key. A failed download is retried twice before giving up. */
export function loadModel(key, renderer) {
  if (!cache.has(key)) {
    const spec = MODELS[key];
    const once = () =>
      new Promise((resolve, reject) =>
        getLoader(renderer).load(
          spec.url,
          (g) => { received.set(key, spec.bytes ?? 1e6); resolve(g); },
          (e) => received.set(key, Math.min((spec.bytes ?? 1e6) * 0.97, e.lengthComputable && e.total ? (e.loaded / e.total) * (spec.bytes ?? 1e6) : e.loaded)),
          reject,
        ),
      );
    const attempt = async () => {
      let err;
      for (let i = 0; i < 3; i++) {
        try {
          return await once();
        } catch (e) {
          err = e;
          received.set(key, 0);
          await sleep(600 * (i + 1));
        }
      }
      throw err;
    };
    cache.set(key, attempt().catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}

export function disposeModels() {
  for (const p of cache.values()) p.then((g) => g.scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material ?? []).forEach((m) => m.dispose()); }));
  cache.clear();
}

/** Copy a clip from a Mixamo skeleton onto another one. Root motion is dropped; only joint rotations are kept. */
function retarget(clip, prefix) {
  const tracks = [];
  for (const t of clip.tracks) {
    if (!t.name.endsWith('.quaternion')) continue;
    if (/^mixamorigHips\./.test(t.name)) continue; // the donor's root turn does not fit other skeletons
    const bone = t.name.split('.')[0].replace(/^mixamorig/, prefix);
    const copy = t.clone();
    copy.name = `${bone}.quaternion`;
    tracks.push(copy);
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

/**
 * Give each character its own materials (the loaded ones are shared between clones) and apply the cast colours.
 * `coat` tints the outfit (humans with an outfit) or the shell (android).
 */
function restyle(root, member) {
  const coat = new THREE.Color(member.coat ?? '#888888');
  const own = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = [].concat(o.material);
    const next = list.map((m) => {
      if (!own.has(m)) own.set(m, m.clone());
      return own.get(m);
    });
    o.material = Array.isArray(o.material) ? next : next[0];
    const n = o.name || '';
    const mat = next[0];
    if (member.model === 'avatar') {
      if (/Headwear/.test(n)) o.visible = false;
      if (/Outfit_Top/.test(n)) { mat.map = null; mat.color.copy(coat); mat.roughness = 0.6; }
      if (/Outfit_Bottom/.test(n)) { mat.map = null; mat.color.set('#202733'); }
      if (/Footwear/.test(n)) { mat.map = null; mat.color.set('#15181e'); }
    }
    if (member.model === 'robot') {
      for (const m of next) if (/main/i.test(m.name)) { m.color.copy(coat); m.metalness = 0.5; m.roughness = 0.4; }
    }
    if (member.model === 'android') {
      for (const m of next) {
        if (/HighLimbs/.test(m.name)) { m.color.copy(coat); m.metalness = 0.85; m.roughness = 0.28; m.emissive?.set('#000000'); }
        if (/Joints/.test(m.name)) { m.color.set('#15191f'); m.metalness = 0.6; m.roughness = 0.45; }
      }
    }
  });
}

/* ------------------------------------------------------------------ actor */

const e = new THREE.Euler();
const q = new THREE.Quaternion();
const spin = (bone, x = 0, y = 0, z = 0) => {
  if (!bone) return;
  q.setFromEuler(e.set(x, y, z));
  bone.quaternion.multiply(q);
};
const ease = (t) => t * t * (3 - 2 * t);

export async function createActor(id, member, renderer) {
  const spec = MODELS[member.model] ?? MODELS.soldier;
  const src = await loadModel(member.model in MODELS ? member.model : 'soldier', renderer);
  const root = cloneSkinned(src.scene);
  const group = new THREE.Group();
  const holder = new THREE.Group();
  group.add(holder);
  holder.add(root);

  // Stand the model on the floor at its intended height.
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  const h = bb.max.y - bb.min.y;
  const scale = Number.isFinite(h) && h > 0.01 ? (spec.height * (member.sc ?? 1)) / h : 1;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const bb2 = new THREE.Box3().setFromObject(root);
  root.position.y -= bb2.min.y;
  const center = (bb2.min.x + bb2.max.x) / 2;
  root.position.x -= center;
  const height = spec.height * (member.sc ?? 1);

  if (spec.flip) root.rotation.y = Math.PI; // these files face away from the camera
  restyle(root, member);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });

  // --- clips
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  let clips = {};
  if (spec.borrow) {
    const donor = await loadModel(spec.borrow, renderer);
    const names = MODELS[spec.borrow].clips;
    for (const [k, n] of Object.entries(names)) {
      const c = donor.animations.find((a) => a.name === n);
      if (c) clips[k] = retarget(c, spec.prefix ?? 'mixamorig');
    }
  } else if (spec.clips) {
    for (const [k, n] of Object.entries(spec.clips)) {
      const c = src.animations.find((a) => a.name === n);
      if (c) clips[k] = c;
    }
  }
  for (const [k, c] of Object.entries(clips)) {
    actions[k] = mixer.clipAction(c);
    actions[k].enabled = true;
  }

  // --- bones for gestures and mouths
  const bone = (re) => {
    let f = null;
    root.traverse((o) => { if (!f && o.isBone && re.test(o.name)) f = o; });
    return f;
  };
  const bones = {
    head: bone(/(^|rig)head$/i),
    neck: bone(/(^|rig)neck$/i),
    spine: bone(/(^|rig)spine1?$/i),
    spine2: bone(/(^|rig)spine2$/i),
    rArm: bone(/(^|rig)rightarm$/i) ?? bone(/^arm\.r$|upper.?arm.*r$/i),
    rFore: bone(/(^|rig)rightforearm$/i),
    lArm: bone(/(^|rig)leftarm$/i),
  };
  // rest pose of every bone, restored each frame so procedural spins never accumulate
  const rest = [];
  root.traverse((o) => { if (o.isBone) rest.push([o, o.quaternion.clone()]); });
  const armsDown = member.model === 'avatar';
  const morphMeshes = [];
  root.traverse((o) => {
    if (o.isMesh && o.morphTargetDictionary) morphMeshes.push(o);
  });
  const setMorph = (name, v) => {
    for (const m of morphMeshes) {
      const i = m.morphTargetDictionary[name];
      if (i !== undefined) m.morphTargetInfluences[i] = v;
    }
  };

  // --- hologram look: the face is drawn as a glowing projection instead of with its own materials
  let holo;
  if (spec.face) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#4cc8f0', 0.9), transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const wire = new THREE.MeshBasicMaterial({ color: hdr('#8ff0ff', 1.6), wireframe: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    const extra = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = mat;
      o.castShadow = o.receiveShadow = false;
      if (o.morphTargetDictionary) {
        const w = new THREE.Mesh(o.geometry, wire);
        w.morphTargetInfluences = o.morphTargetInfluences;
        w.morphTargetDictionary = o.morphTargetDictionary;
        extra.push([o, w]);
      }
    });
    for (const [o, w] of extra) o.parent.add(w);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.04, 40), new THREE.MeshBasicMaterial({ color: hdr('#5fd8ff', 2.4) }));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 32, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#5fd8ff', 0.9), transparent: true, opacity: 0.1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    cone.rotation.x = Math.PI;
    cone.position.y = 0.55;
    base.position.y = 0.02;
    group.add(base, cone);
    holder.position.y = 1.25;
    root.position.y += 0;
    holo = { mat, base };
  }

  // --- state
  const st = {
    from: 0, to: 0, z: 0, t0: 0, dur: 1, moving: false,
    pose: '', motion: '', yaw: 0, fall: 0, mouth: 0, mouthSmooth: 0, time: 0, talk: 0, beat: 0, prevMouth: 0, lastBeat: -9,
  };

  function play(name, { speed = 1, fade = 0.3 } = {}) {
    const a = actions[name] ?? actions.idle;
    if (!a) return;
    const key = actions[name] ? name : 'idle';
    if (st.motion === key && a.timeScale === speed) return;
    const prev = actions[st.motion];
    a.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1).fadeIn(fade).play();
    if (prev && prev !== a) prev.fadeOut(fade);
    st.motion = key;
  }

  const api = {
    id,
    group,
    height,
    spec,
    get headY() { return holo ? 1.35 : height * 0.93; },
    /** Put the character at x (world units) and, if toX differs, walk there over `dur` seconds. */
    place({ x, toX = null, z = 0, pose = '', dur = 4, now = 0 }) {
      st.from = x;
      st.to = toX ?? x;
      st.z = z;
      st.t0 = now;
      st.dur = Math.max(0.8, dur * 0.8);
      st.moving = toX !== null && Math.abs(toX - x) > 0.05;
      st.pose = pose;
      group.position.set(x, 0, z);
      const dir = st.moving ? Math.sign(st.to - st.from) : 0;
      st.yawTarget = dir ? dir * (Math.PI / 2.4) : -Math.sign(x || 1) * Math.min(0.55, Math.abs(x) * 0.12 + 0.12);
      if (holo) st.yawTarget = -Math.sign(x || 1) * Math.min(0.4, Math.abs(x) * 0.08);
      if (pose === 'fall') st.fall = 0.0001;
      else st.fall = 0;
      const motion = st.moving ? (pose === 'run' ? 'run' : pose === 'sneak' && actions.sneak ? 'sneak' : 'walk') : pose && actions[pose] ? pose : 'idle';
      play(motion, { speed: pose === 'sneak' && !actions.sneak && st.moving ? 0.6 : 1 });
      if (pose === 'fall' && actions.fall) {
        actions.fall.setLoop(THREE.LoopOnce, 1);
        actions.fall.clampWhenFinished = true;
      }
    },
    /** 0..1, how loud the voice is right now. Drives mouths and the speaking head-bob. */
    set mouth(v) { st.mouth = v; },
    get speaking() { return st.mouth > 0.02; },
    update(dt, now) {
      st.time += dt;
      for (const [b, r] of rest) b.quaternion.copy(r);
      mixer.update(dt);
      if (st.moving) {
        const k = ease(THREE.MathUtils.clamp((now - st.t0) / st.dur, 0, 1));
        group.position.x = st.from + (st.to - st.from) * k;
        if (k >= 1) {
          st.moving = false;
          play('idle');
        }
      }
      st.yaw += (st.yawTarget - st.yaw) * Math.min(1, dt * 5);
      group.rotation.y = st.yaw;
      st.mouthSmooth += (st.mouth - st.mouthSmooth) * Math.min(1, dt * 22);
      const m = st.mouthSmooth;
      const T = st.time;

      if (spec.mouth) setMorph('mouthOpen', Math.min(1, m * 1.3));
      if (spec.mouth) setMorph('mouthSmile', 0.15 + Math.sin(T * 0.7) * 0.05);
      if (holo) {
        setMorph('jawOpen', Math.min(1, m * 1.1));
        setMorph('mouthFunnel', m * (0.25 + 0.25 * Math.sin(T * 14)));
        setMorph('mouthSmile_L', 0.1);
        setMorph('mouthSmile_R', 0.1);
        setMorph('eyeBlink_L', Math.max(0, Math.sin(T * 1.3) > 0.985 ? 1 : 0));
        setMorph('eyeBlink_R', Math.max(0, Math.sin(T * 1.3) > 0.985 ? 1 : 0));
        holder.position.y = 1.35 + Math.sin(T * 1.2) * 0.03;
        holo.mat.opacity = 0.3 + Math.sin(T * 9) * 0.03 + m * 0.1;
      }

      // gestures on top of whatever clip is playing
      const talk = m > 0.04 ? 1 : 0;
      st.talk += (talk - st.talk) * Math.min(1, dt * 6);
      const pose = st.pose;
      const nod = pose === 'nod' && !actions.nod ? Math.sin(T * 5) * 0.16 * Math.max(0, 1 - ((now - st.t0) / 3)) : 0;
      const shake = pose === 'shake' && !actions.shake ? Math.sin(T * 6) * 0.35 * Math.max(0, 1 - ((now - st.t0) / 3)) : 0;
      const sad = pose === 'sad' && !actions.sad ? 1 : 0;
      // Gestures are rare on purpose: a small head dip when the voice stresses a word (at most every ~1.8 s),
      // plus a barely visible sway while talking. Big gestures only come from poses the author asked for.
      if (m > 0.6 && st.prevMouth < 0.3 && now - st.lastBeat > 1.8) { st.lastBeat = now; st.beat = 1; }
      st.prevMouth = m;
      st.beat = Math.max(0, st.beat - dt * 2.2);
      const bob = st.talk * Math.sin(T * 3.1) * 0.008 - Math.sin(st.beat * Math.PI) * 0.07;
      spin(bones.head, nod + bob + sad * 0.35, shake + Math.sin(T * 2.1) * 0.012 * st.talk, 0);
      if (armsDown) {
        const br = Math.sin(T * 1.6) * 0.012;
        spin(bones.lArm, 0, 0, -1.05 + br);
        if (pose !== 'point' && pose !== 'wave') spin(bones.rArm, 0, 0, 1.05 - br);
        spin(bones.spine, br, 0, 0);
      }
      spin(bones.neck, sad * 0.2, 0, 0);
      spin(bones.spine, sad * 0.18, 0, 0);
      if (pose === 'point' || pose === 'wave') {
        const lift = ease(THREE.MathUtils.clamp((now - st.t0) / 0.6, 0, 1));
        const wave = pose === 'wave' ? Math.sin(T * 9) * 0.35 : 0;
        spin(bones.rArm, 0, 0, -1.15 * lift + wave * lift);
        spin(bones.rFore, 0, 0, -0.35 * lift);
      }
      if (st.fall) {
        st.fall = Math.min(1, st.fall + dt / 0.9);
        holder.rotation.x = -ease(st.fall) * 1.45;
        holder.position.y = ease(st.fall) * 0.12;
      } else if (!holo) {
        holder.rotation.x = 0;
      }
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
  play('idle', { fade: 0 });
  return api;
}
