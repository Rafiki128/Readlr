import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Volume2, Mic, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { CharacterCompanion, CharacterState } from "./CharacterCompanion";
import { useAudioManager } from "../../hooks/useAudioManager";

type FluencyTier = "fluent" | "halting" | "syllabic";

// SDD §2.5 / UC-07 fluency classification rules (confidence threshold = 0.70):
// durationMs is wall-clock (tap → ASR result), so thresholds are scaled up to
// account for ~800ms browser recognition startup overhead.
// 1. accuracy < 0.70 OR duration > 4.0× expected → SYLLABIC
// 2. duration > 2.5× expected → HALTING
// 3. otherwise → FLUENT
function computeTier(confidence: number, durationMs: number, expectedDurationMs: number): FluencyTier {
  const ratio = durationMs / expectedDurationMs;
  if (confidence < 0.70 || ratio > 4.0) return "syllabic";
  if (ratio > 2.5) return "halting";
  return "fluent";
}

function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function fuzzyMatch(word: string, targets: Set<string>): boolean {
  if (targets.has(word)) return true;
  for (const target of targets) {
    // Allow 1 edit for short words (≤4 chars), 2 edits for longer words
    const maxDist = target.length <= 4 ? 1 : 2;
    if (editDistance(word, target) <= maxDist) return true;
  }
  return false;
}

const TIER_LABEL: Record<FluencyTier, { label: string; color: string }> = {
  fluent:   { label: "Fluent ⭐",  color: "#10B981" },
  halting:  { label: "Halting 🔄",  color: "#F59E0B" },
  syllabic: { label: "Keep Trying 💪", color: "#EF4444" },
};

interface GameLevelProps {
  stageId: number;
  levelId: number;
  onBack: () => void;
  onComplete: () => void;
}

interface Challenge {
  id: number;
  word: string;        // The result (e.g., "Apple" or "MA")
  phoneme?: string;    // Used for Stage 1 character display
  consonant?: string;  // Used for blending
  vowel?: string;      // Used for blending/phoneme
  targetWord?: string; // The full word for blending (e.g., "Mama")
  audioPath: string;
  acceptedTranscripts: string[];
  storyContext: string;
  expectedDurationMs: number; // SDD §2.5: 600ms per syllable default
}

type Outcome = "success" | "incorrect" | "silent";

const STAGE_ACCENTS: Record<number, { accent: string; tint: string }> = {
  1: { accent: "#F59E0B", tint: "#FFF7ED" },
  2: { accent: "#4F46E5", tint: "#EEF2FF" },
  3: { accent: "#10B981", tint: "#D1FAE5" },
};

