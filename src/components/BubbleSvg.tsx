import { COLOR_HSL } from "@/game/types";
import type { BubbleColor } from "@/game/types";

interface Props {
  color: BubbleColor;
  size?: number;
  hasPossum?: boolean;
  className?: string;
}

/**
 * SVG bubble visual — used in legends and HUD. Renders a shiny droplet bubble,
 * optionally with a tiny possum face inside.
 */
export function BubbleSvg({ color, size = 48, hasPossum = false, className }: Props) {
  const isRainbow = (color as string) === "rainbow";
  const id = `grad-${color}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      <defs>
        {isRainbow ? (
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0,85%,65%)" />
            <stop offset="25%" stopColor="hsl(48,95%,60%)" />
            <stop offset="50%" stopColor="hsl(140,65%,55%)" />
            <stop offset="75%" stopColor="hsl(210,90%,65%)" />
            <stop offset="100%" stopColor="hsl(280,70%,68%)" />
          </linearGradient>
        ) : (
          <radialGradient id={id} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="35%" stopColor={COLOR_HSL[color] ?? "gray"} stopOpacity="0.95" />
            <stop offset="100%" stopColor={COLOR_HSL[color] ?? "gray"} stopOpacity="1" />
          </radialGradient>
        )}
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${id})`} stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
      <ellipse cx="22" cy="20" rx="8" ry="5" fill="white" opacity="0.7" />
      {isRainbow && <text x="32" y="38" textAnchor="middle" fontSize="18" fill="white" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>🌈</text>}
      {hasPossum && <PossumFace cx={32} cy={36} scale={0.55} />}
    </svg>
  );
}

export function PossumFace({ cx = 32, cy = 32, scale = 1 }: { cx?: number; cy?: number; scale?: number }) {
  const s = scale;
  const fur = "hsl(30 20% 45%)";
  const belly = "hsl(40 30% 82%)";
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      {/* Pointed ears */}
      <polygon points="-14,-6 -10,-18 -6,-6" fill={fur} />
      <polygon points="14,-6 10,-18 6,-6" fill={fur} />
      {/* Pink inner ears */}
      <polygon points="-13,-7 -10,-15 -7,-7" fill="hsl(340 60% 75%)" />
      <polygon points="13,-7 10,-15 7,-7" fill="hsl(340 60% 75%)" />
      {/* Head */}
      <ellipse cx="0" cy="0" rx="16" ry="13" fill={fur} />
      {/* Lighter face patch */}
      <ellipse cx="0" cy="4" rx="9" ry="7" fill={belly} />
      {/* Large round eyes */}
      <circle cx="-5.5" cy="-2" r="3.2" fill="#1a1a1a" />
      <circle cx="5.5" cy="-2" r="3.2" fill="#1a1a1a" />
      <circle cx="-4.8" cy="-3" r="1.1" fill="white" />
      <circle cx="6.2" cy="-3" r="1.1" fill="white" />
      {/* Pointed nose */}
      <ellipse cx="0" cy="4" rx="1.8" ry="1.3" fill="#3a2a2a" />
      {/* Curled tail hint */}
      <path d="M16,8 A5,5 0 1,1 13,4" fill="none" stroke={fur} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}
