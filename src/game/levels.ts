import type { BubbleColor, LevelConfig } from "./types";
import { BUBBLE_COLORS } from "./types";

/**
 * Char codes for level grid strings:
 *   r=red, b=blue, g=green, y=yellow, p=purple, k=pink, .=empty
 *   UPPERCASE same letter = bubble containing a trapped possum
 */
const CHAR_TO_COLOR: Record<string, BubbleColor> = {
  r: "red", b: "blue", g: "green", y: "yellow", p: "purple",
  // Pink removed — legacy 'k' chars now map to purple so old level data stays playable.
  k: "purple",
};

export function charToBubble(ch: string): { color: BubbleColor; possum: boolean } | null {
  if (ch === "." || ch === " ") return null;
  const lower = ch.toLowerCase();
  const color = CHAR_TO_COLOR[lower];
  if (!color) return null;
  return { color, possum: ch !== lower };
}

/**
 * 5 hand-crafted starter levels (15 wide). Colors are spread in small pockets
 * so it takes 3+ layers to reach the deepest possum (uppercase letter).
 */
const HANDCRAFTED: LevelConfig[] = [
  {
    id: 1, name: "Hello Dusty!", shots: 14, cols: 15,
    shooterColors: ["red", "blue", "yellow"],
    grid: [
      "rr.byyr.bby.rrb",
      "by.rrb.yyr.bbyy",
      "rby.ryyB.ybyrby",
      "...rby...rby...",
    ],
  },
  {
    id: 2, name: "First Friend", shots: 16, cols: 15,
    shooterColors: ["red", "blue", "green", "yellow"],
    grid: [
      "rg.ygrg.ygrg.yr",
      "by.gby.rby.rb.g",
      "gr.bGgr.byrg.yb",
      "rb.yg.br.yg.rby",
      "...g.b.r.y.....",
    ],
  },
  {
    id: 3, name: "Possum Party", shots: 18, cols: 15,
    shooterColors: ["red", "blue", "green", "yellow", "purple"],
    grid: [
      "rk.ygk.bygk.byk",
      "yg.bky.rbk.grbK",
      "bR.gkb.ygk.bygk",
      "gy.rkg.brkGybrk",
      "..yk..rb..yg..k",
    ],
  },
  {
    id: 4, name: "Rainbow Rescue", shots: 20, cols: 15,
    shooterColors: BUBBLE_COLORS,
    grid: [
      "rb.ykp.bgyk.rbg",
      "pk.gbrPky.brpky",
      "gy.kprg.bkprgyb",
      "rk.bygr.bygrk.P",
      "by.gk.rp.bg.yk.",
      "..r.b.g.y.k.p..",
    ],
  },
  {
    id: 5, name: "Big Brave Heart", shots: 24, cols: 15,
    shooterColors: ["red", "blue", "yellow", "purple"],
    grid: [
      "pp.yyp.rrk.yybp",
      "yp.RRp.yyk.bbpy",
      "yp.rrp.ykk.bbpy",
      "yp.KKp.yyb.bppy",
      "yp.rrp.yyk.bbpy",
      "..yp..yk..bp..y",
      "....rr....bb...",
      "......YY.......",
    ],
  },
];

/**
 * Procedurally generate levels 6..20.
 * From level 6: at least 20 rows of bubbles. The renderer scrolls so only
 * ~15 rows are visible at a time and the stack lowers as bubbles are popped.
 */
