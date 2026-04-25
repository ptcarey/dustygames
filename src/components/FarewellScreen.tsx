/**
 * FarewellScreen — shown when the player completes the final level on which
 * a companion character is available. Visually mirrors the in-game Overlay
 * but features the companion's sprite + a personalised goodbye message.
 */
import type { Character } from "@/game/types";

interface Props {
  character: Character;
  onContinue: () => void;
}

export function FarewellScreen({ character, onContinue }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center pt-10 animate-bounce-soft">
      <div className="pointer-events-auto w-[80%] max-w-sm rounded-3xl bg-card/95 p-5 text-center shadow-2xl backdrop-blur">
        {character.spriteRef ? (
          <img
            src={character.spriteRef}
            alt={character.name}
            className="mx-auto mb-3 h-32 w-32 object-contain"
          />
        ) : null}
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Thanks for playing with {character.name}!
        </h2>
        <p className="mb-5 text-base text-muted-foreground">See you later!</p>
        <div className="flex flex-col gap-3">
          <button className="kid-button" onClick={onContinue}>Keep Going →</button>
        </div>
      </div>
    </div>
  );
}