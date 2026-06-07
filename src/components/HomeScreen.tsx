import { useState } from "react";
import { Sfx, unlockAudio } from "@/game/sound";
import dustyAndMatilda from "@/assets/dusty-and-matilda.png";
import { isColorblindMode, setColorblindMode, getTotalStars, getAchievements } from "@/game/storage";
import { ACHIEVEMENTS } from "@/game/achievements";

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  onDailyChallenge?: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  highScore: number;
  practiceMode?: boolean;
  onTogglePractice?: () => void;
  onGallery?: () => void;
  onAchievements?: () => void;
}

export function HomeScreen({ onPlay, onLevels, onDailyChallenge, audioEnabled, onToggleAudio, highScore, practiceMode, onTogglePractice, onGallery, onAchievements }: Props) {
  const click = (fn: () => void) => () => { unlockAudio(); Sfx.click(); fn(); };
  const [cbMode, setCbMode] = useState(isColorblindMode);
  const totalStars = getTotalStars();
  const earnedIds = new Set(getAchievements());

  const toggleCb = () => {
    const next = !cbMode;
    setColorblindMode(next);
    setCbMode(next);
    Sfx.click();
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-4 pb-3">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground drop-shadow-sm sm:text-5xl">
          Dusty's Bubble Pop
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Help Dusty rescue the possums and find his owner, Matilda</p>
      </div>

      <div className="animate-float py-1">
        <img
          src={dustyAndMatilda}
          alt="Dusty the cavoodle hugging Matilda"
          className="h-auto w-[180px] select-none drop-shadow-lg sm:w-[240px]"
          draggable={false}
        />
      </div>

      <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
        <button className="kid-button !py-2.5 !text-lg" onClick={click(onPlay)}>▶ Play</button>

        <div className="flex gap-2">
          {onDailyChallenge && (
            <button
              className="kid-button !py-2 !text-sm flex-1"
              onClick={click(onDailyChallenge)}
              style={{ background: "linear-gradient(135deg, hsl(45 95% 55%), hsl(35 90% 50%))" }}
            >
              📅 Daily
            </button>
          )}
          <button className="kid-button kid-button-secondary !py-2 !text-sm flex-1" onClick={click(onLevels)}>Levels</button>
        </div>

        <div className="flex gap-2">
          {onGallery && (
            <button className="kid-button kid-button-secondary !py-2 !text-sm flex-1" onClick={click(onGallery)}>🐾 Gallery</button>
          )}
          {onAchievements && (
            <button className="kid-button kid-button-secondary !py-2 !text-sm flex-1" onClick={click(onAchievements)}>
              🏆 {earnedIds.size}/{ACHIEVEMENTS.length}
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 rounded-2xl bg-card/80 px-3 py-2 shadow-md backdrop-blur">
          <button
            onClick={click(onToggleAudio)}
            className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary"
            aria-label="Toggle sound"
          >
            {audioEnabled ? "🔊 Sound" : "🔇 Sound"}
          </button>
          <button
            onClick={toggleCb}
            className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary"
            aria-label="Toggle colorblind mode"
          >
            {cbMode ? "👁 CB On" : "👁 CB"}
          </button>
          {onTogglePractice && (
            <button
              onClick={() => { Sfx.click(); onTogglePractice(); }}
              className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary"
              aria-label="Toggle practice mode"
            >
              🎯 {practiceMode ? "On" : "Prac"}
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {totalStars > 0 && <span>⭐ {totalStars} stars</span>}
          {highScore > 0 && <span>★ High score: {highScore}</span>}
        </div>
      </div>
    </div>
  );
}
