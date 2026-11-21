/* Small drawing helpers shared by the sets and the actors. No scene state lives here. */
import * as THREE from 'three';

export const hdr = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

/** Colour above 1.0 so the bloom pass makes it glow. Unlit, so it ignores the lights. */
export const glow = (hex, k = 2.2, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color: hdr(hex, k), transparent: opacity < 1, opacity, toneMapped: true });

export const metal = (hex, rough = 0.45, met = 0.7) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: met });

export function canvasTexture(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Deterministic random numbers, so a set looks the same every time it is built. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** A field of stars on a big sphere. Points are cheap and never need lights. */
export function starfield(count = 1400, radius = 90, seed = 7) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * radius, u * radius, Math.sin(a) * s * radius], i * 3);
    const warm = r();
    const k = 0.5 + r() * 1.6;
    col.set([k * (0.8 + warm * 0.3), k * 0.9, k * (1.15 - warm * 0.3)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false }));
  p.frustumCulled = false;
  return p;
}

/** Smooth value noise, summed over a few octaves. Wraps horizontally so a planet texture has no seam. */
function fbm(w, h, { seed = 1, octaves = 5, scale = 4, stretch = 1 } = {}) {
  const r = rng(seed);
  const cells = 256; // must be at least scale * 2^(octaves-1)
  const grid = Array.from({ length: cells * cells }, () => r());
  const at = (x, y, period) => grid[((y % cells + cells) % cells) * cells + (((x % period) + period) % period)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const out = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let v = 0, amp = 0.5, total = 0;
      for (let o = 0; o < octaves; o++) {
        const f = scale * 2 ** o;
        const x = (px / w) * f;
        const y = (py / h) * f * stretch;
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const tx = smooth(x - x0), ty = smooth(y - y0);
        const period = Math.floor(f);
        const a = at(x0, y0, period), b = at(x0 + 1, y0, period), c = at(x0, y0 + 1, period), d = at(x0 + 1, y0 + 1, period);
        v += amp * (a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty - (a + (b - a) * tx) * 0 + 0);
        total += amp;
        amp /= 2;
      }
      out[py * w + px] = v / total;
    }
  }
  return out;
}

const mix = (a, b, t) => a + (b - a) * t;
const rgbOf = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** A planet: continents and clouds (or gas bands), a lit side, and a soft atmosphere shell. */
const planetTextures = new Map();

export function planetMesh(radius, { colors = ['#1d4f86', '#2f7d4f', '#8a7a52', '#f4f7fb'], seed = 3, atmosphere = '#7fc8ff', bands = false, clouds = true, detail = 1, spin = 0.07 } = {}) {
  const W = 512 * detail, H = 256 * detail;
  const cacheKey = [seed, bands, clouds, detail, ...colors].join('|');
  const land = planetTextures.has(cacheKey) ? null : fbm(W, H, { seed, octaves: 6, scale: 3 });
  const cloud = planetTextures.has(cacheKey) ? null : fbm(W, H, { seed: seed + 50, octaves: 6, scale: 5, stretch: 1.4 });
  const tex = planetTextures.get(cacheKey) ?? canvasTexture(W, H, (g) => {
    const img = g.createImageData(W, H);
    const [ocean, green, sand, white] = colors.map(rgbOf);
    for (let y = 0; y < H; y++) {
      const lat = Math.abs(y / H - 0.5) * 2;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let c;
        if (bands) {
          const b = 0.5 + 0.5 * Math.sin(y * 0.22 + land[i] * 6);
          c = [0, 1, 2].map((k) => mix(colors.map(rgbOf)[Math.floor(land[i] * 3.99)][k], colors.map(rgbOf)[Math.floor(b * 3.99)][k], 0.6));
        } else {
          const l = land[i];
          if (l < 0.5) c = ocean.map((v, k) => mix(v * 0.7, v, l / 0.5));
          else if (l < 0.62) c = green.map((v, k) => mix(sand[k], v, (l - 0.5) / 0.12));
          else c = sand.map((v, k) => mix(green[k], v, Math.min(1, (l - 0.62) / 0.2)));
          if (clouds) {
            const cv = Math.max(0, cloud[i] - 0.52) * 3.4;
            c = c.map((v, k) => mix(v, white[k], Math.min(0.85, cv)));
          }
          const cap = Math.max(0, lat - 0.82) * 6;
          c = c.map((v, k) => mix(v, white[k], Math.min(1, cap)));
        }
        img.data.set([c[0], c[1], c[2], 255], i * 4);
      }
    }
    g.putImageData(img, 0, 0);
  });
  if (!planetTextures.has(cacheKey)) {
    tex.dispose = () => {}; // kept for the next time this planet is shown
    planetTextures.set(cacheKey, tex);
  }
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, fog: false }));
  group.add(body);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.04, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(atmosphere) } },
      vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 c;varying vec3 n;void main(){float i=pow(max(.72-dot(n,vec3(0,0,1.)),0.),3.);gl_FragColor=vec4(c*i*1.6,i);}',
    }),
  );
  group.add(atmo);
  group.userData.body = body;
  group.userData.spin = spin; // rad/s around its own axis, applied by the set so the world visibly turns
  return group;
}

