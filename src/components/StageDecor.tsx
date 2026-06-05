/**
 * Decorative, themed SVG + CSS backgrounds for each stage on the adventure map.
 * All visuals are pure SVG / CSS — no images — to keep bundle size tiny.
 */
interface Props {
  stageId: number;
}

export function StageDecor({ stageId }: Props) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden animate-parallax-drift"
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

// ---------------------------------------------------------------------------
// Stage 1 — Sea Life: underwater feel with fish, jellyfish, bubbles, coral
// ---------------------------------------------------------------------------

function SeaLife() {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
        {/* Wavy seaweed beds */}
        <g opacity="0.25" fill="none" strokeWidth="4" strokeLinecap="round">
          {[[15, "hsl(160 65% 35%)"], [385, "hsl(145 60% 30%)"], [12, "hsl(155 70% 38%)"], [388, "hsl(140 55% 32%)"]].map(
            ([x, color], i) => (
              <path
                key={i}
                d={`M${x} 900 Q ${+x + (i % 2 ? -12 : 12)} 780 ${x} 680 Q ${+x + (i % 2 ? 14 : -14)} 580 ${x} 500 Q ${+x + (i % 2 ? -10 : 10)} 420 ${x} 340`}
                stroke={color as string}
              />
            )
          )}
        </g>

        {/* Coral clusters */}
        <g opacity="0.3">
          <g transform="translate(30 850)">
            <path d="M0 0 Q-8 -20 -5 -35 M0 0 Q5 -25 8 -40 M0 0 Q-2 -22 -8 -30" stroke="hsl(350 70% 55%)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="-5" cy="-35" r="4" fill="hsl(350 70% 60%)" />
            <circle cx="8" cy="-40" r="4" fill="hsl(350 65% 55%)" />
            <circle cx="-8" cy="-30" r="3" fill="hsl(10 75% 60%)" />
          </g>
          <g transform="translate(370 870)">
            <path d="M0 0 Q6 -18 4 -32 M0 0 Q-4 -20 -6 -35 M0 0 Q1 -15 6 -25" stroke="hsl(30 80% 55%)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="4" cy="-32" r="3.5" fill="hsl(30 80% 60%)" />
            <circle cx="-6" cy="-35" r="3.5" fill="hsl(25 75% 55%)" />
            <circle cx="6" cy="-25" r="3" fill="hsl(35 85% 60%)" />
          </g>
        </g>

        {/* Rising bubbles */}
        {[
          [35, 750, 5, 8], [55, 600, 7, 11], [25, 400, 4, 6],
          [365, 820, 6, 9], [375, 550, 8, 13], [350, 300, 5, 7],
          [45, 200, 6, 10], [360, 120, 4, 7], [30, 100, 5, 8],
        ].map(([cx, cy, r, dur], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="hsl(195 80% 75%)"
            strokeWidth="1.2"
            opacity="0.4"
          >
            <animate attributeName="cy" values={`${cy};${+cy - 120};${cy}`} dur={`${dur}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur={`${dur}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Little fish */}
        {[
          [50, 150, 1, 10], [350, 350, -1, 12], [40, 550, 1, 14],
          [360, 700, -1, 9], [60, 450, 1, 11],
        ].map(([x, y, dir, dur], i) => (
          <g key={`fish-${i}`} opacity="0.35" transform={`translate(${x} ${y}) scale(${dir as number} 1)`}>
            <ellipse cx="0" cy="0" rx="10" ry="5" fill={i % 2 ? "hsl(35 90% 60%)" : "hsl(190 80% 55%)"} />
            <polygon points="-10,-4 -16,0 -10,4" fill={i % 2 ? "hsl(35 85% 55%)" : "hsl(190 75% 50%)"} />
            <circle cx="6" cy="-1.5" r="1.5" fill="hsl(0 0% 15%)" />
            <animate attributeName="transform" type="translate" values={`${x} ${y};${+x + (dir as number) * 40} ${+y - 5};${x} ${y}`} dur={`${dur}s`} repeatCount="indefinite" />
          </g>
        ))}

        {/* Jellyfish */}
        {[[370, 200, 7], [30, 680, 9]].map(([cx, cy, dur], i) => (
          <g key={`jelly-${i}`} opacity="0.25">
            <path d={`M${+cx - 12} ${cy} a12 10 0 0 1 24 0`} fill="hsl(280 60% 70%)" />
            {[-6, 0, 6].map((dx, j) => (
              <line key={j} x1={+cx + dx} y1={cy as number} x2={+cx + dx + (j % 2 ? 3 : -3)} y2={+cy + 18} stroke="hsl(280 50% 65%)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            ))}
            <animateTransform attributeName="transform" type="translate" values={`0 0;0 -15;0 0`} dur={`${dur}s`} repeatCount="indefinite" />
          </g>
        ))}
      </svg>

      {/* Wavy water surface */}
      <div className="absolute left-0 right-0 top-0 h-8 opacity-20">
        <svg viewBox="0 0 400 30" preserveAspectRatio="none" className="h-full w-full">
          <path d="M0 15 Q 50 5, 100 15 T 200 15 T 300 15 T 400 15 L 400 0 L 0 0 Z" fill="hsl(195 80% 45%)" />
        </svg>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stage 2 — Toy World: colourful blocks, wind-up keys, stars, bouncy ball
// ---------------------------------------------------------------------------

function ToyWorld() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
      {/* Scattered building blocks */}
      <g opacity="0.3">
        {[
          [22, 70, 30, "hsl(0 80% 60%)", 8], [52, 70, 30, "hsl(45 90% 55%)", 0],
          [22, 100, 30, "hsl(220 80% 60%)", -5], [52, 100, 30, "hsl(140 60% 50%)", 3],
          [345, 290, 26, "hsl(280 60% 60%)", 12], [371, 290, 26, "hsl(0 75% 55%)", -4],
          [345, 316, 26, "hsl(45 90% 60%)", 6],
          [18, 500, 24, "hsl(140 65% 50%)", -8], [42, 500, 24, "hsl(210 80% 55%)", 0],
          [355, 650, 28, "hsl(330 80% 60%)", 10],
          [20, 780, 22, "hsl(45 90% 60%)", -6],
        ].map(([x, y, s, fill, rot], i) => (
          <rect key={i} x={x as number} y={y as number} width={s as number} height={s as number} rx="4" fill={fill as string} transform={`rotate(${rot} ${+x + +s / 2} ${+y + +s / 2})`} />
        ))}
      </g>

      {/* Wind-up keys */}
      <g opacity="0.25" stroke="hsl(35 70% 40%)" fill="none" strokeWidth="2" strokeLinecap="round">
        {[[370, 140], [30, 350], [365, 520]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect x="-3" y="-12" width="6" height="12" rx="1" fill="hsl(40 60% 50%)" stroke="hsl(35 70% 40%)" />
            <circle cx="0" cy="-12" r="8" />
            <line x1="-6" y1="-12" x2="6" y2="-12" />
          </g>
        ))}
      </g>

      {/* Sparkle stars */}
      <g opacity="0.35" fill="hsl(50 95% 58%)">
        {[[200, 30], [380, 200], [20, 250], [200, 460], [350, 730], [100, 850], [60, 620]].map(([cx, cy], i) => (
          <polygon
            key={i}
            points={starPoints(cx as number, cy as number, i % 2 ? 6 : 8)}
          >
            <animate attributeName="opacity" values="0.35;0.15;0.35" dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />
          </polygon>
        ))}
      </g>

      {/* Bouncy ball */}
      <g opacity="0.3">
        <circle cx="360" cy="850" r="14" fill="hsl(350 80% 55%)" />
        <path d="M348 843 Q 360 838 372 843" stroke="hsl(0 0% 100%)" strokeWidth="1.5" fill="none" />
        <path d="M348 858 Q 360 862 372 858" stroke="hsl(350 60% 40%)" strokeWidth="1.5" fill="none" />
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="2s" repeatCount="indefinite" />
      </g>

      {/* Toy train tracks (dotted line near bottom) */}
      <g opacity="0.15">
        <line x1="0" y1="880" x2="400" y2="880" stroke="hsl(0 0% 30%)" strokeWidth="2" strokeDasharray="8 6" />
        <line x1="0" y1="886" x2="400" y2="886" stroke="hsl(0 0% 30%)" strokeWidth="2" strokeDasharray="8 6" />
      </g>
    </svg>
  );
}

function starPoints(cx: number, cy: number, r: number): string {
  const inner = r * 0.4;
  return Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");
}

// ---------------------------------------------------------------------------
// Stage 3 — Forest: trees, winding path, fireflies, mushrooms, ferns
// ---------------------------------------------------------------------------

function Forest() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
      {/* Earthy winding path down the centre */}
      <path
        d="M200 0 Q 160 80 200 160 Q 240 240 200 320 Q 160 400 200 480 Q 240 560 200 640 Q 160 720 200 800 Q 240 880 200 900"
        fill="none"
        stroke="hsl(30 40% 55%)"
        strokeWidth="40"
        opacity="0.15"
        strokeLinecap="round"
      />
      <path
        d="M200 0 Q 160 80 200 160 Q 240 240 200 320 Q 160 400 200 480 Q 240 560 200 640 Q 160 720 200 800 Q 240 880 200 900"
        fill="none"
        stroke="hsl(35 45% 65%)"
        strokeWidth="24"
        opacity="0.12"
        strokeLinecap="round"
        strokeDasharray="4 8"
      />

      {/* Pine trees — left side */}
      {[[10, 50, 1.0], [5, 200, 1.2], [15, 380, 0.9], [8, 560, 1.1], [12, 720, 1.0], [5, 860, 0.8]].map(
        ([x, y, s], i) => <PineTree key={`lt-${i}`} x={x as number} y={y as number} s={s as number} />
      )}
      {/* Pine trees — right side */}
      {[[370, 100, 1.1], [378, 280, 0.9], [365, 450, 1.2], [375, 620, 1.0], [370, 790, 1.1]].map(
        ([x, y, s], i) => <PineTree key={`rt-${i}`} x={x as number} y={y as number} s={s as number} />
      )}

      {/* Mushrooms along the path edge */}
      <g opacity="0.35">
        {[[65, 180], [340, 330], [75, 500], [330, 680], [60, 840]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="0" rx="8" ry="5" fill={i % 2 ? "hsl(0 70% 55%)" : "hsl(35 75% 55%)"} />
            <rect x="-2.5" y="0" width="5" height="8" rx="1" fill="hsl(40 30% 88%)" />
            <circle cx="-3" cy="-1" r="1.5" fill="hsl(40 30% 95%)" opacity="0.8" />
            <circle cx="4" cy="-2" r="1.2" fill="hsl(40 30% 95%)" opacity="0.8" />
          </g>
        ))}
      </g>

      {/* Ferns / leafy bits */}
      <g opacity="0.22" fill="hsl(120 50% 35%)">
        {[[80, 100, 20], [320, 230, -15], [90, 420, 25], [310, 570, -20], [85, 750, 15]].map(([cx, cy, rot], i) => (
          <g key={i} transform={`translate(${cx} ${cy}) rotate(${rot})`}>
            <ellipse cx="-8" cy="0" rx="10" ry="3.5" />
            <ellipse cx="8" cy="0" rx="10" ry="3.5" />
            <ellipse cx="0" cy="-6" rx="3.5" ry="8" />
          </g>
        ))}
      </g>

      {/* Fireflies (twinkling dots) */}
      {[
        [90, 150, 3.5], [310, 270, 4.2], [100, 430, 3.0], [290, 590, 4.8],
        [85, 680, 3.3], [320, 820, 4.0], [200, 350, 3.7],
      ].map(([cx, cy, dur], i) => (
        <circle key={`ff-${i}`} cx={cx} cy={cy} r="2.5" fill="hsl(55 100% 70%)">
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur={`${dur}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

function PineTree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g opacity="0.28" transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points="0,-30 -16,0 16,0" fill="hsl(140 50% 28%)" />
      <polygon points="0,-18 -20,12 20,12" fill="hsl(140 45% 25%)" />
      <polygon points="0,-6 -22,22 22,22" fill="hsl(135 40% 22%)" />
      <rect x="-4" y="20" width="8" height="12" rx="1" fill="hsl(25 45% 30%)" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Stage 4 — Snow World: falling snow, igloos, snow drifts, snowmen
// ---------------------------------------------------------------------------

function SnowWorld() {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
        {/* Snow drifts */}
        <g opacity="0.4" fill="hsl(210 40% 95%)">
          <path d="M0 900 Q 60 860 120 875 T 240 865 T 360 878 L 400 870 L 400 900 Z" />
          <path d="M0 450 Q 50 430 100 440 T 200 435 L 200 460 Q 100 455 50 450 Z" />
          <path d="M200 440 Q 280 425 360 435 L 400 430 L 400 460 Q 320 455 240 450 Z" />
        </g>

        {/* Igloo — left side */}
        <g opacity="0.3" transform="translate(30 820)">
          <path d="M-25 0 Q -25 -28 0 -32 Q 25 -28 25 0 Z" fill="hsl(210 30% 92%)" stroke="hsl(210 20% 75%)" strokeWidth="1.5" />
          <path d="M-8 0 Q -8 -10 0 -12 Q 8 -10 8 0" fill="hsl(215 35% 70%)" />
          {/* Ice block lines */}
          <line x1="-20" y1="-10" x2="20" y2="-10" stroke="hsl(210 20% 78%)" strokeWidth="0.8" />
          <line x1="-15" y1="-20" x2="15" y2="-20" stroke="hsl(210 20% 78%)" strokeWidth="0.8" />
        </g>

        {/* Igloo — right side */}
        <g opacity="0.3" transform="translate(370 480) scale(-1 1)">
          <path d="M-20 0 Q -20 -22 0 -26 Q 20 -22 20 0 Z" fill="hsl(210 30% 92%)" stroke="hsl(210 20% 75%)" strokeWidth="1.5" />
          <path d="M-6 0 Q -6 -8 0 -10 Q 6 -8 6 0" fill="hsl(215 35% 70%)" />
          <line x1="-16" y1="-8" x2="16" y2="-8" stroke="hsl(210 20% 78%)" strokeWidth="0.8" />
          <line x1="-12" y1="-16" x2="12" y2="-16" stroke="hsl(210 20% 78%)" strokeWidth="0.8" />
        </g>

        {/* Snowman */}
        <g opacity="0.3" transform="translate(365 250)">
          <circle cx="0" cy="15" r="14" fill="hsl(0 0% 96%)" stroke="hsl(210 15% 80%)" strokeWidth="1" />
          <circle cx="0" cy="-5" r="10" fill="hsl(0 0% 97%)" stroke="hsl(210 15% 80%)" strokeWidth="1" />
          <circle cx="0" cy="-20" r="7" fill="hsl(0 0% 98%)" stroke="hsl(210 15% 80%)" strokeWidth="1" />
          {/* Face */}
          <circle cx="-2.5" cy="-22" r="1" fill="hsl(0 0% 15%)" />
          <circle cx="2.5" cy="-22" r="1" fill="hsl(0 0% 15%)" />
          <path d="M0 -19 l2.5 2" stroke="hsl(25 80% 50%)" strokeWidth="1.5" strokeLinecap="round" />
          {/* Scarf */}
          <path d="M-8 -13 Q 0 -10 8 -13" stroke="hsl(0 70% 50%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <line x1="6" y1="-13" x2="8" y2="-5" stroke="hsl(0 70% 50%)" strokeWidth="2" strokeLinecap="round" />
          {/* Buttons */}
          <circle cx="0" cy="-2" r="1.2" fill="hsl(0 0% 15%)" />
          <circle cx="0" cy="6" r="1.2" fill="hsl(0 0% 15%)" />
        </g>

        {/* Snowman #2 — small */}
        <g opacity="0.25" transform="translate(35 600)">
          <circle cx="0" cy="8" r="10" fill="hsl(0 0% 96%)" stroke="hsl(210 15% 80%)" strokeWidth="1" />
          <circle cx="0" cy="-6" r="7" fill="hsl(0 0% 97%)" stroke="hsl(210 15% 80%)" strokeWidth="1" />
          <circle cx="-2" cy="-8" r="0.8" fill="hsl(0 0% 15%)" />
          <circle cx="2" cy="-8" r="0.8" fill="hsl(0 0% 15%)" />
          <path d="M-5 0 Q 0 2 5 0" stroke="hsl(140 60% 40%)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>

        {/* Decorative snowflakes (static) */}
        <g opacity="0.45" stroke="hsl(210 40% 85%)" strokeWidth="1.2" strokeLinecap="round">
          {[
            [50, 100, 7], [350, 180, 9], [40, 330, 6], [370, 400, 8],
            [200, 60, 8], [200, 700, 7],
          ].map(([cx, cy, r], i) => (
            <g key={i} transform={`translate(${cx} ${cy})`}>
              <line x1={-(r as number)} y1="0" x2={r as number} y2="0" />
              <line x1="0" y1={-(r as number)} x2="0" y2={r as number} />
              <line x1={-(r as number) * 0.7} y1={-(r as number) * 0.7} x2={(r as number) * 0.7} y2={(r as number) * 0.7} />
              <line x1={-(r as number) * 0.7} y1={(r as number) * 0.7} x2={(r as number) * 0.7} y2={-(r as number) * 0.7} />
              {/* Branch tips */}
              {[0, 90, 45, 135].map((angle, j) => {
                const rad = (angle * Math.PI) / 180;
                const bx = Math.cos(rad) * (r as number) * 0.5;
                const by = Math.sin(rad) * (r as number) * 0.5;
                return <circle key={j} cx={bx} cy={by} r="1" fill="hsl(210 40% 85%)" />;
              })}
            </g>
          ))}
        </g>
      </svg>

      {/* Falling snow CSS animation layer */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 2 + (i % 4),
              height: 2 + (i % 4),
              left: `${(i * 17 + 3) % 100}%`,
              top: `-${4 + (i % 8)}px`,
              opacity: 0.3 + (i % 3) * 0.15,
              animation: `snowfall ${6 + (i % 5) * 2}s linear ${(i * 0.4) % 6}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes snowfall {
          0% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { transform: translateY(50vh) translateX(${15}px); }
          100% { transform: translateY(105vh) translateX(-${10}px); opacity: 0.1; }
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stage 5 — Frosty Beach: sandy shore, gentle waves, bundled-up starfish
// ---------------------------------------------------------------------------

function FrostyBeach() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
      {/* Sandy ground */}
      <rect x="0" y="0" width="400" height="900" fill="url(#sand-dots)" opacity="0.12" />
      <defs>
        <pattern id="sand-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.8" fill="hsl(35 55% 45%)" />
          <circle cx="9" cy="9" r="0.6" fill="hsl(35 50% 40%)" />
        </pattern>
      </defs>

      {/* Gentle wave lines */}
      <g opacity="0.2" fill="none" stroke="hsl(200 70% 60%)" strokeWidth="2">
        <path d="M0 150 Q 50 140 100 150 T 200 150 T 300 150 T 400 150">
          <animate attributeName="d" values="M0 150 Q 50 140 100 150 T 200 150 T 300 150 T 400 150;M0 150 Q 50 160 100 150 T 200 150 T 300 150 T 400 150;M0 150 Q 50 140 100 150 T 200 150 T 300 150 T 400 150" dur="4s" repeatCount="indefinite" />
        </path>
        <path d="M0 500 Q 50 490 100 500 T 200 500 T 300 500 T 400 500">
          <animate attributeName="d" values="M0 500 Q 50 490 100 500 T 200 500 T 300 500 T 400 500;M0 500 Q 50 510 100 500 T 200 500 T 300 500 T 400 500;M0 500 Q 50 490 100 500 T 200 500 T 300 500 T 400 500" dur="5s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Seashells */}
      <g opacity="0.35">
        {[[35, 250], [365, 420], [40, 650], [360, 800]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${i * 25})`}>
            <path d="M0 7 Q -9 -7 0 -9 Q 9 -7 0 7 Z" fill="hsl(20 65% 75%)" stroke="hsl(20 55% 50%)" strokeWidth="0.8" />
            <line x1="0" y1="-9" x2="0" y2="7" stroke="hsl(20 50% 55%)" strokeWidth="0.6" />
            <line x1="-3" y1="-7" x2="-1" y2="5" stroke="hsl(20 50% 55%)" strokeWidth="0.5" />
            <line x1="3" y1="-7" x2="1" y2="5" stroke="hsl(20 50% 55%)" strokeWidth="0.5" />
          </g>
        ))}
      </g>

      {/* Starfish wearing a tiny scarf */}
      <g opacity="0.35" transform="translate(370 600)">
        <polygon points="0,-12 3,-4 12,-4 5,2 7,10 0,6 -7,10 -5,2 -12,-4 -3,-4" fill="hsl(15 75% 55%)" />
        <path d="M-5 -1 Q 0 2 5 -1" stroke="hsl(140 60% 45%)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="4" y1="-1" x2="7" y2="4" stroke="hsl(140 60% 45%)" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Crab in a beanie */}
      <g opacity="0.3" transform="translate(35 420)">
        <ellipse cx="0" cy="0" rx="10" ry="7" fill="hsl(10 70% 55%)" />
        {/* Claws */}
        <circle cx="-14" cy="2" r="4" fill="hsl(10 65% 50%)" />
        <circle cx="14" cy="2" r="4" fill="hsl(10 65% 50%)" />
        <line x1="-10" y1="0" x2="-14" y2="2" stroke="hsl(10 60% 45%)" strokeWidth="1.5" />
        <line x1="10" y1="0" x2="14" y2="2" stroke="hsl(10 60% 45%)" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="-3" cy="-3" r="1.5" fill="hsl(0 0% 15%)" />
        <circle cx="3" cy="-3" r="1.5" fill="hsl(0 0% 15%)" />
        {/* Beanie */}
        <path d="M-8 -5 Q 0 -14 8 -5" fill="hsl(280 60% 55%)" />
        <circle cx="0" cy="-13" r="2" fill="hsl(280 50% 70%)" />
      </g>

      {/* Scattered snowflakes (lighter than snow world) */}
      <g opacity="0.3" stroke="hsl(0 0% 100%)" strokeWidth="1" strokeLinecap="round">
        {[[200, 80, 5], [340, 300, 4], [60, 550, 5], [310, 750, 4]].map(([cx, cy, r], i) => (
          <g key={i} transform={`translate(${cx} ${cy})`}>
            <line x1={-(r as number)} y1="0" x2={r as number} y2="0" />
            <line x1="0" y1={-(r as number)} x2="0" y2={r as number} />
            <line x1={-(r as number) * 0.7} y1={-(r as number) * 0.7} x2={(r as number) * 0.7} y2={(r as number) * 0.7} />
          </g>
        ))}
      </g>

      {/* Sand castle */}
      <g opacity="0.25" transform="translate(365 200)">
        <rect x="-15" y="-5" width="30" height="20" rx="2" fill="hsl(42 60% 70%)" />
        <rect x="-10" y="-15" width="8" height="12" rx="1" fill="hsl(42 55% 65%)" />
        <rect x="2" y="-15" width="8" height="12" rx="1" fill="hsl(42 55% 65%)" />
        <rect x="-8" y="-18" width="4" height="4" rx="1" fill="hsl(42 50% 60%)" />
        <rect x="4" y="-18" width="4" height="4" rx="1" fill="hsl(42 50% 60%)" />
        {/* Little flag */}
        <line x1="6" y1="-18" x2="6" y2="-26" stroke="hsl(30 40% 45%)" strokeWidth="0.8" />
        <polygon points="6,-26 14,-23 6,-20" fill="hsl(0 70% 55%)" opacity="0.8" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stage 6 — Tea Party: teapots, tiered cake stands, lace, flowers, hearts
// ---------------------------------------------------------------------------

function TeaParty() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
      {/* Lace doily pattern — subtle background */}
      <g opacity="0.12" fill="hsl(340 60% 50%)">
        {Array.from({ length: 30 }).map((_, i) => (
          <circle key={i} cx={(i * 53 + 20) % 400} cy={(i * 107 + 15) % 900} r="2.5" />
        ))}
      </g>
      <g opacity="0.08" fill="none" stroke="hsl(340 50% 50%)" strokeWidth="0.6">
        {[[100, 200], [300, 500], [100, 700]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="40" strokeDasharray="3 4" />
        ))}
      </g>

      {/* Teapot — large, left side */}
      <g opacity="0.3" transform="translate(35 180)">
        {/* Body */}
        <ellipse cx="0" cy="0" rx="22" ry="16" fill="hsl(340 35% 85%)" stroke="hsl(340 40% 65%)" strokeWidth="1.2" />
        {/* Lid */}
        <path d="M-12 -14 Q 0 -18 12 -14" fill="hsl(340 35% 82%)" stroke="hsl(340 40% 65%)" strokeWidth="1" />
        <circle cx="0" cy="-18" r="3" fill="hsl(340 45% 70%)" />
        {/* Spout */}
        <path d="M20 -4 Q 30 -10 34 -18" stroke="hsl(340 40% 65%)" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Handle */}
        <path d="M-20 -6 Q -32 0 -20 8" stroke="hsl(340 40% 65%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Steam */}
        <path d="M-2 -24 Q -5 -32 -1 -38" stroke="hsl(0 0% 80%)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M4 -24 Q 7 -30 3 -36" stroke="hsl(0 0% 80%)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* Floral detail */}
        <circle cx="-4" cy="2" r="3" fill="hsl(350 70% 70%)" opacity="0.5" />
        <circle cx="5" cy="0" r="2.5" fill="hsl(350 70% 70%)" opacity="0.5" />
      </g>

      {/* Teacup — right side */}
      <g opacity="0.3" transform="translate(370 400)">
        <path d="M-14 -6 h28 v10 a8 8 0 0 1 -8 8 h-12 a8 8 0 0 1 -8 -8 z" fill="hsl(0 0% 98%)" stroke="hsl(340 50% 55%)" strokeWidth="1" />
        <path d="M14 -4 q8 0 8 7 q0 7 -8 7" fill="none" stroke="hsl(340 50% 55%)" strokeWidth="1.2" />
        {/* Saucer */}
        <ellipse cx="0" cy="14" rx="18" ry="4" fill="hsl(0 0% 95%)" stroke="hsl(340 40% 65%)" strokeWidth="0.8" />
        {/* Steam */}
        <path d="M-3 -12 q-4 -5 0 -10" stroke="hsl(0 0% 82%)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M4 -12 q4 -5 0 -10" stroke="hsl(0 0% 82%)" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>

      {/* Tiered cake stand */}
      <g opacity="0.25" transform="translate(35 600)">
        {/* Stand pole */}
        <line x1="0" y1="20" x2="0" y2="-25" stroke="hsl(40 30% 65%)" strokeWidth="2" />
        {/* Base */}
        <ellipse cx="0" cy="20" rx="20" ry="4" fill="hsl(40 25% 80%)" stroke="hsl(40 25% 60%)" strokeWidth="0.8" />
        {/* Bottom tier */}
        <ellipse cx="0" cy="8" rx="16" ry="3" fill="hsl(40 25% 85%)" stroke="hsl(40 25% 60%)" strokeWidth="0.8" />
        {/* Top tier */}
        <ellipse cx="0" cy="-6" rx="12" ry="2.5" fill="hsl(40 25% 87%)" stroke="hsl(40 25% 60%)" strokeWidth="0.8" />
        {/* Little cupcakes / macarons */}
        <circle cx="-6" cy="4" r="3" fill="hsl(330 70% 75%)" />
        <circle cx="6" cy="4" r="3" fill="hsl(50 80% 70%)" />
        <circle cx="-3" cy="-9" r="2.5" fill="hsl(140 50% 70%)" />
        <circle cx="4" cy="-9" r="2.5" fill="hsl(280 50% 75%)" />
      </g>

      {/* Scattered hearts */}
      <g opacity="0.25" fill="hsl(345 80% 65%)">
        {[[200, 50], [120, 300], [280, 550], [200, 800], [350, 150], [50, 750]].map(([x, y], i) => (
          <path key={i} transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.2})`} d="M0 5 C -7 -3 -11 -9 -5 -11 C -1 -11 0 -9 0 -7 C 0 -9 1 -11 5 -11 C 11 -9 7 -3 0 5 Z" />
        ))}
      </g>

      {/* Small flowers */}
      <g opacity="0.25">
        {[[360, 680, "hsl(350 70% 65%)"], [30, 460, "hsl(280 55% 65%)"], [370, 100, "hsl(340 65% 70%)"], [25, 840, "hsl(30 70% 65%)"]].map(
          ([cx, cy, color], i) => (
            <g key={i} transform={`translate(${cx} ${cy})`}>
              {[0, 72, 144, 216, 288].map((angle, j) => {
                const rad = (angle * Math.PI) / 180;
                return <ellipse key={j} cx={Math.cos(rad) * 5} cy={Math.sin(rad) * 5} rx="3.5" ry="2.5" fill={color as string} transform={`rotate(${angle} ${Math.cos(rad) * 5} ${Math.sin(rad) * 5})`} />;
              })}
              <circle cx="0" cy="0" r="2.5" fill="hsl(45 85% 65%)" />
            </g>
          )
        )}
      </g>

      {/* Teapot — smaller, right side near bottom */}
      <g opacity="0.22" transform="translate(365 750) scale(0.7)">
        <ellipse cx="0" cy="0" rx="22" ry="16" fill="hsl(200 30% 85%)" stroke="hsl(200 35% 65%)" strokeWidth="1.2" />
        <path d="M-12 -14 Q 0 -18 12 -14" fill="hsl(200 30% 82%)" stroke="hsl(200 35% 65%)" strokeWidth="1" />
        <circle cx="0" cy="-18" r="3" fill="hsl(200 40% 70%)" />
        <path d="M20 -4 Q 30 -10 34 -18" stroke="hsl(200 35% 65%)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M-20 -6 Q -32 0 -20 8" stroke="hsl(200 35% 65%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
