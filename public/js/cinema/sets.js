/*
 * The six places of the cinema engine, built from primitives. Characters stand on y = 0 around z = 0 and the
 * camera looks towards -z, so everything interesting goes behind them (negative z).
 *
 *   const set = buildSet('bridge', { time: 'night', props: ['hologram'], fx: ['dust'], quality: 'high' });
 *   scene.add(set.group);  // each frame: set.update(seconds, delta)  // when done: disposeTree(set.group)
 */
import * as THREE from 'three';
import { box, canvasTexture, disposeTree, glow, hdr, metal, particles, planetMesh, rng, shootingStars, starfield } from './gfx.js';

export { disposeTree };

/* ------------------------------------------------------------------ lighting moods */

const MOODS = {
  day: { sky: '#cfe3ff', ground: '#443c34', amb: 1.0, key: '#fff4e0', keyI: 3.0, fog: '#9fb4c8', bg: '#7aa6d8' },
  dusk: { sky: '#ffb27a', ground: '#3a2540', amb: 0.9, key: '#ff9a55', keyI: 3.4, fog: '#8c5a58', bg: '#4a2b52' },
  night: { sky: '#5a78c8', ground: '#10131d', amb: 0.55, key: '#8fb2ff', keyI: 1.5, fog: '#0a0f1c', bg: '#04060d' },
  alert: { sky: '#ff3b30', ground: '#220606', amb: 0.7, key: '#ff4a38', keyI: 1.6, fog: '#2a0707', bg: '#080203' },
  dim: { sky: '#5b6a86', ground: '#0c0e14', amb: 0.38, key: '#ffcf9a', keyI: 1.3, fog: '#0b0d13', bg: '#05060a' },
};

function lights(group, time, keyPos = [-4, 6, 5]) {
  const m = MOODS[time] ?? MOODS.night;
  const hemi = new THREE.HemisphereLight(m.sky, m.ground, m.amb);
  const key = new THREE.DirectionalLight(m.key, m.keyI);
  key.position.set(...keyPos);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -3, near: 0.5, far: 24 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  group.add(hemi, key);
  return { hemi, key, mood: m };
}

/* ------------------------------------------------------------------ shared pieces */

const gridFloorTexture = (line = '#2fd8ff', base = '#0d131b') =>
  canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.strokeRect(i * 64 + 3, j * 64 + 3, 58, 58);
    g.strokeStyle = line;
    g.globalAlpha = 0.55;
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
  }, { repeat: [10, 12] });

/** A screen with an animated-looking display. The canvas is redrawn a few times a second. */
function screen(w, h, color = '#38d9ff', seed = 1) {
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round(256 * (h / w));
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const bars = Array.from({ length: 9 }, () => r());
  const draw = (t) => {
    g.fillStyle = '#031018';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = color;
    g.globalAlpha = 0.9;
    g.lineWidth = 2;
    g.strokeRect(6, 6, c.width - 12, c.height - 12);
    g.globalAlpha = 0.75;
    g.fillStyle = color;
    bars.forEach((b, i) => {
      const v = 0.25 + 0.7 * Math.abs(Math.sin(t * (0.6 + b) + i));
      g.fillRect(16 + i * 24, c.height - 18 - v * (c.height - 52), 16, v * (c.height - 52));
    });
    g.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) g.fillRect(16, 16 + i * 6, 40 + ((i * 53 + Math.floor(t * 2)) % 80), 2);
    g.globalAlpha = 1;
    tex.needsUpdate = true;
  };
  draw(0);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: hdr('#ffffff', 1.6), toneMapped: true }));
  mesh.userData.draw = draw;
  return mesh;
}

function console_(x, z, rotY, seed) {
  const g = new THREE.Group();
  g.add(box(2.2, 1.0, 0.9, metal('#1b232e', 0.5, 0.6), 0, 0.5, 0));
  const top = box(2.2, 0.12, 0.9, metal('#2c3a4a', 0.4, 0.7), 0, 1.05, 0);
  top.rotation.x = -0.35;
  g.add(top);
  const s = screen(1.9, 0.75, seed % 2 ? '#38d9ff' : '#ffb347', seed);
  s.position.set(0, 1.28, -0.12);
  s.rotation.x = -0.35 - 0.7;
  g.add(s);
  const strip = box(2.2, 0.05, 0.05, glow('#38d9ff', 2.4), 0, 0.12, 0.46);
  g.add(strip);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.userData.screen = s;
  return g;
}

function ring(r, tube, color, k = 2.6) {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 64), glow(color, k));
}

