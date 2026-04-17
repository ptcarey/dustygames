import type { BubbleColor, LevelConfig } from "./types";
import { BUBBLE_COLORS } from "./types";

/**
 * Char codes for level grid strings:
 *   r=red, b=blue, g=green, y=yellow, p=purple, k=pink, .=empty
 *   UPPERCASE same letter = bubble containing a trapped possum
 */
const CHAR_TO_COLOR: Record<string, BubbleColor> = {
  r: "red", b: "blue", g: "green", y: "yellow", p: "purple", k: "pink",
};

export function charToBubble(ch: string): { color: BubbleColor; possum: boolean } | null {
  if (ch === "." || ch === " ") return null;
  const lower = ch.toLowerCase();
  const color = CHAR_TO_COLOR[lower];
  if (!color) return null;
  return { color, possum: ch !== lower };
}

/** 5 hand-crafted starter levels. */
const HANDCRAFTED: LevelConfig[] = [
  {
    id: 1, name: "Hello Dusty!", shots: 12, cols: 9,
    shooterColors: ["red", "blue", "yellow"],
    grid: [
      "rrrrrrrrr",
      "bbbBbbbbb",
      "yyyyyyyyy",
    ],
  },
  {
    id: 2, name: "First Friend", shots: 14, cols: 9,
    shooterColors: ["red", "blue", "green", "yellow"],
    grid: [
      "rrbbggyyr",
      "rrbbGgyyr",
      "rrbbggyyr",
      "..bb..yy.",
    ],
  },
  {
    id: 3, name: "Possum Party", shots: 16, cols: 9,
    shooterColors: ["red", "blue", "green", "yellow", "pink"],
    grid: [
      "rrkkbbggy",
      "rRkkBbgGy",
      "rrkkbbggy",
      ".rkk.bgg.",
      "..K...G..",
    ],
  },
  {
    id: 4, name: "Rainbow Rescue", shots: 18, cols: 9,
    shooterColors: BUBBLE_COLORS,
    grid: [
      "rbgykprbg",
      "rbgYkprbg",
      "rbgykPrbg",
      "rbgykprbG",
      ".bgy.prb.",
    ],
  },
  {
    id: 5, name: "Big Brave Heart", shots: 20, cols: 9,
    shooterColors: ["red", "blue", "yellow", "purple", "pink"],
    grid: [
      "ppppppppp",
      "pyyyyyyyP",
      "pyrrrrryp",
      "pyrkkkRYp",
      "pyrkbbkyp",
      "pyrkkKkyp",
      "pYrrrrryp",
      "pyyyyyyyp",
    ],
  },
];

/** Procedurally generate levels 6..20 with increasing difficulty. */
function generateProcedural(): LevelConfig[] {
  const levels: LevelConfig[] = [];
  // Seeded RNG for reproducibility
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

  for (let i = 0; i < 15; i++) {
    const lvlId = 6 + i;
    const difficulty = i / 14; // 0 → 1
    const cols = 9;
    const rows = 4 + Math.floor(difficulty * 5); // 4 → 9
    const colorCount = Math.min(6, 3 + Math.floor(difficulty * 4));
    const palette = BUBBLE_COLORS.slice(0, colorCount);
    const shots = Math.max(10, Math.round(rows * cols * 0.45 + (1 - difficulty) * 6));
    const possumCount = 2 + Math.floor(difficulty * 6);

    // Generate grid
    const grid: string[] = [];
    for (let r = 0; r < rows; r++) {
      let row = "";
      for (let c = 0; c < cols; c++) {
        // sparse holes increase with difficulty
        if (rand() < 0.05 + difficulty * 0.08) row += ".";
        else {
          const color = pick(palette);
          row += color[0] === "p" && color === "pink" ? "k" : color[0];
        }
      }
      grid.push(row);
    }

    // Sprinkle possums into random non-empty cells
    const cells: Array<[number, number]> = [];
    grid.forEach((row, r) =>
      row.split("").forEach((ch, c) => { if (ch !== ".") cells.push([r, c]); })
    );
    for (let p = 0; p < possumCount && cells.length; p++) {
      const idx = Math.floor(rand() * cells.length);
      const [r, c] = cells.splice(idx, 1)[0];
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
