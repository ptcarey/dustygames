import { useEffect, useRef } from "react";
import { LEVELS } from "@/game/levels";
import { STAGES, FINAL_LEVEL_ID } from "@/game/stages";
import { Sfx } from "@/game/sound";
import { StageDecor } from "./StageDecor";

interface Props {
  unlocked: number;
  lastPlayed?: number;
  onSelect: (levelId: number) => void;
  onBack: () => void;
}

/**
 * Treasure-map level select.
 *
 * Layout: a vertically scrolling map made of 6 themed stage panels stacked
 * top-to-bottom. Inside each panel an SVG winding path connects the 10 level
 * "stamps". Roughly ~15 levels are visible at once on a typical phone; the
 * user scrolls so the most recently played level sits near the top.
 */
export function LevelSelect({ unlocked, lastPlayed, onSelect, onBack }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Highlight the level the player most recently entered (or the highest unlocked as fallback).
  const focusLevel = lastPlayed && lastPlayed >= 1 ? lastPlayed : unlocked;

  useEffect(() => {
    // Scroll so the focused level is near the top of the visible map.
    activeRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between bg-card/80 p-3 shadow-sm backdrop-blur">
        <button
          onClick={() => { Sfx.click(); onBack(); }}
          className="rounded-full bg-primary/15 px-4 py-2 text-base font-bold text-primary"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold text-foreground">Adventure Map</h2>
        <div className="w-16" />
      </div>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        {STAGES.map((stage) => {
          const stageLevels = LEVELS.filter(l => l.id >= stage.range[0] && l.id <= stage.range[1]);
          return (
            <section
              key={stage.id}
              className="relative px-3 pb-2 pt-3"
              style={{ background: stage.gradient }}
            >
              <StageDecor stageId={stage.id} />

              <header className="relative mb-2 flex items-center justify-between rounded-2xl bg-card/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{stage.emoji}</span>
                  <h3 className="text-base font-bold text-foreground">
                    Stage {stage.id} · {stage.name}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-foreground/70">
                  {stage.range[0]}–{stage.range[1]}
                </span>
              </header>

              <div className="relative">
              <StagePath
                stage={stage}
                levels={stageLevels}
                unlocked={unlocked}
                focusLevel={focusLevel}
                onSelect={onSelect}
                activeRef={activeRef}
              />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface StagePathProps {
  stage: typeof STAGES[number];
  levels: typeof LEVELS;
  unlocked: number;
  focusLevel: number;
  onSelect: (id: number) => void;
  activeRef: React.RefObject<HTMLButtonElement>;
}

/**
 * Renders a winding path of 10 level stamps inside a single stage panel.
 * Stamps zig-zag left-right to feel hand-drawn. The connecting line is an
 * SVG curve drawn behind the stamps.
 */
function StagePath({ stage, levels, unlocked, focusLevel, onSelect, activeRef }: StagePathProps) {
  const STAMP = 64;            // px size of each level stamp
  const ROW_HEIGHT = 86;       // vertical spacing between stamps
  const WIDTH_PCT = 70;        // horizontal swing width (% of container)
  const containerHeight = ROW_HEIGHT * levels.length + 12;

  // Hand-drawn-ish horizontal positions (% of container width).
  const xs = levels.map((_, i) => {
    const t = i / Math.max(1, levels.length - 1);
    // Sine swing for a winding path; slight phase offset per stage so stages don't all look identical.
    const swing = Math.sin(t * Math.PI * 1.6 + stage.id * 0.7);
    return 50 + swing * (WIDTH_PCT / 2);
  });

  // Build SVG path as smooth curves connecting consecutive stamps.
  const pathD = xs.reduce((acc, x, i) => {
    const y = i * ROW_HEIGHT + STAMP / 2 + 6;
    if (i === 0) return `M ${x} ${y}`;
    const prevX = xs[i - 1];
    const prevY = (i - 1) * ROW_HEIGHT + STAMP / 2 + 6;
    const midY = (prevY + y) / 2;
    return `${acc} C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`;
  }, "");

  const isFinale = (id: number) => id === FINAL_LEVEL_ID;

  return (
    <div className="relative mx-auto" style={{ height: containerHeight, maxWidth: 420 }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${containerHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Dashed treasure-map path */}
        <path
          d={pathD}
          fill="none"
          stroke={stage.accent}
          strokeWidth="0.9"
          strokeDasharray="2 1.5"
          strokeLinecap="round"
          opacity="0.75"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {levels.map((lvl, i) => {
        const x = xs[i];
        const y = i * ROW_HEIGHT + 6;
        const locked = lvl.id > unlocked;
        const isCurrent = lvl.id === focusLevel;
        const finale = isFinale(lvl.id);
        return (
          <button
            key={lvl.id}
            ref={isCurrent ? activeRef : undefined}
            disabled={locked}
            onClick={() => { Sfx.click(); onSelect(lvl.id); }}
            className={`absolute flex flex-col items-center transition-transform active:scale-95 ${
              locked ? "opacity-60" : ""
            }`}
            style={{
              left: `${x}%`,
              top: y,
              width: STAMP,
              transform: "translateX(-50%)",
            }}
          >
            <div
              className={`flex items-center justify-center rounded-full border-4 text-lg font-bold shadow-lg ${
                finale
                  ? "bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-900"
                  : locked
                    ? "bg-muted text-muted-foreground"
                    : "bg-card text-foreground"
              }`}
              style={{
                width: STAMP,
                height: STAMP,
                borderColor: locked ? "hsl(var(--muted))" : stage.accent,
              }}
            >
              {locked ? "🔒" : finale ? "👑" : lvl.id}
            </div>
            <div className="mt-1 max-w-[110px] text-center text-[10px] font-semibold leading-tight text-foreground/90 drop-shadow">
              {lvl.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
