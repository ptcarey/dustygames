/**
 * Character roster. Data-driven so new characters can be added without
 * touching the engine. Today Dusty is the sole entry and the active default.
 */
import type { Character } from "@/game/types";
import dustySprite from "@/assets/dusty.png";
import willSprite from "@/assets/will.png";

export const CHARACTERS: readonly Character[] = [
  {
    id: "dusty",
    name: "Dusty",
    // Matches the Dusty component's default bow fill (`hsl(var(--primary))`).
    themeColor: "hsl(var(--primary))",
    // Same import scheme the Dusty component uses for its sprite.
    spriteRef: dustySprite,
    abilityIds: [],
    voiceLines: [],
    cosmetics: ["bowtie"],
  },
  {
    id: "will",
    name: "Will",
    // Cheeky black toy poodle — themed against the existing accent token so
    // it stays consistent with the design system (HSL via CSS var).
    themeColor: "hsl(var(--accent))",
    spriteRef: willSprite,
    abilityIds: ["zigzag-zapper"],
    voiceLines: [],
    backstory: "A cheeky toy poodle who zig-zags his bubbles for maximum mischief.",
    cosmetics: [],
    availability: {
      levels: { from: 5, to: 10 },
      initialUnlock: { metric: "popOrDropInLevel", count: 3 },
      reactivation: { metric: "popOrDropInLevel", count: 10 },
    },
  },
] as const;

export const DEFAULT_CHARACTER_ID = "dusty";

export function getCharacterById(id: string): Character {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}