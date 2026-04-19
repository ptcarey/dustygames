/**
 * Decorative, low-opacity SVG backgrounds tailored to each stage's theme.
 * Rendered behind the level path. Kept small and sparse so level stamps stay obvious.
 */
interface Props {
  stageId: number;
}

export function StageDecor({ stageId }: Props) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {stageId === 1 && <SeaLife />}
      {stageId === 2 && <ToyWorld />}
      {stageId === 3 && <Forest />}
      {stageId === 4 && <SnowWorld />}
      {stageId === 5 && <FrostyBeach />}
      {stageId === 6 && <TeaParty />}
    </div>
  );
}

/* Each decor uses opacity ~0.18-0.28 so the colourful level stamps remain dominant. */

function SeaLife() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      <g opacity="0.22" fill="hsl(200 80% 35%)">
        {/* Bubbles */}
        {[
          [30, 80, 10], [60, 220, 6], [350, 140, 12], [380, 360, 8],
          [20, 460, 9], [370, 560, 7], [40, 700, 11], [360, 740, 6],
          [15, 320, 5], [385, 230, 5],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      {/* Wavy seaweed strands */}
      <g opacity="0.18" stroke="hsl(160 70% 30%)" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M10 800 Q 20 700 10 600 Q 0 500 10 420" />
        <path d="M390 800 Q 380 720 390 640 Q 400 560 390 480" />
      </g>
      {/* Tiny fish */}
      <g opacity="0.2" fill="hsl(45 90% 55%)">
        <path d="M340 60 l12 -6 l0 12 z M352 60 a6 6 0 1 1 0.1 0 z" />
        <path d="M30 540 l12 -6 l0 12 z M42 540 a6 6 0 1 1 0.1 0 z" />
      </g>
    </svg>
  );
}

function ToyWorld() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      <g opacity="0.22">
        {/* Building blocks */}
        <rect x="20" y="60" width="28" height="28" rx="4" fill="hsl(0 80% 60%)" />
        <rect x="48" y="60" width="28" height="28" rx="4" fill="hsl(45 90% 55%)" />
        <rect x="20" y="88" width="28" height="28" rx="4" fill="hsl(220 80% 60%)" />
        <rect x="350" y="320" width="26" height="26" rx="4" fill="hsl(140 60% 50%)" />
        <rect x="360" y="600" width="24" height="24" rx="4" fill="hsl(330 80% 65%)" />
        <rect x="14" y="450" width="22" height="22" rx="4" fill="hsl(45 95% 60%)" />
      </g>
      {/* Stars / sparkles */}
      <g opacity="0.25" fill="hsl(45 95% 55%)">
        {[[200, 30], [380, 200], [20, 250], [200, 760], [340, 730]].map(([cx, cy], i) => (
          <polygon
            key={i}
            points={`${cx},${cy - 8} ${cx + 2},${cy - 2} ${cx + 8},${cy} ${cx + 2},${cy + 2} ${cx},${cy + 8} ${cx - 2},${cy + 2} ${cx - 8},${cy} ${cx - 2},${cy - 2}`}
          />
        ))}
      </g>
      {/* Polka dots */}
      <g opacity="0.15" fill="hsl(330 80% 55%)">
        {[[100, 400], [300, 500], [80, 650], [320, 80], [200, 200]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="6" />
        ))}
      </g>
    </svg>
  );
}

function Forest() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      {/* Pine trees */}
      <g opacity="0.22" fill="hsl(140 55% 28%)">
        {[[20, 120], [375, 260], [15, 480], [380, 600], [25, 730]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <polygon points="0,-22 -14,4 14,4" />
            <polygon points="0,-10 -16,16 16,16" />
            <rect x="-3" y="14" width="6" height="8" fill="hsl(25 50% 30%)" />
          </g>
        ))}
      </g>
      {/* Mushrooms */}
      <g opacity="0.25">
        {[[60, 350], [340, 420], [200, 770]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M-10 0 a10 6 0 0 1 20 0 z" fill="hsl(0 70% 55%)" />
            <rect x="-3" y="0" width="6" height="8" fill="hsl(40 30% 90%)" />
            <circle cx="-4" cy="-2" r="1.5" fill="hsl(40 30% 95%)" />
            <circle cx="3" cy="-3" r="1.5" fill="hsl(40 30% 95%)" />
          </g>
        ))}
      </g>
      {/* Leaves */}
      <g opacity="0.18" fill="hsl(90 60% 40%)">
        {[[110, 60], [290, 180], [120, 560], [310, 700]].map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx="8" ry="4" transform={`rotate(${i * 35} ${cx} ${cy})`} />
        ))}
      </g>
    </svg>
  );
}

