import { getAchievements } from "@/game/storage";
import { ACHIEVEMENTS } from "@/game/achievements";
import { Sfx } from "@/game/sound";

interface Props {
  onBack: () => void;
}

export function AchievementsScreen({ onBack }: Props) {
  const earnedIds = new Set(getAchievements());
  const earnedCount = earnedIds.size;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between bg-card/80 p-3 shadow-sm backdrop-blur">
        <button
          onClick={() => { Sfx.click(); onBack(); }}
          className="rounded-full bg-primary/15 px-4 py-2 text-base font-bold text-primary"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold text-foreground">Achievements</h2>
        <div className="w-16 text-right text-sm font-bold text-muted-foreground">
          {earnedCount}/{ACHIEVEMENTS.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-sm">
          <div className="mb-4 rounded-2xl bg-card/80 p-4 text-center shadow-md backdrop-blur">
            <div className="text-3xl">🏆</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{earnedCount} / {ACHIEVEMENTS.length}</div>
            <div className="text-sm text-muted-foreground">Achievements Unlocked</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                style={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {ACHIEVEMENTS.map(a => {
              const earned = earnedIds.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-2xl bg-card/80 px-4 py-3 shadow-md backdrop-blur transition-all ${
                    earned ? "" : "opacity-40 grayscale"
                  }`}
                >
                  <span className="text-3xl">{a.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-foreground">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </div>
                  {earned ? (
                    <span className="text-lg text-green-500">✓</span>
                  ) : (
                    <span className="text-lg">🔒</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
