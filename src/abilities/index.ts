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