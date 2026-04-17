import { COLOR_HSL, type BubbleColor } from "@/game/types";

interface Props {
  size?: number;
  /** "idle" | "happy" | "wag" — drives subtle animations. */
  mood?: "idle" | "happy" | "wag";
  /** Color of the bubble Dusty is about to throw — shown as his bowtie. */
  ballColor?: BubbleColor;
  className?: string;
}

/**
 * Dusty — caramel cavoodle. Pure SVG, kid-friendly cartoon.
 * The whole body wiggles on "happy". The tail wags on "wag".
 * Bowtie color hints at the next bubble he will shoot.
 */
export function Dusty({ size = 140, mood = "idle", ballColor, className }: Props) {
  const wrapAnim = mood === "happy" ? "animate-wiggle" : "";
  const tailAnim = mood === "wag" || mood === "happy" ? "animate-tail-wag" : "";
  const bowFill = ballColor ? COLOR_HSL[ballColor] : "hsl(var(--primary))";
  return (
    <div className={`inline-block ${wrapAnim} ${className ?? ""}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <radialGradient id="dustyFur" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(32 70% 78%)" />
            <stop offset="100%" stopColor="hsl(var(--dusty-fur))" />
          </radialGradient>
        </defs>

        {/* tail */}
        <g transform="translate(40 130)" className={tailAnim} style={{ transformOrigin: "100% 100%" }}>
          <ellipse cx="0" cy="0" rx="14" ry="22" fill="hsl(var(--dusty-fur-2))" />
          <ellipse cx="-2" cy="-12" rx="10" ry="12" fill="hsl(var(--dusty-fur))" />
        </g>

        {/* body */}
        <ellipse cx="100" cy="145" rx="55" ry="42" fill="url(#dustyFur)" />
        <ellipse cx="100" cy="160" rx="32" ry="20" fill="hsl(35 55% 88%)" opacity="0.7" />

        {/* paws */}
        <ellipse cx="78" cy="180" rx="12" ry="8" fill="hsl(var(--dusty-fur-2))" />
        <ellipse cx="122" cy="180" rx="12" ry="8" fill="hsl(var(--dusty-fur-2))" />

        {/* head */}
        <circle cx="100" cy="90" r="50" fill="url(#dustyFur)" />

        {/* curly ears */}
        <g>
          <circle cx="55" cy="80" r="22" fill="hsl(var(--dusty-fur-2))" />
          <circle cx="48" cy="95" r="16" fill="hsl(var(--dusty-fur))" />
          <circle cx="145" cy="80" r="22" fill="hsl(var(--dusty-fur-2))" />
          <circle cx="152" cy="95" r="16" fill="hsl(var(--dusty-fur))" />
        </g>

        {/* fluffy top tuft */}
        <circle cx="85" cy="50" r="14" fill="hsl(var(--dusty-fur))" />
        <circle cx="105" cy="46" r="14" fill="hsl(var(--dusty-fur))" />
        <circle cx="120" cy="55" r="11" fill="hsl(var(--dusty-fur-2))" />

        {/* snout */}
        <ellipse cx="100" cy="108" rx="22" ry="16" fill="hsl(35 55% 92%)" />

        {/* eyes */}
        <circle cx="84" cy="88" r="6" fill="#1a1a1a" />
        <circle cx="116" cy="88" r="6" fill="#1a1a1a" />
        <circle cx="86" cy="86" r="1.8" fill="white" />
        <circle cx="118" cy="86" r="1.8" fill="white" />

        {/* nose + mouth */}
        <ellipse cx="100" cy="102" rx="5" ry="4" fill="hsl(var(--dusty-nose))" />
        <path d="M100 107 Q100 115 92 116" stroke="hsl(var(--dusty-nose))" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M100 107 Q100 115 108 116" stroke="hsl(var(--dusty-nose))" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* tongue */}
        <ellipse cx="100" cy="118" rx="4" ry="3" fill="hsl(var(--dusty-tongue))" />

        {/* cheek blush */}
        <ellipse cx="74" cy="105" rx="6" ry="3" fill="hsl(0 80% 75%)" opacity="0.5" />
        <ellipse cx="126" cy="105" rx="6" ry="3" fill="hsl(0 80% 75%)" opacity="0.5" />

        {/* bowtie / collar — colored to match the bubble Dusty will throw */}
        <g transform="translate(100 138)">
          <path d="M-18 -6 L-2 0 L-18 6 Z" fill={bowFill} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          <path d="M18 -6 L2 0 L18 6 Z" fill={bowFill} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          <circle cx="0" cy="0" r="5" fill={bowFill} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          <circle cx="-1.5" cy="-1.5" r="1.5" fill="rgba(255,255,255,0.7)" />
        </g>
      </svg>
    </div>
  );
}
