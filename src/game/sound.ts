/**
 * Tiny WebAudio sound engine. Lightweight, no asset files.
 * Generates kid-friendly bleeps/pops procedurally so the PWA bundle stays small.
 */
let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15, slideTo?: number) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  }
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const Sfx = {
  pop: (chainIndex = 0) => {
    const base = 600 + chainIndex * 80;
    tone(base, 0.12, "triangle", 0.18, base * 1.6);
  },
  shoot: () => tone(220, 0.08, "square", 0.1, 320),
  squeak: () => {
    tone(900, 0.12, "sine", 0.2, 1500);
    setTimeout(() => tone(1300, 0.1, "sine", 0.18, 1700), 80);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.2), i * 110));
  },
  lose: () => {
    [440, 330, 220].forEach((f, i) => setTimeout(() => tone(f, 0.25, "sine", 0.18), i * 140));
  },
  click: () => tone(700, 0.05, "square", 0.1),
};