const ALL_CHALLENGES: Record<number, Record<number, Challenge>> = {
  1: {
    // Apple = 2 syllables (1200ms), Egg = 1 (600ms), Igloo = 2 (1200ms),
    // Octopus = 3 (1800ms), Umbrella = 3 (1800ms)
    1: { id: 1, word: "Apple", phoneme: "A", audioPath: "/audio/stage1/Apple.wav", acceptedTranscripts: ["apple", "a", "ah"], storyContext: "Say 'Apple' to open the door!", expectedDurationMs: 1200 },
    2: { id: 2, word: "Egg", phoneme: "E", audioPath: "/audio/stage1/Egg.wav", acceptedTranscripts: ["egg", "e", "eh"], storyContext: "Say 'Egg' to help the bird hatch!", expectedDurationMs: 600 },
    3: { id: 3, word: "Igloo", phoneme: "I", audioPath: "/audio/stage1/Igloo.wav", acceptedTranscripts: ["igloo", "i", "ee"], storyContext: "Say 'Igloo' to unlock the chest!", expectedDurationMs: 1200 },
    4: { id: 4, word: "Octopus", phoneme: "O", audioPath: "/audio/stage1/Octopus.wav", acceptedTranscripts: ["octopus", "o", "oh"], storyContext: "Say 'Octopus' to wake up the octopus!", expectedDurationMs: 1800 },
    5: { id: 5, word: "Umbrella", phoneme: "U", audioPath: "/audio/stage1/Umbrella.wav", acceptedTranscripts: ["umbrella", "u", "uh"], storyContext: "Say 'Umbrella' to move the boulder!", expectedDurationMs: 1800 },
  },
  2: { // Chapter 2: Blending Bridges — all CV blends are 1 syllable (600ms)
    1: {
      id: 1, word: "MA", consonant: "M", vowel: "A", targetWord: "Mama",
      audioPath: "/audio/stage2/MA.wav",
      acceptedTranscripts: ["ma", "mama", "mah", "maa", "m a", "momma", "mamma"],
      storyContext: "Blend M and A to say 'MA', then say 'Mama'!",
      expectedDurationMs: 600,
    },
    2: {
      id: 2, word: "BA", consonant: "B", vowel: "A", targetWord: "Baba",
      audioPath: "/audio/stage2/BA.wav",
      acceptedTranscripts: ["ba", "baba", "bah", "baa", "b a", "bubba", "bub"],
      storyContext: "Blend B and A to say 'BA', then say 'Baba'!",
      expectedDurationMs: 600,
    },
    3: {
      id: 3, word: "TA", consonant: "T", vowel: "A", targetWord: "Tata",
      audioPath: "/audio/stage2/TA.wav",
      acceptedTranscripts: ["ta", "tata", "tah", "taa", "t a", "tada"],
      storyContext: "Blend T and A to say 'TA', then say 'Tata'!",
      expectedDurationMs: 600,
    },
    4: {
      id: 4, word: "SA", consonant: "S", vowel: "A", targetWord: "Sasa",
      audioPath: "/audio/stage2/SA.wav",
      acceptedTranscripts: ["sa", "sasa", "sah", "saa", "s a", "saw"],
      storyContext: "Blend S and A to say 'SA', then say 'Sasa'!",
      expectedDurationMs: 600,
    },
    5: {
      id: 5, word: "LA", consonant: "L", vowel: "A", targetWord: "Lala",
      audioPath: "/audio/stage2/LA.wav",
      acceptedTranscripts: ["la", "lala", "lah", "laa", "l a", "law", "lola"],
      storyContext: "Blend L and A to say 'LA', then say 'Lala'!",
      expectedDurationMs: 600,
    },
    6: {
      id: 6, word: "PA", consonant: "P", vowel: "A", targetWord: "Papa",
      audioPath: "/audio/stage2/PA.wav",
      acceptedTranscripts: ["pa", "papa", "pah", "paa", "p a", "paw", "poppa"],
      storyContext: "Blend P and A to say 'PA', then say 'Papa'!",
      expectedDurationMs: 600,
    },
    7: {
      id: 7, word: "NA", consonant: "N", vowel: "A", targetWord: "Nana",
      audioPath: "/audio/stage2/NA.wav",
      acceptedTranscripts: ["na", "nana", "nah", "naa", "n a", "naw", "nonna"],
      storyContext: "Blend N and A to say 'NA', then say 'Nana'!",
      expectedDurationMs: 600,
    },
    8: {
      id: 8, word: "DA", consonant: "D", vowel: "A", targetWord: "Dada",
      audioPath: "/audio/stage2/DA.wav",
      acceptedTranscripts: ["da", "dada", "dah", "daa", "d a", "dad"],
      storyContext: "Blend D and A to say 'DA', then say 'Dada'!",
      expectedDurationMs: 600,
    },
  },
  3: { // Chapter 3: CVC Kingdom — all monosyllabic CVC words (600ms)
    1: {
      id: 1, word: "CAT", audioPath: "/audio/stage3/CAT.wav",
      acceptedTranscripts: ["cat", "c a t", "see a tee"],
      storyContext: "Say 'CAT' to greet the fuzzy kitty sleeping on the wall!",
      expectedDurationMs: 600,
    },
    2: {
      id: 2, word: "MAN", audioPath: "/audio/stage3/MAN.wav",
      acceptedTranscripts: ["man", "m a n", "em a en"],
      storyContext: "Say 'MAN' to help the friendly baker carry his tray of bread!",
      expectedDurationMs: 600,
    },
    3: {
      id: 3, word: "HAT", audioPath: "/audio/stage3/HAT.wav",
      acceptedTranscripts: ["hat", "hot", "h a t", "aitch a tee"],
      storyContext: "Say 'HAT' to give the lonely scarecrow his magical cap!",
      expectedDurationMs: 600,
    },
    4: {
      id: 4, word: "PIG", audioPath: "/audio/stage3/PIG.wav",
      acceptedTranscripts: ["pig", "p i g", "pee i gee"],
      storyContext: "Say 'PIG' to wake up the little pink piggy playing in the mud!",
      expectedDurationMs: 600,
    },
    5: {
      id: 5, word: "DOG", audioPath: "/audio/stage3/DOG.wav",
      acceptedTranscripts: ["dog", "d o g", "dee o gee"],
      storyContext: "Say 'DOG' to play a happy game of fetch with the puppy!",
      expectedDurationMs: 600,
    },
    6: {
      id: 6, word: "SUN", audioPath: "/audio/stage3/SUN.wav",
      acceptedTranscripts: ["sun", "s u n", "ess u en"],
      storyContext: "Say 'SUN' to clear away the dark clouds and make the morning bright!",
      expectedDurationMs: 600,
    },
    7: {
      id: 7, word: "BED", audioPath: "/audio/stage3/BED.wav",
      acceptedTranscripts: ["bed", "b e d", "bee e dee"],
      storyContext: "Say 'BED' to help Milo tuck under the cozy blankets for a rest!",
      expectedDurationMs: 600,
    },
    8: {
      id: 8, word: "CUP", audioPath: "/audio/stage3/CUP.wav",
      acceptedTranscripts: ["cup", "c u p", "see u pee"],
      storyContext: "Say 'CUP' to fill the magical glass with sweet, cold juice!",
      expectedDurationMs: 600,
    },
    9: {
      id: 9, word: "BUS", audioPath: "/audio/stage3/BUS.wav",
      acceptedTranscripts: ["bus", "b u s", "bee u ess"],
      storyContext: "Say 'BUS' to open the doors so everyone can ride to school!",
      expectedDurationMs: 600,
    },
    10: {
      id: 10, word: "TOP", audioPath: "/audio/stage3/TOP.wav",
      acceptedTranscripts: ["top", "t o p", "tee o pee"],
      storyContext: "Say 'TOP' to spin the colorful toy round and round!",
      expectedDurationMs: 600,
    },
  },
};

