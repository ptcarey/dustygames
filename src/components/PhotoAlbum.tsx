import { CHARACTERS } from "@/characters/characters";
import { Dusty } from "./Dusty";
import { Sfx } from "@/game/sound";

interface Props {
  onClose: () => void;
}

export function PhotoAlbum({ onClose }: Props) {
  const companions = CHARACTERS.filter(c => c.spriteRef);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-pink-50 p-6">
      <div className="w-full max-w-sm overflow-y-auto rounded-3xl bg-card/95 p-5 text-center shadow-2xl backdrop-blur">
        <h2 className="text-2xl font-bold text-foreground">Dusty's Photo Album</h2>
        <p className="mt-1 text-sm text-muted-foreground">All the friends who helped along the way!</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {companions.map((c, i) => (
            <div
              key={c.id}
              className="flex flex-col items-center rounded-xl bg-white/60 p-2 shadow-sm"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <Dusty size={64} mood="happy" characterId={c.id} showBow={false} />
              <span className="mt-1 text-xs font-bold text-foreground">{c.name}</span>
              {c.backstory && (
                <span className="text-[8px] leading-tight text-muted-foreground">{c.backstory.slice(0, 40)}...</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-yellow-50 p-3">
          <p className="text-sm font-bold text-yellow-800">
            Dusty found Matilda and rescued all the possums!
          </p>
          <p className="mt-1 text-xs text-yellow-700">Thanks for playing!</p>
        </div>

        <button className="kid-button mt-4" onClick={() => { Sfx.click(); onClose(); }}>
          Back to Map
        </button>
      </div>
    </div>
  );
}
