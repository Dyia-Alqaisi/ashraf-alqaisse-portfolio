import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { beat } from './pulse.js';

// A stylised anatomical heart, built entirely in code.
// Local frame: +y = base, -y = apex, +z = anterior, +x = patient's left (viewer's right).

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const Z = new THREE.Vector3(0, 0, 1);
const LUMEN = new THREE.MeshStandardMaterial({ color: '#1c0407', roughness: 0.8, side: THREE.DoubleSide });
const g = (x, w) => Math.exp(-((x / w) ** 2));

function organic(x, y, z) {
  return Math.sin(x * 5.1 + 1.3) * Math.sin(y * 4.3 + 0.7) * Math.sin(z * 3.7 + 2.1)
    + 0.45 * Math.sin(x * 11.3 + y * 3.1) * Math.sin(z * 9.7 + y * 2.3 + 0.4);
}

// Unit direction -> point on the ventricular mass. Returns the base/apex blend t.
function ventricle(dx, dy, dz, out) {
  let y = dy * 1.32;
  if (y > 0.5) y = 0.5 + (y - 0.5) * 0.42;           // flatter base dome
  const t = smooth(-1.32, 0.55, y);                   // 0 apex .. 1 base
  let k = mix(0.4, 1.04, t ** 0.58);                     // conical taper to a blunt apex
  const phi = Math.atan2(dx, dz);                     // 0 = anterior, +pi/2 = left
  const along = smooth(-1.22, -0.8, y) * (1 - smooth(0.3, 0.52, y));
  const antGroove = g(angDiff(phi, 0.32), 0.16) * along;   // anterior interventricular groove
  const postGroove = g(angDiff(phi, 2.75), 0.2) * along;   // posterior groove
  const avGroove = g(y - 0.44, 0.07);                       // coronary sulcus
  k *= 1 - 0.075 * antGroove - 0.05 * postGroove - 0.06 * avGroove;
  // LV (left) is rounder and fuller than the crescent-shaped RV
  const lv = 1 + 0.06 * Math.max(0, Math.sin(phi)) * (1 - t * 0.5);
  const rz = dz >= 0 ? 0.84 : 0.7;                    // flat diaphragmatic back
  const n = 1 + 0.014 * organic(dx, dy, dz);
  const ax = (1 - t) * 0.26;                          // apex leans to the patient's left
  out.set(ax + dx * k * lv * n, y + 0.01 * organic(dz, dx, dy), dz * k * rz * n);
  return { t, ax };
}

