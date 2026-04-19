import { Sfx, unlockAudio } from "@/game/sound";
import dustyAndMatilda from "@/assets/dusty-and-matilda.png";

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  highScore: number;
}

export function HomeScreen({ onPlay, onLevels, audioEnabled, onToggleAudio, highScore }: Props) {
  const click = (fn: () => void) => () => { unlockAudio(); Sfx.click(); fn(); };
  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-6">
      <div className="mt-6 text-center">
        <h1 className="text-5xl font-bold text-foreground drop-shadow-sm sm:text-6xl">
          Dusty's Bubble Pop
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Help Dusty rescue the possums and find his owner, Matilda</p>
      </div>

      <div className="animate-float">
        <img
          src={dustyAndMatilda}
          alt="Dusty the cavoodle hugging Matilda"
          className="h-auto w-[260px] select-none drop-shadow-lg sm:w-[300px]"
          draggable={false}
        />
      </div>

      <div className="flex w-full max-w-xs flex-col items-stretch gap-4">
        <button className="kid-button" onClick={click(onPlay)}>▶ Play</button>
        <button className="kid-button kid-button-secondary" onClick={click(onLevels)}>Levels</button>
        <div className="flex items-center justify-between rounded-full bg-card/80 px-5 py-3 shadow-md backdrop-blur">
          <span className="text-base font-semibold text-foreground">Sound</span>
          <button
            onClick={click(onToggleAudio)}
            className="rounded-full bg-primary/15 px-4 py-1 text-base font-bold text-primary"
            aria-label="Toggle sound"
          >
            {audioEnabled ? "🔊 On" : "🔇 Off"}
          </button>
        </div>
        {highScore > 0 && (
          <p className="text-center text-sm text-muted-foreground">★ High score: {highScore}</p>
        )}
      </div>
    </div>
  );
}
