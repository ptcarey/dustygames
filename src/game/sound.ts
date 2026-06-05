/**
 * Tiny WebAudio sound engine. Lightweight, no asset files.
 * Generates kid-friendly bleeps/pops procedurally so the PWA bundle stays small.
 */
let ctx: AudioContext | null = null;
let enabled = true;
let musicGain: GainNode | null = null;
let musicPlaying = false;

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

export function isSoundEnabled() { return enabled; }

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (musicGain) musicGain.gain.value = v ? 0.08 : 0;
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

/**
 * Background music — a simple looping melody generated procedurally.
 * Each stage gets a different key/tempo feel.
 */
const STAGE_MELODIES: number[][] = [
  [523, 587, 659, 698, 784, 698, 659, 587], // Sea Life — C major ascending/descending
  [440, 523, 587, 659, 587, 523, 440, 523], // Toy World — bouncy A-C
  [392, 440, 523, 587, 523, 440, 392, 349], // Forest — earthy G scale
  [523, 659, 784, 880, 784, 659, 523, 440], // Snow World — bright C up high
  [349, 440, 523, 587, 523, 440, 349, 392], // Frosty Beach — mellow F
  [587, 659, 784, 880, 1046, 880, 784, 659], // Tea Party — elegant D scale
];

let musicTimers: ReturnType<typeof setTimeout>[] = [];
let musicLoop: ReturnType<typeof setTimeout> | null = null;

export function startMusic(stageIndex: number) {
  stopMusic();
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  musicGain = c.createGain();
  musicGain.gain.value = 0.08;
  musicGain.connect(c.destination);
  musicPlaying = true;
  const melody = STAGE_MELODIES[stageIndex % STAGE_MELODIES.length];
  const tempo = 280;

  const playLoop = () => {
    if (!musicPlaying || !enabled) return;
    musicTimers = [];
    melody.forEach((freq, i) => {
      const timer = setTimeout(() => {
        if (!musicPlaying || !enabled || !ctx || !musicGain) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(g).connect(musicGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }, i * tempo);
      musicTimers.push(timer);
    });
    musicLoop = setTimeout(playLoop, melody.length * tempo);
  };
  playLoop();
}

export function stopMusic() {
  musicPlaying = false;
  musicTimers.forEach(clearTimeout);
  musicTimers = [];
  if (musicLoop) clearTimeout(musicLoop);
  musicLoop = null;
}

/** Haptic feedback — short vibration on supported devices */
export function haptic(ms = 15) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

export const Sfx = {
  pop: (chainIndex = 0) => {
    const base = 600 + chainIndex * 80;
    tone(base, 0.12, "triangle", 0.18, base * 1.6);
    if (chainIndex > 0) haptic(10 + chainIndex * 5);
  },
  shoot: () => { tone(220, 0.08, "square", 0.1, 320); haptic(8); },
  squeak: (variant = 0) => {
    const bases = [[900, 1300, 1500, 1700], [1100, 1400, 1600, 1900], [700, 1100, 1300, 1500]];
    const b = bases[variant % bases.length];
    tone(b[0], 0.12, "sine", 0.2, b[1]);
    setTimeout(() => tone(b[2], 0.1, "sine", 0.18, b[3]), 80);
  },
  combo: (count: number) => {
    const notes = [523, 659, 784, 1046, 1318];
    const n = Math.min(count, notes.length);
    for (let i = 0; i < n; i++) {
      setTimeout(() => tone(notes[i], 0.15, "triangle", 0.22), i * 60);
    }
    haptic(20 + count * 10);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.2), i * 110));
    haptic(50);
  },
  lose: () => {
    [440, 330, 220].forEach((f, i) => setTimeout(() => tone(f, 0.25, "sine", 0.18), i * 140));
  },
  click: () => { tone(700, 0.05, "square", 0.1); haptic(5); },
  powerUp: () => {
    [784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.25), i * 70));
    haptic(30);
  },
  star: () => {
    [1046, 1318, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.1, "sine", 0.2), i * 80));
  },
  hint: () => {
    tone(880, 0.15, "sine", 0.15, 1320);
  },
};