/** Holographic globe on a table. */
function hologramProp() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.12, 1.3, metal('#202a36'), 0, 0.06, 0));
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.45, 40), metal('#17202a', 0.35, 0.8));
  disc.position.y = 0.34;
  g.add(disc);
  const em = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 40), glow('#38d9ff', 3));
  em.position.y = 0.58;
  g.add(em);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16), new THREE.MeshBasicMaterial({ color: hdr('#58e0ff', 1.8), wireframe: true, transparent: true, opacity: 0.55, depthWrite: false }));
  globe.position.y = 1.2;
  g.add(globe);
  const r1 = ring(0.62, 0.01, '#58e0ff', 3);
  r1.position.y = 1.2;
  r1.rotation.x = Math.PI / 2.4;
  g.add(r1);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.62, 32, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#58e0ff', 0.8), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.position.y = 0.88;
  cone.rotation.x = Math.PI;
  g.add(cone);
  g.userData.anim = (t) => {
    globe.rotation.y = t * 0.5;
    r1.rotation.z = t * 0.8;
  };
  return g;
}

function monolithProp(color = '#42f0d0') {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.2, 0.55), new THREE.MeshStandardMaterial({ color: '#07090d', roughness: 0.18, metalness: 0.9 }));
  slab.position.y = 2.6;
  g.add(slab);
  const lines = canvasTexture(128, 512, (c, w, h) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = color;
    c.lineWidth = 3;
    const r = rng(9);
    for (let i = 0; i < 16; i++) {
      const y = 20 + i * 30;
      c.beginPath();
      c.moveTo(24, y);
      c.lineTo(24 + r() * 80, y);
      c.lineTo(24 + r() * 80, y + 14 + r() * 10);
      c.stroke();
    }
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.9), new THREE.MeshBasicMaterial({ map: lines, color: hdr('#ffffff', 2.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  face.position.set(0, 2.6, 0.29);
  g.add(face);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: hdr(color, 2.2) }));
  edges.position.copy(slab.position);
  g.add(edges);
  const base = box(2.3, 0.18, 1.3, metal('#10141b', 0.4, 0.7), 0, 0.09, 0);
  g.add(base);
  const pl = new THREE.PointLight(color, 3.2, 9);
  pl.position.set(0, 2.6, 1.2);
  g.add(pl);
  g.userData.anim = (t) => (pl.intensity = 2.6 + Math.sin(t * 1.7) * 0.8);
  return g;
}

function beaconProp() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 3.4, 8), metal('#2a2f38', 0.5, 0.8)));
  g.children[0].position.y = 1.7;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), glow('#ff3a30', 3));
  lamp.position.y = 3.55;
  g.add(lamp);
  const pl = new THREE.PointLight('#ff3a30', 4, 11);
  pl.position.y = 3.55;
  g.add(pl);
  g.userData.anim = (t) => {
    const on = 0.5 + 0.5 * Math.sin(t * 5);
    pl.intensity = 1 + on * 5;
    lamp.material.color.copy(hdr('#ff3a30', 0.4 + on * 3.4));
  };
  return g;
}

function podProp() {
  const g = new THREE.Group();
  g.add(box(1.1, 0.25, 1.1, metal('#202935', 0.4, 0.8), 0, 0.12, 0));
  const glass = new THREE.Mesh(new THREE.CapsuleGeometry(0.44, 1.35, 8, 24), new THREE.MeshPhysicalMaterial({ color: '#9fe8ff', roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.22 }));
  glass.position.y = 1.15;
  g.add(glass);
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 6, 12), glow('#7be7ff', 1.3, 0.55));
  core.position.y = 1.15;
  g.add(core);
  g.add(box(1.0, 0.1, 1.0, glow('#38d9ff', 2.2), 0, 2.4, 0));
  return g;
}

function cratesProp() {
  const g = new THREE.Group();
  const mat = metal('#3a4350', 0.6, 0.5);
  const trim = glow('#ffb347', 1.8);
  [[0, 0.4, 0, 1, 0.8, 1], [1.05, 0.3, 0.2, 0.9, 0.6, 0.9], [0.1, 1.15, 0, 0.8, 0.7, 0.8]].forEach(([x, y, z, w, h, d]) => {
    g.add(box(w, h, d, mat, x, y, z));
    g.add(box(w + 0.02, 0.05, d + 0.02, trim, x, y + h / 2 - 0.1, z));
  });
  return g;
}

