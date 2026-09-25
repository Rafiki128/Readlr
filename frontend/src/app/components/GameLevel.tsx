import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Volume2, Mic, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { CharacterCompanion, CharacterState } from "./CharacterCompanion";
import { useAudioManager } from "../../hooks/useAudioManager";
import { VowelChallengeView } from "./VowelChallengeView";
import { getLearningSettings, learningVolume } from "../../hooks/learningSettings";

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
  trainAudioPath: string;
  abilityIntroAudioPath: string;
  mouthHintAudioPath: string;
  readyAudioPath: string;
  useAudioPath: string;
  gainedAudioPath: string;
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
  audioPath?: string;
}

interface VowelPowerChallenge {
  title: string;
  obstacle: string;
  action: string;
  success: string;
  audioPath: string;
  successAudioPath: string;
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
    trainAudioPath: "/audio/stage1/TrainA.wav",
    abilityIntroAudioPath: "/audio/stage1/AArmorWaiting.wav",
    mouthHintAudioPath: "/audio/stage1/AArmorMouth.wav",
    readyAudioPath: "/audio/stage1/LearnAArmor.wav",
    useAudioPath: "/audio/stage1/UseAArmor.wav",
    gainedAudioPath: "/audio/stage1/GainedAArmor.wav",
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
    trainAudioPath: "/audio/stage1/TrainE.wav",
    abilityIntroAudioPath: "/audio/stage1/EEchoWaiting.wav",
    mouthHintAudioPath: "/audio/stage1/EEchoMouth.wav",
    readyAudioPath: "/audio/stage1/LearnEEcho.wav",
    useAudioPath: "/audio/stage1/UseEEcho.wav",
    gainedAudioPath: "/audio/stage1/GainedEEcho.wav",
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
    trainAudioPath: "/audio/stage1/TrainI.wav",
    abilityIntroAudioPath: "/audio/stage1/IInsightWaiting.wav",
    mouthHintAudioPath: "/audio/stage1/IInsightMouth.wav",
    readyAudioPath: "/audio/stage1/LearnIInsight.wav",
    useAudioPath: "/audio/stage1/UseIInsight.wav",
    gainedAudioPath: "/audio/stage1/GainedIInsight.wav",
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
    trainAudioPath: "/audio/stage1/TrainO.wav",
    abilityIntroAudioPath: "/audio/stage1/OOrbWaiting.wav",
    mouthHintAudioPath: "/audio/stage1/OOrbMouth.wav",
    readyAudioPath: "/audio/stage1/LearnOOrb.wav",
    useAudioPath: "/audio/stage1/UseOOrb.wav",
    gainedAudioPath: "/audio/stage1/GainedOOrb.wav",
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
    trainAudioPath: "/audio/stage1/TrainU.wav",
    abilityIntroAudioPath: "/audio/stage1/UUpliftWaiting.wav",
    mouthHintAudioPath: "/audio/stage1/UUpliftMouth.wav",
    readyAudioPath: "/audio/stage1/LearnUUplift.wav",
    useAudioPath: "/audio/stage1/UseUUplift.wav",
    gainedAudioPath: "/audio/stage1/GainedUUplift.wav",
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
  audioPath: "/audio/stage1/ChallengeQuietTrailStone.wav",
  successAudioPath: "/audio/stage1/SuccessQuietTrailStone.wav",
  steps: ["Listen", "Say", "Replay"],
};

