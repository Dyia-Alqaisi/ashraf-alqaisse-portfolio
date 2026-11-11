import { beat } from './pulse.js';

// Synthetic ultrasound sector (apical four-chamber style). Everything is generated noise:
// no patient images are used anywhere.

const NA = 112;                       // beam lines across the sector
const NR = 140;                       // samples along each beam
const HALF = (40 * Math.PI) / 180;    // half the sector angle
const SWEEP_S = 1.5;                  // seconds per sweep, left to right
const DEPTH_CM = 16;

// Chambers in sector units (X across, Y depth, sector radius = 1). LV on screen right, as in A4C.
const CHAMBERS = [
  { x: 0.115, y: 0.4, rx: 0.088, ry: 0.2, v: true },   // LV
  { x: -0.11, y: 0.42, rx: 0.072, ry: 0.17, v: true },  // RV
  { x: 0.1, y: 0.71, rx: 0.085, ry: 0.082, v: false },  // LA
  { x: -0.1, y: 0.71, rx: 0.075, ry: 0.078, v: false }, // RA
];

function rayleigh() {
  return Math.sqrt(-2 * Math.log(1 - Math.random() * 0.9999)) * 0.6;
}

function tissue(a, r, vs, as) {
  const X = r * Math.sin(a);
  const Y = r * Math.cos(a);
  let e = Infinity;
  for (const c of CHAMBERS) {
    const s = c.v ? vs : as;
    const ex = (X - c.x) / (c.rx * s);
    const ey = (Y - c.y) / (c.ry * s);
    e = Math.min(e, ex * ex + ey * ey);
  }
  let v;
  if (e < 1) v = 0.035;                          // blood pool: near black
  else if (e < 1.85) v = 0.5 + 0.12 * (1.85 - e); // myocardium
  else v = 0.16 + 0.05 * Math.sin(Y * 40 + X * 12);
  v += 0.5 * Math.exp(-(((r - 0.93) / 0.03) ** 2));                   // pericardium
  v += r < 0.09 ? 0.35 * (1 - r / 0.09) : 0;                          // near-field clutter
  // valve leaflets: bright when closed (systole)
  if (Math.abs(Y - 0.6) < 0.008 && Math.abs(X) < 0.19 && Math.abs(X) > 0.02 && vs < 0.93) v += 0.5;
  return v * (1 - 0.38 * r);                                          // depth attenuation
}

