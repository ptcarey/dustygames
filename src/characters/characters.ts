/**
 * Character roster. Data-driven so new characters can be added without
 * touching the engine. Today Dusty is the sole entry and the active default.
 */
import type { Character } from "@/game/types";
import dustySprite from "@/assets/dusty.png";
import willSprite from "@/assets/will.png";
import bellaSprite from "@/assets/bella.png";
import teddySprite from "@/assets/teddy.png";
import rubySprite from "@/assets/ruby.png";

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
      levels: { from: 21, to: 30 },
      initialUnlock: { metric: "popOrDropInLevel", count: 3 },
      reactivation: { metric: "popOrDropInLevel", count: 10 },
    },
  },
  {
    id: "bella",
    name: "Bella",
    themeColor: "hsl(0, 75%, 60%)",
    spriteRef: bellaSprite,
    abilityIds: ["love-bomb"],
    voiceLines: [],
    backstory: "A loyal chocolate lab puppy who fires heart bubbles that explode on anything they touch.",
    cosmetics: [],
    availability: {
      levels: { from: 11, to: 20 },
      initialUnlock: { metric: "popOrDropInLevel", count: 5 },
      reactivation: { metric: "popOrDropInLevel", count: 8 },
    },
  },
  {
    id: "teddy",
    name: "Teddy",
    themeColor: "hsl(30, 60%, 40%)",
    spriteRef: teddySprite,
    abilityIds: ["triple-guard"],
    voiceLines: [],
    backstory: "A serious 14-year-old German Shepherd who fires three orbiting bubbles at once.",
    cosmetics: [],
    availability: {
      levels: { from: 31, to: 40 },
      initialUnlock: { metric: "popOrDropInLevel", count: 8 },
      reactivation: { metric: "popOrDropInLevel", count: 12 },
    },
  },
  {
    id: "ruby",
    name: "Ruby",
    themeColor: "hsl(355, 85%, 60%)",
    spriteRef: rubySprite,
    abilityIds: ["scatter-shot"],
    voiceLines: [],
    backstory: "A wildly playful 6-month-old labradoodle who scatters 7 red bubbles that pop anything.",
    cosmetics: [],
    availability: {
      levels: { from: 41, to: 50 },
      initialUnlock: { metric: "popOrDropInLevel", count: 3 },
      reactivation: { metric: "popOrDropInLevel", count: 6 },
    },
  },
  { id: "daisy",  name: "Daisy",  themeColor: "hsl(50, 90%, 60%)",  spriteRef: "", abilityIds: [], cosmetics: [] },
  { id: "emelia", name: "Emelia", themeColor: "hsl(280, 60%, 65%)", spriteRef: "", abilityIds: [], cosmetics: [] },
  { id: "indy",   name: "Indy",   themeColor: "hsl(15, 80%, 55%)",  spriteRef: "", abilityIds: [], cosmetics: [] },
] as const;

export const DEFAULT_CHARACTER_ID = "dusty";

export function getCharacterById(id: string): Character {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}

/** Returns the companion character for a given level, or null if Dusty plays alone. */
export function getCompanionForLevel(levelId: number): Character | null {
  return CHARACTERS.find(
    c => c.availability && levelId >= c.availability.levels.from && levelId <= c.availability.levels.to
  ) ?? null;
}