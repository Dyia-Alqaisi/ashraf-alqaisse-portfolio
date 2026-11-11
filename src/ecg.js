import { ecgWave } from './pulse.js';

// Monitor-style mini ECG for the nav: a write head sweeps across and erases just ahead of itself.
export function createMiniEcg(canvas, pulse, { reduceMotion = false } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio, 2);
  const W = canvas.clientWidth || 72;
  const H = canvas.clientHeight || 22;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = '#c8102e';
  ctx.lineWidth = 1.3;
  ctx.lineJoin = 'round';

  const yOf = (p) => H * 0.62 - ecgWave(p) * H * 0.5;
  const SPEED = W / 2.2; // px per second

  if (reduceMotion) {
    // Static strip: two beats
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const p = ((x / W) * 2 + 0.6) % 1;
      x === 0 ? ctx.moveTo(x, yOf(p)) : ctx.lineTo(x, yOf(p));
    }
    ctx.stroke();
    return;
  }

  let head = 0;
  let lastY = yOf(pulse.phase);
  let lastPhase = pulse.phase;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const dx = dt * SPEED;
    if (dx <= 0) return;
    let dp = pulse.phase - lastPhase;
    if (dp < 0) dp += 1;
    const steps = Math.max(1, Math.ceil(dx));
    ctx.beginPath();
    ctx.moveTo(head, lastY);
    for (let i = 1; i <= steps; i++) {
      const x = head + (dx * i) / steps;
      const y = yOf((lastPhase + (dp * i) / steps) % 1);
      if (x >= W) { ctx.stroke(); ctx.beginPath(); head -= W; ctx.moveTo(x - W, y); continue; }
      ctx.lineTo(x, y);
      lastY = y;
    }
    ctx.stroke();
    head = (head + dx) % W;
    lastPhase = pulse.phase;
    ctx.clearRect(head + 1, 0, 8, H); // erase gap ahead of the write head
    if (head + 9 > W) ctx.clearRect(0, 0, head + 9 - W, H);
  }
  requestAnimationFrame(frame);
}

// Career timeline ECG: one QRS complex per milestone, drawn with the scroll.
export function initTimelineEcg(root, { gsap, ScrollTrigger, reduceMotion }) {
  const list = root.querySelector('.tl');
  const svg = root.querySelector('.tl__ecg');
  const ghost = svg.querySelector('.tl__ghost');
  const path = svg.querySelector('.tl__trace');
  const pen = svg.querySelector('.tl__pen');
  const items = [...list.querySelectorAll('.tl__item')];
  let len = 0;
  let spikes = [];
  let progress = reduceMotion ? 1 : 0;

  function build() {
    const h = list.offsetHeight;
    svg.setAttribute('viewBox', `0 0 64 ${h}`);
    svg.style.height = `${h}px`;
    const b = 14;
    spikes = items.map((it) => it.offsetTop + 14);
    let d = `M${b} 0`;
    for (const y of spikes) {
      d += ` L${b} ${y - 30}`
        + ` C${b + 7} ${y - 29} ${b + 7} ${y - 21} ${b} ${y - 20}` // P
        + ` L${b} ${y - 7} L${b - 4} ${y - 4}`                       // Q
        + ` L${b + 34} ${y}`                                          // R
        + ` L${b - 10} ${y + 5} L${b} ${y + 9}`                       // S
        + ` L${b} ${y + 18}`
        + ` C${b + 11} ${y + 20} ${b + 11} ${y + 34} ${b} ${y + 36}`; // T
    }
    d += ` L${b} ${h}`;
    path.setAttribute('d', d);
    ghost.setAttribute('d', d);
    len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    draw(progress);
  }

  function draw(p) {
    progress = p;
    path.style.strokeDashoffset = `${len * (1 - p)}`;
    const pt = path.getPointAtLength(len * p);
    pen.setAttribute('cx', pt.x);
    pen.setAttribute('cy', pt.y);
    pen.style.opacity = p > 0.002 && p < 0.998 ? 1 : 0;
    items.forEach((it, i) => it.classList.toggle('is-live', pt.y >= spikes[i] - 4 || p >= 0.999));
  }

  build();
  if (!reduceMotion) {
    ScrollTrigger.create({
      trigger: list,
      start: 'top 70%',
      end: 'bottom 60%',
      scrub: 0.6,
      onUpdate: (self) => draw(self.progress),
    });
  }
  return { rebuild: build };
}

