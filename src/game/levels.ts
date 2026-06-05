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
    // Level 1: 2 colors, wide gaps, 1 possum right at the top. A 6-year-old
    // can clear this in a few shots — pure colour-matching intro.
    id: 1, name: STAGES[0].levelNames[0], shots: 18, cols: 15,
    shooterColors: ["red", "blue"],
    grid: [
      "rr.bb.Rr.bb.rr.",
      "bb.rr.bb.rr.bb.",
      "rr.bb.rr.bb.rr.",
      "..r..b..r..b...",
    ],
  },
  {
    // Level 2: 3 colors, generous gaps, 1 possum top-centre.
    id: 2, name: STAGES[0].levelNames[1], shots: 18, cols: 15,
    shooterColors: ["red", "blue", "yellow"],
    grid: [
      "by.rr.Yy.bb.yr.",
      "rr.yy.bb.rr.yy.",
      "yy.bb.rr.yy.bb.",
      "..b..r..y..b...",
      ".....r...y.....",
    ],
  },
  {
    // Level 3: 3 colors, 2 possums — one top, one in middle for early win.
    id: 3, name: STAGES[0].levelNames[2], shots: 20, cols: 15,
    shooterColors: ["blue", "green", "yellow"],
    grid: [
      "gg.Bb.yy.gg.bb.",
      "bb.gg.bb.yy.gg.",
      "yy.bb.Gg.bb.yy.",
      "gg.yy.bb.gg.bb.",
      "..g..b..y..g...",
    ],
  },
  {
    // Level 4: 4 colors, 2 possums — one top, one in lower half.
    id: 4, name: STAGES[0].levelNames[3], shots: 22, cols: 15,
    shooterColors: ["red", "blue", "green", "yellow"],
    grid: [
      "rr.Gg.bb.yy.rr.",
      "gg.bb.yy.rr.gg.",
      "bb.yy.rr.gg.bb.",
      "yy.rr.Gg.bb.yy.",
      "rr.gg.bb.yy.rr.",
      "..r..g..b..y...",
    ],
  },
  {
    // Level 5: 4 colors + purple intro, 3 possums scattered — top, middle, low.
    // End of tutorial.
    id: 5, name: STAGES[0].levelNames[4], shots: 25, cols: 15,
    shooterColors: ["red", "blue", "yellow", "purple"],
    grid: [
      "Rr.bb.pp.yy.rr.",
      "bb.yy.rr.pp.bb.",
      "pp.rr.Bb.yy.pp.",
      "yy.pp.yy.rr.bb.",
      "rr.bb.pp.Bb.yy.",
      "pp.yy.rr.pp.rr.",
      "..r..b..y..p...",
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
    for (let c = 0; c < cols; c++) {
      // Leave regular gaps so shots can squeeze through to reach the top.
      if (r > 0 && c % 4 === 3) continue;
      g[r][c] = true;
    }
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
const makeZigzag = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const wave = 5;
  for (let r = 0; r < rows; r++) {
    const sweep = Math.sin(r * Math.PI / wave) * 4;
    const center = Math.round((cols - 1) / 2 + sweep);
    for (let dc = -3; dc <= 3; dc++) {
      const c = center + dc;
      if (c >= 0 && c < cols) g[r][c] = true;
    }
  }
  fillTop(g, 3); return g;
};
const makeChevrons = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const span = Math.floor(cols / 2);
  for (let r0 = 0; r0 < rows; r0 += 4)
    for (let k = 0; k <= span; k++) {
      const r = r0 + k; if (r >= rows) break;
      const left = span - k, right = span + k;
      for (const c of [left, left + 1, right - 1, right])
        if (c >= 0 && c < cols) g[r][c] = true;
    }
  warp(g, [0, 7, 14]); fillTop(g, 3); return g;
};
const makeScatter = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const clumps = Math.max(5, Math.floor(rows * 1.2));
  for (let i = 0; i < clumps; i++) {
    const cr = Math.floor((i * 7 + 3) % rows);
    const cc = Math.floor((i * 11 + 5) % cols);
    const size = 1 + (i % 3);
    for (let dr = -size; dr <= size; dr++)
      for (let dc = -size; dc <= size; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > size + 1) continue;
        const r = cr + dr, c = cc + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = true;
      }
  }
  fillTop(g, 3); return g;
};
const makeSpiral = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const cx = (cols - 1) / 2, cy = rows / 2;
  for (let t = 0; t < 300; t++) {
    const a = t * 0.12;
    const radius = t * 0.065;
    const r = Math.round(cy + Math.sin(a) * radius * 0.8);
    const c = Math.round(cx + Math.cos(a) * radius);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      g[r][c] = true;
      if (c - 1 >= 0) g[r][c - 1] = true;
      if (c + 1 < cols) g[r][c + 1] = true;
    }
  }
  fillTop(g, 3); return g;
};
const makeLattice = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 3 === 0) g[r][c] = true;
      if (r % 4 === 0 && c % 2 === 0) g[r][c] = true;
    }
  fillTop(g, 3); return g;
};
const makeHoneycomb = (rows: number): boolean[][] => {
  const g: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
  for (let r = 2; r < rows; r += 3) {
    const offset = (r / 3) % 2 === 0 ? 2 : 4;
    for (let c = offset; c < cols; c += 4) g[r][c] = false;
  }
  for (let r = 3; r < rows; r += 4)
    for (let c = 1; c < cols; c += 5) if (c < cols) g[r][c] = false;
  fillTop(g, 3); return g;
};
const PATTERNS = [makeWeb, makeDiamonds, makeZigzag, makeChevrons, makeScatter, makeSpiral, makeLattice, makeHoneycomb];

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

  // Scatter possums across the full grid so kids get early wins.
  // At least 20% go in the bottom half (closer to the shooter = popped first),
  // the rest in the top half, with at least one in the very top row.
  const cells: Array<[number, number]> = [];
  grid.forEach((row, r) =>
    row.split("").forEach((ch, c) => { if (ch !== ".") cells.push([r, c]); })
  );
  const midRow = Math.floor(rows / 2);
  const bottomCells = cells.filter(([r]) => r >= midRow);
  const topCells = cells.filter(([r]) => r < midRow);
  const bottomCount = Math.max(1, Math.ceil(possumCount * 0.2));
  const topCount = possumCount - bottomCount;
  const placed = new Set<string>();
  const placePossum = (pool: Array<[number, number]>) => {
    if (!pool.length) return;
    const idx = Math.floor(rand() * pool.length);
    const [r, c] = pool.splice(idx, 1)[0];
    const arr = grid[r].split("");
    arr[c] = arr[c].toUpperCase();
    grid[r] = arr.join("");
    placed.add(`${r},${c}`);
  };
  for (let i = 0; i < bottomCount; i++) placePossum(bottomCells);
  for (let i = 0; i < topCount; i++) placePossum(topCells.length ? topCells : bottomCells);

  ensurePossumInTopRow(grid);

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

    // Rows: gentle ramp — keep grids small so kids aren't overwhelmed.
    const baseRows = 8 + Math.floor(globalDifficulty * 8); // 8..16
    const rows = Math.min(20, baseRows + Math.floor(idxInStage * 0.4));

    // Palette: stage flavour + extra colors as game progresses.
    const extraColors = Math.min(2, Math.floor(globalDifficulty * 3));
    const paletteSet = new Set<BubbleColor>(stage.palette);
    for (const c of BUBBLE_COLORS) {
      if (paletteSet.size >= stage.palette.length + extraColors) break;
      paletteSet.add(c);
    }
    const palette = Array.from(paletteSet);

    // Fewer possums so kids can focus; generous shots so they always have a chance.
    const possumCount = 2 + Math.floor(globalDifficulty * 5) + Math.floor(idxInStage / 5);
    const shots = Math.max(22, Math.round(rows * 2.0 - globalDifficulty * 2));

    // Boss level: a bit bigger but still kid-friendly, all colors.
    if (lvlId === FINAL_LEVEL_ID) {
      out.push(buildProcLevel(
        lvlId,
        stage.levelNames[idxInStage],
        18,
        BUBBLE_COLORS,
        8,
        40,
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
 * Guarantee at least one trapped possum in the TOP row that contains
 * bubbles — every level's final rescue goal is clearing up to the top.
 * If the row already has an uppercase (possum) char this is a no-op.
 */
function ensurePossumInTopRow(grid: string[]) {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (row.replace(/[. ]/g, "").length === 0) continue;
    if (/[A-Z]/.test(row)) return;
    const arr = row.split("");
    const indices: number[] = [];
    arr.forEach((ch, i) => { if (ch !== "." && ch !== " ") indices.push(i); });
    const target = indices[Math.floor(indices.length / 2)];
    arr[target] = arr[target].toUpperCase();
    grid[r] = arr.join("");
    return;
  }
}

// Apply the guarantee to handcrafted Stage 1 too.
for (const lvl of HANDCRAFTED_STAGE1) ensurePossumInTopRow(lvl.grid);

export const LEVELS: LevelConfig[] = [...HANDCRAFTED_STAGE1, ...generateAll()];

export const TOTAL_LEVELS = LEVELS.length;

