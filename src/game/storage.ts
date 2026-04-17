/**
 * Local persistence for game progress. localStorage only; no cloud, no auth.
 */
import type { GameSave } from "./types";

const KEY = "dusty-bubble-pop-save-v1";

const DEFAULT: GameSave = {
  unlockedLevel: 1,
  highScore: 0,
  audioEnabled: true,
};

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
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
