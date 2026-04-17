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
      "ppyyppRRppkkppy",
      "ypprrppyypkkbby",
      "yyppyypprrppkkb",
      "ppKKppyybbppyyp",
      "ppyypprrppyybbp",
      "ypprrppyybbppy.",
      "ppyybbppyyrrpp.",
      "ppppppYYpppppp.",
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
   * Pattern generators. Each returns a 2D boolean mask. All patterns ALWAYS
   * fill the top several rows densely so bubbles start flush against the
   * header, then build creative shapes below: diamonds, woven lattices,
   * chevrons, hex stars, honeycomb, and webs.
   */
  const cols = 15;

  /** Fill the top `n` rows fully so the stack is anchored and visually grounded. */
  const fillTop = (g: boolean[][], n = 2) => {
    const limit = Math.min(n, g.length);
    for (let r = 0; r < limit; r++)
      for (let c = 0; c < cols; c++) g[r][c] = true;
  };

  /** Spider-web: concentric ovals + radial spokes. */
  const makeWeb = (rows: number, density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    const cx = (cols - 1) / 2;
    const cy = rows / 2;
    const ringCount = 3 + Math.floor(density * 3);
    for (let k = 1; k <= ringCount; k++) {
      const rx = (cols / 2) * (k / (ringCount + 0.5));
      const ry = (rows / 2) * (k / (ringCount + 0.5));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = (c - cx) / rx;
          const dy = (r - cy) / ry;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(d - 1) < 0.18) g[r][c] = true;
        }
      }
    }
    const spokes = 8;
    for (let s = 0; s < spokes; s++) {
      const ang = (Math.PI * 2 * s) / spokes;
      for (let t = 0; t < Math.max(rows, cols) * 1.2; t++) {
        const r = Math.round(cy + Math.sin(ang) * t * 0.55);
        const c = Math.round(cx + Math.cos(ang) * t * 0.85);
        if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = true;
      }
    }
    fillTop(g, 2);
    return g;
  };

  /** Diamond lattice: tiled diamond outlines forming a rhombic mesh. */
  const makeDiamonds = (rows: number, _density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    const size = 4;
    for (let cy0 = 0; cy0 < rows + size; cy0 += size) {
      for (let cx0 = -size; cx0 < cols + size; cx0 += size) {
        for (let dr = -size; dr <= size; dr++) {
          const dc = size - Math.abs(dr);
          for (const c of [cx0 + dc, cx0 - dc]) {
            const r = cy0 + dr;
            if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = true;
          }
        }
      }
    }
    fillTop(g, 2);
    return g;
  };

  /** Woven lattice: two crossing sine waves + vertical warp threads. */
  const makeWeave = (rows: number, density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    const amp = 2.5;
    const period = 6;
    for (let c = 0; c < cols; c++) {
      const r1 = Math.round(rows / 2 + Math.sin((c / period) * Math.PI * 2) * amp);
      const r2 = Math.round(rows / 2 + Math.cos((c / period) * Math.PI * 2) * amp);
      for (const rc of [r1 - 1, r1, r1 + 1]) if (rc >= 0 && rc < rows) g[rc][c] = true;
      for (const rc of [r2 - 1, r2, r2 + 1]) if (rc >= 0 && rc < rows) g[rc][c] = true;
    }
    for (let c = 0; c < cols; c += 2)
      for (let r = 0; r < rows; r++) g[r][c] = true;
    const bands = 2 + Math.floor(density * 3);
    for (let i = 0; i < bands; i++) {
      const r = rows - 2 - i * 2;
      if (r > 2) for (let c = 0; c < cols; c++) if ((c + i) % 2 === 0) g[r][c] = true;
    }
    fillTop(g, 2);
    return g;
  };

  /** Chevrons: stacked V-shapes pointing down across the field. */
  const makeChevrons = (rows: number, _density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    const span = Math.floor(cols / 2);
    for (let r0 = 0; r0 < rows; r0 += 4) {
      for (let k = 0; k <= span; k++) {
        const r = r0 + k;
        if (r >= rows) break;
        const left = span - k;
        const right = span + k;
        if (left >= 0 && left < cols) g[r][left] = true;
        if (right >= 0 && right < cols) g[r][right] = true;
      }
    }
    for (let r = 0; r < rows; r++) g[r][Math.floor(cols / 2)] = true;
    fillTop(g, 2);
    return g;
  };

  /** Hex star bursts: radiating six-point star tiles. */
  const makeStars = (rows: number, _density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    const stamp = ["..x..", ".xxx.", "xxxxx", ".xxx.", "..x.."];
    const sw = stamp[0].length;
    const sh = stamp.length;
    for (let r0 = 0; r0 < rows; r0 += sh + 1) {
      for (let c0 = 0; c0 < cols; c0 += sw + 1) {
        for (let r = 0; r < sh; r++) for (let c = 0; c < sw; c++) {
          if (stamp[r][c] === "x") {
            const rr = r0 + r, cc = c0 + c;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) g[rr][cc] = true;
          }
        }
      }
    }
    for (let c = 2; c < cols; c += 6) for (let r = 0; r < rows; r++) g[r][c] = true;
    fillTop(g, 2);
    return g;
  };

  /** Honeycomb: dense hex packing with periodic empty cells for texture. */
  const makeHoneycomb = (rows: number, _density: number): boolean[][] => {
    const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
    for (let r = 1; r < rows; r += 3) {
      for (let c = (r % 6 === 1 ? 1 : 3); c < cols; c += 4) {
        g[r][c] = false;
      }
    }
    fillTop(g, 2);
    return g;
  };

  const PATTERNS = [makeWeb, makeDiamonds, makeWeave, makeChevrons, makeStars, makeHoneycomb];

  for (let i = 0; i < 15; i++) {
    const lvlId = 6 + i;
    const difficulty = i / 14; // 0 → 1
    // First 3 procedural levels (6,7,8) stay small; from level 9 onward jump to 15+ rows.
    const rows = i < 3 ? 8 + i * 2 : 15 + Math.floor((i - 3) * 0.9); // 8,10,12 → 15..25
    const colorCount = Math.min(5, 3 + Math.floor(difficulty * 3));
    const palette = BUBBLE_COLORS.slice(0, colorCount);
    const shots = Math.max(20, Math.round(rows * 1.4 - difficulty * 6));
    const possumCount = 3 + Math.floor(difficulty * 8);

    const pattern = PATTERNS[i % PATTERNS.length];
    const mask = pattern(rows, difficulty);

    // Color the mask: walk in "patches" so neighbours often share a color,
    // giving small lumps within the lacework. Track which colors actually land
    // in the grid so the shooter palette only offers usable ammo.
    const used = new Set<BubbleColor>();
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
        used.add(curColor);
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

    pruneFloaters(grid, cols);

    // Restrict shooter palette to colors that actually survived in the grid.
    const shooterColors = palette.filter(c => used.has(c));

    levels.push({
      id: lvlId,
      name: NAMES[i],
      shots,
      cols,
      shooterColors: shooterColors.length ? shooterColors : palette,
      grid,
    });
  }
  return levels;
}

