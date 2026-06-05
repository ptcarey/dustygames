/**
 * Achievement definitions and checking logic.
 */
import { addAchievement, getAchievements, loadSave } from "./storage";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-pop", title: "First Pop!", description: "Pop your first bubble", icon: "🫧" },
  { id: "first-possum", title: "Possum Rescuer", description: "Rescue your first possum", icon: "🐾" },
  { id: "combo-5", title: "Combo King", description: "Pop 5+ bubbles in one shot", icon: "💥" },
  { id: "combo-10", title: "Mega Combo!", description: "Pop 10+ bubbles in one shot", icon: "🔥" },
  { id: "no-miss", title: "Sharpshooter", description: "Win a level without missing", icon: "🎯" },
  { id: "rescue-10", title: "Possum Friend", description: "Rescue 10 possums total", icon: "🤗" },
  { id: "rescue-50", title: "Possum Hero", description: "Rescue 50 possums total", icon: "🦸" },
  { id: "rescue-100", title: "Possum Legend", description: "Rescue 100 possums total", icon: "👑" },
  { id: "stars-30", title: "Star Collector", description: "Earn 30 stars", icon: "⭐" },
  { id: "stars-90", title: "Star Master", description: "Earn 90 stars", icon: "🌟" },
  { id: "stage-1", title: "Sea Explorer", description: "Complete Stage 1", icon: "🐚" },
  { id: "stage-2", title: "Toy Collector", description: "Complete Stage 2", icon: "🧸" },
  { id: "stage-3", title: "Forest Ranger", description: "Complete Stage 3", icon: "🌳" },
  { id: "stage-4", title: "Snow Walker", description: "Complete Stage 4", icon: "❄️" },
  { id: "stage-5", title: "Beach Comber", description: "Complete Stage 5", icon: "🏖️" },
  { id: "stage-6", title: "Tea Time!", description: "Complete Stage 6", icon: "🫖" },
  { id: "game-complete", title: "Reunited!", description: "Dusty found Matilda!", icon: "💖" },
  { id: "3-star-level", title: "Perfect Level", description: "Get 3 stars on any level", icon: "✨" },
  { id: "use-companion", title: "Team Player", description: "Use a companion for the first time", icon: "🐕" },
  { id: "pop-100", title: "Bubble Buster", description: "Pop 100 bubbles in a single level", icon: "💪" },
];

export function checkAchievements(context: {
  totalPops?: number;
  comboSize?: number;
  levelId?: number;
  levelWon?: boolean;
  shotsUsed?: number;
  totalShots?: number;
  usedCompanion?: boolean;
}): Achievement[] {
  const earned: Achievement[] = [];
  const save = loadSave();
  const existing = new Set(getAchievements());

  const tryEarn = (id: string) => {
    if (existing.has(id)) return;
    if (addAchievement(id)) {
      const a = ACHIEVEMENTS.find(a => a.id === id);
      if (a) earned.push(a);
    }
  };

  if (context.totalPops && context.totalPops >= 1) tryEarn("first-pop");
  if (context.totalPops && context.totalPops >= 100) tryEarn("pop-100");
  if (context.comboSize && context.comboSize >= 5) tryEarn("combo-5");
  if (context.comboSize && context.comboSize >= 10) tryEarn("combo-10");
  if (context.usedCompanion) tryEarn("use-companion");

  if (context.levelWon && context.shotsUsed !== undefined && context.totalShots !== undefined) {
    if (context.shotsUsed === context.totalShots) tryEarn("no-miss");
  }

  const possumsTotal = save.totalPossumsRescued ?? 0;
  if (possumsTotal >= 1) tryEarn("first-possum");
  if (possumsTotal >= 10) tryEarn("rescue-10");
  if (possumsTotal >= 50) tryEarn("rescue-50");
  if (possumsTotal >= 100) tryEarn("rescue-100");

  const stars = save.stars ?? {};
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  if (totalStars >= 30) tryEarn("stars-30");
  if (totalStars >= 90) tryEarn("stars-90");
  if (Object.values(stars).some(s => s === 3)) tryEarn("3-star-level");

  const stageEnds = [10, 20, 30, 40, 50, 60];
  const stageIds = ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6"];
  stageEnds.forEach((end, i) => {
    if ((save.unlockedLevel ?? 0) > end) tryEarn(stageIds[i]);
  });
  if (context.levelId === 60 && context.levelWon) tryEarn("game-complete");

  return earned;
}
