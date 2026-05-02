## Goal

Swap the identities of "Will" and "Teddy" so the toy poodle is now named **Teddy** and the German Shepherd is now named **Will**. Skills, level ranges, and unlock/reactivation rules stay tied to each *physical* dog (i.e. they swap along with the names).

## Result after the change

| Character | Breed / sprite | Skill | Levels |
|---|---|---|---|
| **Teddy** (was "Will") | Cheeky black toy poodle (`will.png`) | Zig-Zag Zapper — zig-zags up 7 rows then explodes | 21–30 |
| **Will** (was "Teddy") | 14-year-old German Shepherd (`teddy.png`) | Triple Guard — three bubbles in a fan with orbiting flankers | 31–40 |

Dusty, Bella, and Ruby are unchanged.

## Files to change

### 1. `src/characters/characters.ts`

In the `CHARACTERS` array, edit the two existing entries (do **not** rename their `id` fields — the engine and save data key off `id`, so changing them risks breaking persisted state and any in-flight references):

- Entry with `id: "will"`:
  - `name: "Will"` → `name: "Teddy"`
  - `backstory` → "A cheeky toy poodle who zig-zags his bubbles for maximum mischief." (unchanged wording, just confirming it stays)
  - Everything else (sprite `willSprite`, ability `zigzag-zapper`, levels 21–30, unlock 3 / reactivate 10) stays.

- Entry with `id: "teddy"`:
  - `name: "Teddy"` → `name: "Will"`
  - `backstory` → "A serious 14-year-old German Shepherd who fires three orbiting bubbles at once." → "A serious 14-year-old German Shepherd named Will who fires three orbiting bubbles at once." (or simply replace "Teddy" with "Will" if the backstory mentions it; current copy doesn't, so this line stays as-is structurally — just the displayed `name` changes).
  - Everything else (sprite `teddySprite`, ability `triple-guard`, levels 31–40, unlock 8 / reactivate 12) stays.

That's the entire change — two `name` field edits.

## What will NOT change

- File imports (`willSprite`, `teddySprite`) keep their variable names. The variable name reflects the asset filename, not the displayed character name, so renaming would just churn imports without value.
- Object `id` keys (`"will"`, `"teddy"`) stay as-is to avoid breaking save data, level lookups, and any future references.
- No changes to `src/abilities/index.ts`, `BubbleGame.tsx`, levels, stages, or any sprite asset.
- No gameplay change.

## Technical notes

The `id` on each character is the stable identifier used by the engine and save system; the `name` is purely the display label. Swapping only `name` produces exactly the user-visible rename requested without any data-migration risk.