function gateProp() {
  const g = new THREE.Group();
  const outer = ring(2.6, 0.1, '#42f0d0', 1.3);
  outer.position.y = 3;
  const inner = ring(2.1, 0.04, '#42f0d0', 1.1);
  inner.position.y = 3;
  const veil = new THREE.Mesh(new THREE.CircleGeometry(2.45, 48), new THREE.MeshBasicMaterial({ color: hdr('#42f0d0', 0.25), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  veil.position.y = 3;
  g.add(outer, inner, veil);
  g.add(box(0.5, 0.4, 0.7, metal('#10141b', 0.4, 0.7), -2.6, 0.2, 0), box(0.5, 0.4, 0.7, metal('#10141b', 0.4, 0.7), 2.6, 0.2, 0));
  g.userData.anim = (t) => {
    inner.rotation.z = t * 0.4;
    veil.material.opacity = 0.09 + Math.sin(t * 2) * 0.03;
  };
  return g;
}

const PROP_BUILDERS = {
  hologram: () => [hologramProp(), [0, 0, -2.4]],
  monolith: () => [monolithProp(), [0, 0, -5]],
  beacon: () => [beaconProp(), [-4.8, 0, -4]],
  pod: () => [podProp(), [4.6, 0, -3.4]],
  crates: () => [cratesProp(), [-5, 0, -3.2]],
  gate: () => [gateProp(), [0, 0, -7]],
};

/* ------------------------------------------------------------------ places */

function bridge(S, quality) {
  const { group } = S;
  const floorTex = gridFloorTexture();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 24), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.28, metalness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 1;
  floor.receiveShadow = true;
  group.add(floor);

  const hull = metal('#1a212b', 0.55, 0.6);
  const trim = glow('#38d9ff', 2.2);
  // Back wall with a wide window onto space.
  group.add(box(20, 1.3, 0.8, hull, 0, 0.65, -7));
  group.add(box(20, 2, 0.8, hull, 0, 6.2, -7));
  group.add(box(5.5, 5, 0.8, hull, -7.25, 3.5, -7), box(5.5, 5, 0.8, hull, 7.25, 3.5, -7));
  for (let i = -2; i <= 2; i++) {
    const strut = box(0.22, 5, 0.3, hull, i * 2.3, 3.5, -6.7);
    strut.rotation.z = i * 0.04;
    group.add(strut);
  }
  group.add(box(9.6, 0.06, 0.1, trim, 0, 1.32, -6.6), box(9.6, 0.06, 0.1, trim, 0, 5.18, -6.6));
  // Side walls and ceiling.
  for (const sx of [-1, 1]) {
    group.add(box(0.6, 7, 16, hull, sx * 9.8, 3.5, -3));
    for (let i = 0; i < 6; i++) group.add(box(0.2, 5.6, 0.2, metal('#2a3544'), sx * 9.4, 3.3, 1 - i * 2.4));
    group.add(box(0.06, 0.1, 15, trim, sx * 9.45, 2.2, -3));
  }
  const ceil = box(20, 0.5, 16, metal('#10161e', 0.6, 0.5), 0, 7.2, -3);
  group.add(ceil);
  for (let i = 0; i < 5; i++) {
    group.add(box(20, 0.25, 0.35, metal('#222c39'), 0, 6.88, 1 - i * 3));
    group.add(box(6, 0.05, 0.3, glow('#e9f6ff', 2.6), 0, 6.72, 1 - i * 3));
  }
  // Consoles, a captain's chair, and a few practical lights.
  const c1 = console_(-5.3, -4.2, 0.55, 1);
  const c2 = console_(5.3, -4.2, -0.55, 2);
  const c3 = console_(-2.9, -5.6, 0.2, 3);
  const c4 = console_(2.9, -5.6, -0.2, 4);
  group.add(c1, c2, c3, c4);
  S.screens.push(c1.userData.screen, c2.userData.screen, c3.userData.screen, c4.userData.screen);
  const chair = new THREE.Group();
  chair.add(box(0.9, 0.35, 0.9, metal('#2b3340', 0.6, 0.4), 0, 0.5, 0), box(0.9, 1.3, 0.2, metal('#2b3340', 0.6, 0.4), 0, 1.15, -0.42), box(0.16, 0.5, 0.16, metal('#555f6c'), 0, 0.25, 0));
  chair.position.set(0, 0, -4.4);
  group.add(chair);
  const p1 = new THREE.PointLight('#38d9ff', 4, 9);
  p1.position.set(-5, 2.4, -3);
  const p2 = new THREE.PointLight('#ffb347', 3, 9);
  p2.position.set(5, 2.4, -3);
  group.add(p1, p2);

  // Space outside the window.
  S.backdrop.add(starfield(1600));
  const planet = planetMesh(17, { seed: 5, detail: quality === 'low' ? 1 : 2 });
  planet.position.set(14, 3, -90);
  S.backdrop.add(planet);
  const sun = new THREE.DirectionalLight('#fff1d6', 0.6);
  sun.position.set(30, 10, -20);
  group.add(sun);
  S.camHint = { y: 1.6, back: 0 };
}

function corridor(S) {
  const { group } = S;
  const hull = metal('#3a4756', 0.5, 0.5);
  for (const [x, y, z, c, k] of [[-3.6, 3.2, -3, '#38d9ff', 9], [3.6, 3.2, -3, '#38d9ff', 9], [-3.6, 3.2, -10, '#ffb347', 9], [3.6, 3.2, -10, '#ffb347', 9]]) {
    const l = new THREE.PointLight(c, k, 14);
    l.position.set(x, y, z);
    group.add(l);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 52), new THREE.MeshStandardMaterial({ map: gridFloorTexture('#ffb347', '#0f1218'), roughness: 0.3, metalness: 0.7 }));
  floor.material.map.repeat.set(5, 26);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -10;
  floor.receiveShadow = true;
  group.add(floor);
  for (const sx of [-1, 1]) {
    group.add(box(0.5, 6, 52, hull, sx * 5.2, 3, -10));
    group.add(box(0.05, 0.12, 52, glow('#ffb347', 2.4), sx * 4.92, 1.2, -10));
    for (let i = 0; i < 16; i++) {
      group.add(box(0.5, 6, 0.28, metal('#2e3947', 0.45, 0.7), sx * 4.95, 3, 13 - i * 2.6));
      if (i % 3 === 1) group.add(box(0.06, 2.4, 1.3, glow('#38d9ff', 2.4), sx * 4.7, 2, 13 - i * 2.6 - 1.3));
    }
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 52, 10), metal('#38424f', 0.4, 0.8));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx * 4.4, 5.2, -10);
    group.add(pipe);
  }
  group.add(box(10.4, 0.5, 52, metal('#11151c'), 0, 6.1, -10));
  for (let i = 0; i < 14; i++) {
    group.add(box(10, 0.2, 0.3, hull, 0, 5.8, 13 - i * 3));
    group.add(box(3.2, 0.06, 0.4, glow('#e9f6ff', 3.2), 0, 5.66, 11.5 - i * 3));
  }
  const door = new THREE.Group();
  door.add(box(4.4, 4.6, 0.4, metal('#141a22', 0.4, 0.8), 0, 2.3, 0));
  door.add(box(0.14, 4.6, 0.12, glow('#ffb347', 2.6), 0, 2.3, 0.26));
  door.add(box(4.6, 0.12, 0.12, glow('#ffb347', 2.6), 0, 4.65, 0.26));
  door.position.z = -22;
  group.add(door);
  const pl = new THREE.PointLight('#ffb347', 14, 22);
  pl.position.set(0, 3, -16);
  const pl2 = new THREE.PointLight('#cfe9ff', 8, 16);
  pl2.position.set(0, 4.8, 1);
  group.add(pl2);
  group.add(pl);
  S.backdrop.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ visible: false })));
  S.camHint = { y: 1.55 };
  S.fogFar = 38;
}