/**
 * Remove any bubbles not connected (via hex neighbours) to the top row.
 * Mutates `grid` in place. Mirrors the floater logic in engine.ts so generated
 * levels never start with bubbles suspended in mid-air.
 */
function pruneFloaters(grid: string[], cols: number) {
  const rows = grid.length;
  const cells: string[][] = grid.map(row => row.padEnd(cols, ".").split("").slice(0, cols));
  const has = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && cells[r][c] !== ".";
  const supported: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: Array<[number, number]> = [];
  for (let c = 0; c < cols; c++) {
    if (has(0, c)) { supported[0][c] = true; queue.push([0, c]); }
  }
  while (queue.length) {
    const [r, c] = queue.shift()!;
    const odd = r % 2 === 1;
    const nbrs: Array<[number, number]> = [
      [r, c - 1], [r, c + 1],
      [r - 1, c + (odd ? 0 : -1)], [r - 1, c + (odd ? 1 : 0)],
      [r + 1, c + (odd ? 0 : -1)], [r + 1, c + (odd ? 1 : 0)],
    ];
    for (const [nr, nc] of nbrs) {
      if (has(nr, nc) && !supported[nr][nc]) {
        supported[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c] !== "." && !supported[r][c]) cells[r][c] = ".";
    }
    grid[r] = cells[r].join("");
  }
}

export const LEVELS: LevelConfig[] = [...HANDCRAFTED, ...generateProcedural()];

export const TOTAL_LEVELS = LEVELS.length;
