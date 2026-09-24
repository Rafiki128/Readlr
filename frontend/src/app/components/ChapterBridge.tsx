import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowLeft, Volume2 } from "lucide-react";
import { CharacterCompanion } from "./CharacterCompanion";
import { useAudioManager } from "../../hooks/useAudioManager";

interface ChapterBridgeProps {
  stageName: string;
  currentLevel: number;
  vowel: string;
  vowelName: string;
  stageId: number;
  onBeginChapter: () => void;
  onBack: () => void;
  blendingPair?: { consonant: string; vowel: string };
  cvcWord?: string;
  isCompletionView?: boolean;
}

const STAGE_THEMES = {
  1: { from: "from-[var(--tint-amber)]", to: "to-[var(--paper)]", border: "border-[#F59E0B]/30", text: "text-[#F59E0B]", bg: "bg-[#F59E0B]", panel: "from-[var(--tint-amber)] to-[var(--tint-yellow)]" },
  2: { from: "from-[var(--accent-soft)]", to: "to-[var(--tint-indigo)]", border: "border-[#4F46E5]/30", text: "text-[#4F46E5]", bg: "bg-[#4F46E5]", panel: "from-[var(--accent-soft)] to-[var(--tint-indigo)]" },
  3: { from: "from-[var(--tint-green)]", to: "to-[var(--paper)]", border: "border-[#10B981]/30", text: "text-[#10B981]", bg: "bg-[#10B981]", panel: "from-[var(--tint-green)] to-[var(--tint-mint)]" },
};

const STAGE_AUDIO_DIR: Record<number, string> = {
  1: "stage1",
  2: "stage2",
  3: "stage3",
};

const VOWEL_STORIES: Record<number, { message: string; doorCount: string }> = {
  1: { message: "Great job! The second door glows and shows the letter E. It sounds like 'ehhhh...' Let's try together!", doorCount: "2 doors open" },
  2: { message: "Wonderful! The third door appears with the letter I. It makes an 'iii...' sound. Ready to open it?", doorCount: "3 doors open" },
  3: { message: "Amazing! The fourth door shines bright with the letter O. It sounds like 'ohhh...' Can you say it?", doorCount: "4 doors open" },
  4: { message: "Fantastic! The final door reveals the letter U. It makes an 'uuuuh...' sound. Let's complete our journey!", doorCount: "5 doors open" },
};

const BLENDING_STORIES: Record<number, { message: string; doorCount: string }> = {
  1: { message: "Excellent! The 'M' block joins with 'A' to create 'MA'. It's the start of 'Mama'. Ready to find the 'B' block next?", doorCount: "Bridge Piece 1" },
  2: { message: "Great job! 'B' and 'A' come together to make 'BA'. That's how we say 'Baba'. Now, let's look for the 'T' block!", doorCount: "Bridge Piece 2" },
  3: { message: "Wonderful! 'T' and 'A' blend perfectly to make 'TA'. Step by step, our bridge is getting stronger. Can we find the 'S' block?", doorCount: "Bridge Piece 3" },
  4: { message: "Amazing! 'S' and 'A' join hands to make 'SA'. The bridge is growing right before our eyes. Let's hunt for the 'L' block!", doorCount: "Bridge Piece 4" },
  5: { message: "Fantastic! 'L' and 'A' shine bright together as 'LA'. We are halfway across the gap! Only four more pieces to go—find the 'P'!", doorCount: "Bridge Piece 5" },
  6: { message: "Incredible! 'P' and 'A' blend to make 'PA'. You are doing such a great job building this bridge. Next up is the 'N' block!", doorCount: "Bridge Piece 6" },
  7: { message: "Wonderful! 'N' and 'A' unite to make 'NA'. Just one more bridge piece to go before we cross! Let's finish with the 'D' block!", doorCount: "Bridge Piece 7" },
  8: { message: "Fantastic! The final 'D' and 'A' blend to make 'DA'. You've built the whole bridge and crossed the gap! You're a master builder!", doorCount: "Bridge Piece 8" },
};

const CVC_STORIES: Record<number, { message: string; doorCount: string }> = {
  1: { message: "Great reading! The kingdom gate opens to the word MAN. Look at each sound, then blend the whole word.", doorCount: "Word 1 read" },
  2: { message: "Nice work! HAT is waiting at the next tower. Read the letters from left to right, then say the word.", doorCount: "Word 2 read" },
  3: { message: "Wonderful! PIG is splashing near the path. Blend the sounds together to keep moving.", doorCount: "Word 3 read" },
  4: { message: "You did it! DOG is ready for a game of fetch. Say the whole word when you are ready.", doorCount: "Word 4 read" },
  5: { message: "Bright work! SUN is shining over the castle road. Read each sound, then blend it fast.", doorCount: "Word 5 read" },
  6: { message: "Cozy progress! BED is tucked into the next room. Keep your voice smooth from first sound to last.", doorCount: "Word 6 read" },
  7: { message: "Careful reading! CUP is waiting on the table. Touch each sound in your mind, then say it together.", doorCount: "Word 7 read" },
  8: { message: "Strong blend! BUS has arrived for the next stop. Read the whole CVC word clearly.", doorCount: "Word 8 read" },
  9: { message: "Almost there! TOP is spinning near the castle door. Say the word to finish this path.", doorCount: "Word 9 read" },
  10: { message: "CVC Kingdom is complete! You read every word on the path.", doorCount: "Word 10 read" },
};

