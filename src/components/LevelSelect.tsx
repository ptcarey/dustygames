import { LEVELS } from "@/game/levels";
import { Sfx } from "@/game/sound";

interface Props {
  unlocked: number;
  onSelect: (levelId: number) => void;
  onBack: () => void;
}

export function LevelSelect({ unlocked, onSelect, onBack }: Props) {
  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => { Sfx.click(); onBack(); }}
          className="rounded-full bg-card/90 px-4 py-2 text-base font-bold shadow-md"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-foreground">Pick a Level</h2>
        <div className="w-16" />
      </div>

      <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto pb-4 sm:grid-cols-4">
        {LEVELS.map((lvl) => {
          const locked = lvl.id > unlocked;
          return (
            <button
              key={lvl.id}
              disabled={locked}
              onClick={() => { Sfx.click(); onSelect(lvl.id); }}
              className={`group flex aspect-square flex-col items-center justify-center rounded-3xl p-2 text-center shadow-md transition-transform ${
                locked
                  ? "bg-muted/60 text-muted-foreground"
                  : "bg-card text-foreground active:scale-95"
              }`}
            >
              <div className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold ${
                locked ? "bg-muted" : "bg-primary text-primary-foreground"
              }`}>
                {locked ? "🔒" : lvl.id}
              </div>
              <div className="text-[11px] font-semibold leading-tight">{lvl.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
