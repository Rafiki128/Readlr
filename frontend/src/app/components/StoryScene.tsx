import { motion, MotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Volume2, Square } from "lucide-react";
import { CharacterCompanion } from "./CharacterCompanion";
import { useAudioManager } from "../../hooks/useAudioManager";
import "./storyScene.css";

interface StoryScene {
  chapter: string;
  title: string;
  scene: string;
  narration: string;
  goal: string;
  accent: string;
  tint: string;
  illustration: string;
}

interface StorySceneProps {
  stageId: number;
  dojoCompleted?: boolean;
  bridgeWorkshopCompleted?: boolean;
  onGoToValley?: () => void;
  onGoToBridgeMap?: () => void;
  onBack: () => void;
  onBegin: () => void;
}

const SCENES: Record<number, StoryScene> = {
  1: {
    chapter: "Chapter 1",
    title: "Valley of Vowels",
    scene: "At sunrise, the Valley of Vowels is still sleepy and silver. Beside the trail stands the Vowel Dojo, where five training doors are waiting to glow.",
    narration: "Hi, explorer! I am Milo. Before we step onto the valley road, we need to train the five vowel sounds. Behind each door is a vowel power for our journey. Listen closely, say the sound, and hear your brave reading voice come back to you.",
    goal: "Wake the five vowel doors, earn your vowel powers, and use your voice to brighten the valley road.",
    accent: "#F59E0B",
    tint: "#FFF7ED",
    illustration: "🚪",
  },
  2: {
    chapter: "Chapter 2",
    title: "Blending Bridges",
    scene: "Beyond the valley, a sparkling brook winds past Milo's Bridge Workshop. Broken crossings lead to waterfalls and gardens in the sky.",
    narration: "Your vowel powers brought us here! Now our sounds need a teammate. Meet me in the Bridge Workshop. We will join two sounds, hear your voice, and build a crossing together.",
    goal: "Train five sound teams in the Workshop, then help Milo repair fifteen bridges from brook to sky.",
    accent: "#4F46E5",
    tint: "#EEF2FF",
    illustration: "🌉",
  },
  3: {
    chapter: "Chapter 3",
    title: "CVC Kingdom",
    scene: "Beyond the clouds, a quiet castle waits. Its crown has lost three shining jewels. Little words can bring its magic back.",
    narration: "Your vowel powers and sound teams brought us here! Now place a vowel between two consonants. Join the sounds to make a whole word. I will help you make your first spell at the castle gate.",
    goal: "Bring words to life, explore the castle, and restore the Crown of Three Lights.",
    accent: "#10B981",
    tint: "#D1FAE5",
    illustration: "🏰",
  },
};

function chapterBeginAudio(stageId: number) {
  if (stageId === 1) return "/audio/stage1/Stage1BeginChapter.wav";
  return null;
}

