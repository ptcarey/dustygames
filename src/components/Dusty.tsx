import { COLOR_HSL, type BubbleColor } from "@/game/types";
import dustyImg from "@/assets/dusty.png";

interface Props {
  size?: number;
  /** "idle" | "happy" | "wag" — drives subtle animations. */
  mood?: "idle" | "happy" | "wag";
  /** Color of the bubble Dusty is about to throw — shown as his bowtie. */
  ballColor?: BubbleColor;
  className?: string;
}

/**
 * Dusty — caramel cavoodle. Uses the official illustrated portrait,
 * with a small colored bowtie overlay matching the next bubble.
 */
export function Dusty({ size = 140, mood = "idle", ballColor, className }: Props) {
  const wrapAnim = mood === "happy" ? "animate-wiggle" : "";
  const bowFill = ballColor ? COLOR_HSL[ballColor] : "hsl(var(--primary))";
  // Image aspect ~422:677
  const w = size;
  const h = Math.round(size * (677 / 422));
  return (
    <div
      className={`relative inline-block ${wrapAnim} ${className ?? ""}`}
      style={{ width: w, height: h }}
    >
      <img
        src={dustyImg}
        alt="Dusty the caramel cavoodle"
        width={w}
        height={h}
        draggable={false}
        className="block h-full w-full select-none"
      />
      {/* Bowtie overlay — color matches the bubble Dusty is about to throw */}
      <svg
        viewBox="0 0 100 40"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{ top: `${h * 0.62}px`, width: `${w * 0.42}px`, height: "auto" }}
      >
        <path
          d="M10 6 L42 20 L10 34 Z"
          fill={bowFill}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M90 6 L58 20 L90 34 Z"
          fill={bowFill}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="20" r="9" fill={bowFill} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
        <circle cx="47" cy="17" r="2.5" fill="rgba(255,255,255,0.7)" />
      </svg>
    </div>
  );
}
