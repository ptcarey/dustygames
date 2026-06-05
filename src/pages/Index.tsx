import { useEffect, useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { LevelSelect } from "@/components/LevelSelect";
import { BubbleGame } from "@/components/BubbleGame";
import { StoryOverlay } from "@/components/StoryOverlay";
import { PossumGallery } from "@/components/PossumGallery";
import { AchievementsScreen } from "@/components/AchievementsScreen";
import { LEVELS, TOTAL_LEVELS } from "@/game/levels";
import { loadSave, setAudioEnabled, setHighScore, setLastPlayedLevel, unlockLevel } from "@/game/storage";
import { setSoundEnabled } from "@/game/sound";

type Screen = "home" | "levels" | "game" | "story" | "gallery" | "achievements";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(loadSave());
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    document.title = "Dusty's Bubble Pop — A Cavoodle Adventure";
    setSoundEnabled(save.audioEnabled);
  }, [save.audioEnabled]);

  const startLevel = (id: number) => {
    setCurrentLevelId(id);
    setLastPlayedLevel(id);
    setSave(loadSave());
    // Show story overlay at start of each new stage (levels 1,11,21,31,41,51)
    if ([1, 11, 21, 31, 41, 51].includes(id)) {
      setScreen("story");
    } else {
      setScreen("game");
    }
  };

  const handleWin = (score: number) => {
    setHighScore(score);
    const next = Math.min(TOTAL_LEVELS, currentLevelId + 1);
    unlockLevel(next);
    setSave(loadSave());
  };

  const handleNext = () => {
    const next = Math.min(TOTAL_LEVELS, currentLevelId + 1);
    if (currentLevelId < TOTAL_LEVELS) {
      startLevel(next);
    } else {
      setScreen("levels");
    }
  };

  const handleLose = () => {
    // overlay shows; nothing else needed
  };

  const toggleAudio = () => {
    const v = !save.audioEnabled;
    setAudioEnabled(v);
    setSave({ ...save, audioEnabled: v });
  };

  const level = LEVELS.find(l => l.id === currentLevelId) ?? LEVELS[0];

  return (
    <main className="mx-auto flex h-[100dvh] max-w-[560px] flex-col">
      {screen === "home" && (
        <HomeScreen
          onPlay={() => startLevel(save.lastPlayedLevel || save.unlockedLevel)}
          onLevels={() => setScreen("levels")}
          audioEnabled={save.audioEnabled}
          onToggleAudio={toggleAudio}
          highScore={save.highScore}
          practiceMode={practiceMode}
          onTogglePractice={() => setPracticeMode(p => !p)}
          onGallery={() => setScreen("gallery")}
          onAchievements={() => setScreen("achievements")}
          onDailyChallenge={() => {
            const dayNum = Math.floor(Date.now() / 86400000);
            const dailyLevelId = (dayNum % TOTAL_LEVELS) + 1;
            startLevel(dailyLevelId);
          }}
        />
      )}
      {screen === "gallery" && (
        <PossumGallery onBack={() => setScreen("home")} />
      )}
      {screen === "achievements" && (
        <AchievementsScreen onBack={() => setScreen("home")} />
      )}
      {screen === "story" && (
        <StoryOverlay levelId={currentLevelId} onContinue={() => setScreen("game")} />
      )}
      {screen === "levels" && (
        <LevelSelect
          unlocked={save.unlockedLevel}
          lastPlayed={save.lastPlayedLevel}
          onSelect={startLevel}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "game" && (
        <BubbleGame
          key={currentLevelId}
          level={level}
          audioEnabled={save.audioEnabled}
          onWin={handleWin}
          onLose={handleLose}
          onNext={handleNext}
          onExit={() => setScreen("levels")}
          onMenu={() => setScreen("home")}
          practiceMode={practiceMode}
        />
      )}
    </main>
  );
};

export default Index;
