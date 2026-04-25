/**
 * Ability registry — maps ability ids to implementation functions.
 *
 * The signature mirrors the engine's per-frame update loop in
 * `src/game/engine.ts` (which works over a `GridState` plus the active
 * `LevelConfig`). Abilities receive that same context so they can inspect
 * or mutate grid state the same way engine helpers do.
 */
// Abilities are added one file per ability and registered here. See BACKLOG for the planned ability menu.
import type { GridState } from "@/game/engine";
import type { LevelConfig } from "@/game/types";

export interface AbilityContext {
  grid: GridState;
  level: LevelConfig;
  /** Seconds since last frame, matching the engine's `step(dt)` convention. */
  dt: number;
  /** Wall-clock timestamp (ms) for animation timing. */
  now: number;
}

export type AbilityFn = (context: AbilityContext) => void;

export const abilityRegistry: Record<string, AbilityFn> = {};

/**
 * Projectile-behavior registry — describes how a fired bubble should travel
 * when the active character has a projectile ability. Kept separate from
 * `abilityRegistry` because projectile behaviors are pure data the engine
 * reads at fire-time (movement spec + landing rule), not per-frame mutators.
 */
export type ProjectileBehavior =
  | { kind: "zigzag-explode"; rowsBeforeExplode: number; explosionRadius: number }
  | { kind: "love-bomb"; explosionRadius: number; ignoresColorMatch: true }
  | { kind: "triple-fan-orbit"; fanAngleDeg: number; orbitingFlankers: boolean }
  | { kind: "scatter-shot"; totalProjectiles: number; angleBetweenDeg: number; ignoresColorMatch: true };

export const projectileBehaviorRegistry: Record<string, ProjectileBehavior> = {
  "zigzag-zapper": {
    kind: "zigzag-explode",
    rowsBeforeExplode: 7,
    explosionRadius: 1,
  },
  "love-bomb": {
    kind: "love-bomb",
    explosionRadius: 2,
    ignoresColorMatch: true,
  },
  "triple-guard": {
    kind: "triple-fan-orbit",
    fanAngleDeg: 30,
    orbitingFlankers: true,
  },
  "scatter-shot": {
    kind: "scatter-shot",
    totalProjectiles: 7,
    angleBetweenDeg: 7,
    ignoresColorMatch: true,
  },
};

/** Look up the first projectile behavior for a character's abilities, if any. */
export function getProjectileBehaviorForAbilities(
  abilityIds: readonly string[],
): ProjectileBehavior | null {
  for (const id of abilityIds) {
    const b = projectileBehaviorRegistry[id];
    if (b) return b;
  }
  return null;
}