function engine(S) {
  const { group } = S;
  const grate = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#0c0f14';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff8a3c';
    g.globalAlpha = 0.5;
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke();
    }
  }, { repeat: [10, 14] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 30), new THREE.MeshStandardMaterial({ map: grate, roughness: 0.5, metalness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 1;
  floor.receiveShadow = true;
  group.add(floor);
  // Reactor core: a glowing column with turning rings inside a glass cylinder.
  const core = new THREE.Group();
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 9, 24), glow('#5fd0ff', 1.5));
  col.position.y = 4.5;
  core.add(col);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#5fd0ff', 0.6), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 4.5;
  core.add(glass);
  const rings = [1.2, 3.2, 5.2, 7.2].map((y, i) => {
    const r = ring(1.9, 0.09, i % 2 ? '#ffb347' : '#5fd0ff', 1.6);
    r.rotation.x = Math.PI / 2;
    r.position.y = y;
    core.add(r);
    return r;
  });
  core.add(box(4.4, 0.5, 4.4, metal('#171d26', 0.4, 0.8), 0, 0.25, 0), box(3.4, 0.4, 3.4, metal('#202935', 0.4, 0.8), 0, 9.2, 0));
  core.position.set(0, 0, -6.6);
  group.add(core);
  const reactorLight = new THREE.PointLight('#5fd0ff', 5, 22);
  reactorLight.position.set(0, 3.2, -4.4);
  group.add(reactorLight);
  const warm = new THREE.PointLight('#ff8a3c', 5, 14);
  warm.position.set(0, 1, 1.6);
  group.add(warm);
  // Walls, pipes and catwalk rails.
  const hull = metal('#1d242d', 0.55, 0.6);
  group.add(box(24, 11, 0.8, hull, 0, 5.5, -13));
  for (const sx of [-1, 1]) {
    group.add(box(0.6, 11, 30, hull, sx * 10, 5.5, 1));
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 11, 12), metal('#46515f', 0.35, 0.85));
      p.position.set(sx * (8.8 - i * 0.2), 5.5, -9 + i * 2.6);
      group.add(p);
      group.add(box(0.5, 0.12, 0.5, glow('#ff8a3c', 2), sx * (8.8 - i * 0.2), 3.6 + i * 0.6, -9 + i * 2.6));
    }
  }
  group.add(box(24, 0.6, 30, metal('#10141a'), 0, 11.2, 1));
  group.add(box(10, 0.07, 0.07, glow('#ffb347', 2.4), 0, 1.0, -2.2), box(0.07, 1.0, 0.07, glow('#ffb347', 2.4), -5, 0.5, -2.2), box(0.07, 1.0, 0.07, glow('#ffb347', 2.4), 5, 0.5, -2.2));
  S.anims.push((t) => {
    rings.forEach((r, i) => (r.rotation.z = t * (0.4 + i * 0.15) * (i % 2 ? -1 : 1)));
    reactorLight.intensity = 4.5 + Math.sin(t * 3) * 1.2;
    col.scale.set(1 + Math.sin(t * 5) * 0.03, 1, 1 + Math.sin(t * 5) * 0.03);
  });
  S.camHint = { y: 1.6 };
  S.fogFar = 40;
}

