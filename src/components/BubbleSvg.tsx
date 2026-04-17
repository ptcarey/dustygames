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
  const id = `grad-${color}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="35%" stopColor={COLOR_HSL[color]} stopOpacity="0.95" />
          <stop offset="100%" stopColor={COLOR_HSL[color]} stopOpacity="1" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${id})`} stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
      <ellipse cx="22" cy="20" rx="8" ry="5" fill="white" opacity="0.7" />
      {hasPossum && <PossumFace cx={32} cy={36} scale={0.55} />}
    </svg>
  );
}

export function PossumFace({ cx = 32, cy = 32, scale = 1 }: { cx?: number; cy?: number; scale?: number }) {
  const s = scale;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      {/* head */}
      <ellipse cx="0" cy="0" rx="18" ry="15" fill="hsl(var(--possum-fur))" />
      {/* belly snout */}
      <ellipse cx="0" cy="6" rx="10" ry="7" fill="hsl(var(--possum-belly))" />
      {/* ears */}
      <circle cx="-13" cy="-12" r="5" fill="hsl(var(--possum-fur))" />
      <circle cx="13" cy="-12" r="5" fill="hsl(var(--possum-fur))" />
      <circle cx="-13" cy="-12" r="2.5" fill="hsl(330 80% 80%)" />
      <circle cx="13" cy="-12" r="2.5" fill="hsl(330 80% 80%)" />
      {/* eyes */}
      <circle cx="-6" cy="-2" r="2.2" fill="#1a1a1a" />
      <circle cx="6" cy="-2" r="2.2" fill="#1a1a1a" />
      <circle cx="-5.4" cy="-2.6" r="0.7" fill="white" />
      <circle cx="6.6" cy="-2.6" r="0.7" fill="white" />
      {/* nose */}
      <ellipse cx="0" cy="3" rx="1.5" ry="1.2" fill="#2a2a2a" />
    </g>
  );
}
