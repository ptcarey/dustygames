import type { BubbleColor, LevelConfig } from "./types";
import { BUBBLE_COLORS } from "./types";
import { STAGES, stageForLevel, FINAL_LEVEL_ID } from "./stages";

/**
 * Char codes for level grid strings:
 *   r=red, b=blue, g=green, y=yellow, p=purple, .=empty
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

const colorChar = (c: BubbleColor) => c[0];

/**
 * Hand-crafted Stage 1 (Sea Life) intro levels — same layouts as the original
 * tutorial set, renamed to fit the sea theme. These are the gentlest levels
 * in the game.
 */
const HANDCRAFTED_STAGE1: LevelConfig[] = [
  {
    id: 1, name: STAGES[0].levelNames[0], shots: 14, cols: 15,
    shooterColors: ["red", "blue", "yellow"],
    grid: [
      "rr.byyr.bby.rrb",
      "by.rrb.yyr.bbyy",
      "rby.ryyB.ybyrby",
      "...rby...rby...",
    ],
  },
  {
    id: 2, name: STAGES[0].levelNames[1], shots: 16, cols: 15,
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
    id: 3, name: STAGES[0].levelNames[2], shots: 18, cols: 15,
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
    id: 4, name: STAGES[0].levelNames[3], shots: 20, cols: 15,
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
    id: 5, name: STAGES[0].levelNames[4], shots: 22, cols: 15,
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

// ---------------------------------------------------------------------------
// Procedural generator (lace / web / honeycomb / etc.) — produces 1 level for
// any (id, rows, palette, possumCount). Patterns mirror the previous engine.
// ---------------------------------------------------------------------------

const cols = 15;

interface RNG { (): number }
function makeRng(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function fillTop(g: boolean[][], n = 3) {
  const limit = Math.min(n, g.length);
  for (let r = 0; r < limit; r++)
    for (let c = 0; c < cols; c++) g[r][c] = true;
}
function warp(g: boolean[][], colsAt: number[]) {
  for (const c of colsAt)
    for (let r = 0; r < g.length; r++)
      if (c >= 0 && c < cols) g[r][c] = true;
}

const makeWeb = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const cx = (cols - 1) / 2, cy = rows / 2;
  const ringCount = 5;
  for (let k = 1; k <= ringCount; k++) {
    const rx = (cols / 2) * (k / (ringCount + 0.4));
    const ry = (rows / 2) * (k / (ringCount + 0.4));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const dx = (c - cx) / rx, dy = (r - cy) / ry;
      if (Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) < 0.22) g[r][c] = true;
    }
  }
  for (let s = 0; s < 8; s++) {
    const a = (Math.PI * 2 * s) / 8;
    for (let t = 0; t < Math.max(rows, cols) * 1.4; t++) {
      const r = Math.round(cy + Math.sin(a) * t * 0.6);
      const c = Math.round(cx + Math.cos(a) * t * 0.85);
      if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = true;
    }
  }
  warp(g, [0, 7, 14]); fillTop(g, 3); return g;
};
const makeDiamonds = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const size = 3;
  for (let cy0 = 0; cy0 < rows + size; cy0 += size + 1)
    for (let cx0 = 0; cx0 < cols + size; cx0 += size + 1)
      for (let dr = -size; dr <= size; dr++) {
        const span = size - Math.abs(dr);
        for (let dc = -span; dc <= span; dc++) {
          const r = cy0 + dr, c = cx0 + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = true;
        }
      }
  warp(g, [0, 4, 8, 12, 14]); fillTop(g, 3); return g;
};
const makeWeave = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r += 3) for (let c = 0; c < cols; c++) g[r][c] = true;
  warp(g, [0, 2, 4, 6, 8, 10, 12, 14]); fillTop(g, 3); return g;
};
const makeChevrons = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const span = Math.floor(cols / 2);
  for (let r0 = 0; r0 < rows; r0 += 3)
    for (let k = 0; k <= span; k++) {
      const r = r0 + k; if (r >= rows) break;
      const left = span - k, right = span + k;
      for (const c of [left, left + 1, right - 1, right])
        if (c >= 0 && c < cols) g[r][c] = true;
    }
  warp(g, [0, 7, 14]); fillTop(g, 3); return g;
};
const makeStars = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stamp = [".xxx.", "xxxxx", "xxxxx", "xxxxx", ".xxx."];
  const sw = stamp[0].length, sh = stamp.length;
  for (let r0 = 0; r0 < rows; r0 += sh)
    for (let c0 = 0; c0 < cols; c0 += sw)
      for (let r = 0; r < sh; r++) for (let c = 0; c < sw; c++)
        if (stamp[r][c] === "x") {
          const rr = r0 + r, cc = c0 + c;
          if (rr < rows && cc < cols) g[rr][cc] = true;
        }
  warp(g, [0, 5, 10, 14]); fillTop(g, 3); return g;
};
const makeHoneycomb = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
  for (let r = 2; r < rows; r += 3) {
    const offset = (r / 3) % 2 === 0 ? 2 : 4;
    for (let c = offset; c < cols; c += 4) g[r][c] = false;
  }
  fillTop(g, 3); return g;
};
const PATTERNS = [makeWeb, makeDiamonds, makeWeave, makeChevrons, makeStars, makeHoneycomb];

