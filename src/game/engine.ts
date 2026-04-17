/**
 * Bubble shooter game engine — pure logic over a hex grid.
 * Coordinates: row 0 at top. Even rows aligned, odd rows offset by half a column.
 * The renderer (BubbleGame.tsx) consumes the state produced here.
 */
import type { Bubble, BubbleColor, LevelConfig } from "./types";
import { charToBubble } from "./levels";

export const RADIUS = 22;          // logical bubble radius (px @ 1x)
export const DIAMETER = RADIUS * 2;
export const ROW_HEIGHT = Math.round(DIAMETER * 0.866); // hex spacing

export interface GridState {
  bubbles: Bubble[];
  cols: number;
  width: number;
  /** Pixel y at which a bubble in row r sits. */
  rowY: (row: number) => number;
  /** Pixel x at which a bubble in (row, col) sits. */
  colX: (row: number, col: number) => number;
}

let nextId = 1;

export function buildLevel(level: LevelConfig, canvasWidth: number): GridState {
  const cols = level.cols;
  const totalWidth = cols * DIAMETER;
  // Center horizontally in canvas
  const offsetX = (canvasWidth - totalWidth) / 2 + RADIUS;
  const offsetY = RADIUS + 8;

  const colX = (row: number, col: number) =>
    offsetX + col * DIAMETER + (row % 2 === 1 ? RADIUS : 0);
  const rowY = (row: number) => offsetY + row * ROW_HEIGHT;

  const bubbles: Bubble[] = [];
  level.grid.forEach((rowStr, r) => {
    for (let c = 0; c < cols; c++) {
      const ch = rowStr[c] ?? ".";
      const data = charToBubble(ch);
      if (!data) continue;
      // odd rows have one fewer column slot on the right
      if (r % 2 === 1 && c >= cols - 1) continue;
      bubbles.push({
        id: nextId++,
        row: r,
        col: c,
        x: colX(r, c),
        y: rowY(r),
        color: data.color,
        hasPossum: data.possum,
      });
    }
  });

  return { bubbles, cols, width: canvasWidth, rowY, colX };
}

/** Find the 6 hex neighbor (row,col) coords. */
export function neighborsOf(row: number, col: number): Array<[number, number]> {
  const odd = row % 2 === 1;
  return [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col + (odd ? 0 : -1)],
    [row - 1, col + (odd ? 1 : 0)],
    [row + 1, col + (odd ? 0 : -1)],
    [row + 1, col + (odd ? 1 : 0)],
  ];
}

/** Snap a free bubble (x,y) to nearest empty grid cell, returning {row,col}. */
export function snapToGrid(grid: GridState, x: number, y: number): { row: number; col: number } {
  const row = Math.max(0, Math.round((y - RADIUS - 8) / ROW_HEIGHT));
  const odd = row % 2 === 1;
  const offsetX = grid.colX(0, 0);
  let col = Math.round((x - offsetX - (odd ? RADIUS : 0)) / DIAMETER);
  col = Math.max(0, Math.min(grid.cols - (odd ? 2 : 1), col));
  return { row, col };
}

/** Find connected same-color cluster starting from a seed bubble (BFS). */
export function findColorCluster(grid: GridState, seed: Bubble): Bubble[] {
  const map = new Map<string, Bubble>();
  grid.bubbles.forEach(b => map.set(`${b.row},${b.col}`, b));
  const visited = new Set<number>();
  const out: Bubble[] = [];
  const queue: Bubble[] = [seed];
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    if (cur.color !== seed.color) continue;
    out.push(cur);
    for (const [r, c] of neighborsOf(cur.row, cur.col)) {
      const n = map.get(`${r},${c}`);
      if (n && !visited.has(n.id)) queue.push(n);
    }
  }
  return out;
}

/** Find all bubbles connected (any color) to the top row. Floaters are unsupported. */
export function findFloaters(grid: GridState): Bubble[] {
  const map = new Map<string, Bubble>();
  grid.bubbles.forEach(b => map.set(`${b.row},${b.col}`, b));
  const supported = new Set<number>();
  const queue: Bubble[] = grid.bubbles.filter(b => b.row === 0);
  queue.forEach(b => supported.add(b.id));
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [r, c] of neighborsOf(cur.row, cur.col)) {
      const n = map.get(`${r},${c}`);
      if (n && !supported.has(n.id)) {
        supported.add(n.id);
        queue.push(n);
      }
    }
  }
  return grid.bubbles.filter(b => !supported.has(b.id));
}

/**
 * Combo scoring: 10, 20, 30, 40, ... per pop in same chain.
 * Returns total score for a chain of `count` pops.
 */
export function chainScore(count: number): number {
  let total = 0;
  for (let i = 1; i <= count; i++) total += i * 10;
  return total;
}

/** Pick a random color from level palette that still appears in grid (avoids dead ammo). */
export function pickShooterColor(grid: GridState, level: LevelConfig): BubbleColor {
  const inGrid = new Set(grid.bubbles.map(b => b.color));
  const usable = level.shooterColors.filter(c => inGrid.has(c));
  const pool = usable.length ? usable : level.shooterColors;
  return pool[Math.floor(Math.random() * pool.length)];
}
