import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Volume2, Mic, ArrowLeft, Square, Sparkles, Wand2 } from "lucide-react";
import confetti from "canvas-confetti";
import { CharacterCompanion, CharacterState } from "./CharacterCompanion";
import { useAudioManager } from "../../hooks/useAudioManager";

type FluencyTier = "fluent" | "halting" | "syllabic";
type StageOneLevelType =
  | "sound-gem"
  | "mouth-shape"
  | "letter-match"
  | "anchor-echo"
  | "blend-bridge"
  | "missing-vowel"
  | "mixed-review";

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

const VOWEL_CHOICES = ["A", "E", "I", "O", "U"];

function shuffleItems<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let value = Math.floor(seed * 1_000_000) || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    value = (value * 9301 + 49297) % 233280;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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
  levelType?: StageOneLevelType;
  targetSound?: string;
  anchorWord?: string;
  skillLabel?: string;
  reward?: string;
  promptVariants?: string[];
  choices?: string[];
  correctChoice?: string;
  frame?: string;
  mouthHint?: string;
  visualHint?: string;
}

type Outcome = "success" | "incorrect" | "silent";

const STAGE_ACCENTS: Record<number, { accent: string; tint: string }> = {
  1: { accent: "#F59E0B", tint: "#FFF7ED" },
  2: { accent: "#4F46E5", tint: "#EEF2FF" },
  3: { accent: "#10B981", tint: "#D1FAE5" },
};

type VowelKey = "A" | "E" | "I" | "O" | "U";

interface VowelDoorData {
  vowel: VowelKey;
  sound: string;
  title: string;
  intro: string;
  audioPath: string;
  abilityName: string;
  abilityIcon: string;
  ability: string;
  rewardTitle: string;
  rewardSubtitle: string;
  mouthHint: string;
  steps: string[];
}

interface StageOneNarrationStep {
  message: string;
  revealCount: number;
}

interface VowelPowerChallenge {
  title: string;
  obstacle: string;
  action: string;
  success: string;
  steps: string[];
}

const VOWEL_POWER_STORAGE_KEY = "readlr_vowel_powers";
const STAGE_ONE_DOOR_COUNT = 5;
const STAGE_ONE_VOWEL_ORDER: VowelKey[] = ["A", "E", "I", "O", "U"];

const VOWEL_POWER_KIT: Record<VowelKey, VowelDoorData> = {
  A: {
    vowel: "A",
    sound: "/a/",
    title: "A Training Door",
    intro: "The A door opens wide. Milo needs your open /a/ sound to forge the first valley power.",
    audioPath: "/audio/stage1/A.wav",
    abilityName: "A Armor",
    abilityIcon: "A",
    ability: "A strong open sound that clears blocked trail gates.",
    rewardTitle: "You gained A Armor",
    rewardSubtitle: "Your /a/ sound can push open heavy valley gates.",
    mouthHint: "Open your mouth wide like a bright morning yawn.",
    steps: ["Listen", "Open wide", "Say /a/"],
  },
  E: {
    vowel: "E",
    sound: "/e/",
    title: "E Training Door",
    intro: "The E door twinkles with tiny lights. Milo needs your quick /e/ sound to reveal hidden marks.",
    audioPath: "/audio/stage1/E.wav",
    abilityName: "E Echo",
    abilityIcon: "E",
    ability: "A bright echo that wakes small clue lights.",
    rewardTitle: "You gained E Echo",
    rewardSubtitle: "Your /e/ sound can light hidden marks on the road.",
    mouthHint: "Make a small smile and keep the sound quick.",
    steps: ["Listen", "Small smile", "Say /e/"],
  },
  I: {
    vowel: "I",
    sound: "/i/",
    title: "I Training Door",
    intro: "The I door shivers like a tiny bell. Milo needs your short /i/ sound to sharpen the path.",
    audioPath: "/audio/stage1/I.wav",
    abilityName: "I Insight",
    abilityIcon: "I",
    ability: "A sharp sound that draws missing paths back onto the map.",
    rewardTitle: "You gained I Insight",
    rewardSubtitle: "Your /i/ sound can reveal tiny secret trail lines.",
    mouthHint: "Keep the sound short and light.",
    steps: ["Listen", "Short sound", "Say /i/"],
  },
  O: {
    vowel: "O",
    sound: "/o/",
    title: "O Training Door",
    intro: "The O door rolls like a round moon. Milo needs your round /o/ sound to open circle gates.",
    audioPath: "/audio/stage1/O.wav",
    abilityName: "O Orb",
    abilityIcon: "O",
    ability: "A round sound that unlocks circle gates and rolling stones.",
    rewardTitle: "You gained O Orb",
    rewardSubtitle: "Your /o/ sound can open the valley's round gates.",
    mouthHint: "Round your lips like a little circle.",
    steps: ["Listen", "Round lips", "Say /o/"],
  },
  U: {
    vowel: "U",
    sound: "/u/",
    title: "U Training Door",
    intro: "The U door lifts with a whoosh. Milo needs your soft /u/ sound to raise bridges and shields.",
    audioPath: "/audio/stage1/U.wav",
    abilityName: "U Uplift",
    abilityIcon: "U",
    ability: "A lifting sound that raises bridges and shields rainy paths.",
    rewardTitle: "You gained U Uplift",
    rewardSubtitle: "Your /u/ sound can lift the valley road when it sinks.",
    mouthHint: "Make a soft sound from your tummy.",
    steps: ["Listen", "Soft voice", "Say /u/"],
  },
};

const DEFAULT_POWER_CHALLENGE: VowelPowerChallenge = {
  title: "Quiet Trail Stone",
  obstacle: "A trail stone is waiting for a voice spark.",
  action: "Say the vowel sound to make the stone glow.",
  success: "The trail stone glowed and showed Milo the way forward.",
  steps: ["Listen", "Say", "Replay"],
};

