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

  for (let i = 0; i < 15; i++) {
    const lvlId = 6 + i;
    const difficulty = i / 14; // 0 → 1
    const cols = 15;
    const rows = 20 + Math.floor(difficulty * 10); // 20 → 30
    const colorCount = Math.min(6, 4 + Math.floor(difficulty * 3));
    const palette = BUBBLE_COLORS.slice(0, colorCount);
    const shots = Math.max(20, Math.round(rows * 1.4 - difficulty * 8));
    const possumCount = 4 + Math.floor(difficulty * 10);

    // Generate grid: small pockets of color (3-5 wide chunks) instead of huge blobs
    const grid: string[] = [];
    for (let r = 0; r < rows; r++) {
      let row = "";
      let curColor = pick(palette);
      let runLeft = 2 + Math.floor(rand() * 3);
      for (let c = 0; c < cols; c++) {
        if (runLeft <= 0) {
          // pick a different color for the next pocket
          let next = pick(palette);
          if (next === curColor && palette.length > 1) next = pick(palette);
          curColor = next;
          runLeft = 2 + Math.floor(rand() * 3);
        }
        // Sprinkle more gaps so balls can sometimes slip through to deeper rows
        if (rand() < 0.14 + difficulty * 0.12) {
          row += ".";
        } else {
          row += colorChar(curColor);
        }
        runLeft--;
      }
      grid.push(row);
    }

    // Sprinkle possums into random non-empty cells, biased toward the bottom
    const cells: Array<[number, number]> = [];
    grid.forEach((row, r) =>
      row.split("").forEach((ch, c) => { if (ch !== ".") cells.push([r, c]); })
    );
    // Sort so deeper rows are preferred for possums
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
