import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initI18n } from './i18n.js';
import { pulse, tickPulse } from './pulse.js';
import { createEcho } from './echo.js';
import { createMiniEcg, initTimelineEcg } from './ecg.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
document.documentElement.classList.toggle('reduced', reduceMotion);

// Heart pose per section: each one is a different "echo window" on the heart.
// x is measured away from the text (flipped for RTL). dim = fade on portrait screens.
const STATES = {
  hero:      { x: 0,    y: 0.66,  z: 0,    rx: 0.05,  ry: 0,    rz: 0,     s: 0.5,  bpm: 72, dim: 0 },
  about:     { x: 1.5,  y: -0.05, z: 0.3,  rx: 0.15,  ry: -1.25, rz: 0.12, s: 0.7,  bpm: 72, dim: 0.6 },
  expertise: { x: 1.8,  y: 0.85,  z: -1.4, rx: 0.2,   ry: 0.6,  rz: -0.15, s: 0.5,  bpm: 72, dim: 0.78 },
  career:    { x: 1.7,  y: 0.0,   z: 0,    rx: 0.3,   ry: 1.35, rz: -0.12, s: 0.62, bpm: 72, dim: 0.78 },
  teaching:  { x: 1.55, y: 0.05,  z: 0.3,  rx: -0.3,  ry: -0.7, rz: 0.1,   s: 0.64, bpm: 72, dim: 0.6 },
  education: { x: 1.75, y: 0.1,   z: -0.4, rx: 0.85,  ry: -0.35, rz: 0,    s: 0.6,  bpm: 72, dim: 0.78 },
  contact:   { x: 0,    y: 0.95,  z: 0,    rx: 0.05,  ry: 0,    rz: 0,     s: 0.42, bpm: 58, dim: 0 },
};
const pose = { ...STATES.hero, spin: 0, side: 1 };

// ---------- Language ----------
let timeline = null;
let heart = null;
initI18n((lang, first) => {
  const side = lang === 'ar' ? -1 : 1;
  if (first || reduceMotion) pose.side = side;
  else gsap.to(pose, { side, duration: 1.2, ease: 'power3.inOut', onUpdate: () => heart?.render() });
  heart?.render();
  timeline?.rebuild();
  ScrollTrigger.refresh();
});

// ---------- Smooth scroll + shared clock ----------
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ({ velocity }) => {
    ScrollTrigger.update();
    // Fast scrolling raises the heart rate a little; it calms back down on its own.
    pulse.boost = Math.max(pulse.boost, Math.min(Math.abs(velocity) * 0.45, 14));
  });
}
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMs) => {
  lenis?.raf(time * 1000);
  if (!reduceMotion) {
    pulse.base = pose.bpm;
    tickPulse(Math.min(deltaMs / 1000, 0.1));
  }
});

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView();
    if (el.id !== 'hero') el.querySelector('h2')?.setAttribute('tabindex', '-1');
    el.querySelector('h2, h1')?.focus({ preventScroll: true });
  });
});

// ---------- BPM readouts ----------
const bpmVal = document.getElementById('bpm-val');
const hudHr = document.getElementById('hud-hr');
createMiniEcg(document.getElementById('mini-ecg'), pulse, { reduceMotion });
if (!reduceMotion) {
  let shown = 72;
  setInterval(() => {
    const v = Math.round(pulse.bpm);
    if (v !== shown) { shown = v; bpmVal.textContent = v; hudHr.textContent = v; }
  }, 250);
}

// ---------- Echo sector (hero) ----------
createEcho(document.getElementById('echo-canvas'), pulse, { reduceMotion, mobile });

// ---------- Heart choreography ----------
if (!reduceMotion) {
  const sections = [...document.querySelectorAll('[data-heart]')];
  sections.forEach((sec, i) => {
    if (i === 0) return;
    const from = STATES[sections[i - 1].dataset.heart];
    const to = STATES[sec.dataset.heart];
    gsap.fromTo(pose, { ...from }, {
      ...to,
      ease: 'power1.inOut',
      immediateRender: false,
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 15%', scrub: 1.2 },
    });
  });
  // The heart turns a full revolution through the expertise section.
  gsap.fromTo(pose, { spin: 0 }, {
    spin: Math.PI * 2, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: '#expertise', start: 'top 40%', end: 'bottom 60%', scrub: 1.5 },
  });
}