function SnowWorld() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      {/* Snowflakes */}
      <g opacity="0.5" stroke="hsl(0 0% 100%)" strokeWidth="1.4" strokeLinecap="round">
        {[
          [40, 70, 6], [360, 130, 8], [30, 260, 5], [380, 330, 7],
          [60, 480, 6], [340, 540, 9], [20, 640, 5], [370, 720, 6],
          [200, 40, 7], [200, 780, 6],
        ].map(([cx, cy, r], i) => (
          <g key={i} transform={`translate(${cx} ${cy})`}>
            <line x1={-r} y1="0" x2={r} y2="0" />
            <line x1="0" y1={-r} x2="0" y2={r} />
            <line x1={-r * 0.7} y1={-r * 0.7} x2={r * 0.7} y2={r * 0.7} />
            <line x1={-r * 0.7} y1={r * 0.7} x2={r * 0.7} y2={-r * 0.7} />
          </g>
        ))}
      </g>
      {/* Snow drifts */}
      <g opacity="0.45" fill="hsl(0 0% 100%)">
        <path d="M0 800 Q 100 760 200 780 T 400 770 L 400 800 Z" />
        <path d="M0 420 Q 80 400 160 415 T 320 410 L 400 415 L 400 425 Q 300 430 200 425 T 0 430 Z" />
      </g>
    </svg>
  );
}

function FrostyBeach() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      {/* Sandy ground dots */}
      <g opacity="0.25" fill="hsl(35 60% 40%)">
        {Array.from({ length: 30 }).map((_, i) => (
          <circle key={i} cx={(i * 47) % 400} cy={(i * 113) % 800} r={1.5 + (i % 3)} />
        ))}
      </g>
      {/* Shells */}
      <g opacity="0.3" fill="hsl(20 70% 70%)" stroke="hsl(20 60% 45%)" strokeWidth="1">
        {[[40, 200], [360, 380], [50, 600]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 8 Q -10 -8 0 -10 Q 10 -8 0 8 Z" />
            <line x1="0" y1="-10" x2="0" y2="8" />
            <line x1="-3" y1="-8" x2="-1" y2="6" />
            <line x1="3" y1="-8" x2="1" y2="6" />
          </g>
        ))}
      </g>
      {/* Snowflakes mixed in */}
      <g opacity="0.45" stroke="hsl(0 0% 100%)" strokeWidth="1.2" strokeLinecap="round">
        {[[200, 80, 6], [340, 250, 5], [60, 470, 6], [310, 700, 5]].map(([cx, cy, r], i) => (
          <g key={i} transform={`translate(${cx} ${cy})`}>
            <line x1={-r} y1="0" x2={r} y2="0" />
            <line x1="0" y1={-r} x2="0" y2={r} />
            <line x1={-r * 0.7} y1={-r * 0.7} x2={r * 0.7} y2={r * 0.7} />
            <line x1={-r * 0.7} y1={r * 0.7} x2={r * 0.7} y2={-r * 0.7} />
          </g>
        ))}
      </g>
      {/* Tiny starfish */}
      <g opacity="0.3" fill="hsl(15 75% 55%)">
        <polygon points="380,560 384,568 392,568 386,574 388,582 380,578 372,582 374,574 368,568 376,568" />
      </g>
    </svg>
  );
}

function TeaParty() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      {/* Polka dot lace background */}
      <g opacity="0.18" fill="hsl(340 70% 45%)">
        {Array.from({ length: 24 }).map((_, i) => (
          <circle key={i} cx={(i * 67) % 400} cy={(i * 131) % 800} r="3" />
        ))}
      </g>
      {/* Tiny teacups */}
      <g opacity="0.3">
        {[[40, 140], [360, 320], [30, 540], [370, 680]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M-10 -4 h20 v8 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6 z" fill="hsl(0 0% 100%)" stroke="hsl(340 60% 40%)" strokeWidth="1" />
            <path d="M10 -2 q6 0 6 6 q0 6 -6 6" fill="none" stroke="hsl(340 60% 40%)" strokeWidth="1" />
            {/* Steam */}
            <path d="M-2 -10 q-3 -4 0 -8" stroke="hsl(0 0% 100%)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M3 -10 q3 -4 0 -8" stroke="hsl(0 0% 100%)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>
      {/* Hearts */}
      <g opacity="0.25" fill="hsl(340 80% 60%)">
        {[[200, 60], [110, 400], [290, 500], [200, 760]].map(([x, y], i) => (
          <path key={i} transform={`translate(${x} ${y})`} d="M0 4 C -6 -2 -10 -8 -4 -10 C -1 -10 0 -8 0 -6 C 0 -8 1 -10 4 -10 C 10 -8 6 -2 0 4 Z" />
        ))}
      </g>
    </svg>
  );
}
