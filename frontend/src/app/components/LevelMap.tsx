import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DoorOpen,
  Lock,
  Map as MapIcon,
  Play,
  Star,
} from "lucide-react";

interface LevelNode {
  id: number;
  label: string;
  hint: string;
}

interface StageDef {
  chapter: string;
  title: string;
  accent: string;
  tint: string;
  nodes: LevelNode[];
}

interface ValleyLevelNode extends LevelNode {
  vowel: "A" | "E" | "I" | "O" | "U";
  word: string;
  x: number;
  y: number;
}

interface LevelMapProps {
  stageId: number;
  completedCount?: number;
  onBack: () => void;
  onSelectLevel: (levelId: number) => void;
}

type NodeStatus = "done" | "next" | "locked";

const GATE_LEVELS: ValleyLevelNode[] = [
  { id: 1, vowel: "A", word: "Apple", label: "A", hint: "Apple", x: 13, y: 52 },
  { id: 2, vowel: "E", word: "Egg", label: "E", hint: "Egg", x: 31, y: 30 },
  { id: 3, vowel: "I", word: "Igloo", label: "I", hint: "Igloo", x: 50, y: 64 },
  { id: 4, vowel: "O", word: "Octopus", label: "O", hint: "Octopus", x: 69, y: 30 },
  { id: 5, vowel: "U", word: "Umbrella", label: "U", hint: "Umbrella", x: 87, y: 52 },
];

const VOWEL_SECTIONS: Array<{
  vowel: ValleyLevelNode["vowel"];
  title: string;
  accent: string;
  tint: string;
  words: string[];
}> = [
  {
    vowel: "A",
    title: "Apple Meadow",
    accent: "#F59E0B",
    tint: "#FFF7ED",
    words: ["Apple", "Ant", "Axe", "Alligator", "Astronaut", "Anchor", "Arrow", "Acorn", "Apron", "Album"],
  },
  {
    vowel: "E",
    title: "Echo Garden",
    accent: "#EC4899",
    tint: "#FCE7F3",
    words: ["Egg", "Elephant", "Elbow", "Engine", "Envelope", "Exit", "Echo", "Emerald", "Eskimo", "Exercise"],
  },
  {
    vowel: "I",
    title: "Igloo Springs",
    accent: "#06B6D4",
    tint: "#CFFAFE",
    words: ["Igloo", "Insect", "Ink", "Island", "Invitation", "Iguana", "Idea", "Ice", "Iron", "Inside"],
  },
  {
    vowel: "O",
    title: "Octopus Orchard",
    accent: "#8B5CF6",
    tint: "#EDE9FE",
    words: ["Octopus", "Orange", "Ostrich", "Oblong", "Owl", "Ocean", "Olive", "Oven", "Office", "Orbit"],
  },
  {
    vowel: "U",
    title: "Umbrella Grove",
    accent: "#10B981",
    tint: "#D1FAE5",
    words: ["Umbrella", "Unicorn", "Up", "Under", "Uniform", "Ukulele", "Uncle", "Utensil", "Unit", "Us"],
  },
];

const SECTION_NODE_POSITIONS = [
  [10, 20],
  [26, 32],
  [48, 23],
  [69, 36],
  [88, 26],
  [78, 50],
  [56, 60],
  [34, 51],
  [16, 68],
  [42, 81],
] as const;

const SECTION_HEIGHT = 720;
const BOARD_WIDTH = 1280;
const BOARD_HEIGHT = VOWEL_SECTIONS.length * SECTION_HEIGHT;

const SECTION_BACKGROUNDS = [
  "linear-gradient(180deg, #D9F99D 0%, #FEF3C7 100%)",
  "linear-gradient(180deg, #FCE7F3 0%, #FBCFE8 100%)",
  "linear-gradient(180deg, #BAE6FD 0%, #CFFAFE 100%)",
  "linear-gradient(180deg, #DDD6FE 0%, #EDE9FE 100%)",
  "linear-gradient(180deg, #A7F3D0 0%, #67E8F9 100%)",
];

