/**
 * Local persistence for game progress. localStorage only; no cloud, no auth.
 */
import type { GameSave } from "./types";
import { TOTAL_LEVELS } from "./levels";

const KEY = "dusty-bubble-pop-save-v1";
const ACTIVE_CHARACTER_KEY = "dusty-bubble-pop-active-character-v1";
const DEFAULT_ACTIVE_CHARACTER_ID = "dusty";

const DEFAULT: GameSave = {
  unlockedLevel: TOTAL_LEVELS,
  highScore: 0,
  audioEnabled: true,
  lastPlayedLevel: 1,
  stars: {},
  totalPossumsRescued: 0,
  achievements: [],
  bestShots: {},
  hintsRemaining: 3,
  lastHintRefill: new Date().toISOString().slice(0, 10),
  colorblindMode: false,
};

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(KEY);
    const base = raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
    base.unlockedLevel = TOTAL_LEVELS;
    if (!base.stars) base.stars = {};
    if (!base.achievements) base.achievements = [];
    if (!base.bestShots) base.bestShots = {};
    refillHintsIfNewDay(base);
    return base;
  } catch {
    return { ...DEFAULT };
  }
}

function refillHintsIfNewDay(save: GameSave) {
  const today = new Date().toISOString().slice(0, 10);
  if (save.lastHintRefill !== today) {
    save.hintsRemaining = 3;
    save.lastHintRefill = today;
  }
}

export function writeSave(save: GameSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {}
}

export function unlockLevel(n: number) {
  const s = loadSave();
  if (n > s.unlockedLevel) { s.unlockedLevel = n; writeSave(s); }
}

export function setHighScore(score: number) {
  const s = loadSave();
  if (score > s.highScore) { s.highScore = score; writeSave(s); }
}

export function setAudioEnabled(enabled: boolean) {
  const s = loadSave();
  s.audioEnabled = enabled;
  writeSave(s);
}

export function setLastPlayedLevel(levelId: number) {
  const s = loadSave();
  s.lastPlayedLevel = levelId;
  writeSave(s);
}

export function setStars(levelId: number, stars: number) {
  const s = loadSave();
  if (!s.stars) s.stars = {};
  const existing = s.stars[levelId] ?? 0;
  if (stars > existing) { s.stars[levelId] = stars; writeSave(s); }
}

export function addPossumsRescued(count: number) {
  const s = loadSave();
  s.totalPossumsRescued = (s.totalPossumsRescued ?? 0) + count;
  writeSave(s);
  return s.totalPossumsRescued;
}

export function setBestShots(levelId: number, shotsUsed: number) {
  const s = loadSave();
  if (!s.bestShots) s.bestShots = {};
  const existing = s.bestShots[levelId] ?? Infinity;
  if (shotsUsed < existing) { s.bestShots[levelId] = shotsUsed; writeSave(s); }
}

export function useHint(): boolean {
  const s = loadSave();
  if ((s.hintsRemaining ?? 0) <= 0) return false;
  s.hintsRemaining = (s.hintsRemaining ?? 0) - 1;
  writeSave(s);
  return true;
}

export function getHintsRemaining(): number {
  return loadSave().hintsRemaining ?? 0;
}

export function addAchievement(id: string): boolean {
  const s = loadSave();
  if (!s.achievements) s.achievements = [];
  if (s.achievements.includes(id)) return false;
  s.achievements.push(id);
  writeSave(s);
  return true;
}

export function getAchievements(): string[] {
  return loadSave().achievements ?? [];
}

export function setColorblindMode(on: boolean) {
  const s = loadSave();
  s.colorblindMode = on;
  writeSave(s);
}

export function isColorblindMode(): boolean {
  return loadSave().colorblindMode ?? false;
}

export function getTotalStars(): number {
  const s = loadSave();
  return Object.values(s.stars ?? {}).reduce((a, b) => a + b, 0);
}

export function getActiveCharacterId(): string {
  try {
    return localStorage.getItem(ACTIVE_CHARACTER_KEY) ?? DEFAULT_ACTIVE_CHARACTER_ID;
  } catch {
    return DEFAULT_ACTIVE_CHARACTER_ID;
  }
}

export function setActiveCharacterId(id: string) {
  try {
    localStorage.setItem(ACTIVE_CHARACTER_KEY, id);
  } catch {}
}