// Background monitor: a faint ECG trace written across the page behind the content,
// beating with the shared pulse. Older trace fades out behind the write head.
export function createBackgroundEcg(canvas, pulse, { reduceMotion = false } = {}) {
  const ctx = canvas.getContext('2d');
  const SWEEP_S = 6.5;         // seconds for the write head to cross the screen
  const FPS_STEP = 1 / 40;
  let W = 0, H = 0, ys = null, head = 0, lastPhase = pulse.phase, last = performance.now(), acc = 0;

  const baseline = () => H * 0.82;
  const amp = () => Math.min(90, Math.max(46, H * 0.08));
  const yOf = (p) => baseline() - ecgWave(p) * amp();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.ceil(W) + 2;
    ys = new Float32Array(n).fill(NaN);
    head = Math.min(head, n - 1);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const n = ys.length;
    const CHUNK = 14;
    // Draw in short chunks; alpha falls off with distance behind the write head.
    for (let start = 0; start < n - 1; start += CHUNK) {
      const end = Math.min(n - 1, start + CHUNK);
      const mid = (start + end) / 2;
      const behind = (head - mid + n) % n;            // 0 at the head, grows into the past
      const a = Math.max(0, 1 - behind / (n * 0.85));
      if (a <= 0.01) continue;
      ctx.strokeStyle = `rgba(200, 16, 46, ${(0.42 * a * a).toFixed(3)})`;
      ctx.beginPath();
      let pen = false;
      for (let x = start; x <= end; x++) {
        const y = ys[x];
        if (Number.isNaN(y) || (x > head && x < head + 24)) { pen = false; continue; } // gap ahead of head
        if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Glowing write head
    const hy = ys[Math.floor(head)];
    if (!Number.isNaN(hy)) {
      const g = ctx.createRadialGradient(head, hy, 0, head, hy, 16);
      g.addColorStop(0, 'rgba(200, 16, 46, 0.45)');
      g.addColorStop(1, 'rgba(200, 16, 46, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(head - 16, hy - 16, 32, 32);
      ctx.fillStyle = 'rgba(200, 16, 46, 0.7)';
      ctx.beginPath(); ctx.arc(head, hy, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function step(dt) {
    const n = ys.length;
    const dx = (dt * W) / SWEEP_S;
    let dp = pulse.phase - lastPhase;
    if (dp < 0) dp += 1;
    const steps = Math.max(1, Math.ceil(dx));
    for (let i = 1; i <= steps; i++) {
      const x = Math.floor(head + (dx * i) / steps) % n;
      ys[x] = yOf((lastPhase + (dp * i) / steps) % 1);
    }
    head = (head + dx) % n;
    lastPhase = pulse.phase;
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduceMotion) drawStatic(); });

  function drawStatic() {
    // Reduced motion: a still strip of a few beats, already faded at the start.
    const beatPx = (W / SWEEP_S) * (60 / 72);
    for (let x = 0; x < ys.length; x++) ys[x] = yOf(((x / beatPx) + 0.6) % 1);
    head = ys.length - 30;
    draw();
  }
  if (reduceMotion) { drawStatic(); return; }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    acc += dt;
    if (acc < FPS_STEP) return; // ~40 fps is plenty for a faint background
    step(acc);
    acc = 0;
    draw();
  }
  requestAnimationFrame(frame);
}