const POWER_CHALLENGES: Record<VowelKey, VowelPowerChallenge[]> = {
  A: [
    { title: "Heavy Gate", obstacle: "A sleepy gate blocks the trail.", action: "Use A Armor. Say /a/ with an open mouth.", success: "A Armor pushed the heavy gate open.", steps: ["Open", "Say /a/", "Push"] },
    { title: "Branch Wall", obstacle: "A branch wall leans across the road.", action: "Use A Armor to make a strong sound wave.", success: "The /a/ sound wave cleared the branches.", steps: ["Breathe", "Say /a/", "Clear"] },
    { title: "Stone Step", obstacle: "A stone step needs a strong voice to rise.", action: "Say /a/ and send the sound under the stone.", success: "The stone rose into a safe step.", steps: ["Aim", "Say /a/", "Rise"] },
  ],
  E: [
    { title: "Hidden Marks", obstacle: "Tiny trail marks are hiding in the grass.", action: "Use E Echo. Say /e/ quickly and clearly.", success: "E Echo lit the hidden marks.", steps: ["Smile", "Say /e/", "Reveal"] },
    { title: "Blinking Sign", obstacle: "A small sign blinks but cannot shine.", action: "Send your /e/ sound to wake the sign.", success: "The sign blinked bright and pointed ahead.", steps: ["Listen", "Say /e/", "Shine"] },
    { title: "Little Light Path", obstacle: "The path needs tiny lights to appear.", action: "Say /e/ to spark each little light.", success: "Little lights led Milo forward.", steps: ["Tap", "Say /e/", "Follow"] },
  ],
  I: [
    { title: "Missing Map Line", obstacle: "The map lost the next trail line.", action: "Use I Insight. Say a short /i/ sound.", success: "I Insight drew the missing line.", steps: ["Focus", "Say /i/", "Trace"] },
    { title: "Tiny Clue", obstacle: "A clue is too small for Milo to see.", action: "Say /i/ to sharpen the clue.", success: "The tiny clue grew clear.", steps: ["Look", "Say /i/", "Spot"] },
    { title: "Needle Bridge", obstacle: "A narrow bridge needs careful steps.", action: "Say /i/ and help Milo focus.", success: "Milo crossed the narrow bridge.", steps: ["Steady", "Say /i/", "Cross"] },
  ],
  O: [
    { title: "Round Gate", obstacle: "A round gate is sealed shut.", action: "Use O Orb. Round your lips and say /o/.", success: "O Orb rolled the round gate open.", steps: ["Round", "Say /o/", "Open"] },
    { title: "Rolling Stone", obstacle: "A round stone waits on the road.", action: "Say /o/ to roll it aside.", success: "The stone rolled away from the path.", steps: ["Circle", "Say /o/", "Roll"] },
    { title: "Moon Door", obstacle: "A moon door only hears round sounds.", action: "Say /o/ with your lips like a circle.", success: "The moon door opened softly.", steps: ["Shape", "Say /o/", "Glow"] },
  ],
  U: [
    { title: "Low Bridge", obstacle: "A little bridge sank into the stream.", action: "Use U Uplift. Say /u/ to raise it.", success: "U Uplift raised the bridge.", steps: ["Soft", "Say /u/", "Lift"] },
    { title: "Rainy Shield", obstacle: "Rain covers the valley road.", action: "Say /u/ to lift a shield over Milo.", success: "The shield rose and caught the rain.", steps: ["Breathe", "Say /u/", "Shield"] },
    { title: "Updraft Path", obstacle: "The next platform is too high.", action: "Say /u/ to call an updraft.", success: "The updraft lifted Milo safely.", steps: ["Ready", "Say /u/", "Rise"] },
  ],
};

function readEarnedVowelPowers(): Partial<Record<VowelKey, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(VOWEL_POWER_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeEarnedVowelPower(vowel: VowelKey) {
  const saved = readEarnedVowelPowers();
  localStorage.setItem(VOWEL_POWER_STORAGE_KEY, JSON.stringify({ ...saved, [vowel]: true }));
}

function makeStageOneEncounter(levelId: number) {
  const roadLevel = Math.max(1, levelId - STAGE_ONE_DOOR_COUNT);
  const seed = (levelId * 7 + roadLevel * 11) % STAGE_ONE_VOWEL_ORDER.length;
  const vowel = STAGE_ONE_VOWEL_ORDER[seed];
  const power = VOWEL_POWER_KIT[vowel];
  const challenges = POWER_CHALLENGES[vowel] ?? [DEFAULT_POWER_CHALLENGE];
  const challenge = challenges[(roadLevel - 1) % challenges.length];
  const prompt = `${challenge.obstacle} ${challenge.action}`;

  return {
    roadLevel,
    vowel,
    power,
    challenge,
    prompt,
    title: `Trail Level ${roadLevel}`,
  };
}

function makeDoorNarrationSteps(door: VowelDoorData): StageOneNarrationStep[] {
  return [
    {
      message: `We need your help training the vowel sound ${door.sound}. Listen to Milo first, then try the sound with your own voice.`,
      revealCount: 0,
    },
    {
      message: `${door.abilityName} is waiting behind this door. ${door.ability}`,
      revealCount: 1,
    },
    {
      message: `${door.mouthHint} When you record it, Milo will play your voice back so you can hear your sound.`,
      revealCount: 1,
    },
  ];
}

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
  {
    id: 1,
    word: "A",
    phoneme: "A",
    vowel: "A",
    audioPath: "/audio/stage1/A.wav",
    acceptedTranscripts: ["a", "ah", "apple"],
    storyContext: "Listen to the vowel sound. Say /a/ to light the A door. Apple is only the picture clue.",
    expectedDurationMs: 700,
    levelType: "sound-gem",
    targetSound: "/a/",
    anchorWord: "Apple",
    skillLabel: "Vowel Door",
    reward: "A Door",
    promptVariants: [
      "Listen to the A sound. Then say /a/.",
      "This door opens with the vowel sound /a/.",
      "Say the sound, not the word: /a/.",
    ],
  },
  {
    id: 2,
    word: "E",
    phoneme: "E",
    vowel: "E",
    audioPath: "/audio/stage1/E.wav",
    acceptedTranscripts: ["e", "eh", "egg"],
    storyContext: "Listen to the vowel sound. Say /e/ to light the E door. Egg is only the picture clue.",
    expectedDurationMs: 700,
    levelType: "sound-gem",
    targetSound: "/e/",
    anchorWord: "Egg",
    skillLabel: "Vowel Door",
    reward: "E Door",
    promptVariants: [
      "Listen to the E sound. Then say /e/.",
      "This door opens with the vowel sound /e/.",
      "Say the sound, not the word: /e/.",
    ],
  },
  {
    id: 3,
    word: "I",
    phoneme: "I",
    vowel: "I",
    audioPath: "/audio/stage1/I.wav",
    acceptedTranscripts: ["i", "ih", "igloo"],
    storyContext: "Listen to the vowel sound. Say /i/ to light the I door. Igloo is only the picture clue.",
    expectedDurationMs: 700,
    levelType: "sound-gem",
    targetSound: "/i/",
    anchorWord: "Igloo",
    skillLabel: "Vowel Door",
    reward: "I Door",
    promptVariants: [
      "Listen to the I sound. Then say /i/.",
      "This door opens with the vowel sound /i/.",
      "Say the sound, not the word: /i/.",
    ],
  },
  {
    id: 4,
    word: "O",
    phoneme: "O",
    vowel: "O",
    audioPath: "/audio/stage1/O.wav",
    acceptedTranscripts: ["o", "oh", "octopus"],
    storyContext: "Listen to the vowel sound. Say /o/ to light the O door. Octopus is only the picture clue.",
    expectedDurationMs: 700,
    levelType: "sound-gem",
    targetSound: "/o/",
    anchorWord: "Octopus",
    skillLabel: "Vowel Door",
    reward: "O Door",
    promptVariants: [
      "Listen to the O sound. Then say /o/.",
      "This door opens with the vowel sound /o/.",
      "Say the sound, not the word: /o/.",
    ],
  },
  {
    id: 5,
    word: "U",
    phoneme: "U",
    vowel: "U",
    audioPath: "/audio/stage1/U.wav",
    acceptedTranscripts: ["u", "uh", "umbrella"],
    storyContext: "Listen to the vowel sound. Say /u/ to light the U door. Umbrella is only the picture clue.",
    expectedDurationMs: 700,
    levelType: "sound-gem",
    targetSound: "/u/",
    anchorWord: "Umbrella",
    skillLabel: "Vowel Door",
    reward: "U Door",
    promptVariants: [
      "Listen to the U sound. Then say /u/.",
      "This door opens with the vowel sound /u/.",
      "Say the sound, not the word: /u/.",
    ],
  },
];