const VALLEY_DECORATIONS = [
  ["🌼", 140, 220],
  ["🌻", 1080, 285],
  ["🍎", 930, 560],
  ["🦋", 220, 900],
  ["🌷", 980, 1150],
  ["💧", 160, 1580],
  ["❄", 1030, 1810],
  ["🍊", 220, 2380],
  ["🌙", 1000, 2560],
  ["☂", 180, 3140],
  ["🌿", 1020, 3400],
] as const;

function sectionCompletedCount(sectionIndex: number, completed: number) {
  const valleyProgress = Math.max(0, completed - GATE_LEVELS.length);
  return Math.min(Math.max(valleyProgress - sectionIndex * 10, 0), 10);
}

function restorationFilter(restoredCount: number) {
  if (restoredCount >= 10) return "grayscale(0%) brightness(1)";
  if (restoredCount > 0) {
    const pct = restoredCount / 10;
    return `grayscale(${Math.round((1 - pct) * 65)}%) brightness(${0.78 + pct * 0.22})`;
  }
  return "grayscale(100%) brightness(0.72)";
}

const VALLEY_LEVELS: ValleyLevelNode[] = VOWEL_SECTIONS.flatMap((section, sectionIndex) =>
  section.words.map((word, wordIndex) => {
    const id = 6 + sectionIndex * 10 + wordIndex;
    const [x, localY] = SECTION_NODE_POSITIONS[wordIndex];
    return {
      id,
      vowel: section.vowel,
      word,
      label: section.vowel,
      hint: word,
      x,
      y: sectionIndex * SECTION_HEIGHT + Math.round((localY / 100) * SECTION_HEIGHT),
    };
  })
);

const STAGES: Record<number, StageDef> = {
  2: {
    chapter: "Chapter 2",
    title: "Blending Bridges",
    accent: "#4F46E5",
    tint: "#EEF2FF",
    nodes: [
      { id: 1, label: "MA", hint: "M + A" },
      { id: 2, label: "BA", hint: "B + A" },
      { id: 3, label: "TA", hint: "T + A" },
      { id: 4, label: "SA", hint: "S + A" },
      { id: 5, label: "LA", hint: "L + A" },
      { id: 6, label: "PA", hint: "P + A" },
      { id: 7, label: "NA", hint: "N + A" },
      { id: 8, label: "DA", hint: "D + A" },
    ],
  },
  3: {
    chapter: "Chapter 3",
    title: "CVC Kingdom",
    accent: "#10B981",
    tint: "#D1FAE5",
    nodes: [
      { id: 1, label: "CAT", hint: "C-A-T" },
      { id: 2, label: "MAN", hint: "M-A-N" },
      { id: 3, label: "HAT", hint: "H-A-T" },
      { id: 4, label: "PIG", hint: "P-I-G" },
      { id: 5, label: "DOG", hint: "D-O-G" },
      { id: 6, label: "SUN", hint: "S-U-N" },
      { id: 7, label: "BED", hint: "B-E-D" },
      { id: 8, label: "CUP", hint: "C-U-P" },
      { id: 9, label: "BUS", hint: "B-U-S" },
      { id: 10, label: "TOP", hint: "T-O-P" },
    ],
  },
};

function getStatus(index: number, completed: number): NodeStatus {
  if (index < completed) return "done";
  if (index === completed) return "next";
  return "locked";
}

function valleyStatus(levelId: number, completed: number): NodeStatus {
  if (levelId <= completed) return "done";
  if (levelId === completed + 1) return "next";
  return "locked";
}

function sectionForProgress(completed: number) {
  const valleyProgress = Math.max(0, completed - GATE_LEVELS.length);
  return VOWEL_SECTIONS[Math.min(Math.floor(valleyProgress / 10), VOWEL_SECTIONS.length - 1)];
}

function routePath(nodes: ValleyLevelNode[]) {
  return nodes
    .map((node, index) => {
      const x = (node.x / 100) * BOARD_WIDTH;
      const y = node.y + 72;
      if (index === 0) return `M ${x} ${y}`;
      const prev = nodes[index - 1];
      const prevX = (prev.x / 100) * BOARD_WIDTH;
      const prevY = prev.y + 72;
      const midY = (prevY + y) / 2;
      return `C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`;
    })
    .join(" ");
}

