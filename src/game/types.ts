/**
 * Game type definitions.
 */
export type BubbleColor = "red" | "blue" | "green" | "yellow" | "purple" | "pink";

export const BUBBLE_COLORS: BubbleColor[] = ["red", "blue", "green", "yellow", "purple", "pink"];

/** Color → CSS hsl() string from design tokens. */
export const COLOR_HSL: Record<BubbleColor, string> = {
  red: "hsl(var(--bubble-red))",
  blue: "hsl(var(--bubble-blue))",
  green: "hsl(var(--bubble-green))",
  yellow: "hsl(var(--bubble-yellow))",
  purple: "hsl(var(--bubble-purple))",
  pink: "hsl(var(--bubble-pink))",
};

/** A single bubble in the grid (or projectile). */
export interface Bubble {
  id: number;
  row: number;
  col: number;
  x: number; // canvas px (center)
  y: number;
  color: BubbleColor;
  hasPossum: boolean;
  popping?: boolean;
  popStart?: number;
  falling?: boolean;
  vy?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  shots: number;
  cols: number;
  /** Grid: rows of strings; each char = color key or '.' for empty. Uppercase = possum bubble. */
  grid: string[];
  /** Available colors for the shooter (subset of grid colors). */
  shooterColors: BubbleColor[];
}

export interface GameSave {
  unlockedLevel: number; // highest level reachable (1-indexed)
  highScore: number;
  audioEnabled: boolean;
}