const VOWEL_WORD_SETS: Array<{
  phoneme: string;
  audioWord: string;
  audioPath: string;
  words: { word: string; audioPath: string }[];
}> = [
  {
    phoneme: "A",
    audioWord: "Apple",
    audioPath: "/audio/stage1/Apple.wav",
    words: [
      { word: "Apple", audioPath: "/audio/stage1/Apple.wav" },
      { word: "Ant", audioPath: "/audio/stage1/Ant.wav" },
      { word: "Axe", audioPath: "/audio/stage1/Axe.wav" },
      { word: "Alligator", audioPath: "/audio/stage1/Alligator.wav" },
      { word: "Astronaut", audioPath: "/audio/stage1/Astronaut.wav" },
      { word: "Anchor", audioPath: "/audio/stage1/Anchor.wav" },
      { word: "Arrow", audioPath: "/audio/stage1/Arrow.wav" },
      { word: "Acorn", audioPath: "/audio/stage1/Acorn.wav" },
      { word: "Apron", audioPath: "/audio/stage1/Apron.wav" },
      { word: "Album", audioPath: "/audio/stage1/Album.wav" },
    ],
  },
  {
    phoneme: "E",
    audioWord: "Egg",
    audioPath: "/audio/stage1/Egg.wav",
    words: [
      { word: "Egg", audioPath: "/audio/stage1/Egg.wav" },
      { word: "Elephant", audioPath: "/audio/stage1/Elephant.wav" },
      { word: "Elbow", audioPath: "/audio/stage1/Elbow.wav" },
      { word: "Engine", audioPath: "/audio/stage1/Engine.wav" },
      { word: "Envelope", audioPath: "/audio/stage1/Envelope.wav" },
      { word: "Exit", audioPath: "/audio/stage1/Exit.wav" },
      { word: "Echo", audioPath: "/audio/stage1/Echo.wav" },
      { word: "Emerald", audioPath: "/audio/stage1/Emerald.wav" },
      { word: "Eskimo", audioPath: "/audio/stage1/Eskimo.wav" },
      { word: "Exercise", audioPath: "/audio/stage1/Exercise.wav" },
    ],
  },
  {
    phoneme: "I",
    audioWord: "Igloo",
    audioPath: "/audio/stage1/Igloo.wav",
    words: [
      { word: "Igloo", audioPath: "/audio/stage1/Igloo.wav" },
      { word: "Insect", audioPath: "/audio/stage1/Insect.wav" },
      { word: "Ink", audioPath: "/audio/stage1/Ink.wav" },
      { word: "Island", audioPath: "/audio/stage1/Island.wav" },
      { word: "Invitation", audioPath: "/audio/stage1/Invitation.wav" },
      { word: "Iguana", audioPath: "/audio/stage1/Iguana.wav" },
      { word: "Idea", audioPath: "/audio/stage1/Idea.wav" },
      { word: "Ice", audioPath: "/audio/stage1/Ice.wav" },
      { word: "Iron", audioPath: "/audio/stage1/Iron.wav" },
      { word: "Inside", audioPath: "/audio/stage1/Inside.wav" },
    ],
  },
  {
    phoneme: "O",
    audioWord: "Octopus",
    audioPath: "/audio/stage1/Octopus.wav",
    words: [
      { word: "Octopus", audioPath: "/audio/stage1/Octopus.wav" },
      { word: "Orange", audioPath: "/audio/stage1/Orange.wav" },
      { word: "Ostrich", audioPath: "/audio/stage1/Ostrich.wav" },
      { word: "Oblong", audioPath: "/audio/stage1/Oblong.wav" },
      { word: "Owl", audioPath: "/audio/stage1/Owl.wav" },
      { word: "Ocean", audioPath: "/audio/stage1/Ocean.wav" },
      { word: "Olive", audioPath: "/audio/stage1/Olive.wav" },
      { word: "Oven", audioPath: "/audio/stage1/Oven.wav" },
      { word: "Office", audioPath: "/audio/stage1/Office.wav" },
      { word: "Orbit", audioPath: "/audio/stage1/Orbit.wav" },
    ],
  },
  {
    phoneme: "U",
    audioWord: "Umbrella",
    audioPath: "/audio/stage1/Umbrella.wav",
    words: [
      { word: "Umbrella", audioPath: "/audio/stage1/Umbrella.wav" },
      { word: "Unicorn", audioPath: "/audio/stage1/Unicorn.wav" },
      { word: "Up", audioPath: "/audio/stage1/Up.wav" },
      { word: "Under", audioPath: "/audio/stage1/Under.wav" },
      { word: "Uniform", audioPath: "/audio/stage1/Uniform.wav" },
      { word: "Ukulele", audioPath: "/audio/stage1/Ukulele.wav" },
      { word: "Uncle", audioPath: "/audio/stage1/Uncle.wav" },
      { word: "Utensil", audioPath: "/audio/stage1/Utensil.wav" },
      { word: "Unit", audioPath: "/audio/stage1/Unit.wav" },
      { word: "Us", audioPath: "/audio/stage1/Us.wav" },
    ],
  },
];