// Load Three.js and build the heart after first paint so it never blocks the page.
function loadHeart() {
  import('./heart.js').then(async ({ createHeart }) => {
    heart = await createHeart(document.getElementById('heart-canvas'), { pose, pulse, reduceMotion, mobile });
    if (!reduceMotion) gsap.to(heart, { intro: 1, duration: 2.4, ease: 'expo.out' });
  }).catch((err) => console.warn('3D heart unavailable:', err));
}
// Phones: start WebGL a moment after load (or on first touch/scroll, whichever comes first),
// so its GPU start-up never competes with the first paint.
let heartQueued = false;
const scheduleHeart = () => {
  if (heartQueued) return;
  heartQueued = true;
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadHeart, { timeout: 1500 });
  else setTimeout(loadHeart, 300);
};
const afterLoad = () => {
  if (!mobile) return scheduleHeart();
  setTimeout(scheduleHeart, 2500);
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach((ev) => window.addEventListener(ev, scheduleHeart, { once: true, passive: true }));
};
if (document.readyState === 'complete') afterLoad();
else window.addEventListener('load', afterLoad, { once: true });

// ---------- Career ECG ----------
timeline = initTimelineEcg(document.getElementById('career'), { gsap, ScrollTrigger, reduceMotion });

// ---------- Reveals ----------
if (!reduceMotion) {
  gsap.from('.hero__in', { y: 28, opacity: 0.01, duration: 1.2, ease: 'power3.out', stagger: 0.12, delay: 0.1 });
  gsap.from('.nav, .hud, .scroll-cue', { opacity: 0, duration: 1.2, delay: 0.5 });

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  ScrollTrigger.batch('[data-card], .tl__item', {
    start: 'top 90%',
    once: true,
    onEnter: (els) => gsap.from(els, {
      y: 60, opacity: 0, rotateX: -12, duration: 1.1, ease: 'power3.out', stagger: 0.1, clearProps: 'transform,opacity',
    }),
  });

  // Echo "sweep reveal": a scan line crosses each section heading and uncovers it.
  const APEX = 'at 50% -30%';
  const sweepCss = (theta, rtl) => rtl
    ? {
      mask: `conic-gradient(${APEX}, #000 0deg ${theta - 3}deg, transparent ${theta}deg 360deg)`,
      band: `conic-gradient(${APEX}, transparent 0deg ${theta - 26}deg, rgba(0,0,0,.9) ${theta - 1}deg, transparent ${theta + 0.5}deg)`,
    }
    : {
      mask: `conic-gradient(${APEX}, transparent 0deg ${theta}deg, #000 ${theta + 3}deg 360deg)`,
      band: `conic-gradient(${APEX}, transparent 0deg ${theta - 0.5}deg, rgba(0,0,0,.9) ${theta + 1}deg, transparent ${theta + 26}deg)`,
    };
  const setMask = (el, v) => { el.style.webkitMaskImage = v; el.style.maskImage = v; };

  document.querySelectorAll('[data-sweep]').forEach((el) => {
    const fx = document.createElement('div');
    fx.className = 'sweep-fx';
    fx.setAttribute('aria-hidden', 'true');
    el.append(fx);
    const rtl = () => document.documentElement.dir === 'rtl';
    const st = { theta: 0 };
    const paint = () => {
      const { mask, band } = sweepCss(st.theta, rtl());
      setMask(el, mask);
      fx.style.setProperty('--band', band);
    };
    const reset = () => { st.theta = rtl() ? 88 : 272; paint(); };
    reset();
    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        reset();
        gsap.to(st, {
          theta: rtl() ? 272 : 88, duration: 1.15, ease: 'power2.inOut', onUpdate: paint,
          onComplete: () => { setMask(el, ''); fx.remove(); },
        });
      },
    });
  });
}

// Count-up stats
document.querySelectorAll('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  if (reduceMotion) return;
  const o = { v: 0 };
  el.textContent = '0';
  gsap.to(o, {
    v: to, duration: 1.8, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    onUpdate: () => { el.textContent = Math.round(o.v); },
  });
});

// Run the card micro-animations only while they are on screen.
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting));
}, { rootMargin: '80px' });
document.querySelectorAll('.micro').forEach((m) => io.observe(m));

// ---------- Nav ----------
ScrollTrigger.create({
  start: 40, end: 'max',
  onToggle: (self) => document.getElementById('nav').classList.toggle('nav--solid', self.isActive),
});
document.querySelectorAll('.nav__links a').forEach((a) => {
  const sec = document.querySelector(a.getAttribute('href'));
  ScrollTrigger.create({
    trigger: sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: (self) => a.classList.toggle('is-active', self.isActive),
  });
});

Promise.all([document.fonts.ready]).then(() => {
  timeline.rebuild();
  ScrollTrigger.refresh();
});