const STAGE_ONE_VOWELS = [
  {
    vowel: "A",
    sound: "/a/",
    anchor: "Apple",
    audioPath: "/audio/stage1/A.wav",
    accepted: ["a", "ah", "apple"],
    mouthHint: "Open your mouth wide like a big smile.",
    blend: { word: "MA", consonant: "M", accepted: ["ma", "mah", "m a"] },
    missing: { frame: "c _ t", answer: "cat", accepted: ["a", "ah", "cat"] },
    accent: "amber",
  },
  {
    vowel: "E",
    sound: "/e/",
    anchor: "Egg",
    audioPath: "/audio/stage1/E.wav",
    accepted: ["e", "eh", "egg"],
    mouthHint: "Make a small smile and say a quick sound.",
    blend: { word: "ME", consonant: "M", accepted: ["me", "meh", "m e"] },
    missing: { frame: "p _ n", answer: "pen", accepted: ["e", "eh", "pen"] },
    accent: "pink",
  },
  {
    vowel: "I",
    sound: "/i/",
    anchor: "Igloo",
    audioPath: "/audio/stage1/I.wav",
    accepted: ["i", "ih", "igloo"],
    mouthHint: "Keep the sound short and light.",
    blend: { word: "SI", consonant: "S", accepted: ["si", "see", "s i"] },
    missing: { frame: "p _ n", answer: "pin", accepted: ["i", "ih", "pin"] },
    accent: "cyan",
  },
  {
    vowel: "O",
    sound: "/o/",
    anchor: "Octopus",
    audioPath: "/audio/stage1/O.wav",
    accepted: ["o", "oh", "octopus"],
    mouthHint: "Round your lips like a small circle.",
    blend: { word: "TO", consonant: "T", accepted: ["to", "toe", "t o"] },
    missing: { frame: "d _ g", answer: "dog", accepted: ["o", "oh", "dog"] },
    accent: "violet",
  },
  {
    vowel: "U",
    sound: "/u/",
    anchor: "Umbrella",
    audioPath: "/audio/stage1/U.wav",
    accepted: ["u", "uh", "umbrella"],
    mouthHint: "Make a soft sound from your tummy.",
    blend: { word: "LU", consonant: "L", accepted: ["lu", "loo", "l u"] },
    missing: { frame: "s _ n", answer: "sun", accepted: ["u", "uh", "sun"] },
    accent: "green",
  },
] as const;

const STAGE_ONE_ACTIVITY_PLAN: StageOneLevelType[] = [
  "sound-gem",
  "mouth-shape",
  "letter-match",
  "anchor-echo",
  "blend-bridge",
  "missing-vowel",
];