function buildProcLevel(
  id: number,
  name: string,
  rows: number,
  palette: BubbleColor[],
  possumCount: number,
  shots: number,
  patternIndex: number,
  seed: number,
): LevelConfig {
  const rand = makeRng(seed);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const mask = PATTERNS[patternIndex % PATTERNS.length](rows);

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
  pruneFloaters(grid, cols);

  // Sprinkle possums into deeper surviving cells.
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

  ensurePossumInLastRow(grid);

  // Recompute used colors for accurate shooter palette.
  const finalUsed = new Set<BubbleColor>();
  for (const row of grid)
    for (const ch of row) {
      const data = charToBubble(ch);
      if (data) finalUsed.add(data.color);
    }
  const shooterColors = palette.filter(c => finalUsed.has(c));

  return {
    id, name, shots, cols,
    shooterColors: shooterColors.length ? shooterColors : palette,
    grid,
  };
}

/**
 * Generate levels 6..60. Difficulty scales smoothly across the whole game.
 * Each stage keeps its themed palette flavour while still using a few extra
 * colors for visual variety in later stages.
 */
function generateAll(): LevelConfig[] {
  const out: LevelConfig[] = [];
  for (let lvlId = 6; lvlId <= FINAL_LEVEL_ID; lvlId++) {
    const stage = stageForLevel(lvlId);
    const idxInStage = lvlId - stage.range[0]; // 0..9
    const globalDifficulty = (lvlId - 6) / (FINAL_LEVEL_ID - 6); // 0..1

    // Rows: gentle ramp inside each stage, plus overall growth.
    const baseRows = 12 + Math.floor(globalDifficulty * 10); // 12..22
    const rows = Math.min(26, baseRows + Math.floor(idxInStage * 0.6));

    // Palette: stage flavour + extra colors as game progresses.
    const extraColors = Math.min(2, Math.floor(globalDifficulty * 3));
    const paletteSet = new Set<BubbleColor>(stage.palette);
    for (const c of BUBBLE_COLORS) {
      if (paletteSet.size >= stage.palette.length + extraColors) break;
      paletteSet.add(c);
    }
    const palette = Array.from(paletteSet);

    const possumCount = 3 + Math.floor(globalDifficulty * 9) + Math.floor(idxInStage / 4);
    const shots = Math.max(20, Math.round(rows * 1.5 - globalDifficulty * 4));

    // Boss level: bigger, all colors, lots of possums.
    if (lvlId === FINAL_LEVEL_ID) {
      out.push(buildProcLevel(
        lvlId,
        stage.levelNames[idxInStage],
        26,
        BUBBLE_COLORS,
        16,
        38,
        0, // spider web for the finale
        9999,
      ));
      continue;
    }

    out.push(buildProcLevel(
      lvlId,
      stage.levelNames[idxInStage],
      rows,
      palette,
      possumCount,
      shots,
      lvlId, // pattern rotates
      lvlId * 7919 + 13,
    ));
  }
  return out;
}

/**
 * Remove any bubbles not connected (via hex neighbours) to the top row.
 */
function pruneFloaters(grid: string[], cols: number) {
  const rows = grid.length;
  const cells: string[][] = grid.map(row => row.padEnd(cols, ".").split("").slice(0, cols));
  const has = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && cells[r][c] !== ".";
  const supported: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: Array<[number, number]> = [];
  for (let c = 0; c < cols; c++)
    if (has(0, c)) { supported[0][c] = true; queue.push([0, c]); }
  while (queue.length) {
    const [r, c] = queue.shift()!;
    const odd = r % 2 === 1;
    const nbrs: Array<[number, number]> = [
      [r, c - 1], [r, c + 1],
      [r - 1, c + (odd ? 0 : -1)], [r - 1, c + (odd ? 1 : 0)],
      [r + 1, c + (odd ? 0 : -1)], [r + 1, c + (odd ? 1 : 0)],
    ];
    for (const [nr, nc] of nbrs)
      if (has(nr, nc) && !supported[nr][nc]) {
        supported[nr][nc] = true;
        queue.push([nr, nc]);
      }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++)
      if (cells[r][c] !== "." && !supported[r][c]) cells[r][c] = ".";
    grid[r] = cells[r].join("");
  }
}

/**
 * Guarantee at least one trapped possum in the deepest row that contains
 * bubbles — every level should reward the player with a rescue at the bottom.
 * If the row already has an uppercase (possum) char this is a no-op.
 */
function ensurePossumInLastRow(grid: string[]) {
  for (let r = grid.length - 1; r >= 0; r--) {
    const row = grid[r];
    if (row.replace(/[. ]/g, "").length === 0) continue;
    if (/[A-Z]/.test(row)) return;
    const arr = row.split("");
    // Prefer a centre-ish bubble so it feels like a deliberate placement.
    const indices: number[] = [];
    arr.forEach((ch, i) => { if (ch !== "." && ch !== " ") indices.push(i); });
    const target = indices[Math.floor(indices.length / 2)];
    arr[target] = arr[target].toUpperCase();
    grid[r] = arr.join("");
    return;
  }
}

// Apply the guarantee to handcrafted Stage 1 too.
for (const lvl of HANDCRAFTED_STAGE1) ensurePossumInLastRow(lvl.grid);

export const LEVELS: LevelConfig[] = [...HANDCRAFTED_STAGE1, ...generateAll()];

export const TOTAL_LEVELS = LEVELS.length;