export function createEcho(canvas, pulse, { reduceMotion = false, mobile = false } = {}) {
  const ctx = canvas.getContext('2d');
  const polar = new Float32Array(NA * NR);
  const colTime = new Float32Array(NA).fill(-10);
  const gain = new Float32Array(NA);
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');
  const BW = mobile ? 150 : 230;

  let W = 0, H = 0, R = 0, apex = { x: 0, y: 0 }, box = null, lut = null, lutA = null, img = null;
  let sweep = 0, clock = 0, last = 0, running = false, visible = true, raf = 0;

  function fillColumn(ai, t) {
    const { lub, dub, atrial } = beat(pulse.phase);
    const vs = 1 - 0.16 * lub - 0.07 * dub;
    const as = 1 + 0.1 * lub - 0.16 * atrial;
    const a = -HALF + ((ai + 0.5) / NA) * 2 * HALF;
    const base = ai * NR;
    for (let ri = 0; ri < NR; ri++) {
      polar[base + ri] = tissue(a, (ri + 0.5) / NR, vs, as) * rayleigh();
    }
    colTime[ai] = t;
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const top = Math.max(72, H * 0.1);
    R = Math.min(H * 0.86 - top, (W * 0.44) / Math.sin(HALF));
    apex = { x: W / 2, y: top };
    const bw = 2 * R * Math.sin(HALF);
    box = { x: apex.x - bw / 2, y: apex.y, w: bw, h: R };
    const ow = BW;
    const oh = Math.max(1, Math.round((BW * box.h) / box.w));
    off.width = ow;
    off.height = oh;
    img = octx.createImageData(ow, oh);
    lut = new Int32Array(ow * oh);
    lutA = new Int16Array(ow * oh);
    for (let j = 0; j < oh; j++) {
      for (let i = 0; i < ow; i++) {
        const X = ((i + 0.5) / ow - 0.5) * box.w;
        const Y = ((j + 0.5) / oh) * box.h;
        const r = Math.hypot(X, Y) / R;
        const a = Math.atan2(X, Y);
        const k = j * ow + i;
        if (r > 1 || r < 0.025 || Math.abs(a) > HALF) { lut[k] = -1; continue; }
        const ai = Math.min(NA - 1, Math.floor(((a + HALF) / (2 * HALF)) * NA));
        const ri = Math.min(NR - 1, Math.floor(r * NR));
        lut[k] = ai * NR + ri;
        lutA[k] = ai;
      }
    }
  }

  function draw() {
    // Speckle image
    for (let ai = 0; ai < NA; ai++) {
      gain[ai] = reduceMotion ? 1 : 0.66 + 0.4 * Math.exp(-(clock - colTime[ai]) / 0.45);
    }
    const d = img.data;
    for (let k = 0; k < lut.length; k++) {
      const idx = lut[k];
      const o = k * 4;
      if (idx < 0) { d[o + 3] = 0; continue; }
      const c = Math.min(255, polar[idx] * gain[lutA[k]] * 255);
      d[o] = c * 0.93; d[o + 1] = c * 0.97; d[o + 2] = c; d[o + 3] = 255;
    }
    octx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, box.x, box.y, box.w, box.h);

    // Sector outline
    const ex = Math.sin(HALF) * R;
    const ey = Math.cos(HALF) * R;
    ctx.strokeStyle = 'rgba(190, 210, 235, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(apex.x - ex, apex.y + ey);
    ctx.lineTo(apex.x, apex.y);
    ctx.lineTo(apex.x + ex, apex.y + ey);
    ctx.arc(apex.x, apex.y, R, Math.PI / 2 - HALF, Math.PI / 2 + HALF);
    ctx.stroke();

    // Scan line
    if (!reduceMotion) {
      const a = -HALF + sweep * 2 * HALF;
      const sx = Math.sin(a);
      const sy = Math.cos(a);
      const grad = ctx.createLinearGradient(apex.x, apex.y, apex.x + sx * R, apex.y + sy * R);
      grad.addColorStop(0, 'rgba(235, 242, 250, 0.75)');
      grad.addColorStop(1, 'rgba(235, 242, 250, 0.05)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(apex.x + sx * R, apex.y + sy * R);
      ctx.stroke();
    }

    // Depth ruler (cm) along the right side
    const rx = apex.x + ex + 18;
    ctx.strokeStyle = 'rgba(190, 210, 235, 0.45)';
    ctx.fillStyle = 'rgba(190, 210, 235, 0.6)';
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.beginPath();
    ctx.moveTo(rx, apex.y);
    ctx.lineTo(rx, apex.y + R);
    for (let cm = 0; cm <= DEPTH_CM; cm++) {
      const y = apex.y + (cm / DEPTH_CM) * R;
      const len = cm % 4 === 0 ? 8 : 4;
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + len, y);
      if (cm % 4 === 0) ctx.fillText(String(cm), rx + 12, y);
    }
    ctx.stroke();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    if (dt < 1 / 32) return; // ~30 fps is plenty for the echo screen
    last = now;
    clock += dt;
    const prev = Math.floor(sweep * NA);
    sweep += dt / SWEEP_S;
    if (sweep >= 1) sweep -= 1;
    const cur = Math.floor(sweep * NA);
    for (let ai = prev; ai !== cur; ai = (ai + 1) % NA) fillColumn(ai, clock);
    fillColumn(cur, clock);
    draw();
  }

  function update() {
    const should = visible && !document.hidden && !reduceMotion;
    if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }

  layout();
  for (let ai = 0; ai < NA; ai++) fillColumn(ai, -10);
  draw();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }).observe(canvas);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('resize', () => { layout(); draw(); });
  update();

  return { redraw: () => { layout(); draw(); } };
}
