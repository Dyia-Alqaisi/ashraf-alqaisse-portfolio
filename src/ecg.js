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