/** Floating dust / sparks. Returns { points, update(t) }. */
export function particles({ count = 140, size = 0.05, color = '#ffffff', area = [8, 4, 6], center = [0, 1.6, -1], drift = [0.05, 0.02, 0.02], opacity = 0.7, seed = 11 }) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base.set([center[0] + (r() - 0.5) * area[0], center[1] + (r() - 0.5) * area[1], center[2] + (r() - 0.5) * area[2]], i * 3);
  }
  pos.set(base);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return {
    points,
    update(t) {
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        pos[k] = base[k] + Math.sin(t * drift[0] * 6 + i) * area[0] * 0.04 + t * drift[0];
        pos[k + 1] = center[1] + ((base[k + 1] - center[1] + t * drift[1] + area[1] * 50) % area[1]) - area[1] / 2;
        pos[k + 2] = base[k + 2] + Math.cos(t * drift[2] * 6 + i) * 0.2;
        // wrap sideways drift
        if (pos[k] > center[0] + area[0] / 2) base[k] -= area[0];
      }
      g.attributes.position.needsUpdate = true;
    },
  };
}

/** Free GPU memory held by a group: geometries, materials and textures. */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose();
      m.dispose();
    }
  });
}

/**
 * Falling stars: short bright streaks that cross the sky now and then, each on its own timer.
 * Lives in the backdrop (which follows the camera), so they always cross the visible sky.
 */
export function shootingStars({ count = 7, radius = 70, seed = 21, color = '#cfeaff' } = {}) {
  const r = rng(seed);
  const pos = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lines.frustumCulled = false;
  const c = new THREE.Color(color);
  const stars = Array.from({ length: count }, (_, i) => ({
    period: 2.2 + r() * 3.5,
    offset: r() * 8,
    // each star: a start point in the upper forward sky (inside the camera's view), a fall direction, a length
    z: -radius * (0.45 + r() * 0.35),
    x: (r() - 0.5) * radius * 0.7,
    y: radius * (0.05 + r() * 0.2),
    dx: (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.5),
    len: 2.2 + r() * 3.2,
    fresh: i,
  }));
  return {
    object: lines,
    update(t) {
      stars.forEach((s, i) => {
        const k = ((t + s.offset) % s.period) / s.period; // 0..1 over its cycle
        const run = k < 0.22 ? k / 0.22 : -1; // only visible for the first 22% of the cycle
        const o = i * 6;
        if (run < 0) {
          col.fill(0, o, o + 6);
          return;
        }
        const speed = 18;
        const hx = s.x + s.dx * run * speed, hy = s.y - run * speed, hz = s.z;
        const tail = Math.max(0, run - 0.35);
        pos.set([hx - s.dx * s.len * Math.min(1, run * 4), hy + s.len * Math.min(1, run * 4), hz, hx, hy, hz], o);
        const fade = Math.sin(run * Math.PI);
        col.set([c.r * 0.1, c.g * 0.1, c.b * 0.1, c.r * 3 * fade, c.g * 3 * fade, c.b * 3 * fade], o);
      });
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    },
  };
}