function stageAudioPath(stageId: number, fileName: string) {
  return `/audio/${STAGE_AUDIO_DIR[stageId] ?? `stage${stageId}`}/${fileName}.wav`;
}

export function ChapterBridge({ 
  stageName, 
  currentLevel, 
  vowel, 
  vowelName, 
  stageId, 
  onBeginChapter, 
  onBack,
  blendingPair,
  cvcWord,
  isCompletionView = false 
}: ChapterBridgeProps) {
  const theme = STAGE_THEMES[stageId as keyof typeof STAGE_THEMES] || STAGE_THEMES[1];
  
  // Apply the -1 logic to fetch the story and audio for the level just completed.
  // Math.max ensures it doesn't drop below 1 if the user is on the very first level.
  const storyLevel = Math.max(1, currentLevel - 1);
  const storySet = stageId === 3 ? CVC_STORIES : stageId === 2 ? BLENDING_STORIES : VOWEL_STORIES;
  const story = storySet[storyLevel] || Object.values(storySet)[0];
  const displaySound = stageId === 3 && cvcWord
    ? cvcWord
    : blendingPair
      ? `${blendingPair.consonant} + ${blendingPair.vowel}`
      : vowel;

  const { playAudio, stopAudio } = useAudioManager();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Stages use the "MiloCompletedLevelX.wav" naming convention for bridge stories.
    // This will now properly play the audio for the (currentLevel - 1)
    const fileName = `MiloCompletedLevel${storyLevel}`;
    
    // Delay autoplay to allow page to render first
    const timer = setTimeout(() => {
      const audio = playAudio(stageAudioPath(stageId, fileName));
      audioRef.current = audio || null;
    }, 1000);

    return () => {
      clearTimeout(timer);
      stopAudio();
    };
  }, [stageId, storyLevel, playAudio, stopAudio]);

  const handleRepeatStory = () => {
    // Stop any other audio and replay the story
    stopAudio();
    const fileName = `MiloCompletedLevel${storyLevel}`;
    const audio = playAudio(stageAudioPath(stageId, fileName));
    audioRef.current = audio || null;
  };

  const handleListen = () => {
    // Stop any other audio first
    stopAudio();
    
    const audioPath = stageId === 3 && cvcWord
      ? stageAudioPath(stageId, cvcWord === "CAT" ? cvcWord : `Pronounce${cvcWord}`)
      : stageId === 2
        ? stageAudioPath(stageId, `Pronounce${blendingPair?.consonant}${blendingPair?.vowel}`)
        : stageAudioPath(stageId, vowel.toUpperCase());
      
    playAudio(audioPath);
  };

  return (
    <div className={`size-full bg-gradient-to-b ${theme.from} ${theme.to} overflow-hidden relative flex flex-col`}>
      <div className="relative z-10 flex-1 flex flex-col px-3 sm:px-6 md:px-10 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto w-full flex flex-col h-full justify-between">
          
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
            <span className="text-xs sm:text-sm font-medium text-[var(--ink-muted)]">
              <span className={theme.text}>{story.doorCount}</span> - {stageName}
            </span>
            {/* The level indicator still shows the current active level they are about to play */}
            <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Level {currentLevel}</span>
          </motion.div>

          <div className="flex-1 flex flex-col justify-center gap-4 sm:gap-6 md:gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 sm:gap-6">
              <CharacterCompanion state="encouraging" phoneme={vowel} size={typeof window !== 'undefined' ? Math.max(120, Math.min(220, window.innerWidth < 640 ? 120 : window.innerWidth < 768 ? 160 : 200)) : 160} />

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg border-2 ${theme.border} max-w-md w-full relative`}>
                <button onClick={handleRepeatStory} className={`absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold ${theme.text} hover:opacity-80 transition-colors bg-current/10 px-2 py-1 rounded-full`}>
                  <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Repeat
                </button>

                {/* This will now show the -1 story message */}
                <p className="text-center text-sm sm:text-base md:text-lg text-[var(--ink)] leading-relaxed mb-4 sm:mb-6 mt-3 sm:mt-4">{story.message}</p>
                
                <div className={`bg-gradient-to-br ${theme.panel} rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6`}>
                  <p className="text-[9px] sm:text-xs uppercase tracking-widest text-[var(--ink-muted)] text-center mb-2 sm:mb-3 font-medium">
                    {stageId === 3 ? "THE WORD" : "THE SOUND"}
                  </p>
                  <div className="text-center flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
                    <div className={`text-2xl sm:text-3xl md:text-5xl font-bold ${theme.text}`}>
                      {displaySound}
                    </div>
                    <button onClick={handleListen} className={`p-2 sm:p-3 md:p-4 rounded-full bg-current/10 hover:bg-current/20 transition-colors ${theme.text}`}>
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 sm:gap-4 mt-4 sm:mt-6 flex-col sm:flex-row">
            <motion.button whileHover={{ y: -2 }} onClick={onBack} className={`flex-1 px-3 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-card border-2 text-[var(--ink-soft)] font-bold text-sm sm:text-base md:text-lg hover:bg-gray-50 flex items-center justify-center gap-2 sm:gap-3`} style={{ borderColor: `${theme.bg.replace('bg-', '')}33` }}>
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Back to Chapter Map</span><span className="sm:hidden">Back</span>
            </motion.button>
            <motion.button whileHover={{ y: -2 }} onClick={onBeginChapter} className={`flex-1 px-3 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl ${theme.bg} text-white font-bold text-sm sm:text-base md:text-lg hover:opacity-90 flex items-center justify-center gap-2 sm:gap-3`}>
              Let's Go! <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
