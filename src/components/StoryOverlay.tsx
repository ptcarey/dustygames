import { stageForLevel } from "@/game/stages";
import { getCompanionForLevel } from "@/characters/characters";
import { Sfx } from "@/game/sound";

interface Props {
  levelId: number;
  onContinue: () => void;
}

const STAGE_STORIES: Record<number, { title: string; text: string }> = {
  1: {
    title: "The Journey Begins",
    text: "Dusty the cavoodle has lost his owner Matilda! He heard she went looking for the lost possums near the sea. Time to pop some bubbles and rescue those little ringtails!",
  },
  2: {
    title: "Into the Toy World",
    text: "The possums have wandered into a magical toy workshop! Dusty spots colourful building blocks and wind-up toys everywhere. Bella the lab puppy offers to help with her love-bomb bubbles!",
  },
  3: {
    title: "The Whispering Forest",
    text: "Deep in the forest, fireflies light the way. Teddy the poodle joins the adventure — his zig-zag bubbles can reach tricky spots between the tall pines!",
  },
  4: {
    title: "Snow World",
    text: "Brr! The possums are shivering in the snow! Will the German Shepherd is here with his triple-guard bubbles. Let's warm those possums up with some bubble-popping action!",
  },
  5: {
    title: "Frosty Beach",
    text: "A beach covered in snow — how strange! Ruby the labradoodle bounces in excitedly. Her scatter-shot bubbles will make quick work of these sandy bubble formations!",
  },
  6: {
    title: "Matilda's Tea Party",
    text: "Dusty can smell Matilda's famous scones! She's set up a tea party in her garden for all the rescued possums. Just a few more levels and they'll be reunited at last!",
  },
};

export function StoryOverlay({ levelId, onContinue }: Props) {
  const stage = stageForLevel(levelId);
  const stageNum = stage.id;
  const story = STAGE_STORIES[stageNum] ?? STAGE_STORIES[1]!;
  const companion = getCompanionForLevel(levelId);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6" style={{ background: stage.gradient }}>
      <div className="w-full max-w-sm rounded-3xl bg-card/95 p-6 text-center shadow-2xl backdrop-blur">
        <span className="text-4xl">{stage.emoji}</span>
        <h2 className="mt-3 text-2xl font-bold text-foreground">{story.title}</h2>
        <p className="mt-2 text-lg font-bold text-primary">Stage {stageNum}: {stage.name}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{story.text}</p>
        {companion && (
          <p className="mt-2 text-sm font-semibold text-accent-foreground">
            New companion: {companion.name}!
          </p>
        )}
        <button
          className="kid-button mt-5"
          onClick={() => { Sfx.click(); onContinue(); }}
        >
          Let's Go! →
        </button>
      </div>
    </div>
  );
}
