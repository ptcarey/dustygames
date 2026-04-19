/**
 * Stage metadata: 6 themed stages of 10 levels each (1..60).
 * Used by the treasure-map level select to colour-code regions and by
 * `levels.ts` to procedurally name + theme each level.
 */
import type { BubbleColor } from "./types";

export interface Stage {
  id: number;            // 1..6
  name: string;
  emoji: string;
  /** Themed background gradient for this stage's section on the map. */
  gradient: string;
  /** Themed accent color (HSL string) for level node rings. */
  accent: string;
  /** Bubble palette flavour (used for shooter colour suggestions). */
  palette: BubbleColor[];
  /** Inclusive level range. */
  range: [number, number];
  /** 10 short themed level names. */
  levelNames: string[];
}

export const STAGES: Stage[] = [
  {
    id: 1,
    name: "Sea Life",
    emoji: "🐚",
    gradient: "linear-gradient(180deg, hsl(195 85% 80%), hsl(200 75% 65%))",
    accent: "hsl(200, 80%, 45%)",
    palette: ["blue", "green", "yellow", "purple"],
    range: [1, 10],
    levelNames: [
      "Tide Pool Splash",
      "Coral Hello",
      "Bubbly Reef",
      "Seahorse Trot",
      "Jellyfish Drift",
      "Pearl Pocket",
      "Octopus Tangle",
      "Starfish Sparkle",
      "Whale Song",
      "Deep Blue Friends",
    ],
  },
  {
    id: 2,
    name: "Toy World",
    emoji: "🧸",
    gradient: "linear-gradient(180deg, hsl(330 90% 85%), hsl(45 95% 75%))",
    accent: "hsl(330, 80%, 55%)",
    palette: ["red", "yellow", "purple", "blue"],
    range: [11, 20],
    levelNames: [
      "Building Blocks",
      "Wind-up Wobble",
      "Marble Run",
      "Teddy Picnic",
      "Spinning Top",
      "Toy Train Tracks",
      "Doll House Door",
      "Rubber Duck Pond",
      "Jack-in-the-Box",
      "Toy Box Treasure",
    ],
  },
  {
    id: 3,
    name: "Forest",
    emoji: "🌳",
    gradient: "linear-gradient(180deg, hsl(110 55% 70%), hsl(140 50% 50%))",
    accent: "hsl(140, 60%, 35%)",
    palette: ["green", "yellow", "red", "purple"],
    range: [21, 30],
    levelNames: [
      "Mossy Path",
      "Tall Pine Climb",
      "Hollow Log",
      "Firefly Glade",
      "Squirrel Scamper",
      "Mushroom Ring",
      "Berry Bramble",
      "Owl's Branch",
      "Hidden Brook",
      "Whispering Woods",
    ],
  },
  {
    id: 4,
    name: "Snow World",
    emoji: "❄️",
    gradient: "linear-gradient(180deg, hsl(210 60% 92%), hsl(220 55% 78%))",
    accent: "hsl(215, 70%, 55%)",
    palette: ["blue", "purple", "red", "yellow"],
    range: [31, 40],
    levelNames: [
      "First Snowfall",
      "Frozen Pond",
      "Snowball Stack",
      "Mitten Mix-up",
      "Igloo Cuddle",
      "Sled Hill Slide",
      "Pine & Powder",
      "Northern Lights",
      "Snow Fort",
      "Crystal Peak",
    ],
  },
  {
    id: 5,
    name: "Frosty Beach",
    emoji: "🏖️",
    gradient: "linear-gradient(180deg, hsl(45 90% 85%), hsl(200 70% 80%))",
    accent: "hsl(35, 85%, 50%)",
    palette: ["yellow", "blue", "purple", "red"],
    range: [41, 50],
    levelNames: [
      "Sandy Snowman",
      "Shell & Snowflake",
      "Driftwood Dunes",
      "Icy Sandcastle",
      "Crab in a Scarf",
      "Surf & Slush",
      "Penguin Pier",
      "Frosted Tide",
      "Shimmer Shore",
      "Winter Lagoon",
    ],
  },
  {
    id: 6,
    name: "Tea Party",
    emoji: "🫖",
    gradient: "linear-gradient(180deg, hsl(20 75% 85%), hsl(340 70% 80%))",
    accent: "hsl(340, 70%, 50%)",
    palette: ["red", "purple", "yellow", "blue"],
    range: [51, 60],
    levelNames: [
      "Sugar Cube Stack",
      "Teapot Steam",
      "Lace Tablecloth",
      "Cupcake Tower",
      "Honey Drizzle",
      "Strawberry Scone",
      "Macaron Parade",
      "Garden Invitations",
      "Matilda's Garden",
      "Reunited with Matilda",
    ],
  },
];

export function stageForLevel(levelId: number): Stage {
  return STAGES.find(s => levelId >= s.range[0] && levelId <= s.range[1]) ?? STAGES[0];
}

export const FINAL_LEVEL_ID = 60;