function routeSegmentPath(from: ValleyLevelNode, to: ValleyLevelNode) {
  const fromX = (from.x / 100) * BOARD_WIDTH;
  const fromY = from.y + 72;
  const toX = (to.x / 100) * BOARD_WIDTH;
  const toY = to.y + 72;
  const midY = (fromY + toY) / 2;

  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
}

function ValleyHeader({
  completed,
  total,
  onBack,
}: {
  completed: number;
  total: number;
  onBack: () => void;
}) {
  const currentSection = sectionForProgress(completed);
  const pct = Math.round((completed / total) * 100);

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 py-3 bg-[var(--paper)]/95 backdrop-blur border-b border-[var(--hairline)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Stages
          </button>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
            <MapIcon className="w-3.5 h-3.5" />
            Valley Map
          </span>
        </div>
      </div>

      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-7xl mx-auto pt-8 pb-6"
      >
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: currentSection.accent }}>
          Chapter 1
        </p>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">
              Valley of Vowels
            </h1>
            <p className="text-[var(--ink-soft)] mt-2 max-w-2xl">
              Open the five vowel doors first. Then follow the winding valley road through 50 pronunciation levels.
            </p>
          </div>
          <div className="w-full lg:w-96 bg-card rounded-2xl p-5 border border-[var(--hairline)]">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                Valley restored
              </span>
              <span className="text-sm text-[var(--ink)]">
                {completed} / {total}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--paper-deep)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-2 rounded-full"
                style={{
                  background: "linear-gradient(to right, #F59E0B, #EC4899, #06B6D4, #8B5CF6, #10B981)",
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function VowelDoorIntro({
  completed,
  onBack,
  onSelectLevel,
  onRevealRoad,
}: {
  completed: number;
  onBack: () => void;
  onSelectLevel: (levelId: number) => void;
  onRevealRoad: () => void;
}) {
  const allDoorsOpen = completed >= GATE_LEVELS.length;

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-4 sm:px-6 md:px-10 py-6">
        <ValleyHeader completed={completed} total={55} onBack={onBack} />

        <div className="max-w-7xl mx-auto">
          <div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-[var(--hairline)] bg-[#D9F99D] shadow-[0_18px_48px_-28px_rgba(31,36,48,0.35)]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#BDEB77] via-[#DFF8A6] to-[#A7F3D0]" />
            <div className="absolute left-0 right-0 bottom-0 h-40 bg-[#8DD7A8]" />
            <svg className="absolute inset-x-0 top-0 h-52 w-full" viewBox="0 0 1200 220" preserveAspectRatio="none">
              <path d="M 0 170 L 120 70 L 220 168 L 350 52 L 510 174 L 650 80 L 760 168 L 900 44 L 1060 174 L 1200 82 L 1200 0 L 0 0 Z" fill="#8BA46F" opacity="0.42" />
              <path d="M 0 215 L 170 98 L 310 214 L 470 92 L 660 220 L 820 82 L 990 212 L 1200 110 L 1200 0 L 0 0 Z" fill="#6F8F68" opacity="0.32" />
            </svg>
            <div className="absolute left-[8%] top-[12%] h-24 w-56 rounded-[50%] bg-[#FDE68A]" />
            <div className="absolute right-[12%] top-[16%] h-28 w-64 rounded-[50%] bg-[#BAE6FD]" />
            <div className="absolute left-[42%] bottom-[8%] h-20 w-80 rounded-[50%] bg-[#FCD34D]" />

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 620" preserveAspectRatio="none">
              <path d="M 100 430 C 260 160, 440 500, 600 350 C 760 190, 910 480, 1100 260" stroke="#F7EFE0" strokeWidth="42" strokeLinecap="round" fill="none" />
              <path d="M 100 430 C 260 160, 440 500, 600 350 C 760 190, 910 480, 1100 260" stroke="#86EFAC" strokeWidth="8" strokeDasharray="18 16" strokeLinecap="round" fill="none" />
            </svg>

            <div className="absolute right-8 top-8 z-20 flex items-center gap-4 rounded-2xl border border-white bg-card/95 px-5 py-4 shadow-[0_14px_32px_-20px_rgba(31,36,48,0.5)]">
              <motion.div
                animate={allDoorsOpen ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[#F59E0B] bg-card"
              >
                {allDoorsOpen ? (
                  <DoorOpen className="h-9 w-9 text-[#F59E0B]" />
                ) : (
                  <Lock className="h-8 w-8 text-[#A8A29E]" />
                )}
              </motion.div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                  {completed}/5 doors
                </p>
                <p className="text-base font-bold text-[var(--ink)]">
                  {allDoorsOpen ? "Valley door open" : "Open vowel doors"}
                </p>
              </div>
            </div>

            {allDoorsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute left-1/2 top-[44%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white bg-card/95 px-8 py-6 text-center shadow-[0_24px_48px_-24px_rgba(31,36,48,0.5)]"
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[#F59E0B] bg-[var(--tint-amber)]"
                >
                  <DoorOpen className="h-11 w-11 text-[#F59E0B]" />
                </motion.div>
                <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                  Gate unlocked
                </p>
                <p className="text-xl font-bold text-[var(--ink)]">
                  The Valley road is open
                </p>
              </motion.div>
            )}

            {GATE_LEVELS.map((node, index) => {
              const status = valleyStatus(node.id, completed);
              const accent = VOWEL_SECTIONS[index].accent;
              return (
                <motion.button
                  key={node.id}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08, ease: "easeOut" }}
                  whileHover={status !== "locked" ? { y: -5 } : {}}
                  whileTap={status !== "locked" ? { scale: 0.97 } : {}}
                  onClick={() => status !== "locked" && onSelectLevel(node.id)}
                  disabled={status === "locked"}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <span
                    className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[6px] bg-card text-4xl font-bold shadow-[0_12px_28px_-16px_rgba(31,36,48,0.5)] ${
                      status === "locked" ? "grayscale" : ""
                    }`}
                    style={{ borderColor: status === "locked" ? "#D6D3D1" : accent, color: accent }}
                  >
                    {status === "done" ? <Check className="h-10 w-10" strokeWidth={3} /> : node.label}
                    {status === "next" && (
                      <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                        <Play className="h-4 w-4 fill-white" />
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block rounded-full bg-card/90 px-3 py-1 text-sm font-bold text-[var(--ink)] shadow-sm">
                    {node.word}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="sticky bottom-4 z-30 mt-6 rounded-2xl border border-[var(--hairline)] bg-card/95 p-4 shadow-[0_18px_38px_-24px_rgba(31,36,48,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--ink)]">
                  {allDoorsOpen ? "The full valley road is ready" : `Next door: ${GATE_LEVELS[completed]?.word ?? "Valley"}`}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {allDoorsOpen ? "Continue to the first valley road level." : "Complete the original vowel words to unlock the map."}
                </p>
              </div>
              <button
                onClick={() => {
                  if (allDoorsOpen) {
                    onRevealRoad();
                    return;
                  }

                  onSelectLevel(completed + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F59E0B] px-4 py-2 text-sm text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValleyRoadMap({
  completed,
  onBack,
  onSelectLevel,
}: {
  completed: number;
  onBack: () => void;
  onSelectLevel: (levelId: number) => void;
}) {
  const currentSection = sectionForProgress(completed);
  const valleyCompleted = Math.max(0, completed - GATE_LEVELS.length);
  const recentSegmentPath =
    valleyCompleted > 1
      ? routeSegmentPath(VALLEY_LEVELS[valleyCompleted - 2], VALLEY_LEVELS[valleyCompleted - 1])
      : "";
  const recentNodeId = valleyCompleted > 0 ? VALLEY_LEVELS[valleyCompleted - 1]?.id : null;

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-4 sm:px-6 md:px-10 py-6">
        <ValleyHeader completed={completed} total={55} onBack={onBack} />

        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-x-auto rounded-[2rem] border border-[var(--hairline)] bg-card shadow-[0_18px_48px_-28px_rgba(31,36,48,0.35)]">
            <div
              className="relative min-w-[980px]"
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT + 140 }}
            >
              <div className="absolute inset-0 bg-[#BFC4B7]" />
              {VOWEL_SECTIONS.map((section, index) => {
                const restoredCount = sectionCompletedCount(index, completed);
                const isRestored = restoredCount >= 10;
                return (
                  <motion.div
                    key={`${section.vowel}-terrain`}
                    className="absolute inset-x-0 overflow-hidden transition-all duration-700"
                    animate={{ filter: restorationFilter(restoredCount) }}
                    style={{
                      top: index * SECTION_HEIGHT,
                      height: SECTION_HEIGHT,
                      background: SECTION_BACKGROUNDS[index],
                    }}
                  >
                    <svg
                      className="absolute inset-0 h-full w-full"
                      viewBox={`0 0 ${BOARD_WIDTH} ${SECTION_HEIGHT}`}
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 0 190 L 105 70 L 210 190 L 300 88 L 430 210 L 560 64 L 720 220 L 860 82 L 1010 202 L 1140 96 L 1280 206 L 1280 0 L 0 0 Z"
                        fill={isRestored ? "#8AC46B" : "#8F948D"}
                        opacity="0.48"
                      />
                      <path
                        d="M 0 255 L 150 118 L 290 252 L 430 126 L 590 270 L 760 110 L 930 262 L 1080 130 L 1280 274 L 1280 0 L 0 0 Z"
                        fill={isRestored ? "#6BAE65" : "#747B73"}
                        opacity="0.36"
                      />
                      <path
                        d="M 0 590 C 210 530, 370 600, 590 548 C 790 500, 1010 574, 1280 520 L 1280 720 L 0 720 Z"
                        fill={isRestored ? "#4ADE80" : "#8B9088"}
                        opacity="0.34"
                      />
                      <path
                        d="M 0 660 C 180 610, 320 686, 510 635 C 725 580, 980 690, 1280 620 L 1280 720 L 0 720 Z"
                        fill={isRestored ? "#22C55E" : "#737A72"}
                        opacity="0.28"
                      />
                    </svg>
                    <div className="absolute left-[8%] top-[18%] h-24 w-56 rounded-[50%] bg-white/20" />
                    <div className="absolute right-[10%] top-[24%] h-20 w-72 rounded-[50%] bg-white/18" />
                    {restoredCount < 10 && (
                      <div className="absolute inset-0 bg-[#2F3130] opacity-[0.22]" />
                    )}
                    {restoredCount > 0 && restoredCount < 10 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-white/10"
                        style={{ width: `${restoredCount * 10}%` }}
                      />
                    )}
                  </motion.div>
                );
              })}

              <svg className="absolute inset-0" width={BOARD_WIDTH} height={BOARD_HEIGHT + 140} viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT + 140}`}>
                <path d={routePath(VALLEY_LEVELS)} stroke="#F7EFE0" strokeWidth="48" strokeLinecap="round" fill="none" />
                <path d={routePath(VALLEY_LEVELS)} stroke="#7ED957" strokeWidth="9" strokeDasharray="20 17" strokeLinecap="round" fill="none" />
                {valleyCompleted > 0 && (
                  <>
                    <path
                      d={routePath(VALLEY_LEVELS.slice(0, valleyCompleted))}
                      stroke="#F59E0B"
                      strokeWidth="24"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.24"
                    />
                    <path
                      d={routePath(VALLEY_LEVELS.slice(0, valleyCompleted))}
                      stroke="#FBBF24"
                      strokeWidth="16"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.96"
                    />
                    <path
                      d={routePath(VALLEY_LEVELS.slice(0, valleyCompleted))}
                      stroke="#FFE8A3"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="18 18"
                      fill="none"
                      opacity="0.8"
                    />
                  </>
                )}
                {recentSegmentPath && (
                  <g key={`recent-road-${completed}`}>
                    <motion.path
                      d={recentSegmentPath}
                      stroke="#F97316"
                      strokeWidth="22"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0.95 }}
                      animate={{ pathLength: 1, opacity: 0 }}
                      transition={{ duration: 1.25, ease: "easeInOut", delay: 0.25 }}
                    />
                    <circle r="13" fill="#FFFFFF" stroke="#F97316" strokeWidth="6">
                      <animateMotion dur="1.25s" begin="0.25s" fill="freeze" path={recentSegmentPath} />
                    </circle>
                    <circle r="5" fill="#FBBF24">
                      <animateMotion dur="1.25s" begin="0.25s" fill="freeze" path={recentSegmentPath} />
                    </circle>
                  </g>
                )}
              </svg>

              {VOWEL_SECTIONS.map((section, index) => (
                <div key={section.vowel}>
                  <div
                    className="pointer-events-none absolute left-10 z-30 w-[300px] rounded-2xl border border-white bg-card px-5 py-3 shadow-[0_12px_28px_-18px_rgba(31,36,48,0.45)]"
                    style={{ top: index * SECTION_HEIGHT + 26 }}
                  >
                    <p className="text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                      {sectionCompletedCount(index, completed) >= 10
                        ? "Restored"
                        : sectionCompletedCount(index, completed) > 0
                        ? "Restoring"
                        : "Muted region"}
                    </p>
                    <p className="text-xl font-bold leading-tight" style={{ color: section.accent }}>
                      {section.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {sectionCompletedCount(index, completed)}/10 sounds
                    </p>
                  </div>
                  <div
                    className="absolute right-16 text-[11rem] font-bold leading-none opacity-15"
                    style={{ top: index * SECTION_HEIGHT + 120, color: section.accent }}
                  >
                    {section.vowel}
                  </div>
                </div>
              ))}

              {VALLEY_DECORATIONS.map(([icon, x, y]) => {
                const sectionIndex = Math.min(Math.floor(y / SECTION_HEIGHT), VOWEL_SECTIONS.length - 1);
                const restoredCount = sectionCompletedCount(sectionIndex, completed);
                return (
                  <span
                    key={`${icon}-${x}-${y}`}
                    className="absolute text-5xl opacity-80 transition-all duration-700"
                    style={{
                      left: x,
                      top: y,
                      filter: restorationFilter(restoredCount),
                    }}
                  >
                    {icon}
                  </span>
                );
              })}

              {VALLEY_LEVELS.map((node) => {
                const section = VOWEL_SECTIONS[Math.floor((node.id - 6) / 10)];
                const status = valleyStatus(node.id, completed);
                const isDone = status === "done";
                const isNext = status === "next";
                return (
                  <motion.button
                    key={node.id}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: ((node.id - 6) % 10) * 0.03, ease: "easeOut" }}
                    whileHover={status !== "locked" ? { y: -5 } : {}}
                    whileTap={status !== "locked" ? { scale: 0.96 } : {}}
                    onClick={() => status !== "locked" && onSelectLevel(node.id)}
                    disabled={status === "locked"}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{ left: `${node.x}%`, top: node.y + 72 }}
                    aria-label={`Level ${node.id}: ${node.word}`}
                  >
                    <span
                      className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[7px] bg-card text-2xl font-bold shadow-[0_14px_30px_-16px_rgba(31,36,48,0.55)] ${
                        status === "locked" ? "grayscale brightness-90" : ""
                      }`}
                      style={{ borderColor: status === "locked" ? "#D6D3D1" : section.accent, color: section.accent }}
                    >
                      {isDone ? <Check className="h-9 w-9" strokeWidth={3} /> : isNext ? node.id : <Lock className="h-7 w-7 text-[#78716C]" />}
                      {isNext && (
                        <motion.span
                          animate={{ scale: [1, 1.16, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full text-white"
                          style={{ background: section.accent }}
                        >
                          <Play className="h-4 w-4 fill-white" />
                        </motion.span>
                      )}
                      {node.id === recentNodeId && (
                        <motion.span
                          className="absolute inset-[-14px] rounded-full border-4"
                          style={{ borderColor: section.accent }}
                          initial={{ scale: 0.7, opacity: 0.8 }}
                          animate={{ scale: 1.22, opacity: 0 }}
                          transition={{ duration: 1.15, ease: "easeOut", delay: 1.1 }}
                        />
                      )}
                    </span>
                    <span className="mt-2 block rounded-full bg-card/90 px-3 py-1 text-sm font-bold text-[var(--ink)] shadow-sm">
                      {node.word}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {completed < 55 && (
            <div className="sticky bottom-4 z-30 mt-6 rounded-2xl border border-[var(--hairline)] bg-card/95 p-4 shadow-[0_18px_38px_-24px_rgba(31,36,48,0.35)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Next: Level {completed + 1}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {VALLEY_LEVELS.find((node) => node.id === completed + 1)?.word ?? "Valley"} sound practice
                  </p>
                </div>
                <button
                  onClick={() => onSelectLevel(completed + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm text-white"
                  style={{ background: currentSection.accent }}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ValleyOfVowelsMap({
  completedCount = 0,
  onBack,
  onSelectLevel,
}: Omit<LevelMapProps, "stageId">) {
  const completed = Math.min(completedCount, 55);
  const [showRoadAfterGate, setShowRoadAfterGate] = useState(false);

  if (completed < GATE_LEVELS.length || (completed === GATE_LEVELS.length && !showRoadAfterGate)) {
    return (
      <VowelDoorIntro
        completed={completed}
        onBack={onBack}
        onSelectLevel={onSelectLevel}
        onRevealRoad={() => setShowRoadAfterGate(true)}
      />
    );
  }

  return <ValleyRoadMap completed={completed} onBack={onBack} onSelectLevel={onSelectLevel} />;
}

function StandardLevelMap({
  stageId,
  completedCount = 0,
  onBack,
  onSelectLevel,
}: LevelMapProps) {
  const stage = STAGES[stageId] ?? STAGES[2];
  const total = stage.nodes.length;
  const completed = Math.min(completedCount, total);
  const pct = Math.round((completed / total) * 100);

  const handleClick = (index: number, node: LevelNode) => {
    if (getStatus(index, completed) === "locked") return;
    onSelectLevel(node.id);
  };

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto relative">
      <div className="relative z-10 min-h-full px-6 md:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <MapIcon className="w-3.5 h-3.5" />
              Level Map
            </span>
          </div>

          <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: stage.accent }}>
              {stage.chapter}
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">{stage.title}</h1>
              <p className="text-[var(--ink-soft)]">
                <span style={{ color: stage.accent }}>{completed}</span>
                <span className="text-[var(--ink-muted)]"> / {total} levels</span>
              </p>
            </div>
          </motion.div>

          <div className="bg-card rounded-2xl p-5 border border-[var(--hairline)] mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Chapter progress</span>
              <span className="text-sm text-[var(--ink)]">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--paper-deep)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-1.5 rounded-full"
                style={{ background: stage.accent }}
              />
            </div>
          </div>

          <div className="bg-card rounded-3xl p-6 md:p-10 border border-[var(--hairline)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-8">
              {stage.nodes.map((node, i) => {
                const status = getStatus(i, completed);
                return (
                  <div key={node.id} className="relative flex flex-col items-center">
                    <motion.button
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05, ease: "easeOut" }}
                      whileHover={status !== "locked" ? { y: -3 } : {}}
                      whileTap={status !== "locked" ? { scale: 0.97 } : {}}
                      onClick={() => handleClick(i, node)}
                      disabled={status === "locked"}
                      className={`relative z-10 rounded-2xl flex items-center justify-center text-xl transition-all border-2 ${
                        status === "locked" ? "bg-[var(--paper-deep)] text-[var(--ink-muted)] cursor-not-allowed" : "bg-card text-[var(--ink)] cursor-pointer"
                      }`}
                      style={{
                        width: 72,
                        height: 72,
                        borderColor: status === "locked" ? "#1F243014" : stage.accent,
                        background: status === "done" ? stage.tint : status === "next" ? "#ffffff" : "#F2EEE6",
                      }}
                    >
                      {status === "locked" ? <Lock className="w-5 h-5" /> : <span style={{ color: stage.accent }}>{node.label}</span>}
                      {status === "done" && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: stage.accent }}>
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                      )}
                      {status === "next" && (
                        <motion.span
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ background: stage.accent }}
                        >
                          <Star className="w-3 h-3 fill-white" />
                        </motion.span>
                      )}
                    </motion.button>
                    <div className="mt-3 text-center">
                      <p className={`text-sm ${status === "locked" ? "text-[var(--ink-muted)]" : "text-[var(--ink)]"}`}>Level {i + 1}</p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">{node.hint}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LevelMap(props: LevelMapProps) {
  if (props.stageId === 1) {
    return <ValleyOfVowelsMap {...props} />;
  }

  return <StandardLevelMap {...props} />;
}
