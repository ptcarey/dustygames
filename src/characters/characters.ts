/**
 * Character roster. Data-driven so new characters can be added without
 * touching the engine. Today Dusty is the sole entry and the active default.
 */
import type { Character } from "@/game/types";
import dustySprite from "@/assets/dusty.png";

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
  },
] as const;

export const DEFAULT_CHARACTER_ID = "dusty";

export function getCharacterById(id: string): Character {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}