function planetSurface(S) {
  const { group } = S;
  const r = rng(21);
  // Dunes: a displaced plane with the colour following the height.
  const geo = new THREE.PlaneGeometry(120, 90, 120, 90);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color('#a8512f');
  const high = new THREE.Color('#e08b52');
  // Height in world coordinates. Flat where the characters and the camera are, dunes further away.
  const h = (x, wz) => {
    const far = THREE.MathUtils.smoothstep(Math.hypot(x * 0.7, wz + 3), 7, 34) * (1 - THREE.MathUtils.smoothstep(wz, 2, 8));
    return far * (Math.sin(x * 0.18 + wz * 0.07) * 2.6 + Math.sin(x * 0.07 - wz * 0.21) * 3.1 + Math.sin(wz * 0.04) * 2 + 4);
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = h(x, p.getZ(i) - 25);
    p.setY(i, Math.max(-0.05, y));
    const c = base.clone().lerp(high, THREE.MathUtils.clamp(y / 5, 0, 1));
    c.offsetHSL(0, 0, (r() - 0.5) * 0.04);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  ground.position.z = -25;
  ground.receiveShadow = true;
  group.add(ground);
  // Rocks and mesas.
  const rock = new THREE.MeshStandardMaterial({ color: '#7a3d26', roughness: 1, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const s = 0.3 + r() * 1.6;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rock);
    const x = (r() - 0.5) * 70;
    const z = -4 - r() * 52;
    if (Math.abs(x) < 4.5 && z > -9) continue;
    m.position.set(x, s * 0.35 + Math.max(0, h(x, z)) * 0.95, z);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.scale.y = 0.7 + r() * 0.6;
    m.castShadow = true;
    group.add(m);
  }
  for (const [x, z, w, hh] of [[-30, -48, 14, 9], [24, -52, 18, 12], [-8, -60, 22, 7], [46, -44, 10, 8]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.7, w, hh, 7), new THREE.MeshStandardMaterial({ color: '#6a3322', roughness: 1, flatShading: true }));
    m.position.set(x, hh / 2 - 0.5, z);
    group.add(m);
  }
  // Sky: ringed gas giant and two moons.
  S.backdrop.add(starfield(900, 95, 4));
  const giant = planetMesh(16, { colors: ['#c98a5a', '#e9c79a', '#a65f3c', '#f2dfbf'], bands: true, seed: 8, atmosphere: '#ffb98a', clouds: false });
  giant.position.set(-10, 20, -85);
  giant.rotation.z = 0.35;
  const ringGeo = new THREE.RingGeometry(21, 33, 96, 1);
  const rp = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  for (let i = 0; i < rp.count; i++) uv.setXY(i, (Math.hypot(rp.getX(i), rp.getY(i)) - 21) / 12, 0.5);
  const ringTex = canvasTexture(256, 4, (g, w) => {
    for (let x = 0; x < w; x++) {
      const a = 0.25 + 0.6 * Math.abs(Math.sin(x * 0.19) * Math.sin(x * 0.047));
      g.fillStyle = `rgba(240,214,176,${a})`;
      g.fillRect(x, 0, 1, 4);
    }
  });
  const rm = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, color: hdr('#ffffff', 1.1) }));
  rm.rotation.x = Math.PI / 2 - 0.2;
  giant.add(rm);
  S.backdrop.add(giant);
  const moon = planetMesh(3.4, { colors: ['#59656e', '#7d8a93', '#9aa7b0', '#aab6bd'], seed: 2, atmosphere: '#9ab', clouds: false });
  moon.position.set(32, 28, -80);
  S.backdrop.add(moon);
  const moon2 = planetMesh(1.8, { colors: ['#6e554d', '#8a6f66', '#b99a8c', '#c9ada0'], seed: 6, atmosphere: '#c98', clouds: false });
  moon2.position.set(8, 38, -78);
  S.backdrop.add(moon2);
  S.skyTint = true;
  S.camHint = { y: 1.45 };
  S.fogFar = 85;
  S.keyPos = [-14, 5, -10];
}

