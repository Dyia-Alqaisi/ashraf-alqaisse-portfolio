import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initI18n } from './i18n.js';
import { pulse, tickPulse } from './pulse.js';
import { createEcho } from './echo.js';
import { createMiniEcg, initTimelineEcg, createBackgroundEcg } from './ecg.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
document.documentElement.classList.toggle('reduced', reduceMotion);

// The heart lives only in the hero monitor: a fixed three-quarter anterior view.
const pose = { x: 0, y: 0.15, rx: 0.05, ry: 0, rz: 0, s: 0.62 };
const rate = { bpm: 72 }; // resting rate; calmer at Contact

// ---------- Language ----------
let timeline = null;
let heart = null;
initI18n(() => {
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
    pulse.base = rate.bpm;
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
createBackgroundEcg(document.getElementById('bg-ecg'), pulse, { reduceMotion });
if (!reduceMotion) {
  let shown = 72;
  setInterval(() => {
    const v = Math.round(pulse.bpm);
    if (v !== shown) { shown = v; bpmVal.textContent = v; hudHr.textContent = v; }
  }, 250);
}

// ---------- Echo sector (hero) ----------
createEcho(document.getElementById('echo-canvas'), pulse, { reduceMotion, mobile });

// ---------- Calm rhythm at Contact ----------
if (!reduceMotion) {
  ScrollTrigger.create({
    trigger: '#contact', start: 'top 60%', end: 'bottom top',
    onToggle: (self) => gsap.to(rate, { bpm: self.isActive ? 58 : 72, duration: 1.5 }),
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
