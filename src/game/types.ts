/**
 * Game type definitions.
 */
export type BubbleColor = "red" | "blue" | "green" | "yellow" | "purple" | "pink";

// Pink removed from selectable bubble palette (kept in type for legacy level data).
export const BUBBLE_COLORS: BubbleColor[] = ["red", "blue", "green", "yellow", "purple"];

/** Color → CSS hsl() string. Hardcoded so canvas gradients can parse them. */
export const COLOR_HSL: Record<BubbleColor, string> = {
  red: "hsl(0, 85%, 65%)",
  blue: "hsl(210, 90%, 65%)",
  green: "hsl(140, 65%, 55%)",
  yellow: "hsl(48, 95%, 60%)",
  purple: "hsl(280, 70%, 68%)",
  pink: "hsl(330, 85%, 72%)",
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