function moonSurface(S, quality) {
  const { group } = S;
  const r = rng(77);
  // Grey regolith with craters. Flat where the characters stand, rougher further out.
  const craters = Array.from({ length: 16 }, () => ({ x: (r() - 0.5) * 90, z: -8 - r() * 52, rad: 3 + r() * 8 }));
  const h = (x, wz) => {
    let y = THREE.MathUtils.smoothstep(Math.hypot(x * 0.6, wz + 4), 8, 40) * (Math.sin(x * 0.11 + wz * 0.05) * 1.4 + Math.sin(wz * 0.09) * 1.2);
    for (const c of craters) {
      const d = Math.hypot(x - c.x, wz - c.z) / c.rad;
      if (d < 1.35) y += d < 1 ? -(1 - d * d) * c.rad * 0.18 : Math.exp(-(((d - 1) * 6) ** 2)) * c.rad * 0.07;
    }
    return y;
  };
  const geo = new THREE.PlaneGeometry(120, 90, 130, 100);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const dark = new THREE.Color('#44464c');
  const light = new THREE.Color('#85878d');
  for (let i = 0; i < p.count; i++) {
    const y = h(p.getX(i), p.getZ(i) - 25);
    p.setY(i, y);
    const c = dark.clone().lerp(light, THREE.MathUtils.clamp(0.5 + y * 0.25 + (r() - 0.5) * 0.25, 0, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  ground.position.z = -25;
  ground.receiveShadow = true;
  group.add(ground);
  const rock = new THREE.MeshStandardMaterial({ color: '#6d6f75', roughness: 1, flatShading: true });
  for (let i = 0; i < 40; i++) {
    const sz = 0.2 + r() * 1.2;
    const x = (r() - 0.5) * 60;
    const z = -4 - r() * 46;
    if (Math.abs(x) < 4 && z > -8) continue;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(sz, 0), rock);
    m.position.set(x, sz * 0.3 + h(x, z), z);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.castShadow = true;
    group.add(m);
  }
  // Black sky, many hard stars, and our own Earth, turning slowly.
  S.backdrop.add(starfield(2600, 90, 31));
  const earth = planetMesh(11, { seed: 14, detail: quality === 'low' ? 1 : 2, spin: 0.09 });
  earth.position.set(-16, 22, -78);
  S.backdrop.add(earth);
  const sun = new THREE.DirectionalLight('#ffffff', 1.5);
  sun.position.set(14, 9, 6);
  group.add(sun);
  S.camHint = { y: 1.5 };
  S.fogFar = 70;
  S.keyPos = [8, 7, 6];
}

function space(S, quality) {
  const { group } = S;
  S.backdrop.add(starfield(2200, 90, 12));
  const world = planetMesh(30, { seed: 14, detail: quality === 'low' ? 1 : 2 });
  world.position.set(10, -26, -48);
  S.backdrop.add(world);
  const sun = new THREE.DirectionalLight('#fff4de', 3.4);
  sun.position.set(-30, 18, 14);
  group.add(sun);
  // The ship, built from a few pieces.
  const ship = new THREE.Group();
  const hull = metal('#c9d2dc', 0.35, 0.7);
  const dark = metal('#2a3340', 0.4, 0.8);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 6.4, 10, 24), hull);
  body.rotation.z = Math.PI / 2;
  ship.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 24), dark);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 4.8;
  ship.add(nose);
  for (const s of [-1, 1]) {
    const wing = box(2.8, 0.14, 2.7, hull, -0.8, 0, s * 1.9);
    wing.rotation.y = s * 0.28;
    ship.add(wing);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 3.2, 16), dark);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(-1.9, -0.1, s * 3);
    ship.add(pod);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#58b8ff', 2.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.rotation.z = Math.PI / 2;
    flame.position.set(-4.1, -0.1, s * 3);
    ship.add(flame);
    S.anims.push((t) => flame.scale.set(1 + Math.sin(t * 22 + s) * 0.12, 1, 1));
  }
  const bridgeBlock = box(1.6, 0.6, 1.2, dark, 1.6, 0.95, 0);
  ship.add(bridgeBlock);
  for (let i = 0; i < 12; i++) ship.add(box(0.14, 0.12, 0.05, glow('#ffe9b0', 2.6), -2.4 + i * 0.62, 0.15, 0.92));
  ship.position.set(1.5, 0.4, -9);
  ship.rotation.set(0.1, -0.7, 0.05);
  ship.scale.setScalar(0.9);
  group.add(ship);
  const glowLight = new THREE.PointLight('#58b8ff', 6, 16);
  glowLight.position.set(-2, 0.2, -7);
  group.add(glowLight);
  S.anims.push((t) => {
    ship.position.y = 0.4 + Math.sin(t * 0.5) * 0.12;
    ship.rotation.z = 0.05 + Math.sin(t * 0.37) * 0.02;
  });
  S.noFloor = true;
  S.camHint = { y: 1.2 };
  S.fogFar = 400;
}