function generateProcedural(): LevelConfig[] {
  const levels: LevelConfig[] = [];
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const NAMES = [
    "Tangled Trees", "Moonlit Branches", "Bubble Forest", "Possum Hideout",
    "Sleepy Hollow", "Fluffy Clouds", "Sunny Meadow", "Treetop Tumble",
    "Curly Whirly", "Dazzle Bloom", "Sparkle Path", "Twilight Pop",
    "Big Cuddle", "Final Friends", "Hero Dusty",
  ];

  const colorChar = (c: BubbleColor) => c[0];

  /**
   * Lace / spider-web style generators. Each returns a 2D boolean grid
   * marking which cells should hold a bubble. Colors are layered on after.
   */
  const cols = 15;

  const makeWeb = (rows: number, density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    const cx = (cols - 1) / 2;
    const cy = rows / 2;
    // Concentric "rings" (ovals) — the radial threads of a web.
    const ringCount = 3 + Math.floor(density * 3);
    for (let k = 1; k <= ringCount; k++) {
      const rx = (cols / 2) * (k / (ringCount + 0.5));
      const ry = (rows / 2) * (k / (ringCount + 0.5));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = (c - cx) / rx;
          const dy = (r - cy) / ry;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(d - 1) < 0.09) g[r][c] = true;
        }
      }
    }
    // Spokes — diagonal threads from the center outward.
    const spokes = 6;
    for (let s = 0; s < spokes; s++) {
      const ang = (Math.PI * 2 * s) / spokes + 0.2;
      for (let t = 0; t < Math.max(rows, cols); t++) {
        const r = Math.round(cy + Math.sin(ang) * t * 0.6);
        const c = Math.round(cx + Math.cos(ang) * t * 0.9);
        if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = true;
      }
    }
    return g;
  };

  const makeLace = (rows: number, density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    // Repeating diamond/floral lace motif: a small stamp tiled across the grid.
    const stamp = [
      "..x..",
      ".x.x.",
      "x.x.x",
      ".x.x.",
      "..x..",
    ];
    const sw = stamp[0].length;
    const sh = stamp.length;
    for (let r0 = 0; r0 < rows; r0 += sh - 1) {
      for (let c0 = -2; c0 < cols; c0 += sw - 1) {
        for (let r = 0; r < sh; r++) {
          for (let c = 0; c < sw; c++) {
            if (stamp[r][c] === "x") {
              const rr = r0 + r;
              const cc = c0 + c;
              if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) g[rr][cc] = true;
            }
          }
        }
      }
    }
    // Add a few small "lumps" — 2x2 ish clusters scattered around.
    const lumps = 2 + Math.floor(density * 4);
    for (let i = 0; i < lumps; i++) {
      const r = Math.floor(rand() * (rows - 2));
      const c = Math.floor(rand() * (cols - 2));
      g[r][c] = true; g[r][c + 1] = true;
      g[r + 1][c] = true; g[r + 1][c + 1] = true;
    }
    return g;
  };

  const makeZigzag = (rows: number, density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    // Horizontal lace bands separated by gaps; every few rows a denser garland.
    for (let r = 0; r < rows; r++) {
      const band = r % 4;
      for (let c = 0; c < cols; c++) {
        if (band === 0 && (c + r) % 2 === 0) g[r][c] = true;
        else if (band === 2 && c % 3 === (r % 3)) g[r][c] = true;
      }
    }
    // Sprinkle small lumps for variety.
    const lumps = 3 + Math.floor(density * 4);
    for (let i = 0; i < lumps; i++) {
      const r = Math.floor(rand() * (rows - 1));
      const c = Math.floor(rand() * (cols - 1));
      g[r][c] = true; g[r][c + 1] = true; g[r + 1][c] = true;
    }
    return g;
  };

  for (let i = 0; i < 15; i++) {
    const lvlId = 6 + i;
    const difficulty = i / 14; // 0 → 1
    // First 3 procedural levels (6,7,8) stay small; from level 9 onward jump to 15+ rows.
    const rows = i < 3 ? 8 + i * 2 : 15 + Math.floor((i - 3) * 0.9); // 8,10,12 → 15..25
    const colorCount = Math.min(5, 3 + Math.floor(difficulty * 3));
    const palette = BUBBLE_COLORS.slice(0, colorCount);
    const shots = Math.max(20, Math.round(rows * 1.4 - difficulty * 6));
    const possumCount = 3 + Math.floor(difficulty * 8);

    // Pick a pattern style — cycle through web / lace / zigzag.
    const style = i % 3;
    const mask =
      style === 0 ? makeWeb(rows, difficulty) :
      style === 1 ? makeLace(rows, difficulty) :
      makeZigzag(rows, difficulty);

    // Color the mask: walk in "patches" so neighbours often share a color,
    // giving small lumps within the lacework.
    const colorGrid: string[][] = mask.map(row => row.map(() => "."));
    for (let r = 0; r < rows; r++) {
      let curColor = pick(palette);
      let runLeft = 2 + Math.floor(rand() * 3);
      for (let c = 0; c < cols; c++) {
        if (!mask[r][c]) continue;
        if (runLeft <= 0) {
          curColor = pick(palette);
          runLeft = 2 + Math.floor(rand() * 3);
        }
        colorGrid[r][c] = colorChar(curColor);
        runLeft--;
      }
    }
    const grid: string[] = colorGrid.map(row => row.join(""));

    // Sprinkle possums into deeper non-empty cells.
    const cells: Array<[number, number]> = [];
    grid.forEach((row, r) =>
      row.split("").forEach((ch, c) => { if (ch !== ".") cells.push([r, c]); })
    );
    cells.sort((a, b) => b[0] - a[0]);
    const deepPool = cells.slice(0, Math.floor(cells.length * 0.6));
    for (let p = 0; p < possumCount && deepPool.length; p++) {
      const idx = Math.floor(rand() * deepPool.length);
      const [r, c] = deepPool.splice(idx, 1)[0];
      const arr = grid[r].split("");
      arr[c] = arr[c].toUpperCase();
      grid[r] = arr.join("");
    }

    levels.push({
      id: lvlId,
      name: NAMES[i],
      shots,
      cols,
      shooterColors: palette,
      grid,
    });
  }
  return levels;
}

export const LEVELS: LevelConfig[] = [...HANDCRAFTED, ...generateProcedural()];

export const TOTAL_LEVELS = LEVELS.length;