const POWER_CHALLENGES: Record<VowelKey, VowelPowerChallenge[]> = {
  A: [
    { title: "Heavy Gate", obstacle: "A sleepy gate blocks the trail.", action: "Use A Armor. Say /a/ with an open mouth.", success: "A Armor pushed the heavy gate open. Milo steps through the first bright doorway.", audioPath: "/audio/stage1/ChallengeAHeavyGate.wav", successAudioPath: "/audio/stage1/SuccessAHeavyGate.wav", steps: ["Open", "Say /a/", "Push"] },
    { title: "Branch Wall", obstacle: "A branch wall leans across the road.", action: "Use A Armor to make a strong sound wave.", success: "The /a/ sound wave cleared the branches. The meadow trail is open again.", audioPath: "/audio/stage1/ChallengeABranchWall.wav", successAudioPath: "/audio/stage1/SuccessABranchWall.wav", steps: ["Breathe", "Say /a/", "Clear"] },
    { title: "Stone Step", obstacle: "A stone step needs a strong voice to rise.", action: "Say /a/ and send the sound under the stone.", success: "The stone rose into a safe step. Milo climbs higher on the valley path.", audioPath: "/audio/stage1/ChallengeAStoneStep.wav", successAudioPath: "/audio/stage1/SuccessAStoneStep.wav", steps: ["Aim", "Say /a/", "Rise"] },
  ],
  E: [
    { title: "Hidden Marks", obstacle: "Tiny trail marks are hiding in the grass.", action: "Use E Echo. Say /e/ quickly and clearly.", success: "E Echo lit the hidden marks. Milo can follow the secret trail.", audioPath: "/audio/stage1/ChallengeEHiddenMarks.wav", successAudioPath: "/audio/stage1/SuccessEHiddenMarks.wav", steps: ["Smile", "Say /e/", "Reveal"] },
    { title: "Blinking Sign", obstacle: "A small sign blinks but cannot shine.", action: "Send your /e/ sound to wake the sign.", success: "The sign blinked bright and pointed ahead. Milo knows where to go next.", audioPath: "/audio/stage1/ChallengeEBlinkingSign.wav", successAudioPath: "/audio/stage1/SuccessEBlinkingSign.wav", steps: ["Listen", "Say /e/", "Shine"] },
    { title: "Little Light Path", obstacle: "The path needs tiny lights to appear.", action: "Say /e/ to spark each little light.", success: "Little lights popped awake one by one. Milo walks the glowing path.", audioPath: "/audio/stage1/ChallengeELittleLightPath.wav", successAudioPath: "/audio/stage1/SuccessELittleLightPath.wav", steps: ["Tap", "Say /e/", "Follow"] },
  ],
  I: [
    { title: "Missing Map Line", obstacle: "The map lost the next trail line.", action: "Use I Insight. Say a short /i/ sound.", success: "I Insight drew the missing line. Milo can see the trail again.", audioPath: "/audio/stage1/ChallengeIMissingMapLine.wav", successAudioPath: "/audio/stage1/SuccessIMissingMapLine.wav", steps: ["Focus", "Say /i/", "Trace"] },
    { title: "Tiny Clue", obstacle: "A clue is too small for Milo to see.", action: "Say /i/ to sharpen the clue.", success: "The tiny clue grew clear. Milo found the mark he needed.", audioPath: "/audio/stage1/ChallengeITinyClue.wav", successAudioPath: "/audio/stage1/SuccessITinyClue.wav", steps: ["Look", "Say /i/", "Spot"] },
    { title: "Needle Bridge", obstacle: "A narrow bridge needs careful steps.", action: "Say /i/ and help Milo focus.", success: "I Insight steadied the bridge. Milo crossed with careful little steps.", audioPath: "/audio/stage1/ChallengeINeedleBridge.wav", successAudioPath: "/audio/stage1/SuccessINeedleBridge.wav", steps: ["Steady", "Say /i/", "Cross"] },
  ],
  O: [
    { title: "Round Gate", obstacle: "A round gate is sealed shut.", action: "Use O Orb. Round your lips and say /o/.", success: "O Orb rolled the round gate open. Milo follows the circle road ahead.", audioPath: "/audio/stage1/ChallengeORoundGate.wav", successAudioPath: "/audio/stage1/SuccessORoundGate.wav", steps: ["Round", "Say /o/", "Open"] },
    { title: "Rolling Stone", obstacle: "A round stone waits on the road.", action: "Say /o/ to roll it aside.", success: "The round stone rolled away. Milo found a smooth path underneath.", audioPath: "/audio/stage1/ChallengeORollingStone.wav", successAudioPath: "/audio/stage1/SuccessORollingStone.wav", steps: ["Circle", "Say /o/", "Roll"] },
    { title: "Moon Door", obstacle: "A moon door only hears round sounds.", action: "Say /o/ with your lips like a circle.", success: "The moon door opened softly. Silver light spills across Milo's trail.", audioPath: "/audio/stage1/ChallengeOMoonDoor.wav", successAudioPath: "/audio/stage1/SuccessOMoonDoor.wav", steps: ["Shape", "Say /o/", "Glow"] },
  ],
  U: [
    { title: "Low Bridge", obstacle: "A little bridge sank into the stream.", action: "Use U Uplift. Say /u/ to raise it.", success: "U Uplift raised the bridge. Milo crosses above the sparkling water.", audioPath: "/audio/stage1/ChallengeULowBridge.wav", successAudioPath: "/audio/stage1/SuccessULowBridge.wav", steps: ["Soft", "Say /u/", "Lift"] },
    { title: "Rainy Shield", obstacle: "Rain covers the valley road.", action: "Say /u/ to lift a shield over Milo.", success: "The shield rose and caught the rain. Milo walks forward warm and dry.", audioPath: "/audio/stage1/ChallengeURainyShield.wav", successAudioPath: "/audio/stage1/SuccessURainyShield.wav", steps: ["Breathe", "Say /u/", "Shield"] },
    { title: "Updraft Path", obstacle: "The next platform is too high.", action: "Say /u/ to call an updraft.", success: "A soft updraft lifted Milo safely. The high path is ready.", audioPath: "/audio/stage1/ChallengeUUpdraftPath.wav", successAudioPath: "/audio/stage1/SuccessUUpdraftPath.wav", steps: ["Ready", "Say /u/", "Rise"] },
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
  const trainingInstructions: Record<VowelKey, string> = {
    A: "Open your mouth wide and say /a/.",
    E: "Make a small smile and say /e/.",
    I: "Keep it short and light. Say /i/.",
    O: "Round your lips and say /o/.",
    U: "Use a soft voice and say /u/.",
  };
  return [
    {
      message: `Let us train the ${door.vowel} sound. ${trainingInstructions[door.vowel]}`,
      revealCount: 0,
      audioPath: door.trainAudioPath,
    },
    {
      message: `${door.abilityName} is waiting behind this door. ${door.ability}`,
      revealCount: 1,
      audioPath: door.abilityIntroAudioPath,
    },
    {
      message: `${door.mouthHint} When you record it, Milo will play your voice back so you can hear your sound.`,
      revealCount: 1,
      audioPath: door.mouthHintAudioPath,
    },
  ];
}

const ALL_CHALLENGES: Record<number, Record<number, Challenge>> = {
  1: {
    1: { id: 1, word: "A", phoneme: "A", audioPath: "/audio/stage1/A.wav", acceptedTranscripts: ["a", "ah"], storyContext: "Say the vowel sound /a/ to open the door.", expectedDurationMs: 700 },
    2: { id: 2, word: "E", phoneme: "E", audioPath: "/audio/stage1/E.wav", acceptedTranscripts: ["e", "eh"], storyContext: "Say the vowel sound /e/ to open the door.", expectedDurationMs: 700 },
    3: { id: 3, word: "I", phoneme: "I", audioPath: "/audio/stage1/I.wav", acceptedTranscripts: ["i", "ih"], storyContext: "Say the vowel sound /i/ to open the door.", expectedDurationMs: 700 },
    4: { id: 4, word: "O", phoneme: "O", audioPath: "/audio/stage1/O.wav", acceptedTranscripts: ["o", "oh"], storyContext: "Say the vowel sound /o/ to open the door.", expectedDurationMs: 700 },
    5: { id: 5, word: "U", phoneme: "U", audioPath: "/audio/stage1/U.wav", acceptedTranscripts: ["u", "uh"], storyContext: "Say the vowel sound /u/ to open the door.", expectedDurationMs: 700 },
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
  const [, setStageOneVisibleChoiceCount] = useState(0);
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
  const stageOneReplayCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageOneRecordingPlaybackFinishedRef = useRef(false);
  const stageOneActiveRef = useRef(true);
  const stageOneFinishingRef = useRef(false);
  const stageOneCompletedRef = useRef(false);
  const stageOneRecordingPendingRef = useRef(false);
  const [preparingRecording, setPreparingRecording] = useState(false);
  const recordingLeadInRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          message: `${stageOneEncounter.challenge.obstacle} ${stageOneEncounter.challenge.action}`,
          revealCount: 0,
          audioPath: stageOneEncounter.challenge.audioPath,
        },
        {
          message: `${stageOneEncounter.power.abilityName} is the right power for this trail. Milo needs your ${stageOneEncounter.power.sound} sound to wake it up.`,
          revealCount: 0,
          audioPath: `/audio/stage1/Trail${stageOneEncounter.vowel}Power.wav`,
        },
        {
          message: `When the button appears, record your ${stageOneEncounter.power.sound} sound. Then listen back as Milo uses it on the trail.`,
          revealCount: 0,
          audioPath: `/audio/stage1/Trail${stageOneEncounter.vowel}Record.wav`,
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
    stageOneActiveRef.current = true;
    return () => {
      stageOneActiveRef.current = false;
      if (recordingLeadInRef.current) clearTimeout(recordingLeadInRef.current);
      stopAllAudio();
      stopListening();
      try {
        if (recordingStopTimerRef.current) {
          clearTimeout(recordingStopTimerRef.current);
        }
        if (stageOneCompleteTimerRef.current) {
          clearTimeout(stageOneCompleteTimerRef.current);
        }
        if (stageOneReplayCompleteTimerRef.current) {
          clearTimeout(stageOneReplayCompleteTimerRef.current);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        }
      } catch {
        // The browser may already have stopped the recorder during teardown.
      }
      if (learnerAudioRef.current) {
        learnerAudioRef.current.pause();
        learnerAudioRef.current.src = "";
        learnerAudioRef.current = null;
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [stopAllAudio]);

  useEffect(() => () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

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
    stageOneRecordingPlaybackFinishedRef.current = false;
    setRecordingUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setRandomSeed(Math.random());

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const revealStageOneActivity = () => {
      if (cancelled) return;
      const readyMessage = stageOneDoor ? `Tap once to learn ${stageOneDoor.abilityName}.` : `Tap once to use ${activePower.abilityName}.`;
      setCharacterState("idle");
      setStageOneVisibleChoiceCount(stageOneDoor ? 1 : 0);
      setCharacterState("speaking");
      setBubbleMessage(`Milo is saying ${activePower.sound}. Listen, then use your power.`);
      const modelAudio = playAudio(activePower.audioPath);
      const playReadyPrompt = () => {
        if (cancelled) return;
        setCharacterState("speaking");
        setBubbleMessage(readyMessage);
        const readyAudio = stageOneDoor ? playAudio(stageOneDoor.readyAudioPath) : playAudio("/audio/stage1/TapToUsePower.wav");
        const finishReadyPrompt = () => {
          if (cancelled) return;
          setStageOneIntroRevealed(true);
          setCharacterState("idle");
          setBubbleMessage(readyMessage);
        };
        if (readyAudio) {
          readyAudio.onended = finishReadyPrompt;
          readyAudio.onerror = () => {
            const spoken = speakText(readyMessage, 0.84);
            if (spoken) {
              spoken.addEventListener("end", finishReadyPrompt, { once: true });
              spoken.addEventListener("error", finishReadyPrompt, { once: true });
            } else {
              finishReadyPrompt();
            }
          };
        } else {
          const spoken = speakText(readyMessage, 0.84);
          if (spoken) {
            spoken.addEventListener("end", finishReadyPrompt, { once: true });
            spoken.addEventListener("error", finishReadyPrompt, { once: true });
          } else {
            finishReadyPrompt();
          }
        }
      };
      if (modelAudio) {
        modelAudio.onerror = playReadyPrompt;
        modelAudio.onended = () => {
          playReadyPrompt();
        };
      } else {
        playReadyPrompt();
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

      const speakStep = () => {
        if (cancelled) return;
        const narration = speakText(step.message, 0.84);
        if (narration) {
          narration.addEventListener("end", advance, { once: true });
          narration.addEventListener("error", advance, { once: true });
        } else {
          advance();
        }
      };

      const narrationAudio = step.audioPath ? playAudio(step.audioPath) : null;
      if (narrationAudio) {
        narrationAudio.onended = advance;
        narrationAudio.onerror = speakStep;
      } else {
        speakStep();
      }

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
    if (!stageOneActiveRef.current || stageOneFinishingRef.current) return;
    if (!stageOneRecordingPlaybackFinishedRef.current) return;
    stageOneFinishingRef.current = true;

    if (stageOneDoor) {
      writeEarnedVowelPower(stageOneDoor.vowel);
      setEarnedVowelPowers(readEarnedVowelPowers());
    }

    setStageOneAutoCompleting(true);
    setStageOneRewardRevealed(true);
    setCharacterState("celebrating");
    setBubbleMessage(stageOneDoor ? `${stageOneDoor.abilityName} is ready. Milo can use it in the valley.` : activePowerChallenge.success);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.62 } });

    const completeAfterReward = () => {
      if (!stageOneActiveRef.current || stageOneCompletedRef.current) return;
      stageOneCompletedRef.current = true;
      if (stageOneCompleteTimerRef.current) {
        clearTimeout(stageOneCompleteTimerRef.current);
      }
      stageOneCompleteTimerRef.current = null;
      onComplete();
    };
    if (!getLearningSettings().voice_feedback) {
      stageOneCompleteTimerRef.current = setTimeout(completeAfterReward,650);
      return;
    }
    const rewardAudio = playAudio(stageOneDoor ? stageOneDoor.gainedAudioPath : activePowerChallenge.successAudioPath);
    const speakMatchingSuccessFallback = () => {
      if (!stageOneActiveRef.current || stageOneCompletedRef.current) return;
      const fallbackText = stageOneDoor
        ? `${stageOneDoor.abilityName} is ready. Milo can use it in the valley.`
        : activePowerChallenge.success;
      const spoken = speakText(fallbackText, 0.84);
      if (spoken) {
        spoken.addEventListener("end", () => {
          completeAfterReward();
        }, { once: true });
        spoken.addEventListener("error", () => {
          if (stageOneActiveRef.current) stageOneCompleteTimerRef.current = setTimeout(completeAfterReward, 1800);
        }, { once: true });
      } else {
        stageOneCompleteTimerRef.current = setTimeout(completeAfterReward, 2600);
      }
    };

    if (rewardAudio) {
      rewardAudio.onended = completeAfterReward;
      rewardAudio.onerror = speakMatchingSuccessFallback;
    } else {
      speakMatchingSuccessFallback();
    }
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
    if (!stageOneActiveRef.current) return;
    stopAudio();
    learnerAudioRef.current?.pause();
    const audio = new Audio(url);
    audio.volume = learningVolume();
    learnerAudioRef.current = audio;
    setCharacterState("listening");
    setBubbleMessage(autoReplay ? "Listen. This is your vowel sound coming back to you." : "Listen closely. That is your explorer voice on the trail.");
    audio.onended = () => {
      if (!stageOneActiveRef.current || learnerAudioRef.current !== audio) return;
      stageOneRecordingPlaybackFinishedRef.current = true;
      setCharacterState(autoReplay ? "celebrating" : "idle");
      if (stageOneDoor) {
        setStageOneRewardRevealed(true);
        setBubbleMessage(`${stageOneDoor.rewardTitle}. Milo is using it now.`);
      } else {
        setStageOneRewardRevealed(true);
        setBubbleMessage(activePowerChallenge.success);
      }

      if (autoReplay) {
        if (stageOneReplayCompleteTimerRef.current) {
          clearTimeout(stageOneReplayCompleteTimerRef.current);
        }
        stageOneReplayCompleteTimerRef.current = setTimeout(() => {
          stageOneReplayCompleteTimerRef.current = null;
          finishStageOneAutomatically();
        }, 650);
      }
    };
    audio.play().catch(() => {
      if (!stageOneActiveRef.current) return;
      setHasRecording(false);
      setCharacterState("encouraging");
      setBubbleMessage("I could not play that recording. Try recording again.");
    });
  };

  const startStageOneRecording = async () => {
    if (!stageOneIntroRevealed || preparingRecording || isRecording || hasRecording || stageOneAutoCompleting || stageOneRecordingPendingRef.current) {
      return;
    }

    stageOneRecordingPendingRef.current = true;
    setPreparingRecording(true);
    try {
      if (stageOneReplayCompleteTimerRef.current) {
        clearTimeout(stageOneReplayCompleteTimerRef.current);
        stageOneReplayCompleteTimerRef.current = null;
      }
      if (stageOneCompleteTimerRef.current) {
        clearTimeout(stageOneCompleteTimerRef.current);
        stageOneCompleteTimerRef.current = null;
      }
      stageOneRecordingPlaybackFinishedRef.current = false;
      stopAudio();
      if (learnerAudioRef.current) {
        learnerAudioRef.current.pause();
        learnerAudioRef.current.src = "";
        learnerAudioRef.current = null;
      }
      setStageOneRewardRevealed(false);
      setStageOneAutoCompleting(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stageOneActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
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
        if (!stageOneActiveRef.current) return;
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
        const doneAudio = playAudio("/audio/stage1/RecordingDone.wav");
        if (doneAudio) {
          doneAudio.onended = () => {
            if (!stageOneActiveRef.current) return;
            const listenBackAudio = playAudio("/audio/stage1/NowListenBack.wav");
            if (listenBackAudio) {
              listenBackAudio.onended = () => playStageOneRecordingUrl(nextUrl, true);
              listenBackAudio.onerror = () => playStageOneRecordingUrl(nextUrl, true);
            } else {
              playStageOneRecordingUrl(nextUrl, true);
            }
          };
          doneAudio.onerror = () => playStageOneRecordingUrl(nextUrl, true);
        } else {
          playStageOneRecordingUrl(nextUrl, true);
        }
      };

      setCharacterState("speaking");
      setBubbleMessage("Listen first. Get your voice ready!");
      let queued = false;
      const startAfterPrompt = () => {
        if (queued || !stageOneActiveRef.current) return;
        queued = true;
        setCharacterState("idle");
        setBubbleMessage("Get ready...");
        recordingLeadInRef.current = setTimeout(() => {
          recordingLeadInRef.current = null;
          if (!stageOneActiveRef.current) return;
          try {
            recorder.start();
            setPreparingRecording(false);
            setIsRecording(true);
            setHasRecording(false);
            setCharacterState("listening");
            setBubbleMessage(`Your turn! Say ${activePower.sound}.`);
            recordingStopTimerRef.current = setTimeout(() => {
              stopStageOneRecording();
              recordingStopTimerRef.current = null;
            }, 3000);
          } catch {
            stream.getTracks().forEach((track) => track.stop());
            setPreparingRecording(false);
            setBubbleMessage("The microphone stopped. Tap to try again.");
          }
        }, 900);
      };
      const prompt = playAudio("/audio/stage1/RecordingStarts.wav");
      if (prompt) {
        prompt.onended = startAfterPrompt;
        prompt.onerror = startAfterPrompt;
        prompt.play().catch(startAfterPrompt);
      } else startAfterPrompt();
    } catch {
      if (!stageOneActiveRef.current) return;
      setIsRecording(false);
      setPreparingRecording(false);
      setCharacterState("encouraging");
      setBubbleMessage("I could not open the microphone. Check browser microphone permission.");
    } finally {
      stageOneRecordingPendingRef.current = false;
    }
  };

  if (isStageOneQuest) {
    return <VowelChallengeView
      vowel={activeVowel} sound={activePower.sound} ability={activePower.abilityName}
      title={stageOneDoor ? "Train your vowel power" : activePowerChallenge.title}
      message={bubbleMessage} characterState={characterState}
      preparing={preparingRecording}
      training={Boolean(stageOneDoor)} ready={stageOneIntroRevealed}
      recording={isRecording} recorded={hasRecording} celebrating={stageOneRewardRevealed}
      onBack={onBack} onReplay={playStageOneModel} onRecord={startStageOneRecording}
    />;
  }

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
          {isStageOneQuest ? (
            <div className="flex flex-col items-center">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs uppercase tracking-widest text-white" style={{ background: accent }}>
                  {challenge.skillLabel}
                </span>
                <span className="rounded-full bg-[var(--tint-amber)] px-3 py-1 text-xs font-bold text-[#B45309]">
                  {challenge.reward}
                </span>
              </div>

              <h2 className="text-xs sm:text-sm uppercase tracking-widest text-gray-400 mb-3">
                {activePrompt}
              </h2>

              {challenge.levelType === "blend-bridge" ? (
                <div className="flex items-center gap-2 sm:gap-4 font-bold justify-center flex-wrap" style={{ color: accent }}>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8FAFC] text-4xl sm:text-5xl border border-[var(--hairline)]">
                    {challenge.consonant}
                  </span>
                  <span className="text-2xl sm:text-3xl text-gray-300">+</span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--tint-amber)] text-4xl sm:text-5xl border border-[#F59E0B]/30">
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
                        className={char === "_" ? "inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-dashed border-[#D6D3D1] bg-[var(--paper)]" : ""}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">Choose the missing vowel, then say the sound.</p>
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
                  <p className="text-sm text-[var(--ink-soft)]">{challenge.mouthHint}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: [-4, 4, -4], scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="flex h-28 w-28 items-center justify-center rounded-[2rem] border-4 bg-[var(--tint-amber)] shadow-[0_16px_34px_-20px_rgba(245,158,11,0.8)]"
                    style={{ borderColor: accent }}
                  >
                    <span className="text-6xl font-bold" style={{ color: accent }}>{challenge.vowel}</span>
                  </motion.div>
                  <span className="text-4xl sm:text-6xl font-bold" style={{ color: accent }}>
                    {challenge.levelType === "anchor-echo" ? challenge.anchorWord : challenge.targetSound}
                  </span>
                  {challenge.levelType === "anchor-echo" && (
                    <p className="text-sm text-[var(--ink-soft)]">
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
                              : "bg-[var(--tint-red)] border-[#EF4444] text-[#B91C1C]"
                            : "bg-card border-[#E6DED2] text-[var(--ink)] hover:border-[#F59E0B]"
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
