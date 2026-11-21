/*
 * Toon characters: cartoon humans built from Three.js primitives, so a movie can have any number of different
 * people without downloading a model. Every cast member of model "toon" gets its own skin, hair, outfit, build and
 * gear from the cast fields (see docs/MOVIE_FORMAT.md). Every toon has a mouth that follows the voice, blinks,
 * walks, runs, dashes (with a lightning trail) and gestures on request.
 *
 * Same interface as the GLB actors in actors.js: { id, group, height, spec, headY, place, mouth, speaking, update, dispose }.
 */
import * as THREE from 'three';
import { hdr } from './gfx.js';

const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let gradient;
/** Three flat bands of light: what makes MeshToonMaterial look like a cartoon. */
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const toon = (color) => new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: toonGradient() });
const flat = (color) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#12121c', side: THREE.BackSide });

/** A mesh with a dark back-face shell around it: the comic-book outline. */
function part(geo, mat, { outline = true, grow = 1.07 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(grow);
    m.add(o);
  }
  return m;
}

/** A limb segment that hangs down from its pivot (the group origin is the joint). */
function limb(radius, length, mat) {
  const g = new THREE.Group();
  const m = part(new THREE.CapsuleGeometry(radius, length, 4, 10), mat);
  m.position.y = -(length / 2 + radius * 0.6);
  g.add(m);
  return g;
}

const GEAR = ['mask', 'glasses', 'cape', 'belt', 'bolt', 'coat', 'scarf', 'headband', 'suit', 'visor', 'halo'];
const HAIR = ['short', 'afro', 'long', 'bun', 'bald', 'cap', 'braids', 'cowl'];
export const TOON_GEAR = GEAR;
export const TOON_HAIR = HAIR;