export function StoryScene({ stageId, dojoCompleted = false, bridgeWorkshopCompleted = false, onGoToValley, onGoToBridgeMap, onBack, onBegin }: StorySceneProps) {
  const scene = SCENES[stageId] ?? SCENES[1];
  const { playAudio, stopAudio, speakText } = useAudioManager();
  const [speaking, setSpeaking] = useState(false);
  const [beginning, setBeginning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const sequenceRef = useRef(0);
  const beginningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelNarration = () => {
    sequenceRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    stopAudio();
    setSpeaking(false);
  };

  const playIntroduction = () => {
    cancelNarration();
    const sequence = sequenceRef.current;
    const parts = stageId === 1 ? [
      { file: "Stage1Scene.wav", text: scene.scene },
      { file: "Stage1MiloIntro.wav", text: "Hi, explorer! I am Milo. Before we step onto the valley road, we need to train the five vowel sounds." },
      { file: "Stage1MiloMission.wav", text: "Behind each door is a vowel power for our journey. Listen closely, say the sound, and hear your brave reading voice come back to you." },
      { file: "Stage1Goal.wav", text: scene.goal },
    ] : stageId === 2 ? [
      { file: "BridgeStoryScene.wav", text: scene.scene },
      { file: "BridgeStoryMilo.wav", text: scene.narration },
      { file: "BridgeStoryGoal.wav", text: scene.goal },
    ] : [
      { file: "CvcStoryScene.wav", text: scene.scene },
      { file: "CvcStoryMilo.wav", text: scene.narration },
      { file: "CvcStoryGoal.wav", text: scene.goal },
    ];
    const playPart = (index: number) => {
      if (sequence !== sequenceRef.current) return;
      if (index >= parts.length) { setSpeaking(false); setBeat(-1); return; }
      setSpeaking(true);
      setBeat(index);
      let advanced = false;
      const advance = () => {
        if (advanced || sequence !== sequenceRef.current) return;
        advanced = true;
        timerRef.current = setTimeout(() => playPart(index + 1), 350);
      };
      let fallingBack = false;
      const fallback = () => {
        if (fallingBack || sequence !== sequenceRef.current) return;
        fallingBack = true;
        const speech = speakText(parts[index].text, 0.84);
        if (speech) {
          speech.addEventListener("end", advance, { once: true });
          speech.addEventListener("error", advance, { once: true });
        } else advance();
      };
      const audio = playAudio(`/audio/stage${stageId}/${parts[index].file}`);
      if (audio) {
        audio.onended = advance;
        audio.onerror = fallback;
        audio.play().catch((error: DOMException) => {
          if (sequence !== sequenceRef.current) return;
          if (error.name === "NotAllowedError") {
            cancelNarration();
            setBeat(-1);
          } else fallback();
        });
      } else fallback();
    };
    playPart(0);
  };

  // Keep one sequence per visit; audio helpers are recreated on render.
  useEffect(() => {
    const timer = setTimeout(() => {
      playIntroduction();
    }, 700);
    timerRef.current = timer;

    return () => {
      clearTimeout(timer);
      sequenceRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopAudio();
    };
  }, [stageId]);

  const handleListen = () => {
    if (beginningRef.current) return;
    if (speaking) { cancelNarration(); setBeat(-1); }
    else playIntroduction();
  };

  const handleBegin = () => {
    if (beginningRef.current) return;
    beginningRef.current = true;
    setBeginning(true);
    cancelNarration();
    const sequence = sequenceRef.current;
    let finished = false;
    const finish = () => {
      if (finished || sequence !== sequenceRef.current) return;
      finished = true;
      onBegin();
    };
    const audioPath = chapterBeginAudio(stageId);
    if (!audioPath) {
      finish();
      return;
    }

    stopAudio();
    const audio = playAudio(audioPath);
    if (audio) {
      setSpeaking(true);
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
      return;
    }

    finish();
  };

  return (
    <MotionConfig reducedMotion="user"><div className="chapter-story size-full bg-[var(--paper)] relative">
      <div className="chapter-story__content px-4 sm:px-6 md:px-10 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              onClick={() => { cancelNarration(); onBack(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--hairline-strong)] transition-colors text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Stages
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <BookOpen className="w-3.5 h-3.5" />
              Story scene
            </span>
          </div>

          {/* Title */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-6 sm:mb-8"
          >
            <p
              className="text-xs uppercase tracking-wider mb-2"
              style={{ color: scene.accent }}
            >
              {scene.chapter}
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl text-[var(--ink)] tracking-tight">
              {scene.title}
            </h1>
          </motion.div>

          {/* Scene panel */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
            className="chapter-story__panel bg-card rounded-3xl border border-[var(--hairline)] overflow-hidden shadow-[0_2px_4px_rgba(31,36,48,0.05),0_18px_40px_-18px_rgba(31,36,48,0.18)]"
          >
            {/* Top color band */}
            <div className="h-1" style={{ background: scene.accent }} />

            <div className="chapter-story__grid">
              {/* Left — narrative */}
              <div className="p-5 sm:p-8 md:p-10">
                <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  Scene
                </p>
                <p className="text-sm sm:text-base md:text-lg text-[var(--ink)] leading-relaxed mb-6 sm:mb-8">
                  <span style={{ background: speaking && beat === 0 ? "#FEF3C7" : "transparent", transition: "background 300ms" }}>
                  {scene.scene}
                  </span>
                </p>

                {/* Milo speech */}
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.28, duration: 0.45, ease: "easeOut" }}
                  className="bg-[var(--paper)] rounded-2xl p-4 sm:p-5 border border-[var(--hairline)] mb-6"
                  style={{ borderColor: speaking && (beat === 1 || (stageId === 1 && beat === 2)) ? scene.accent : undefined }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: scene.accent }}
                    />
                    <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                      Milo says
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-[var(--ink)] leading-relaxed">
                    "{scene.narration}"
                  </p>
                  <button
                    onClick={handleListen}
                    disabled={beginning}
                    aria-label={speaking ? "Stop narration" : "Listen to the story again"}
                    className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--hairline-strong)] transition-colors text-xs sm:text-sm"
                  >
                    {speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />}
                    {speaking ? "Stop narration" : "Listen again"}
                  </button>
                </motion.div>

                {/* Goal */}
                <div className="flex items-start gap-3 mb-6 sm:mb-8">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: scene.tint }}
                  >
                    <span style={{ color: scene.accent }}>🎯</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-0.5">
                      Your goal
                    </p>
                    <p className="text-sm sm:text-base text-[var(--ink)]" style={{ background: speaking && beat === (stageId === 1 ? 3 : 2) ? "#FEF3C7" : "transparent", transition: "background 300ms" }}>{scene.goal}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBegin}
                  disabled={beginning}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-white text-sm sm:text-lg font-medium transition-colors hover:opacity-90 w-full sm:w-auto justify-center sm:justify-start"
                  style={{
                    background: scene.accent,
                    boxShadow: `0 8px 24px -12px ${scene.accent}99`,
                  }}
                >
                  {beginning ? (stageId === 1 ? "Off to the Dojo..." : stageId === 2 ? "Off to the Workshop..." : "Let's begin...") : "Begin chapter"}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
                {stageId === 1 && dojoCompleted && onGoToValley && (
                  <button
                    disabled={beginning}
                    onClick={() => {
                      if (beginningRef.current) return;
                      beginningRef.current = true;
                      cancelNarration();
                      onGoToValley();
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#F59E0B]/30 bg-card px-5 py-3 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--tint-amber)] disabled:opacity-50 sm:w-auto"
                  >
                    Go directly to the valley <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {stageId === 2 && bridgeWorkshopCompleted && onGoToBridgeMap && (
                  <button
                    disabled={beginning}
                    onClick={() => {
                      if (beginningRef.current) return;
                      beginningRef.current = true;
                      cancelNarration();
                      onGoToBridgeMap();
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#4F46E5]/30 bg-card px-5 py-3 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50 sm:w-auto"
                  >
                    Go directly to the bridges <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                </div>
              </div>

              {/* Right — Milo + illustration card */}
              <div
                className="relative hidden md:flex flex-col items-center justify-center p-6 lg:p-10 border-t md:border-t-0 md:border-l border-[var(--hairline)]"
                style={{ background: scene.tint }}
              >
                <div className="absolute top-4 right-4 text-4xl sm:text-5xl opacity-60">
                  {scene.illustration}
                </div>
                <CharacterCompanion state={speaking ? "speaking" : "idle"} phoneme="A" size={180} />
                <p
                  className="mt-3 sm:mt-4 text-xs uppercase tracking-wider text-center"
                  style={{ color: scene.accent }}
                >
                  Your reading buddy
                </p>
                <p className="text-[var(--ink)] text-base sm:text-lg font-medium">Milo</p>
              </div>
            </div>
          </motion.div>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 sm:mt-6 text-center text-xs text-[var(--ink-muted)]"
          >
            Tip: a quiet room helps Milo hear every brave little word.
          </motion.p>
        </div>
      </div>
    </div></MotionConfig>
  );
}
