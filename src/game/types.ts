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
  lastPlayedLevel: number; // most recently entered level (for map auto-scroll)
}

/**
 * Character — data-driven definition of a playable character.
 * Today only Dusty exists; the type exists so future characters can be
 * added without touching the engine or UI.
 */
export interface Character {
  id: string;
  name: string;
  /** Theme colour. Matches the project convention: a CSS hsl() string (see COLOR_HSL). */
  themeColor: string;
  /** Sprite reference. Matches the Dusty component scheme: an imported asset module URL. */
  spriteRef: string;
  abilityIds: string[];
  voiceLines?: string[];
  backstory?: string;
  cosmetics: string[];                  // ids of visual flourishes ("bowtie", "hat", "cape", etc.)
  availability?: CharacterAvailability; // optional — characters without a rule are always available on all levels
}

export interface CharacterAvailability {
  /** Inclusive level-id range during which this character can appear. */
  levels: { from: number; to: number };
  /** What the player must do before this character first becomes selectable on a level. */
  initialUnlock: { metric: "popOrDropInLevel"; count: number };
  /** After this character is used, what the player must do for them to become selectable again on the same level. */
  reactivation: { metric: "popOrDropInLevel"; count: number };
}
