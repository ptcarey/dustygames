import { loadSave, getTotalStars } from "@/game/storage";
import { CHARACTERS } from "@/characters/characters";
import { Sfx } from "@/game/sound";
import { Dusty } from "./Dusty";

interface Props {
  onBack: () => void;
}

export function PossumGallery({ onBack }: Props) {
  const save = loadSave();
  const totalRescued = save.totalPossumsRescued ?? 0;
  const totalStars = getTotalStars();
  const companions = CHARACTERS.filter(c => c.availability);

  const COSMETICS = [
    { name: "Golden Bowtie", stars: 10, icon: "🎀" },
    { name: "Rainbow Trail", stars: 30, icon: "🌈" },
    { name: "Sparkle Bubbles", stars: 60, icon: "✨" },
    { name: "Crown", stars: 90, icon: "👑" },
    { name: "Angel Wings", stars: 120, icon: "😇" },
    { name: "Star Aura", stars: 150, icon: "🌟" },
  ];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between bg-card/80 p-3 shadow-sm backdrop-blur">
        <button
          onClick={() => { Sfx.click(); onBack(); }}
          className="rounded-full bg-primary/15 px-4 py-2 text-base font-bold text-primary"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold text-foreground">Possum Gallery</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-sm">
          <div className="mb-4 rounded-2xl bg-card/80 p-4 text-center shadow-md backdrop-blur">
            <div className="text-3xl">🐾</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{totalRescued}</div>
            <div className="text-sm text-muted-foreground">Possums Rescued</div>
          </div>

          <h3 className="mb-3 text-lg font-bold text-foreground">Dusty's Friends</h3>
          <div className="grid grid-cols-2 gap-3">
            {CHARACTERS.filter(c => c.spriteRef).map(c => {
              const unlocked = !c.availability || (save.unlockedLevel ?? 1) >= c.availability.levels.from;
              return (
                <div
                  key={c.id}
                  className={`flex flex-col items-center rounded-2xl bg-card/80 p-3 shadow-md backdrop-blur ${unlocked ? "" : "opacity-40 grayscale"}`}
                >
                  <Dusty size={80} mood="idle" characterId={c.id} showBow={false} />
                  <div className="mt-1 text-sm font-bold text-foreground">{c.name}</div>
                  {c.backstory && (
                    <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{c.backstory}</div>
                  )}
                  {c.availability && (
                    <div className="mt-1 text-[9px] text-primary">
                      Levels {c.availability.levels.from}-{c.availability.levels.to}
                    </div>
                  )}
                  {!unlocked && <div className="mt-1 text-xs">🔒</div>}
                </div>
              );
            })}
          </div>

          {companions.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 text-lg font-bold text-foreground">Cosmetic Unlocks</h3>
              <div className="space-y-2 mb-4">
                {COSMETICS.map(c => (
                  <div
                    key={c.name}
                    className={`flex items-center gap-3 rounded-xl bg-card/80 px-3 py-2 shadow-sm backdrop-blur ${totalStars >= c.stars ? "" : "opacity-40"}`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">⭐ {c.stars} stars</div>
                    </div>
                    {totalStars >= c.stars ? (
                      <span className="text-green-500 font-bold">✓</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{c.stars - totalStars} more</span>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="mb-3 mt-6 text-lg font-bold text-foreground">Possum Milestones</h3>
              <div className="space-y-2">
                {[
                  { count: 10, label: "Possum Friend", icon: "🤗" },
                  { count: 50, label: "Possum Hero", icon: "🦸" },
                  { count: 100, label: "Possum Legend", icon: "👑" },
                ].map(m => (
                  <div
                    key={m.count}
                    className={`flex items-center gap-3 rounded-xl bg-card/80 px-3 py-2 shadow-sm backdrop-blur ${totalRescued >= m.count ? "" : "opacity-40"}`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-foreground">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.count} possums rescued</div>
                    </div>
                    {totalRescued >= m.count && <span className="ml-auto text-green-500">✓</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