function sphereGeo(detail) {
  let geo = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo); // shared vertices -> smooth, seamless normals
  // Spherical UVs for the muscle-fibre normal map (seam sits at the back of each lobe)
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    uv[i * 2] = Math.atan2(x, z) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Tileable normal map of fine, slightly twisted myocardial fibres (generated, no image files).
function fibreNormalMap(size = 512, count = 28) {
  const W = size, H = size / 2;
  const h = new Float32Array(W * H);
  const TAU = Math.PI * 2;
  // Many irregular waves (integer u-frequencies keep it tileable), domain-warped so it reads organic.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const waves = Array.from({ length: count }, () => {
    const ku = Math.round(6 + rnd() * 48) * (rnd() < 0.5 ? -1 : 1);
    const kv = 4 + rnd() * 40;
    return { ku, kv, a: 1 / Math.sqrt(Math.abs(ku) + kv), ph: rnd() * TAU };
  });
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = i / W, v = j / H;
      const wu = u + 0.02 * Math.sin(TAU * (3 * u + 5 * v));
      const wv = v + 0.03 * Math.sin(TAU * (2 * u - 4 * v) + 1.3);
      let sum = 0;
      for (const w of waves) sum += w.a * Math.sin(TAU * (w.ku * wu + w.kv * wv) + w.ph);
      h[j * W + i] = sum;
    }
  }
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const l = h[j * W + ((i - 1 + W) % W)], r = h[j * W + ((i + 1) % W)];
      const d = h[Math.max(0, j - 1) * W + i], uu = h[Math.min(H - 1, j + 1) * W + i];
      const nx = (l - r) * 0.9, ny = (d - uu) * 0.9, nz = 1;
      const n = Math.hypot(nx, ny, nz);
      const o = (j * W + i) * 4;
      img.data[o] = ((nx / n) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((ny / n) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((nz / n) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

function deform(geo, fn) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    fn(d, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function lobe(detail, c, r, wobble = 0.03, seed = 0) {
  return deform(sphereGeo(detail), (d, out) => {
    const n = 1 + wobble * organic(d.x + seed, d.y - seed, d.z + seed * 0.5);
    out.set(c[0] + d.x * r[0] * n, c[1] + d.y * r[1] * n, c[2] + d.z * r[2] * n);
  });
}

// Tube along points, tapered by fn(u) and capped with spheres where requested.
function vessel(points, radius, mat, { taper = () => 1, tubular = 64, radial = 18, capStart = false, capEnd = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, c);
    const f = taper(u);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(f).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(geo, mat));
  // Cut vessel end: a lip of vessel wall around a dark lumen
  const cap = (u, sign) => {
    const r = radius * taper(u);
    const end = new THREE.Group();
    end.add(new THREE.Mesh(new THREE.RingGeometry(r * 0.74, r, radial), mat));
    const lumen = new THREE.Mesh(new THREE.CircleGeometry(r * 0.74, radial), LUMEN);
    lumen.position.z = -r * 0.04;
    end.add(lumen);
    end.position.copy(curve.getPointAt(u));
    end.quaternion.setFromUnitVectors(Z, curve.getTangentAt(u).multiplyScalar(sign));
    grp.add(end);
  };
  if (capStart) cap(0, -1);
  if (capEnd) cap(1, 1);
  return grp;
}

// Points on the ventricle surface along (phi, lat) keyframes, lifted slightly off the surface.
function surfacePath(keys, lift = 0.018, steps = 28) {
  const pts = [];
  const out = new THREE.Vector3();
  for (let s = 0; s < keys.length - 1; s++) {
    const [p0, l0] = keys[s];
    const [p1, l1] = keys[s + 1];
    for (let i = 0; i < steps; i++) {
      const u = i / steps;
      const phi = mix(p0, p1, u);
      const lat = mix(l0, l1, u);
      const dx = Math.sin(phi) * Math.cos(lat);
      const dy = Math.sin(lat);
      const dz = Math.cos(phi) * Math.cos(lat);
      const { ax } = ventricle(dx, dy, dz, out);
      const rx = out.x - ax;
      const rz = out.z;
      const r = Math.hypot(rx, rz) || 1;
      pts.push([out.x + (rx / r) * lift, out.y, out.z + (rz / r) * lift]);
    }
  }
  pts.push(pts[pts.length - 1]);
  return pts.filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
}

// Yield to the browser between build steps so no single task blocks the main thread for long.
const breathe = () => new Promise((r) => (window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 16)));

export async function createHeart(canvas, { pose, pulse, reduceMotion = false, mobile = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  let __t=performance.now();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0).texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();
  console.log('T pmrem '+Math.round(performance.now()-__t));

  const key = new THREE.DirectionalLight(0xfff1ea, 1.7);
  key.position.set(2.5, 4, 5);
  const rimWarm = new THREE.DirectionalLight(0xff7b72, 3.2);
  rimWarm.position.set(-4.5, 2.5, -3.5);
  const rimCool = new THREE.DirectionalLight(0x5b8cff, 2.2);
  rimCool.position.set(4.5, -1.5, -3.5);
  scene.add(key, rimWarm, rimCool);

  // ---------- Materials ----------
  await breathe();
  const fibres = fibreNormalMap(mobile ? 256 : 512, mobile ? 16 : 28);
  await breathe();
  // Every material uses the same feature set so they share one shader program (cheaper to compile).
  // Phones skip the sheen layer for a lighter shader.
  const wet = mobile
    ? { clearcoat: 0.75, clearcoatRoughness: 0.22 }
    : { clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.4, sheenRoughness: 0.55 };
  const mat = (color, roughness, sheenColor, normal) => new THREE.MeshPhysicalMaterial({
    color, roughness, ...wet, ...(mobile ? {} : { sheenColor }),
    normalMap: fibres, normalScale: new THREE.Vector2(normal, normal),
  });
  const muscle = mat('#5a0a11', 0.58, '#ff6a6a', 0.2);
  const atrium = mat('#4e0910', 0.6, '#ff6a6a', 0.16);
  const artery = mat('#741820', 0.5, '#ff8f8f', 0.03);
  const venous = mat('#2a3460', 0.52, '#8aa6e6', 0.03);
  const coronary = mat('#a3161f', 0.4, '#ff9a9a', 0.02);
  const cardiacVein = mat('#2d3d74', 0.42, '#8fb0ff', 0.02);

  const detail = mobile ? 5 : 6;

  // ---------- Ventricles + coronary vessels (beat together) ----------
  const vent = new THREE.Group();
  vent.add(new THREE.Mesh(deform(sphereGeo(detail), (d, out) => ventricle(d.x, d.y, d.z, out)), muscle));

  const cor = (keys, r, mat = coronary, taperTo = 0.45) =>
    vent.add(vessel(surfacePath(keys), r, mat, { taper: (u) => mix(1, taperTo, u), tubular: 90, radial: 8, capEnd: false }));
  const AV = 0.31; // latitude of the AV groove on the unit sphere
  cor([[0.18, AV + 0.02], [0.3, 0.1], [0.33, -0.5], [0.4, -1.05], [0.6, -1.32]], 0.03);   // LAD
  cor([[0.3, 0.06], [0.75, -0.25], [1.05, -0.6]], 0.018);                                  // diagonal 1
  cor([[0.33, -0.35], [0.7, -0.7], [0.95, -0.95]], 0.016);                                 // diagonal 2
  cor([[0.2, AV], [0.9, AV + 0.02], [1.6, AV], [2.4, AV - 0.02]], 0.026);                  // circumflex
  cor([[1.45, AV], [1.6, -0.2], [1.75, -0.75]], 0.017);                                    // obtuse marginal
  cor([[-0.1, AV], [-0.9, AV + 0.02], [-1.7, AV], [-2.6, AV - 0.02]], 0.028);              // RCA
  cor([[-1.5, AV], [-1.45, -0.3], [-1.3, -0.9]], 0.017);                                   // acute marginal
  cor([[-2.6, AV], [-2.8, -0.2], [-2.9, -0.95]], 0.02);                                    // posterior descending
  cor([[0.42, AV], [0.4, 0.05], [0.42, -0.55], [0.5, -1.0]], 0.02, cardiacVein, 0.6);     // great cardiac vein

  await breathe();
  // ---------- Atria ----------
  const atria = new THREE.Group();
  atria.add(new THREE.Mesh(lobe(detail - 1, [-0.62, 0.72, 0.08], [0.5, 0.44, 0.46], 0.04, 1), atrium));   // right atrium
  atria.add(new THREE.Mesh(lobe(detail - 1, [0.28, 0.76, -0.42], [0.56, 0.36, 0.42], 0.04, 2), atrium));  // left atrium
  const ra = new THREE.Mesh(lobe(4, [0, 0, 0], [0.32, 0.17, 0.2], 0.08, 3), atrium);                       // right auricle
  ra.position.set(-0.32, 0.92, 0.5); ra.rotation.set(0.3, 0.5, 0.5);
  const la = new THREE.Mesh(lobe(4, [0, 0, 0], [0.3, 0.14, 0.18], 0.1, 4), atrium);                         // left auricle
  la.position.set(0.74, 0.78, 0.26); la.rotation.set(0.2, -0.6, -0.5);
  atria.add(ra, la);

  await breathe();
  // ---------- Great vessels ----------
  const vessels = new THREE.Group();
  const aortaPts = [[-0.04, 0.55, 0.12], [-0.1, 1.25, 0.2], [-0.04, 1.85, 0.08], [0.22, 2.12, -0.15], [0.56, 2.0, -0.45], [0.7, 1.45, -0.62], [0.72, 0.55, -0.7]];
  vessels.add(vessel(aortaPts, 0.25, artery, { taper: (u) => mix(1, 0.82, u), tubular: 120 }));
  [[[0.0, 2.02, 0.02], [-0.08, 2.28, 0.05], [-0.12, 2.48, 0.07]],
   [[0.27, 2.1, -0.18], [0.29, 2.34, -0.2], [0.3, 2.52, -0.21]],
   [[0.47, 2.04, -0.36], [0.55, 2.28, -0.41], [0.6, 2.46, -0.44]]]
    .forEach((pts, i) => vessels.add(vessel(pts, [0.095, 0.075, 0.08][i], artery, { taper: (u) => mix(1, 0.85, u), tubular: 24 })));

  await breathe();
  // Pulmonary trunk and branches (deoxygenated -> blue, as in anatomical convention)
  const pt = [[0.2, 0.5, 0.6], [0.32, 1.02, 0.52], [0.38, 1.38, 0.2], [0.38, 1.48, -0.02]];
  vessels.add(vessel(pt, 0.21, venous, { tubular: 48, capEnd: false }));
  vessels.add(vessel([[0.38, 1.48, -0.02], [0.75, 1.52, -0.2], [0.98, 1.44, -0.3]], 0.14, venous, { taper: (u) => mix(1.25, 0.95, u), tubular: 32 }));
  vessels.add(vessel([[0.38, 1.48, -0.02], [0.02, 1.44, -0.36], [-0.36, 1.4, -0.44]], 0.14, venous, { taper: (u) => mix(1.25, 0.95, u), tubular: 32 }));

  // Venae cavae
  vessels.add(vessel([[-0.64, 0.95, 0.0], [-0.66, 1.55, -0.02], [-0.63, 2.05, -0.05]], 0.16, venous, { tubular: 32 }));
  vessels.add(vessel([[-0.62, 0.45, -0.12], [-0.66, 0.0, -0.22], [-0.7, -0.35, -0.28]], 0.15, venous, { tubular: 24 }));

  // Pulmonary veins entering the left atrium (oxygenated -> red)
  [[0.62, 0.92, -0.6, 1.05, 1.0, -0.85], [0.6, 0.62, -0.62, 1.0, 0.55, -0.9],
   [-0.02, 0.92, -0.66, -0.35, 1.0, -0.92], [0.0, 0.62, -0.7, -0.32, 0.55, -0.96]]
    .forEach(([a, b, c, d, e, f]) => vessels.add(vessel([[a, b, c], [d, e, f]], 0.075, artery, { tubular: 8, radial: 12 })));

  await breathe();
  // ---------- Assembly ----------
  const model = new THREE.Group();
  vent.position.y = 0.45;              // pivot near the base: the apex moves on contraction
  vent.children.forEach((c) => { c.position.y -= 0.45; });
  model.add(vent, atria, vessels);
  model.position.set(-0.06, -0.62, 0);

  const orient = new THREE.Group();    // anatomical tilt: apex down, left and forward
  orient.rotation.set(-0.3, -0.25, 0.42);
  orient.add(model);

  const spinner = new THREE.Group();   // idle + scroll rotation
  spinner.add(orient);
  const holder = new THREE.Group();    // pose transform from main.js
  holder.add(spinner);
  scene.add(holder);

  // ---------- Layout: the canvas fills the hero "monitor" panel ----------
  let fit = 1;
  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit = Math.min(1, (w / h) / 0.8); // shrink in narrow panels so the heart never crops
  }
  resize();
  new ResizeObserver(() => { resize(); api.render(); }).observe(canvas);

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  const api = { intro: reduceMotion ? 1 : 0, render: () => {} };
  let lastOpacity = -1;
  const clock = new THREE.Clock();

  function frame() {
    const t = clock.getElapsedTime();
    const s = pose;

    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;

    if (!reduceMotion) {
      const b = beat(pulse.phase);
      const sq = 0.055 * b.lub + 0.03 * b.dub;
      vent.scale.set(1 - sq, 1 - sq * 0.7, 1 - sq);
      vent.rotation.y = 0.05 * b.lub;                       // ventricular twist
      atria.scale.setScalar(1 + 0.03 * b.lub - 0.045 * b.atrial);
      vessels.scale.setScalar(1 + 0.012 * b.lub + 0.006 * b.dub);
    }

    // The heart stays in place: only a slow idle turn, a gentle pointer tilt and the intro.
    const intro = api.intro;
    holder.position.set(s.x, s.y + (1 - intro) * -0.5, 0);
    holder.rotation.set(s.rx + pointer.sy * 0.1, pointer.sx * 0.18, s.rz);
    holder.scale.setScalar(Math.max(s.s * fit * (0.4 + 0.6 * intro), 0.0001));
    spinner.rotation.y = s.ry + (reduceMotion ? 0 : Math.sin(t * 0.25) * 0.22) + (1 - intro) * -1.6;

    if (Math.abs(intro - lastOpacity) > 0.005) { canvas.style.opacity = intro.toFixed(3); lastOpacity = intro; }

    renderer.render(scene, camera);
  }

  // Compile shaders off the critical path (parallel compile where supported)
  await breathe();
  try { await renderer.compileAsync(scene, camera); } catch { /* falls back to compile on first render */ }

  if (reduceMotion) {
    // Static heart: render only when something changes.
    api.render = () => requestAnimationFrame(frame);
    api.render();
  } else {
    // Render only while the hero is on screen and the tab is visible.
    let onScreen = true;
    let running = false;
    const update = () => {
      const should = onScreen && !document.hidden;
      if (should && !running) { running = true; clock.getDelta(); renderer.setAnimationLoop(frame); }
      if (!should && running) { running = false; renderer.setAnimationLoop(null); }
    };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }).observe(canvas);
    document.addEventListener('visibilitychange', update);
    update();
  }
  return api;
}
