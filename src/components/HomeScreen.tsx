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
        {onDailyChallenge && (
          <button className="kid-button" onClick={click(onDailyChallenge)} style={{ background: "linear-gradient(135deg, hsl(45 95% 55%), hsl(35 90% 50%))" }}>
            📅 Daily Challenge
          </button>
        )}
        <button className="kid-button kid-button-secondary" onClick={click(onLevels)}>Levels</button>
        {onGallery && (
          <button className="kid-button kid-button-secondary" onClick={click(onGallery)}>🐾 Possum Gallery</button>
        )}

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

        <div className="flex items-center justify-between rounded-full bg-card/80 px-5 py-3 shadow-md backdrop-blur">
          <span className="text-base font-semibold text-foreground">Colorblind</span>
          <button
            onClick={toggleCb}
            className="rounded-full bg-primary/15 px-4 py-1 text-base font-bold text-primary"
            aria-label="Toggle colorblind mode"
          >
            {cbMode ? "On" : "Off"}
          </button>
        </div>

        {onTogglePractice && (
          <div className="flex items-center justify-between rounded-full bg-card/80 px-5 py-3 shadow-md backdrop-blur">
            <span className="text-base font-semibold text-foreground">Practice</span>
            <button
              onClick={() => { Sfx.click(); onTogglePractice(); }}
              className="rounded-full bg-primary/15 px-4 py-1 text-base font-bold text-primary"
              aria-label="Toggle practice mode"
            >
              {practiceMode ? "On" : "Off"}
            </button>
          </div>
        )}

        {onAchievements && (
          <button className="kid-button kid-button-secondary" onClick={click(onAchievements)}>
            🏆 Achievements ({earnedIds.size}/{ACHIEVEMENTS.length})
          </button>
        )}

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {totalStars > 0 && <span>⭐ {totalStars} stars</span>}
          {highScore > 0 && <span>★ High score: {highScore}</span>}
        </div>
      </div>
    </div>
  );
}