export function createToon(id, member = {}) {
  const k = (member.sc ?? 1) * (1.75 / 1.8);
  const buildW = { slim: 0.88, regular: 1, stocky: 1.2 }[member.build] ?? 1;
  const gear = new Set(String(member.gear ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  const suit = gear.has('suit');
  const skin = member.skin ?? '#c68642';
  const topC = member.coat ?? '#3b82f6';
  const accent = member.coat2 ?? '#7fe8ff';
  const pantsC = member.pants ?? '#273046';
  const shoeC = '#24242b';
  const hairC = member.hair ?? '#1a1a1a';
  const style = HAIR.includes(member.hairstyle) ? member.hairstyle : 'short';

  const group = new THREE.Group();
  const holder = new THREE.Group();
  const body = new THREE.Group();
  holder.add(body);
  group.add(holder);
  holder.scale.setScalar(k);

  const skinM = toon(skin), topM = toon(topC), pantsM = toon(pantsC), shoeM = toon(shoeC), hairM = toon(hairC);
  const accentM = new THREE.MeshBasicMaterial({ color: hdr(accent, 2.2) }); // only for glowing emblems
  const trimM = toon(member.trim ?? '#e8e8ee'), accentT = toon(accent), soleM = toon('#e9e6df'), beltM = toon('#2b2420');

  // ---- legs
  const legs = [];
  for (const sx of [1, -1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.1 * buildW, 0.93, 0);
    const thigh = limb(0.088 * buildW, 0.34, pantsM);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    const shin = limb(0.07 * buildW, 0.34, pantsM);
    const foot = new THREE.Group();
    const shoe = part(new THREE.CapsuleGeometry(0.055 * buildW, 0.11, 4, 10), shoeM);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.05, 1, 0.78);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.12 * buildW, 0.022, 0.24), soleM);
    sole.position.set(0, -0.035, 0.0);
    foot.add(shoe, sole);
    foot.position.set(0, -0.485, 0.06);
    knee.add(shin, foot);
    hip.add(thigh, knee);
    body.add(hip);
    legs.push({ hip, knee, sx });
  }

  // ---- torso, arms, head
  const torso = new THREE.Group();
  torso.position.y = 0.93;
  body.add(torso);
  // shirt: broad at the shoulders, narrower at the waist, over a pelvis in trouser colour
  const chest = part(new THREE.CapsuleGeometry(0.16 * buildW, 0.22, 6, 16), topM);
  chest.position.y = 0.33;
  chest.scale.set(1.08, 1, 0.74);
  torso.add(chest);
  const waist = part(new THREE.CylinderGeometry(0.15 * buildW, 0.135 * buildW, 0.16, 18), topM);
  waist.position.y = 0.12;
  waist.scale.z = 0.76;
  torso.add(waist);
  const pelvis = part(new THREE.SphereGeometry(0.15 * buildW, 18, 12), pantsM);
  pelvis.position.y = 0.01;
  pelvis.scale.set(1, 0.72, 0.78);
  torso.add(pelvis);
  const collar = part(new THREE.TorusGeometry(0.075, 0.022, 8, 18), trimM, { outline: false });
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.58, 0.005);
  torso.add(collar);
  if (gear.has('belt')) {
    const belt = part(new THREE.CylinderGeometry(0.152 * buildW, 0.148 * buildW, 0.05, 20), beltM, { outline: false });
    belt.position.y = 0.075;
    belt.scale.z = 0.82;
    torso.add(belt);
  }
  if (gear.has('bolt')) {
    const s = new THREE.Shape();
    [[0.02, 0.12], [-0.06, -0.01], [-0.01, -0.01], [-0.04, -0.12], [0.07, 0.02], [0.01, 0.02], [0.06, 0.12]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const bolt = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: false }), accentM);
    bolt.position.set(0, 0.34, 0.118 * 1.0 * buildW + 0.012);
    bolt.scale.setScalar(1.35);
    torso.add(bolt);
  }
  if (gear.has('coat')) {
    const skirt = part(new THREE.CylinderGeometry(0.16 * buildW, 0.27 * buildW, 0.5, 20, 1, true), topM);
    skirt.material.side = THREE.DoubleSide;
    skirt.position.y = -0.14;
    torso.add(skirt);
  }
  if (gear.has('scarf')) {
    const scarf = part(new THREE.TorusGeometry(0.1, 0.036, 8, 18), accentT, { outline: false });
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.58;
    torso.add(scarf);
  }
  let cape = null;
  if (gear.has('cape')) {
    cape = new THREE.Group();
    cape.position.set(0, 0.55, -0.12);
    const sheet = part(new THREE.BoxGeometry(0.42 * buildW, 0.78, 0.025), toon(member.coat2 ?? topC));
    sheet.position.y = -0.38;
    cape.add(sheet);
    torso.add(cape);
  }

  const arms = [];
  for (const sx of [1, -1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * (0.2 * buildW + 0.04), 0.5, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.066 * buildW, 14, 10), topM);
    cap.castShadow = true;
    const upper = limb(0.058 * buildW, 0.24, topM);
    upper.add(cap);
    const elbow = new THREE.Group();
    elbow.position.y = -0.33;
    const fore = limb(0.05 * buildW, 0.22, suit ? topM : skinM);
    const hand = new THREE.Group();
    const palm = part(new THREE.CapsuleGeometry(0.036, 0.05, 4, 10), suit ? trimM : skinM);
    palm.scale.set(1.2, 1, 0.7);
    palm.position.y = -0.03;
    const thumb = part(new THREE.CapsuleGeometry(0.014, 0.03, 3, 6), suit ? trimM : skinM, { outline: false });
    thumb.position.set(sx * -0.04, -0.015, 0.018);
    thumb.rotation.z = sx * 0.5;
    hand.add(palm, thumb);
    hand.position.y = -0.375;
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    torso.add(shoulder);
    arms.push({ shoulder, elbow, sx });
  }

  const neck = part(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 10), skinM);
  neck.position.y = 0.6;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.66;
  torso.add(head);
  const skull = part(new THREE.SphereGeometry(0.165, 28, 20), skinM, { grow: 1.05 });
  skull.position.y = 0.16;
  skull.scale.set(1, 1.06, 1);
  head.add(skull);
  for (const sx of [1, -1]) {
    const ear = part(new THREE.SphereGeometry(0.036, 10, 8), skinM, { grow: 1.1 });
    ear.position.set(sx * 0.163, 0.15, 0);
    head.add(ear);
  }
  const nose = part(new THREE.SphereGeometry(0.026, 10, 8), skinM, { outline: false });
  nose.position.set(0, 0.125, 0.165);
  nose.scale.set(0.9, 1, 1.1);
  head.add(nose);

  // face
  const eyeWhite = flat('#ffffff'), pupil = flat('#16161d');
  const eyes = [];
  for (const sx of [1, -1]) {
    const e = new THREE.Group();
    e.position.set(sx * 0.063, 0.19, 0.148);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), eyeWhite);
    w.scale.z = 0.5;
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), flat('#4a2d1c'));
    iris.position.z = 0.009;
    iris.scale.z = 0.6;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 10, 8), pupil);
    p.position.z = 0.016;
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), flat('#ffffff'));
    gl.position.set(0.008, 0.008, 0.021);
    e.add(w, iris, p, gl);
    head.add(e);
    eyes.push(e);
  }
  const brows = [];
  for (const sx of [1, -1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.012), flat(hairC === '#1a1a1a' ? '#1a1a1a' : hairC));
    b.position.set(sx * 0.063, 0.245, 0.15);
    head.add(b);
    brows.push({ m: b, sx, y: 0.245 });
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), flat('#7d2f33'));
  mouth.position.set(0, 0.085, member.beard ? 0.172 : 0.153);
  mouth.scale.set(1, 0.2, 0.35);
  head.add(mouth);
  if (member.beard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.32), toon(member.beard));
    beard.position.y = 0.16;
    beard.scale.set(1, 1.06, 1);
    head.add(beard);
  }

  // hair
  const cap = (r, phi) => new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, phi);
  const addHair = (geo, mat, y = 0.16, z = 0, rx = -0.22) => {
    const h = part(geo, mat, { grow: 1.04 });
    h.position.set(0, y, z);
    h.rotation.x = rx;
    head.add(h);
    return h;
  };
  if (style === 'short' || style === 'long' || style === 'bun' || style === 'braids') addHair(cap(0.172, Math.PI * 0.56), hairM);
  if (style === 'afro') addHair(new THREE.SphereGeometry(0.235, 20, 16), hairM, 0.2, -0.03, 0);
  if (style === 'long') {
    const back = part(new THREE.BoxGeometry(0.32, 0.3, 0.07), hairM);
    back.position.set(0, 0.03, -0.12);
    head.add(back);
  }
  if (style === 'bun') {
    const bun = part(new THREE.SphereGeometry(0.07, 12, 10), hairM);
    bun.position.set(0, 0.36, -0.04);
    head.add(bun);
  }
  if (style === 'braids') {
    for (let i = -3; i <= 3; i++) {
      const br = part(new THREE.CapsuleGeometry(0.014, 0.24, 3, 6), hairM, { outline: false });
      br.position.set(i * 0.045, 0.06, -0.14 + Math.abs(i) * 0.02);
      head.add(br);
    }
  }
  if (style === 'cap') {
    addHair(cap(0.176, Math.PI * 0.5), toon(member.coat2 ?? topC));
    const brim = part(new THREE.BoxGeometry(0.2, 0.014, 0.12), toon(member.coat2 ?? topC), { outline: false });
    brim.position.set(0, 0.255, 0.17);
    head.add(brim);
  }
  if (style === 'cowl') {
    addHair(cap(0.178, Math.PI * 0.62), toon(topC), 0.15, 0, -0.12);
    for (const sx of [1, -1]) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), accentM);
      fin.position.set(sx * 0.15, 0.27, 0);
      fin.rotation.z = -sx * 0.5;
      head.add(fin);
    }
  }
  if (gear.has('headband')) {
    const hb = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 6, 24), accentM);
    hb.rotation.x = Math.PI / 2;
    hb.position.y = 0.26;
    head.add(hb);
  }
  if (gear.has('mask')) {
    // eye mask: a dark band over the eyes with the whites still showing through two holes
    const band = new THREE.Mesh(new THREE.SphereGeometry(0.168, 24, 6, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.1), toon(topC));
    band.position.y = 0.17;
    head.add(band);
  }
  if (gear.has('glasses')) {
    const rm = new THREE.MeshBasicMaterial({ color: '#1b1b22' });
    for (const sx of [1, -1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 6, 16), rm);
      rim.position.set(sx * 0.063, 0.19, 0.16);
      head.add(rim);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.007, 0.007), rm);
    bridge.position.set(0, 0.195, 0.16);
    head.add(bridge);
  }

  // visor: a dark glass face plate; the eyes and mouth glow in the accent colour like a friendly screen
  if (gear.has('visor')) {
    const plate = part(new THREE.SphereGeometry(0.172, 28, 16, Math.PI * 0.14, Math.PI * 0.72, Math.PI * 0.26, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: '#141824', roughness: 0.18, metalness: 0.7 }), { grow: 1.03 });
    plate.position.y = 0.16;
    plate.scale.set(1, 1.06, 1);
    head.add(plate);
    nose.visible = false;
    for (const e of eyes) {
      e.position.z = 0.184;
      e.scale.set(1.1, 1.25, 1);
      e.children[0].material = new THREE.MeshBasicMaterial({ color: hdr(accent, 2.6) });
      for (const c of e.children.slice(1)) c.visible = false;
    }
    for (const b of brows) b.m.visible = false;
    mouth.material = new THREE.MeshBasicMaterial({ color: hdr(accent, 2.2) });
    mouth.position.z = 0.182;
  }
  // halo: little lights circling the head, a visible sign of thinking
  const halo = [];
  if (gear.has('halo')) {
    const ring = new THREE.Group();
    ring.position.set(0, 0.42, 0);
    ring.rotation.z = 0.35;
    head.add(ring);
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.02 + (i % 2) * 0.008, 10, 8), new THREE.MeshBasicMaterial({ color: hdr(accent, 2.8) }));
      ring.add(d);
      halo.push({ d, a: (i / 6) * Math.PI * 2 });
    }
  }

  // ---- dash effects (lightning trail + glow), only visible while dashing
  const fx = new THREE.Group();
  fx.visible = false;
  group.add(fx);
  const streakMat = new THREE.MeshBasicMaterial({ color: hdr(accent, 2.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const streaks = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035 + (i % 3) * 0.02), streakMat);
    s.position.set(0, 0.25 + i * 0.17, (i % 2 ? 1 : -1) * 0.12);
    fx.add(s);
    streaks.push(s);
  }
  const boltPos = new Float32Array(30 * 6);
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
  const bolts = new THREE.LineSegments(boltGeo, new THREE.LineBasicMaterial({ color: hdr('#ffffff', 3), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  bolts.frustumCulled = false;
  group.add(bolts);
  bolts.visible = false;
  const flash = new THREE.PointLight(accent, 0, 6);
  flash.position.set(0, 1.2, 0.6);
  group.add(flash);

  // ---- state
  const st = {
    from: 0, to: 0, t0: 0, dur: 1, moving: false, pose: '', yaw: 0, yawTarget: 0, fall: 0,
    mouth: 0, mouthSmooth: 0, time: 0, talk: 0, beat: 0, prevMouth: 0, lastBeat: -9,
    phase: Math.random() * 6, gait: 0, blinkAt: 2 + Math.random() * 2, blink: 0, dashFade: 0, dashFrom: 0,
  };

  const api = {
    id,
    group,
    height: 1.75 * (member.sc ?? 1),
    spec: { face: false, mouth: ['mouthOpen'], toon: true },
    get headY() { return 1.62 * k * 1.03; },
    place({ x, toX = null, z = 0, pose = '', dur = 4, now = 0 }) {
      st.from = x;
      st.to = toX ?? x;
      st.t0 = now;
      st.pose = pose;
      st.moving = toX !== null && Math.abs(toX - x) > 0.05;
      st.dur = pose === 'dash' ? 0.55 : Math.max(0.8, dur * 0.8);
      st.dashFrom = x;
      st.dashFade = pose === 'dash' && st.moving ? 1 : 0;
      group.position.set(x, 0, z);
      const dir = st.moving ? Math.sign(st.to - st.from) : 0;
      st.yawTarget = dir ? dir * (Math.PI / 2.4) : -Math.sign(x || 1) * Math.min(0.55, Math.abs(x) * 0.12 + 0.12);
      st.fall = pose === 'fall' ? 0.0001 : 0;
    },
    set mouth(v) { st.mouth = v; },
    get speaking() { return st.mouth > 0.02; },
    update(dt, now) {
      st.time += dt;
      const T = st.time;
      const pose = st.pose;
      const dashing = pose === 'dash' && st.dashFade > 0;

      // travel
      if (st.moving) {
        const kk = ease(clamp((now - st.t0) / st.dur, 0, 1));
        group.position.x = st.from + (st.to - st.from) * kk;
        if (kk >= 1) st.moving = false;
      }
      const moving = st.moving;
      st.gait += ((moving ? 1 : 0) - st.gait) * Math.min(1, dt * 9);
      const mode = pose === 'dash' ? 'dash' : pose === 'run' ? 'run' : pose === 'sneak' ? 'sneak' : 'walk';
      const amp = { walk: 0.55, run: 0.95, dash: 1.3, sneak: 0.42 }[mode];
      const rate = { walk: 6.2, run: 10.5, dash: 17, sneak: 4 }[mode];
      st.phase += dt * rate * st.gait;
      const g = st.gait;
      const sp = Math.sin(st.phase), cp = Math.cos(st.phase);

      // legs
      for (const L of legs) {
        const s = L.sx;
        L.hip.rotation.x = -sp * s * amp * g;
        L.knee.rotation.x = (s > 0 ? Math.max(0, -cp) : Math.max(0, cp)) * amp * 1.05 * g + (mode === 'sneak' ? 0.5 * g : 0);
        L.hip.rotation.z = s * 0.03;
      }
      body.position.y = Math.abs(sp) * 0.045 * amp * g - (mode === 'sneak' ? 0.1 * g : 0) + Math.sin(T * 1.7) * 0.004;
      const lean = { walk: 0.05, run: 0.25, dash: 0.62, sneak: 0.2 }[mode] * g;
      body.rotation.x = lean;
      torso.rotation.y = sp * 0.12 * amp * g;

      // arms: swing while moving, hang with a little sway when still
      for (const A of arms) {
        const s = A.sx;
        const swing = sp * s * amp * 0.9 * g;
        A.shoulder.rotation.x = swing + (mode === 'dash' ? 0.9 * g : 0);
        A.shoulder.rotation.z = s * (0.1 * (1 - g) + 0.05) + Math.sin(T * 1.4 + s) * 0.015 * (1 - g);
        A.elbow.rotation.x = -(0.2 + 0.5 * amp * g + Math.sin(T * 1.5 + s) * 0.02);
      }

      // voice: mouth, blink, stressed-word head dip
      st.mouthSmooth += (st.mouth - st.mouthSmooth) * Math.min(1, dt * 22);
      const m = st.mouthSmooth;
      mouth.scale.set(1 - m * 0.18, 0.2 + m * 1.5, 0.35 + m * 0.2);
      st.talk += ((m > 0.04 ? 1 : 0) - st.talk) * Math.min(1, dt * 6);
      if (m > 0.6 && st.prevMouth < 0.3 && now - st.lastBeat > 1.8) { st.lastBeat = now; st.beat = 1; }
      st.prevMouth = m;
      st.beat = Math.max(0, st.beat - dt * 2.2);
      st.blinkAt -= dt;
      if (st.blinkAt < 0) { st.blink = 0.14; st.blinkAt = 2.2 + Math.random() * 3; }
      st.blink = Math.max(0, st.blink - dt);
      for (const e of eyes) e.scale.y = st.blink > 0 ? 0.12 : 1;
      const sadAmt = pose === 'sad' ? 1 : 0;
      for (const b of brows) {
        b.m.position.y = b.y + st.beat * 0.012 + m * 0.006 - sadAmt * 0.004;
        b.m.rotation.z = b.sx * sadAmt * 0.38;
      }

      // head and gestures
      const fade = Math.max(0, 1 - (now - st.t0) / 3);
      const nod = pose === 'nod' ? Math.sin(T * 5) * 0.16 * fade : 0;
      const shake = pose === 'shake' ? Math.sin(T * 6) * 0.35 * fade : 0;
      head.rotation.x = nod - Math.sin(st.beat * Math.PI) * 0.07 + sadAmt * 0.4 + Math.sin(T * 3.1) * 0.008 * st.talk - lean * 0.6;
      head.rotation.y = shake + Math.sin(T * 2.1) * 0.012 * st.talk;
      torso.rotation.x = sadAmt * 0.16;
      if (sadAmt) for (const A of arms) A.shoulder.rotation.z = A.sx * 0.02;
      if (pose === 'point' || pose === 'wave') {
        const A = arms[0];
        const lift = ease(clamp((now - st.t0) / 0.6, 0, 1));
        if (pose === 'point') {
          A.shoulder.rotation.x = -1.45 * lift;
          A.shoulder.rotation.z = 0.15 * lift;
          A.elbow.rotation.x = -0.1;
        } else {
          A.shoulder.rotation.z = 2.7 * lift;
          A.shoulder.rotation.x = 0;
          A.elbow.rotation.z = Math.sin(T * 9) * 0.45 * lift;
          A.elbow.rotation.x = -0.25;
        }
      } else {
        arms[0].elbow.rotation.z = 0;
      }
      for (const h of halo) { const a = h.a + T * 1.4; h.d.position.set(Math.cos(a) * 0.24, Math.sin(a * 2) * 0.04, Math.sin(a) * 0.24); }
      if (cape) cape.rotation.x = 0.1 + g * (0.55 + (mode === 'dash' ? 0.5 : 0)) + Math.sin(T * 4 + st.phase) * 0.05 * (0.3 + g);

      // fall: topple backwards and stay down
      if (st.fall) {
        st.fall = Math.min(1, st.fall + dt / 0.9);
        holder.rotation.x = -ease(st.fall) * 1.45;
        holder.position.y = ease(st.fall) * 0.12;
      } else {
        holder.rotation.x = 0;
        holder.position.y = 0;
      }

      // turn toward where we are going / toward the middle
      st.yaw += (st.yawTarget - st.yaw) * Math.min(1, dt * (dashing ? 14 : 5));
      group.rotation.y = st.yaw;

      // dash trail
      if (st.dashFade > 0) {
        const done = !moving;
        if (done) st.dashFade = Math.max(0, st.dashFade - dt * 2.2);
        const x0 = st.dashFrom, x1 = group.position.x;
        const len = Math.max(0.05, Math.abs(x1 - x0));
        fx.visible = true;
        // The streaks must run along the world x axis whatever way the runner is turned.
        const yaw = group.rotation.y;
        const dxw = (x0 + x1) / 2 - group.position.x;
        fx.rotation.y = -yaw;
        fx.position.set(dxw * Math.cos(yaw), 0, dxw * Math.sin(yaw));
        const a = st.dashFade;
        streakMat.opacity = 0.75 * a;
        streaks.forEach((s, i) => {
          s.scale.x = len * (0.7 + (i % 3) * 0.15);
          s.position.x = (i % 2 ? 0.1 : -0.1) * len * 0.2;
        });
        // lightning arcs jitter around the body
        bolts.visible = true;
        bolts.position.set(0, 0, 0);
        for (let i = 0; i < 30; i++) {
          const ax = (Math.random() - 0.5) * 0.9, ay = 0.15 + Math.random() * 1.6, az = (Math.random() - 0.5) * 0.5;
          const o = i * 6;
          boltPos.set([ax, ay, az, ax + (Math.random() - 0.5) * 0.5, ay + (Math.random() - 0.5) * 0.4, az + (Math.random() - 0.5) * 0.3], o);
        }
        boltGeo.attributes.position.needsUpdate = true;
        bolts.material.opacity = a;
        flash.intensity = 9 * a * (0.6 + Math.random() * 0.4);
        if (!st.dashFade) {
          fx.visible = false;
          bolts.visible = false;
          flash.intensity = 0;
        }
      }
    },
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose();
        if (o.material && o.material !== OUTLINE) [].concat(o.material).forEach((mm) => mm.dispose());
      });
    },
  };
  return api;
}
