import { LEVELS, charToBubble } from "./game/levels";
import { BUBBLE_COLORS } from "./game/types";

const issues: string[] = [];
const stats: any[] = [];

for (const lvl of LEVELS) {
  const rows = lvl.grid.length;
  const cols = lvl.cols;
  // Build cell matrix
  const cells: (string | null)[][] = [];
  let bubbleCount = 0;
  let possumCount = 0;
  const colorCounts: Record<string, number> = {};
  for (let r = 0; r < rows; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const ch = lvl.grid[r][c] ?? ".";
      const data = charToBubble(ch);
      if (r % 2 === 1 && c >= cols - 1) { row.push(null); continue; }
      if (!data) { row.push(null); continue; }
      row.push(data.color);
      bubbleCount++;
      if (data.possum) possumCount++;
      colorCounts[data.color] = (colorCounts[data.color] || 0) + 1;
    }
    cells.push(row);
  }

  // Check row widths match cols
  for (let r = 0; r < rows; r++) {
    if (lvl.grid[r].length !== cols) {
      issues.push(`L${lvl.id} row ${r} width=${lvl.grid[r].length} expected=${cols}`);
    }
  }

  // Floater check (BFS from row 0)
  const supported = Array.from({ length: rows }, () => Array(cols).fill(false));
  const q: [number, number][] = [];
  for (let c = 0; c < cols; c++) if (cells[0][c]) { supported[0][c] = true; q.push([0, c]); }
  while (q.length) {
    const [r, c] = q.shift()!;
    const odd = r % 2 === 1;
    const nbrs: [number, number][] = [
      [r, c - 1], [r, c + 1],
      [r - 1, c + (odd ? 0 : -1)], [r - 1, c + (odd ? 1 : 0)],
      [r + 1, c + (odd ? 0 : -1)], [r + 1, c + (odd ? 1 : 0)],
    ];
    for (const [nr, nc] of nbrs) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc] && !supported[nr][nc]) {
        supported[nr][nc] = true; q.push([nr, nc]);
      }
    }
  }
  let floaters = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (cells[r][c] && !supported[r][c]) floaters++;
  }
  if (floaters > 0) issues.push(`L${lvl.id} has ${floaters} floating bubbles`);

  // Possums must be poppable: every possum color should appear ≥2 of that color total (so cluster ≥2 possible) and shooterColors include it
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lvl.grid[r][c];
      if (ch && ch !== "." && ch === ch.toUpperCase() && /[A-Z]/.test(ch)) {
        const data = charToBubble(ch);
        if (data && !lvl.shooterColors.includes(data.color)) {
          issues.push(`L${lvl.id} possum color ${data.color} not in shooterColors`);
        }
      }
    }
  }

  // shooterColors all present in grid
  for (const col of lvl.shooterColors) {
    if (!colorCounts[col]) issues.push(`L${lvl.id} shooter color ${col} missing in grid`);
  }

  // Density (only for procedural, lvl >=6)
  const density = bubbleCount / (rows * cols);

  stats.push({
    id: lvl.id, name: lvl.name, rows, cols, shots: lvl.shots,
    bubbles: bubbleCount, possums: possumCount,
    density: density.toFixed(2),
    palette: lvl.shooterColors.length,
    style: lvl.id >= 6 ? ["web", "lace", "zigzag"][(lvl.id - 6) % 3] : "handcrafted",
  });
}

console.log("=== LEVEL STATS ===");
console.table(stats);
console.log("\n=== ISSUES ===");
if (issues.length === 0) console.log("✅ No issues found across", LEVELS.length, "levels");
else issues.forEach(i => console.log("❌", i));

// Visual ascii of a couple of procedural levels
console.log("\n=== VISUAL: Level 6 (web) ===");
LEVELS[5].grid.forEach(r => console.log(r.replace(/\./g, "·")));
console.log("\n=== VISUAL: Level 7 (lace) ===");
LEVELS[6].grid.forEach(r => console.log(r.replace(/\./g, "·")));
console.log("\n=== VISUAL: Level 8 (zigzag) ===");
LEVELS[7].grid.forEach(r => console.log(r.replace(/\./g, "·")));
console.log("\n=== VISUAL: Level 12 (web, deeper) ===");
LEVELS[11].grid.forEach(r => console.log(r.replace(/\./g, "·")));
console.log("\n=== VISUAL: Level 20 (final) ===");
LEVELS[19].grid.forEach(r => console.log(r.replace(/\./g, "·")));