const VOWEL_GATE_CHALLENGES: Challenge[] = [
  { id: 1, word: "Apple", phoneme: "A", audioPath: "/audio/stage1/Apple.wav", acceptedTranscripts: ["apple", "a", "ah"], storyContext: "Say 'Apple' to light the A door!", expectedDurationMs: 1200 },
  { id: 2, word: "Egg", phoneme: "E", audioPath: "/audio/stage1/Egg.wav", acceptedTranscripts: ["egg", "e", "eh"], storyContext: "Say 'Egg' to light the E door!", expectedDurationMs: 600 },
  { id: 3, word: "Igloo", phoneme: "I", audioPath: "/audio/stage1/Igloo.wav", acceptedTranscripts: ["igloo", "i", "ee"], storyContext: "Say 'Igloo' to light the I door!", expectedDurationMs: 1200 },
  { id: 4, word: "Octopus", phoneme: "O", audioPath: "/audio/stage1/Octopus.wav", acceptedTranscripts: ["octopus", "o", "oh"], storyContext: "Say 'Octopus' to light the O door!", expectedDurationMs: 1800 },
  { id: 5, word: "Umbrella", phoneme: "U", audioPath: "/audio/stage1/Umbrella.wav", acceptedTranscripts: ["umbrella", "u", "uh"], storyContext: "Say 'Umbrella' to unlock the Valley of Vowels!", expectedDurationMs: 1800 },
];

