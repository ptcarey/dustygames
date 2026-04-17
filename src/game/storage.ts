/**
 * Local persistence for game progress. localStorage only; no cloud, no auth.
 */
import type { GameSave } from "./types";
import { TOTAL_LEVELS } from "./levels";

const KEY = "dusty-bubble-pop-save-v1";

// During development all levels are unlocked so we can jump straight to any
// level for testing. In production the player must earn each unlock.
const DEV_UNLOCK_ALL = import.meta.env.DEV;

const DEFAULT: GameSave = {
  unlockedLevel: TOTAL_LEVELS,
  highScore: 0,
  audioEnabled: true,
};

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(KEY);
    const base = raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
    // All levels are always unlocked
    base.unlockedLevel = TOTAL_LEVELS;
    return base;
  } catch {
    return { ...DEFAULT };
  }
}

export function writeSave(save: GameSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // storage may be unavailable (private mode); silently ignore
  }
}

export function unlockLevel(n: number) {
  const s = loadSave();
  if (n > s.unlockedLevel) {
    s.unlockedLevel = n;
    writeSave(s);
  }
}

export function setHighScore(score: number) {
  const s = loadSave();
  if (score > s.highScore) {
    s.highScore = score;
    writeSave(s);
  }
}

export function setAudioEnabled(enabled: boolean) {
  const s = loadSave();
  s.audioEnabled = enabled;
  writeSave(s);
}