function ruins(S) {
  const { group } = S;
  const stone = new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: 0.75, metalness: 0.2 });
  const floorTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#15181c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#42f0d0';
    g.globalAlpha = 0.28;
    g.lineWidth = 2;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.beginPath(); g.moveTo(8, h / 2); g.lineTo(w - 8, h / 2); g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 8); g.stroke();
  }, { repeat: [8, 12] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 30), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 1;
  floor.receiveShadow = true;
  group.add(floor);
  const glowRune = glow('#42f0d0', 2.4);
  for (let i = 0; i < 7; i++) {
    for (const sx of [-1, 1]) {
      const z = 1 - i * 2.6;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 9, 8), stone);
      col.position.set(sx * 6.2, 4.5, z);
      col.castShadow = true;
      group.add(col);
      group.add(box(0.07, 6.5, 0.07, glowRune, sx * 5.62, 4.2, z), box(0.07, 6.5, 0.07, glowRune, sx * 6.2, 4.2, z + 0.62));
      group.add(box(1.4, 0.4, 1.4, stone, sx * 6.2, 9.1, z));
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.35, 8, 32, Math.PI), stone);
    arch.position.set(0, 9.0, 1 - i * 2.6);
    group.add(arch);
  }
  group.add(box(14, 0.6, 20, new THREE.MeshStandardMaterial({ color: '#12151a', roughness: 0.9 }), 0, 10.4, -6));
  // Central pedestal with a floating light.
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 0.9, 24), metal('#1b2127', 0.35, 0.8));
  ped.position.set(0, 0.45, -5.2);
  group.add(ped);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), glow('#42f0d0', 3));
  orb.position.set(0, 2.1, -5.2);
  group.add(orb);
  const light = new THREE.PointLight('#42f0d0', 14, 22);
  light.position.set(0, 2.2, -3.4);
  group.add(light);
  S.anims.push((t) => {
    orb.position.y = 2.1 + Math.sin(t * 1.1) * 0.18;
    orb.rotation.y = t * 0.6;
    light.intensity = 12 + Math.sin(t * 2.3) * 3;
  });
  S.backdrop.add(new THREE.Object3D());
  S.camHint = { y: 1.55 };
  S.fogFar = 30;
}

const PLACES = { bridge, corridor, engine, planet: planetSurface, space, ruins, moon: moonSurface };

/* ------------------------------------------------------------------ public */

