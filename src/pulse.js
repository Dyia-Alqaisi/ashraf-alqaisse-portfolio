// One shared cardiac clock. The 3D heart, the echo screen and every ECG trace
// read from it, so they all beat together.

export const pulse = {
  bpm: 72,     // displayed / current rate
  base: 72,    // resting rate for the current section (calmer at Contact)
  boost: 0,    // extra bpm from fast scrolling, decays back to 0
  phase: 0,    // 0..1 position in the cardiac cycle (R wave at ~0.19)
};

const listeners = new Set();
export const onBeat = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function tickPulse(dt) {
  pulse.boost *= Math.exp(-dt / 0.6);
  const target = pulse.base + pulse.boost;
  const tau = target > pulse.bpm ? 0.5 : 2.4; // quick to rise, slow to calm
  pulse.bpm += (target - pulse.bpm) * (1 - Math.exp(-dt / tau));
  pulse.phase += (dt * pulse.bpm) / 60;
  if (pulse.phase >= 1) {
    pulse.phase %= 1;
    listeners.forEach((fn) => fn());
  }
}

const gauss = (p, c, w) => Math.exp(-(((p - c) / w) ** 2));

// Lead-II style ECG waveform for one cycle (P, QRS, T). Range ~ -0.3..1.
export function ecgWave(p) {
  return 0.11 * gauss(p, 0.08, 0.025)
    - 0.12 * gauss(p, 0.172, 0.007)
    + 1.0 * gauss(p, 0.19, 0.009)
    - 0.28 * gauss(p, 0.207, 0.008)
    + 0.24 * gauss(p, 0.4, 0.045);
}

const easeOutCubic = (x) => 1 - (1 - x) ** 3;
const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

// A single contraction: fast systolic squeeze, slower diastolic release.
function contraction(p, start, width) {
  const u = (p - start) / width;
  if (u < 0 || u > 1) return 0;
  return u < 0.28 ? easeOutCubic(u / 0.28) : 1 - easeInOutSine((u - 0.28) / 0.72);
}

// Mechanical beat for a cycle phase. "lub" + softer "dub", atrial kick before the next beat.
// Mechanical systole follows the R wave, so it is offset from the ECG phase.
export function beat(phase) {
  const p = (phase - 0.2 + 1) % 1;
  return {
    lub: contraction(p, 0.0, 0.2),
    dub: contraction(p, 0.17, 0.26),
    atrial: contraction((p + 0.12) % 1, 0.0, 0.14),
  };
}