function makeStageOneQuest(levelId: number): Challenge {
  const valleyLevel = Math.max(1, Math.min(levelId - VOWEL_GATE_CHALLENGES.length, 35));
  const isReview = valleyLevel > 30;
  const vowelIndex = isReview
    ? valleyLevel - 31
    : Math.floor((valleyLevel - 1) / STAGE_ONE_ACTIVITY_PLAN.length);
  const vowelData = STAGE_ONE_VOWELS[Math.max(0, Math.min(vowelIndex, STAGE_ONE_VOWELS.length - 1))];
  const levelType = isReview
    ? "mixed-review"
    : STAGE_ONE_ACTIVITY_PLAN[(valleyLevel - 1) % STAGE_ONE_ACTIVITY_PLAN.length];

  const base: Challenge = {
    id: levelId,
    word: vowelData.vowel,
    phoneme: vowelData.vowel,
    vowel: vowelData.vowel,
    audioPath: vowelData.audioPath,
    acceptedTranscripts: [...vowelData.accepted],
    storyContext: `Earn the ${vowelData.vowel} Sound Charm for later reading adventures.`,
    expectedDurationMs: 700,
    levelType,
    targetSound: vowelData.sound,
    anchorWord: vowelData.anchor,
    correctChoice: vowelData.vowel,
    choices: VOWEL_CHOICES,
    mouthHint: vowelData.mouthHint,
  };

  switch (levelType) {
    case "sound-gem":
      return {
        ...base,
        word: `${vowelData.vowel} Sound`,
        skillLabel: "Sound Gem",
        reward: `${vowelData.vowel} Gem`,
        promptVariants: [
          `Say the ${vowelData.vowel} sound to wake the gem.`,
          `Give Milo a clear ${vowelData.sound} sound.`,
          `Hold the ${vowelData.vowel} sound just long enough to glow.`,
        ],
        visualHint: "sound waves",
      };
    case "mouth-shape":
      return {
        ...base,
        word: `${vowelData.vowel} Mouth`,
        skillLabel: "Mouth Mirror",
        reward: "Voice Spark",
        promptVariants: [
          vowelData.mouthHint,
          `Copy Milo's mouth and say ${vowelData.sound}.`,
          `Try the ${vowelData.vowel} mouth shape, then speak.`,
        ],
        visualHint: "mouth mirror",
      };
    case "letter-match":
      return {
        ...base,
        word: `${vowelData.vowel} Letter`,
        skillLabel: "Letter Tile",
        reward: `${vowelData.vowel} Tile`,
        promptVariants: [
          `Pick the letter that makes ${vowelData.sound}, then say it.`,
          `Find ${vowelData.vowel} among the vowel stones.`,
          `Tap the right vowel tile before you speak.`,
        ],
        visualHint: "letter match",
      };
    case "anchor-echo":
      return {
        ...base,
        word: vowelData.anchor,
        skillLabel: "Anchor Echo",
        reward: `${vowelData.anchor} Badge`,
        promptVariants: [
          `Say ${vowelData.sound}, then ${vowelData.anchor}.`,
          `Echo Milo: ${vowelData.vowel} as in ${vowelData.anchor}.`,
          `Use the sound in ${vowelData.anchor}.`,
        ],
        expectedDurationMs: vowelData.anchor.length > 5 ? 1200 : 700,
        visualHint: "anchor picture",
      };
    case "blend-bridge":
      return {
        ...base,
        word: vowelData.blend.word,
        consonant: vowelData.blend.consonant,
        acceptedTranscripts: [...vowelData.blend.accepted, ...vowelData.accepted],
        skillLabel: "Blend Bridge",
        reward: "Bridge Piece",
        promptVariants: [
          `Blend ${vowelData.blend.consonant} and ${vowelData.vowel}: ${vowelData.blend.word}.`,
          `Tap the tiles in your mind, then say ${vowelData.blend.word}.`,
          `Slide the sounds together: ${vowelData.blend.consonant} plus ${vowelData.vowel}.`,
        ],
        expectedDurationMs: 600,
        visualHint: "blend tiles",
      };
    case "missing-vowel":
      return {
        ...base,
        word: vowelData.missing.answer.toUpperCase(),
        frame: vowelData.missing.frame,
        acceptedTranscripts: [...vowelData.missing.accepted, ...vowelData.accepted],
        skillLabel: "Missing Vowel",
        reward: "Word Key",
        promptVariants: [
          `Choose the missing vowel in ${vowelData.missing.frame}, then say the sound.`,
          `The word key needs ${vowelData.vowel}. Fill the blank.`,
          `Tap ${vowelData.vowel} to repair the word bridge.`,
        ],
        expectedDurationMs: 700,
        visualHint: "missing vowel",
      };
    case "mixed-review":
    default:
      return {
        ...base,
        word: `${vowelData.vowel} Review`,
        skillLabel: "Mixed Review",
        reward: "Review Star",
        promptVariants: [
          `Listen for ${vowelData.sound}. Pick ${vowelData.vowel}, then say it.`,
          `Quick challenge: find and say ${vowelData.vowel}.`,
          `Show Milo you remember the ${vowelData.vowel} sound.`,
        ],
        visualHint: "review spinner",
      };
  }
}

function getChallenge(stageId: number, levelId: number): Challenge {
  if (stageId === 1) {
    if (levelId <= VOWEL_GATE_CHALLENGES.length) {
      return VOWEL_GATE_CHALLENGES[levelId - 1];
    }

    return makeStageOneQuest(levelId);
  }

  return ALL_CHALLENGES[stageId]?.[levelId] ?? ALL_CHALLENGES[2][1];
}