function getChallenge(stageId: number, levelId: number): Challenge {
  if (stageId === 1) {
    if (levelId <= VOWEL_GATE_CHALLENGES.length) {
      return VOWEL_GATE_CHALLENGES[levelId - 1];
    }

    const valleyLevel = Math.max(1, Math.min(levelId - VOWEL_GATE_CHALLENGES.length, 50));
    const group = VOWEL_WORD_SETS[Math.floor((valleyLevel - 1) / 10)];
    const wordData = group.words[(valleyLevel - 1) % 10]; // Now properly extracted as an object

    return {
      id: levelId,
      word: wordData.word,
      phoneme: group.phoneme,
      audioPath: wordData.audioPath, // Uses the exact audio path for this specific word
      acceptedTranscripts: [
        wordData.word.toLowerCase(),
        group.phoneme.toLowerCase(),
        group.audioWord.toLowerCase(),
      ],
      storyContext: `Say '${wordData.word}' to restore the ${group.phoneme} part of the valley!`,
      expectedDurationMs: 600,
    };
  }

  return ALL_CHALLENGES[stageId]?.[levelId] ?? ALL_CHALLENGES[2][1];
}

export function GameLevel({ stageId, levelId, onBack, onComplete }: GameLevelProps) {
  const { accent, tint } = STAGE_ACCENTS[stageId] ?? STAGE_ACCENTS[1];
  const { playAudio, stopAudio, stopAllAudio } = useAudioManager();

  const [characterState, setCharacterState] = useState<CharacterState>("idle");
  const [bubbleMessage, setBubbleMessage] = useState<string>("Hi! Let's read together!");
  const [earnedTier, setEarnedTier] = useState<FluencyTier | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attemptNumber = useRef(0);
  const attemptStartTime = useRef<number>(0);
  // SDD UC-06: track whether last attempt failed and whether the learner
  // requested the model audio before retrying (blocks self-correction flag)
  const lastAttemptFailed = useRef(false);
  const userRequestedModel = useRef(false);
  // SDD §2.1 schema: sessionId scoped to this level visit
  const sessionId = useRef<string>(crypto.randomUUID());

  const challenge = getChallenge(stageId, levelId);
  const isBlendingMode = stageId === 2;
  const isCvcMode = stageId === 3;

  useEffect(() => {
    return () => {
      stopAllAudio();
      stopListening();
    };
  }, [stopAllAudio]);

  const speakPhoneme = useCallback(() => {
    stopAudio();
    setCharacterState("speaking");
    setBubbleMessage(`Listen to Milo: "${challenge.word}"`);

    const sound = playAudio(challenge.audioPath);

    if (sound) {
      sound.onended = () => {
        setCharacterState("idle");
        setBubbleMessage(`Your turn! Say: "${isBlendingMode ? challenge.targetWord : challenge.word}"!`);
      };
    }
  }, [challenge, isBlendingMode, playAudio, stopAudio]);

  useEffect(() => {
    attemptNumber.current = 0;
    lastAttemptFailed.current = false;
    userRequestedModel.current = false;
    sessionId.current = crypto.randomUUID();
    setEarnedTier(null);

    const autoplayTimer = setTimeout(() => {
      speakPhoneme();
    }, 1000);

    return () => {
      clearTimeout(autoplayTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, levelId]);

  const handleSpeechResult = (outcome: Outcome) => {
    stopAudio();
    if (outcome === "success") {
      setCharacterState("celebrating");
      setBubbleMessage(`Great! You said "${challenge.targetWord || challenge.word}"!`);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      const feedbackAudio = playAudio("/audio/common/GreatJob.wav");
      if (feedbackAudio) {
        feedbackAudio.onended = onComplete;
      } else {
        onComplete();
      }
    } else {
      setCharacterState("encouraging");
      setBubbleMessage(outcome === "silent" ? "Oops! Let's try again." : "Not quite, try saying the word clearly.");
      const retryAudio = playAudio(outcome === "silent" ? "/audio/common/TryAgain.wav" : "/audio/common/IncorrectWord.wav");
      if (retryAudio) {
        retryAudio.onended = () => setCharacterState("idle");
      }
    }
  };

  const stopListening = () => {
    if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* already stopped */ } recognitionRef.current = null; }
    setIsListening(false);
  };

  const handleListen = () => {
    if (isListening) return;
    stopAudio();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Use Chrome!"); return; }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    setIsListening(true);
    setCharacterState("listening");
    setBubbleMessage(`Listening...`);
    attemptStartTime.current = Date.now();
    attemptNumber.current += 1;

    // Auto-stop after 10s if ASR hangs and never fires onresult/onerror
    listenTimeoutRef.current = setTimeout(() => {
      stopListening();
      handleSpeechResult("silent");
    }, 10000);

    recognition.onresult = (event: any) => {
      if (event.results[event.results.length - 1].isFinal) {
        stopListening();
        const result = event.results[event.results.length - 1][0];
        const transcript = result.transcript.toLowerCase().trim();
        const confidence: number = result.confidence || 0.75;
        const durationMs = Date.now() - attemptStartTime.current;

        const targetWords = new Set(challenge.acceptedTranscripts);
        // Stage 1 targets vowel discrimination — exact match only so "igg" ≠ "egg"
        const matchWord = (word: string) => stageId === 1
          ? targetWords.has(word)
          : fuzzyMatch(word, targetWords);
        const matched = transcript.split(/\s+/).some((word: string) => matchWord(word.replace(/[^a-z]/g, "")));

        setLastTranscript(`${matched ? challenge.word.toLowerCase() : transcript} (confidence: ${confidence.toFixed(2)})`);

        if (matched) {
          const tier = computeTier(confidence, durationMs, challenge.expectedDurationMs);
          setEarnedTier(tier);

          // SDD UC-06: self-correction = previous attempt failed AND learner
          // did not press Listen to request the audio model between attempts
          const selfCorrected = lastAttemptFailed.current && !userRequestedModel.current;
          lastAttemptFailed.current = false;
          userRequestedModel.current = false;

          // SDD §2.5 / READING_ATTEMPT_RECORD schema with all required fields
          const record = {
            wordId: challenge.id,
            sessionId: sessionId.current,
            stageId,
            levelId,
            word: challenge.word,
            attemptNumber: attemptNumber.current,
            confidence,
            durationMs,
            tier,
            selfCorrected,
            timestamp: new Date().toISOString(),
          };
          const existing = JSON.parse(localStorage.getItem("readlr_attempt_records") || "[]");
          localStorage.setItem("readlr_attempt_records", JSON.stringify([...existing, record]));

          handleSpeechResult("success");
        } else {
          lastAttemptFailed.current = true;
          handleSpeechResult("incorrect");
        }
      }
    };
    recognition.onerror = (e: any) => { stopListening(); handleSpeechResult(e.error === 'no-speech' ? "silent" : "incorrect"); };
    recognition.start();
  };

  return (
    <div className="size-full bg-[var(--paper)] overflow-hidden relative flex flex-col">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-60 pointer-events-none" style={{ background: tint }} />
      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 items-center justify-center gap-4">
        <button onClick={onBack} className="absolute top-6 left-6 px-3 py-2 rounded-xl bg-card border text-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
        </button>
        
        <motion.div className="bg-card rounded-2xl px-6 sm:px-8 py-4 shadow-lg text-center max-w-md w-full">
          <p className="text-lg sm:text-xl font-bold text-[var(--ink)]">{bubbleMessage}</p>
        </motion.div>
        
        <motion.div 
          className="flex-shrink-0"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          <CharacterCompanion state={characterState} phoneme={challenge.phoneme || challenge.vowel || ""} size={260} />
        </motion.div>

        <motion.div className="bg-card px-6 sm:px-12 py-4 sm:py-6 rounded-3xl border-4 text-center max-w-2xl w-full" style={{ borderColor: accent }}>
          {isBlendingMode ? (
            <div className="flex flex-col items-center">
              <h2 className="text-xs sm:text-sm uppercase tracking-widest text-gray-400 mb-3 sm:mb-4">Blend the sounds:</h2>
              <div className="flex items-center gap-2 sm:gap-4 font-bold justify-center flex-wrap" style={{ color: accent }}>
                <span className="text-4xl sm:text-6xl">{challenge.consonant}</span>
                <span className="text-2xl sm:text-3xl text-gray-300">+</span>
                <span className="text-4xl sm:text-6xl">{challenge.vowel}</span>
                <span className="text-2xl sm:text-3xl text-gray-300">=</span>
                <span className="text-4xl sm:text-6xl uppercase">{challenge.targetWord}</span>
              </div>
            </div>
          ) : isCvcMode ? (
            <div className="flex flex-col items-center">
              <h2 className="text-xs sm:text-sm uppercase tracking-widest text-gray-400 mb-3 sm:mb-4">Read the word:</h2>
              <span className="text-5xl sm:text-7xl font-bold inline-block mb-2" style={{ color: accent }}>{challenge.word}</span>
              <div className="mt-4 flex items-center gap-2 sm:gap-3 justify-center" style={{ color: accent }}>
                {challenge.word.split("").map((letter, index) => (
                  <span key={`${letter}-${index}`} className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl font-bold uppercase">
                      {letter}
                    </span>
                    {index < challenge.word.length - 1 && (
                      <span className="text-gray-300 text-xl sm:text-2xl font-bold">
                        +
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xs sm:text-sm uppercase tracking-widest text-gray-400 mb-3 sm:mb-4">Say the word:</h2>
              <span className="text-5xl sm:text-7xl font-bold inline-block" style={{ color: accent }}>{challenge.word}</span>
            </>
          )}
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-sm sm:max-w-md sm:gap-4 justify-center">
          <button onClick={() => { userRequestedModel.current = true; speakPhoneme(); }} className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-card border flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium">
            <Volume2 className="w-4 h-4 flex-shrink-0" /> Listen
          </button>
          <button onClick={handleListen} disabled={isListening} className="px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: accent }}>
            <Mic className="w-4 h-4 flex-shrink-0" /> {isListening ? "Listening..." : "Tap to Speak"}
          </button>
        </div>
        
        {lastTranscript && (
          <p className="text-xs text-gray-400 text-center">heard: "{lastTranscript}"</p>
        )}
        <p className="mt-2 sm:mt-4 text-gray-500 text-xs sm:text-sm text-center max-w-md">{challenge.storyContext}</p>

        {earnedTier && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-4 py-2 rounded-full text-white text-sm font-bold"
            style={{ backgroundColor: TIER_LABEL[earnedTier].color }}
          >
            {TIER_LABEL[earnedTier].label}
          </motion.div>
        )}
      </div>
    </div>
  );
}