/**
 * Build one place with lighting for `time`, its props and its effects.
 * Returns { group, backdrop, update(t, dt), fog, background, flags, camHint }. `backdrop` is added to the scene
 * separately and follows the camera, so stars and planets stay at infinity.
 */
export function buildSet(name, { time = 'night', props = [], fx = [], quality = 'high' } = {}) {
  const S = { group: new THREE.Group(), backdrop: new THREE.Group(), screens: [], anims: [], camHint: { y: 1.55 }, fogFar: 60, keyPos: [-4, 6, 5] };
  (PLACES[name] ?? bridge)(S, quality);
  const L = lights(S.group, time, S.keyPos);
  if (quality === 'low') L.key.castShadow = false;
  const mood = L.mood;

  for (const p of props) {
    const make = PROP_BUILDERS[p];
    if (!make) continue;
    const [obj, pos] = make();
    obj.position.set(...pos);
    S.group.add(obj);
    if (obj.userData.anim) S.anims.push(obj.userData.anim);
  }

  const extras = [];
  if (fx.includes('dust') || name === 'planet') extras.push(particles({ count: 220, size: 0.05, color: name === 'planet' ? '#ffcf9a' : '#ffffff', area: [16, 5, 14], center: [0, 2, -3], drift: [0.35, 0.02, 0.05], opacity: name === 'planet' ? 0.65 : 0.4 }));
  if (fx.includes('sparks')) extras.push(particles({ count: 70, size: 0.07, color: '#ffb347', area: [6, 4, 4], center: [0, 2.2, -2], drift: [0.1, 1.2, 0.2], opacity: 0.95, seed: 4 }));
  if (fx.includes('streaks')) {
    const r = rng(33);
    const pos = [];
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * 60, y = (r() - 0.5) * 30, z = -r() * 120;
      pos.push(x, y, z, x, y, z - 6 - r() * 18);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: hdr('#9fdcff', 2), transparent: true, opacity: 0.8 }));
    lines.frustumCulled = false;
    S.backdrop.add(lines);
    S.anims.push((t) => (lines.position.z = (t * 40) % 24));
  }
  for (const e of extras) S.group.add(e.points);
  if (fx.includes('alarm')) {
    const spin = new THREE.SpotLight('#ff2a20', 40, 30, 0.5, 0.6);
    spin.position.set(0, 5.5, -1);
    const target = new THREE.Object3D();
    S.group.add(spin, target);
    spin.target = target;
    S.anims.push((t) => {
      target.position.set(Math.sin(t * 4) * 7, 1, -2 + Math.cos(t * 4) * 4);
      L.hemi.intensity = mood.amb * (0.65 + 0.35 * Math.abs(Math.sin(t * 4)));
    });
  }
  if (time === 'alert') S.anims.push((t) => (L.key.intensity = mood.keyI * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.2)))));

  // A living sky: every world turns, the stars drift, and falling stars cross now and then.
  const sky = [];
  S.backdrop.traverse((o) => { if (o.userData.spin) sky.push(o); });
  const starLayers = S.backdrop.children.filter((c) => c.isPoints);
  if (starLayers.length) {
    const falling = shootingStars({ count: quality === 'low' ? 3 : 7, seed: name.length * 7 });
    S.backdrop.add(falling.object);
    S.anims.push((t) => falling.update(t));
    S.anims.push((t, dt) => { for (const l of starLayers) l.rotation.y += (dt || 0.016) * 0.012; });
  }
  S.anims.push((t, dt) => { for (const w of sky) w.userData.body.rotation.y += (dt || 0.016) * w.userData.spin; });

  const open = name === 'bridge' || name === 'space' || name === 'moon';
  const background = new THREE.Color(open ? '#02030a' : S.skyTint ? (time === 'night' ? '#05070f' : time === 'day' ? '#e8a77a' : '#6a3a3a') : mood.bg);
  return {
    group: S.group,
    backdrop: S.backdrop,
    background,
    fog: new THREE.Fog(new THREE.Color(open ? '#04060d' : S.skyTint && time !== 'night' ? (time === 'day' ? '#e4a77c' : '#7a4a48') : mood.fog), 13, S.fogFar + 13),
    camHint: S.camHint,
    flags: { glitch: fx.includes('glitch'), haze: fx.includes('haze') },
    update(t, dt) {
      for (const a of S.anims) a(t, dt);
      for (const e of extras) e.update(t);
      if (Math.floor(t * 4) !== S._tick) {
        S._tick = Math.floor(t * 4);
        for (const s of S.screens) s.userData.draw(t);
      }
    },
  };
}