export function GameLevel({ stageId, levelId, onBack, onComplete }: GameLevelProps) {
  const { accent, tint } = STAGE_ACCENTS[stageId] ?? STAGE_ACCENTS[1];
  const { playAudio, stopAudio, stopAllAudio, speakText } = useAudioManager();

  const [characterState, setCharacterState] = useState<CharacterState>("idle");
  const [bubbleMessage, setBubbleMessage] = useState<string>("Hi! Let's read together!");
  const [earnedTier, setEarnedTier] = useState<FluencyTier | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [randomSeed, setRandomSeed] = useState(() => Math.random());
  const [, setEarnedVowelPowers] = useState<Partial<Record<VowelKey, boolean>>>(() => readEarnedVowelPowers());
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [hasRecording, setHasRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stageOneIntroRevealed, setStageOneIntroRevealed] = useState(false);
  const [stageOneVisibleChoiceCount, setStageOneVisibleChoiceCount] = useState(0);
  const [stageOneRewardRevealed, setStageOneRewardRevealed] = useState(false);
  const [stageOneAutoCompleting, setStageOneAutoCompleting] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const learnerAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageOneCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const isStageOneQuest = stageId === 1;
  const stageOneDoorVowel = isStageOneQuest && levelId <= STAGE_ONE_DOOR_COUNT
    ? STAGE_ONE_VOWEL_ORDER[levelId - 1]
    : null;
  const stageOneDoor = stageOneDoorVowel ? VOWEL_POWER_KIT[stageOneDoorVowel] : null;
  const stageOneEncounter = isStageOneQuest && !stageOneDoor ? makeStageOneEncounter(levelId) : null;
  const activeVowel = stageOneDoor?.vowel ?? stageOneEncounter?.vowel ?? "A";
  const activePower = stageOneDoor ?? stageOneEncounter?.power ?? VOWEL_POWER_KIT.A;
  const activePowerChallenge = stageOneEncounter?.challenge ?? DEFAULT_POWER_CHALLENGE;
  const stageOneNarrationSteps = useMemo<StageOneNarrationStep[]>(() => {
    if (stageOneDoor) return makeDoorNarrationSteps(stageOneDoor);
    if (stageOneEncounter) {
      return [
        {
          message: `${stageOneEncounter.challenge.obstacle} ${stageOneEncounter.challenge.action} Listen to the ${stageOneEncounter.vowel} sound, then record your own vowel power.`,
          revealCount: 0,
        },
      ];
    }
    return [];
  }, [stageOneDoor, stageOneEncounter]);
  const needsChoice =
    isStageOneQuest &&
    ["letter-match", "missing-vowel", "mixed-review"].includes(challenge.levelType ?? "");
  const shuffledChoices = useMemo(
    () => shuffleItems(challenge.choices ?? VOWEL_CHOICES, randomSeed),
    [challenge.choices, randomSeed]
  );
  const activePrompt = useMemo(() => {
    const prompts = challenge.promptVariants ?? [challenge.storyContext];
    const index = Math.floor(randomSeed * prompts.length) % prompts.length;
    return prompts[index];
  }, [challenge.promptVariants, challenge.storyContext, randomSeed]);

  useEffect(() => {
    return () => {
      stopAllAudio();
      stopListening();
      try {
        if (recordingStopTimerRef.current) {
          clearTimeout(recordingStopTimerRef.current);
        }
        if (stageOneCompleteTimerRef.current) {
          clearTimeout(stageOneCompleteTimerRef.current);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // The browser may already have stopped the recorder during teardown.
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, [recordingUrl, stopAllAudio]);

  const speakPhoneme = useCallback(() => {
    stopAudio();
    setCharacterState("speaking");
    setBubbleMessage(isStageOneQuest ? activePrompt : `Listen to Milo: "${challenge.word}"`);

    const sound = playAudio(challenge.audioPath);

    if (sound) {
      sound.onended = () => {
        setCharacterState("idle");
        setBubbleMessage(
          isStageOneQuest
            ? activePrompt
            : `Your turn! Say: "${isBlendingMode ? challenge.targetWord : challenge.word}"!`
        );
      };
    }
  }, [activePrompt, challenge, isBlendingMode, isStageOneQuest, playAudio, stopAudio]);

  useEffect(() => {
    attemptNumber.current = 0;
    lastAttemptFailed.current = false;
    userRequestedModel.current = false;
    sessionId.current = crypto.randomUUID();
    setEarnedTier(null);
    setLastTranscript(null);
    setSelectedChoice(null);
    setHasRecording(false);
    setStageOneIntroRevealed(false);
    setStageOneVisibleChoiceCount(0);
    setStageOneRewardRevealed(false);
    setStageOneAutoCompleting(false);
    setRecordingUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setRandomSeed(Math.random());

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const revealStageOneActivity = () => {
      if (cancelled) return;
      setCharacterState("idle");
      setStageOneIntroRevealed(true);
      setStageOneVisibleChoiceCount(stageOneDoor ? 1 : 0);
      setCharacterState("speaking");
      setBubbleMessage(`Milo is saying ${activePower.sound}. Listen, then use your power.`);
      const modelAudio = playAudio(activePower.audioPath);
      if (modelAudio) {
        modelAudio.onended = () => {
          if (cancelled) return;
          setCharacterState("idle");
          setBubbleMessage(stageOneDoor ? `Tap once to use ${stageOneDoor.abilityName}.` : `Tap once to use ${activePower.abilityName}.`);
        };
      } else {
        setCharacterState("idle");
        setBubbleMessage(stageOneDoor ? `Tap once to use ${stageOneDoor.abilityName}.` : `Tap once to use ${activePower.abilityName}.`);
      }
    };

    const playStageOneNarrationStep = (stepIndex: number) => {
      if (cancelled) return;
      const step = stageOneNarrationSteps[stepIndex];
      if (!step) {
        revealStageOneActivity();
        return;
      }

      setCharacterState("speaking");
      setStageOneVisibleChoiceCount(step.revealCount);
      setBubbleMessage(step.message);

      let advanced = false;
      const advance = () => {
        if (advanced || cancelled) return;
        advanced = true;
        if (stepIndex >= stageOneNarrationSteps.length - 1) {
          revealStageOneActivity();
          return;
        }
        playStageOneNarrationStep(stepIndex + 1);
      };

      const narration = speakText(step.message, 0.84);
      if (narration) {
        narration.addEventListener("end", advance, { once: true });
        narration.addEventListener("error", advance, { once: true });
      }

      const fallbackMs = Math.max(2200, step.message.length * 72);
      timers.push(setTimeout(advance, fallbackMs));
    };

    const autoplayTimer = setTimeout(() => {
      if (isStageOneQuest) {
        playStageOneNarrationStep(0);
        return;
      }

      speakPhoneme();
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(autoplayTimer);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, levelId, isStageOneQuest]);

  const handleSpeechResult = (outcome: Outcome) => {
    stopAudio();
    if (outcome === "success") {
      setCharacterState("celebrating");
      setBubbleMessage(`Great! You earned ${challenge.reward ?? "a sound star"}!`);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      const feedbackAudio = playAudio("/audio/common/GreatJob.wav");
      if (feedbackAudio) {
        feedbackAudio.onended = onComplete;
      } else {
        onComplete();
      }
    } else {
      setCharacterState("encouraging");
      setBubbleMessage(outcome === "silent" ? "Oops! Let's try again." : "Good try. Listen, then say it one more time.");
      const retryAudio = playAudio(outcome === "silent" ? "/audio/common/TryAgain.wav" : "/audio/common/IncorrectWord.wav");
      if (retryAudio) {
        retryAudio.onended = () => setCharacterState("idle");
      }
    }
  };

  const handleChoice = (choice: string) => {
    setSelectedChoice(choice);
    if (choice === challenge.correctChoice) {
      setCharacterState("celebrating");
      setBubbleMessage(`Yes! ${choice} is the sound tile. Now say it.`);
    } else {
      setCharacterState("encouraging");
      setBubbleMessage(`Try another vowel tile. Listen for ${challenge.targetSound ?? challenge.phoneme}.`);
    }
  };

  const stopListening = () => {
    if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* already stopped */ } recognitionRef.current = null; }
    setIsListening(false);
  };

  const handleListen = () => {
    if (isListening) return;
    if (needsChoice && selectedChoice !== challenge.correctChoice) {
      setCharacterState("encouraging");
      setBubbleMessage("Pick the matching vowel tile first.");
      return;
    }
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

  const playStageOneModel = () => {
    if (isRecording || stageOneAutoCompleting) return;
    stopAudio();
    learnerAudioRef.current?.pause();
    setCharacterState("speaking");
    setBubbleMessage(`Listen to Milo's ${activePower.sound} sound.`);
    const modelAudio = playAudio(activePower.audioPath);
    if (modelAudio) {
      modelAudio.onended = () => {
        setCharacterState("idle");
        setBubbleMessage(`Now try the ${activePower.sound} sound with your explorer voice.`);
      };
    }
  };

  const finishStageOneAutomatically = () => {
    if (stageOneCompleteTimerRef.current) return;

    if (stageOneDoor) {
      writeEarnedVowelPower(stageOneDoor.vowel);
      setEarnedVowelPowers(readEarnedVowelPowers());
    }

    setStageOneAutoCompleting(true);
    setStageOneRewardRevealed(true);
    setCharacterState("celebrating");
    setBubbleMessage(
      stageOneDoor
        ? `${stageOneDoor.abilityName} is ready. Milo can use it in the valley.`
        : `${activePower.abilityName} worked. Milo can move forward.`
    );
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.62 } });
    stageOneCompleteTimerRef.current = setTimeout(() => {
      stageOneCompleteTimerRef.current = null;
      onComplete();
    }, 1500);
  };

  const stopStageOneRecording = () => {
    if (recordingStopTimerRef.current) {
      clearTimeout(recordingStopTimerRef.current);
      recordingStopTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const playStageOneRecordingUrl = (url: string, autoReplay = false) => {
    stopAudio();
    learnerAudioRef.current?.pause();
    const audio = new Audio(url);
    learnerAudioRef.current = audio;
    setCharacterState("listening");
    setBubbleMessage(autoReplay ? "Listen. This is your vowel sound coming back to you." : "Listen closely. That is your explorer voice on the trail.");
    audio.onended = () => {
      setCharacterState(autoReplay ? "celebrating" : "idle");
      if (stageOneDoor) {
        setStageOneRewardRevealed(true);
        setBubbleMessage(`${stageOneDoor.rewardTitle}. Milo is using it now.`);
      } else {
        setStageOneRewardRevealed(true);
        setBubbleMessage(`${activePowerChallenge.success} Milo is moving ahead.`);
      }

      if (autoReplay) {
        setTimeout(finishStageOneAutomatically, 650);
      }
    };
    audio.play().catch(() => {
      setCharacterState("encouraging");
      setBubbleMessage("I could not play that recording. Try recording again.");
    });
  };

  const startStageOneRecording = async () => {
    if (!stageOneIntroRevealed || isRecording || stageOneAutoCompleting) {
      return;
    }

    try {
      stopAudio();
      learnerAudioRef.current?.pause();
      setStageOneRewardRevealed(false);
      setStageOneAutoCompleting(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const nextUrl = URL.createObjectURL(blob);
        setRecordingUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextUrl;
        });
        setHasRecording(true);
        setIsRecording(false);
        setCharacterState("speaking");
        setBubbleMessage("Great. Milo is playing your sound back now.");
        window.setTimeout(() => playStageOneRecordingUrl(nextUrl, true), 300);
      };

      recorder.start();
      setIsRecording(true);
      setHasRecording(false);
      setCharacterState("listening");
      setBubbleMessage(`Say ${activePower.sound}. Milo is listening...`);
      recordingStopTimerRef.current = setTimeout(() => {
        stopStageOneRecording();
        recordingStopTimerRef.current = null;
      }, 1800);
    } catch {
      setIsRecording(false);
      setCharacterState("encouraging");
      setBubbleMessage("I could not open the microphone. Check browser microphone permission.");
    }
  };

  if (isStageOneQuest) {
    return (
      <div className="size-full bg-[#FAF7F2] overflow-hidden relative">
        <div className="flex h-full min-h-0 flex-col px-4 py-3 sm:px-5 sm:py-4">
          <button onClick={onBack} className="absolute left-4 top-3 z-20 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1F243014] text-sm font-bold text-[#4B5266] hover:text-[#1F2430] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Valley Map
          </button>

          <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col items-center justify-center gap-3 pt-10">
            <motion.div
              key={bubbleMessage}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-2xl bg-white px-4 py-3 text-center shadow-lg"
            >
              <p className="text-base sm:text-lg font-bold leading-snug text-[#1F2430]">{bubbleMessage}</p>
            </motion.div>

            <div className="h-[132px] sm:h-[150px] shrink-0">
              <CharacterCompanion state={characterState} phoneme={activeVowel} size={150} />
            </div>

            <motion.div
              layout
              initial={{ y: 18, opacity: 0, scale: 0.985 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", layout: { duration: 0.45, ease: "easeInOut" } }}
              className="w-full min-h-0 rounded-3xl border-4 bg-white p-4 shadow-[0_18px_42px_-28px_rgba(31,36,48,0.35)] sm:p-5"
              style={{ borderColor: accent }}
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#B45309]">
                    <Wand2 className="h-3.5 w-3.5" />
                    Milo's Vowel Power Kit
                  </p>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1F2430]">
                    {stageOneDoor ? stageOneDoor.title : stageOneEncounter?.title}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-snug text-[#4B5266]">
                    {stageOneDoor ? stageOneDoor.intro : stageOneEncounter?.prompt}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={playStageOneModel}
                    disabled={!stageOneIntroRevealed || isRecording || stageOneAutoCompleting}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F59E0B]/25 bg-white text-[#F59E0B] disabled:opacity-40"
                    aria-label={`Hear Milo say ${activePower.sound}`}
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-3xl font-bold text-[#F59E0B]">
                    {activeVowel}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!stageOneIntroRevealed ? (
                  <motion.div
                    key="stage-one-intro"
                    initial={{ opacity: 0, y: 18, scale: 0.975 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.98 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#F59E0B]/40 bg-[#FFF7ED] px-4 py-5 text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [-2, 2, -2], y: [0, -4, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#F59E0B] shadow-[0_12px_24px_-18px_rgba(245,158,11,0.8)]"
                    >
                      <Volume2 className="h-6 w-6" />
                    </motion.div>
                    <p className="text-base font-bold text-[#1F2430]">Milo is opening the scene</p>
                    <p className="mt-1 max-w-md text-sm leading-snug text-[#4B5266]">
                      Listen for the quest. Your vowel power will glow awake in a moment.
                    </p>
                    <div className="mt-3 grid w-full max-w-lg grid-cols-3 gap-2 text-xs font-bold text-[#B45309]">
                      <span className="rounded-xl bg-white px-2 py-2">Hear it</span>
                      <span className="rounded-xl bg-white px-2 py-2">Say it</span>
                      <span className="rounded-xl bg-white px-2 py-2">Hear it back</span>
                    </div>
                    {stageOneDoor && stageOneVisibleChoiceCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="mt-3 w-full max-w-md rounded-2xl border-2 border-[#F59E0B] bg-white p-3 text-left shadow-[0_14px_28px_-22px_rgba(245,158,11,0.8)]"
                      >
                        <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
                          {stageOneDoor.sound} power training
                        </p>
                        <p className="mt-1 text-xl font-bold text-[#1F2430]">{stageOneDoor.abilityName}</p>
                        <p className="mt-1 text-sm text-[#4B5266]">{stageOneDoor.ability}</p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : stageOneDoor ? (
                  <motion.div
                    key="stage-one-power"
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18, scale: 0.985 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]"
                  >
                    <div className="rounded-2xl border border-[#E6DED2] bg-[#FAF7F2] p-4">
                      <p className="text-xs uppercase tracking-wider text-[#8A91A3]">Vowel training</p>
                      <p className="mt-1 text-4xl font-bold text-[#F59E0B]">{stageOneDoor.sound}</p>
                      <p className="mt-2 text-sm leading-snug text-[#4B5266]">{stageOneDoor.mouthHint}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {stageOneDoor.steps.map((step, index) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.35, ease: "easeOut" }}
                            className="rounded-xl bg-white px-2 py-2 text-center text-xs font-bold text-[#B45309]"
                          >
                            {step}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#FFF7ED] p-4 text-center">
                      <p className="text-xs uppercase tracking-wider text-[#B45309]">Power waiting</p>
                      <motion.div
                        animate={stageOneRewardRevealed ? { scale: [1, 1.16, 1], rotate: [0, -4, 4, 0] } : {}}
                        transition={{ duration: 0.75, repeat: stageOneAutoCompleting ? 2 : 0, ease: "easeInOut" }}
                        className="mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#F59E0B] bg-white text-4xl font-black text-[#F59E0B] shadow-[0_18px_34px_-24px_rgba(245,158,11,0.95)]"
                      >
                        {stageOneDoor.abilityIcon}
                      </motion.div>
                      <p className="mt-2 text-2xl font-bold text-[#1F2430]">{stageOneDoor.abilityName}</p>
                      <p className="mt-2 text-sm leading-snug text-[#4B5266]">{stageOneDoor.ability}</p>
                      <AnimatePresence>
                        {stageOneRewardRevealed && (
                          <motion.div
                            initial={{ opacity: 0, y: 14, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="mt-3 rounded-2xl bg-white px-3 py-2 text-left"
                          >
                            <p className="text-sm font-bold text-[#B45309]">{stageOneDoor.rewardTitle}</p>
                            <p className="mt-1 text-xs leading-relaxed text-[#4B5266]">{stageOneDoor.rewardSubtitle}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="stage-one-road"
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -18, scale: 0.985 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="grid gap-3 md:grid-cols-[1fr_1.15fr]"
                  >
                    <div className="rounded-2xl border border-[#E6DED2] bg-[#FAF7F2] p-4">
                      <p className="text-xs uppercase tracking-wider text-[#8A91A3]">Road challenge</p>
                      <p className="mt-1 text-xl font-bold text-[#1F2430]">{activePowerChallenge.title}</p>
                      <p className="mt-2 text-sm leading-snug text-[#4B5266]">{activePowerChallenge.obstacle}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {activePowerChallenge.steps.map((step, index) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.35, ease: "easeOut" }}
                            className="rounded-xl bg-white px-2 py-2 text-center text-xs font-bold text-[#B45309]"
                          >
                            {step}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#FFF7ED] p-4 text-center">
                      <p className="text-xs uppercase tracking-wider text-[#B45309]">Use this vowel power</p>
                      <p className="mt-1 text-2xl font-bold text-[#1F2430]">{activePower.abilityName}</p>
                      <motion.p
                        animate={stageOneRewardRevealed ? { scale: [1, 1.18, 1] } : {}}
                        transition={{ duration: 0.75, repeat: stageOneAutoCompleting ? 2 : 0, ease: "easeInOut" }}
                        className="mt-1 text-4xl font-bold text-[#F59E0B]"
                      >
                        {activePower.sound}
                      </motion.p>
                      <p className="mt-2 text-sm leading-snug text-[#4B5266]">{activePowerChallenge.action}</p>
                      <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#B45309]">
                        Listen, record, hear it back, then send the sound.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {stageOneIntroRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, duration: 0.4, ease: "easeOut" }}
                  className="mt-4"
                >
                  <button
                    onClick={startStageOneRecording}
                    disabled={isRecording || stageOneAutoCompleting}
                    className="mx-auto flex min-h-[64px] w-full max-w-xl items-center justify-center gap-3 rounded-3xl px-6 py-4 text-lg font-black text-white shadow-[0_18px_34px_-24px_rgba(245,158,11,0.95)] disabled:cursor-wait disabled:opacity-80"
                    style={{ background: isRecording ? "#EF4444" : stageOneAutoCompleting ? "#10B981" : accent }}
                  >
                    {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isRecording
                      ? `Say ${activePower.sound}`
                      : stageOneAutoCompleting
                      ? "Milo's power is ready!"
                      : `Use my ${activePower.abilityName}`}
                  </button>
                </motion.div>
              )}

              {stageOneIntroRevealed && (isRecording || hasRecording || stageOneAutoCompleting) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs sm:text-sm font-bold text-[#4B5266]"
                >
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                  {isRecording
                    ? "The app will stop by itself."
                    : stageOneAutoCompleting
                    ? "Milo is taking this power to the next task."
                    : "Your voice played back. Milo is using the power."}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full bg-[#FAF7F2] overflow-hidden relative flex flex-col">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-60 pointer-events-none" style={{ background: tint }} />
      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 items-center justify-center gap-4">
        <button onClick={onBack} className="absolute top-6 left-6 px-3 py-2 rounded-xl bg-white border text-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
        </button>
        
        <motion.div className="bg-white rounded-2xl px-6 sm:px-8 py-4 shadow-lg text-center max-w-md w-full">
          <p className="text-lg sm:text-xl font-bold text-[#1F2430]">{bubbleMessage}</p>
        </motion.div>
        
        <motion.div 
          className="flex-shrink-0"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          <CharacterCompanion state={characterState} phoneme={challenge.phoneme || challenge.vowel || ""} size={260} />
        </motion.div>

        <motion.div className="bg-white px-6 sm:px-12 py-4 sm:py-6 rounded-3xl border-4 text-center max-w-2xl w-full" style={{ borderColor: accent }}>
          {isStageOneQuest ? (
            <div className="flex flex-col items-center">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs uppercase tracking-widest text-white" style={{ background: accent }}>
                  {challenge.skillLabel}
                </span>
                <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-bold text-[#B45309]">
                  {challenge.reward}
                </span>
              </div>

              <h2 className="text-xs sm:text-sm uppercase tracking-widest text-gray-400 mb-3">
                {activePrompt}
              </h2>

              {challenge.levelType === "blend-bridge" ? (
                <div className="flex items-center gap-2 sm:gap-4 font-bold justify-center flex-wrap" style={{ color: accent }}>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8FAFC] text-4xl sm:text-5xl border border-[#1F243014]">
                    {challenge.consonant}
                  </span>
                  <span className="text-2xl sm:text-3xl text-gray-300">+</span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF7ED] text-4xl sm:text-5xl border border-[#F59E0B]/30">
                    {challenge.vowel}
                  </span>
                  <span className="text-2xl sm:text-3xl text-gray-300">=</span>
                  <span className="text-4xl sm:text-6xl uppercase">{challenge.word}</span>
                </div>
              ) : challenge.levelType === "missing-vowel" ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 text-5xl sm:text-7xl font-bold" style={{ color: accent }}>
                    {(challenge.frame ?? "_").split("").map((char, index) => (
                      <span
                        key={`${char}-${index}`}
                        className={char === "_" ? "inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-dashed border-[#D6D3D1] bg-[#FAF7F2]" : ""}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#8A91A3]">Choose the missing vowel, then say the sound.</p>
                </div>
              ) : challenge.levelType === "mouth-shape" ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex h-28 w-44 items-center justify-center rounded-[50%] border-4 bg-[#FFF1F2]" style={{ borderColor: accent }}>
                    <motion.div
                      animate={{ scaleX: [1, 1.16, 1], scaleY: [1, 0.86, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      className="h-10 w-24 rounded-[50%] bg-[#7F1D1D]"
                    />
                  </div>
                  <span className="text-5xl sm:text-7xl font-bold" style={{ color: accent }}>
                    {challenge.targetSound}
                  </span>
                  <p className="text-sm text-[#4B5266]">{challenge.mouthHint}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: [-4, 4, -4], scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="flex h-28 w-28 items-center justify-center rounded-[2rem] border-4 bg-[#FFF7ED] shadow-[0_16px_34px_-20px_rgba(245,158,11,0.8)]"
                    style={{ borderColor: accent }}
                  >
                    <span className="text-6xl font-bold" style={{ color: accent }}>{challenge.vowel}</span>
                  </motion.div>
                  <span className="text-4xl sm:text-6xl font-bold" style={{ color: accent }}>
                    {challenge.levelType === "anchor-echo" ? challenge.anchorWord : challenge.targetSound}
                  </span>
                  {challenge.levelType === "anchor-echo" && (
                    <p className="text-sm text-[#4B5266]">
                      Say the sound first, then the anchor picture.
                    </p>
                  )}
                </div>
              )}

              {needsChoice && (
                <div className="mt-5 grid grid-cols-5 gap-2 w-full max-w-sm">
                  {shuffledChoices.map((choice) => {
                    const isSelected = selectedChoice === choice;
                    const isCorrect = choice === challenge.correctChoice;
                    return (
                      <button
                        key={choice}
                        onClick={() => handleChoice(choice)}
                        className={`h-12 rounded-xl border-2 text-lg font-bold transition-all ${
                          isSelected
                            ? isCorrect
                              ? "bg-[#DCFCE7] border-[#10B981] text-[#047857]"
                              : "bg-[#FEE2E2] border-[#EF4444] text-[#B91C1C]"
                            : "bg-white border-[#E6DED2] text-[#1F2430] hover:border-[#F59E0B]"
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isBlendingMode ? (
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
          <button onClick={() => { userRequestedModel.current = true; speakPhoneme(); }} className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-white border flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium">
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
