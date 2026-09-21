import { useEffect, useState } from "react";
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
  X,
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
  vowel: "A" | "E" | "I" | "O" | "U" | "★";
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
  { id: 1, vowel: "A", word: "A Door", label: "A", hint: "train the A power", x: 20, y: 62 },
  { id: 2, vowel: "E", word: "E Door", label: "E", hint: "train the E power", x: 31, y: 32 },
  { id: 3, vowel: "I", word: "I Door", label: "I", hint: "train the I power", x: 50, y: 70 },
  { id: 4, vowel: "O", word: "O Door", label: "O", hint: "train the O power", x: 69, y: 32 },
  { id: 5, vowel: "U", word: "U Door", label: "U", hint: "train the U power", x: 80, y: 62 },
];

const VOWEL_DOJO_STATIONS = [
  { name: "A Armor", figure: "Shield stance", cue: "open sound" },
  { name: "E Echo", figure: "Echo bell", cue: "quick sound" },
  { name: "I Insight", figure: "Focus lens", cue: "short sound" },
  { name: "O Orb", figure: "Round gate", cue: "round sound" },
  { name: "U Uplift", figure: "Lift bridge", cue: "soft sound" },
] as const;

const VOWEL_SECTIONS: Array<{
  vowel: ValleyLevelNode["vowel"];
  title: string;
  accent: string;
  tint: string;
  words: string[];
}> = [
  {
    vowel: "A",
    title: "Meadow Trail",
    accent: "#F59E0B",
    tint: "#FFF7ED",
    words: ["Trail 1", "Trail 2", "Trail 3"],
  },
  {
    vowel: "E",
    title: "Garden Trail",
    accent: "#EC4899",
    tint: "#FCE7F3",
    words: ["Trail 4", "Trail 5", "Trail 6"],
  },
  {
    vowel: "I",
    title: "Spring Trail",
    accent: "#06B6D4",
    tint: "#CFFAFE",
    words: ["Trail 7", "Trail 8", "Trail 9"],
  },
  {
    vowel: "O",
    title: "Orchard Trail",
    accent: "#8B5CF6",
    tint: "#EDE9FE",
    words: ["Trail 10", "Trail 11", "Trail 12"],
  },
  {
    vowel: "U",
    title: "Grove Trail",
    accent: "#10B981",
    tint: "#D1FAE5",
    words: ["Trail 13", "Trail 14", "Trail 15"],
  },
];

const SECTION_NODE_POSITIONS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [
    [25, 31],
    [47, 44],
    [72, 30],
  ],
  [
    [86, 24],
    [62, 43],
    [34, 29],
  ],
  [
    [18, 28],
    [46, 20],
    [77, 39],
  ],
  [
    [90, 30],
    [66, 22],
    [42, 44],
  ],
  [
    [19, 24],
    [48, 42],
    [78, 26],
  ],
] as const;

const SECTION_HEIGHT = 720;
const BOARD_WIDTH = 1280;
const BOARD_HEIGHT = VOWEL_SECTIONS.length * SECTION_HEIGHT;
const VALLEY_TOTAL_LEVELS = GATE_LEVELS.length + VOWEL_SECTIONS.reduce((sum, section) => sum + section.words.length, 0);

const SECTION_BACKGROUNDS = [
  "linear-gradient(180deg, #D9F99D 0%, #FEF3C7 100%)",
  "linear-gradient(180deg, #FCE7F3 0%, #FBCFE8 100%)",
  "linear-gradient(180deg, #BAE6FD 0%, #CFFAFE 100%)",
  "linear-gradient(180deg, #DDD6FE 0%, #EDE9FE 100%)",
  "linear-gradient(180deg, #A7F3D0 0%, #67E8F9 100%)",
];

const VALLEY_DECORATIONS = [
  ["🌼", 210, 255],
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

const VOWEL_DOJO_NODE: ValleyLevelNode = {
  id: 5,
  vowel: "A",
  word: "Vowel Dojo",
  label: "A",
  hint: "train vowel powers again",
  x: 10,
  y: 210,
};

function sectionStartOffset(sectionIndex: number) {
  return VOWEL_SECTIONS.slice(0, sectionIndex).reduce((sum, section) => sum + section.words.length, 0);
}

function sectionIndexForLevelId(levelId: number) {
  const valleyLevel = Math.max(1, levelId - GATE_LEVELS.length);
  let offset = 0;
  for (let i = 0; i < VOWEL_SECTIONS.length; i += 1) {
    const nextOffset = offset + VOWEL_SECTIONS[i].words.length;
    if (valleyLevel <= nextOffset) return i;
    offset = nextOffset;
  }
  return VOWEL_SECTIONS.length - 1;
}

function sectionCompletedCount(sectionIndex: number, completed: number) {
  const valleyProgress = Math.max(0, completed - GATE_LEVELS.length);
  const sectionSize = VOWEL_SECTIONS[sectionIndex].words.length;
  return Math.min(Math.max(valleyProgress - sectionStartOffset(sectionIndex), 0), sectionSize);
}

function restorationFilter(restoredCount: number, total = 6) {
  if (restoredCount >= total) return "grayscale(0%) brightness(1)";
  if (restoredCount > 0) {
    const pct = restoredCount / total;
    return `grayscale(${Math.round((1 - pct) * 65)}%) brightness(${0.78 + pct * 0.22})`;
  }
  return "grayscale(100%) brightness(0.72)";
}

const VALLEY_LEVELS: ValleyLevelNode[] = VOWEL_SECTIONS.flatMap((section, sectionIndex) =>
  section.words.map((word, wordIndex) => {
    const id = 6 + sectionStartOffset(sectionIndex) + wordIndex;
    const sectionPositions = SECTION_NODE_POSITIONS[sectionIndex] ?? SECTION_NODE_POSITIONS[0];
    const [x, localY] = sectionPositions[wordIndex % sectionPositions.length];
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

const VALLEY_ROUTE_WITH_DOJO: ValleyLevelNode[] = [VOWEL_DOJO_NODE, ...VALLEY_LEVELS];

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
  let offset = 0;
  for (const section of VOWEL_SECTIONS) {
    offset += section.words.length;
    if (valleyProgress <= offset) return section;
  }
  return VOWEL_SECTIONS[VOWEL_SECTIONS.length - 1];
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
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 py-3 bg-[#FAF7F2]/95 backdrop-blur border-b border-[#1F243014]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1F243014] text-[#4B5266] hover:text-[#1F2430] text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Stages
          </button>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#8A91A3]">
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
            <h1 className="text-4xl md:text-5xl text-[#1F2430] tracking-tight">
              Valley of Vowels
            </h1>
            <p className="text-[#4B5266] mt-2 max-w-2xl">
              Open the five vowel doors first. Then use Milo's vowel powers across short road challenges.
            </p>
          </div>
          <div className="w-full lg:w-96 bg-white rounded-2xl p-5 border border-[#1F243014]">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
                Valley restored
              </span>
              <span className="text-sm text-[#1F2430]">
                {completed} / {total}
              </span>
            </div>
            <div className="w-full h-2 bg-[#F2EEE6] rounded-full overflow-hidden">
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
  const trainedDoorCount = Math.min(completed, GATE_LEVELS.length);
  const [showUnlockNotice, setShowUnlockNotice] = useState(allDoorsOpen);

  useEffect(() => {
    if (allDoorsOpen) {
      setShowUnlockNotice(true);
    }
  }, [allDoorsOpen]);

  return (
    <div className="size-full bg-[#FAF7F2] overflow-auto">
      <div className="min-h-full px-4 sm:px-6 md:px-10 py-6">
        <ValleyHeader completed={completed} total={VALLEY_TOTAL_LEVELS} onBack={onBack} />

        <div className="max-w-7xl mx-auto">
          <div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-[#1F243014] bg-[#F8E7C5] shadow-[0_18px_48px_-28px_rgba(31,36,48,0.35)]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#FFF7ED_0%,#F8E7C5_58%,#E7C990_100%)]" />
            <div className="absolute inset-x-0 top-0 h-28 bg-[#D8B778]" />
            <div className="absolute inset-x-10 top-20 h-8 rounded-full bg-white/35" />
            <div className="absolute bottom-0 left-0 right-0 h-[42%] bg-[#D9B978]" />
            <div className="absolute bottom-0 left-0 right-0 h-[42%] opacity-25" style={{ backgroundImage: "linear-gradient(90deg, #9A7A48 1px, transparent 1px), linear-gradient(0deg, #9A7A48 1px, transparent 1px)", backgroundSize: "96px 96px" }} />
            <div className="absolute left-1/2 top-[50%] h-72 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] border-[12px] border-white/80 bg-[#FFF7ED] shadow-[0_24px_52px_-34px_rgba(31,36,48,0.45)]" />
            <div className="absolute left-1/2 top-[50%] h-48 w-80 -translate-x-1/2 -translate-y-1/2 rounded-[2.4rem] border-4 border-dashed border-[#F59E0B]/45 bg-[#FEF3C7]" />
            <div className="absolute left-[12%] top-[18%] h-24 w-10 rounded-full bg-[#B45309]/25" />
            <div className="absolute right-[12%] top-[18%] h-24 w-10 rounded-full bg-[#B45309]/25" />
            <div className="absolute left-[9%] bottom-[18%] h-20 w-40 rounded-[50%] bg-white/25" />
            <div className="absolute right-[8%] bottom-[18%] h-20 w-40 rounded-[50%] bg-white/25" />

            <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_14px_32px_-20px_rgba(31,36,48,0.5)] sm:left-auto sm:right-8 sm:top-8 sm:gap-4 sm:px-5 sm:py-4">
              <motion.div
                animate={allDoorsOpen ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[#F59E0B] bg-white"
              >
                {allDoorsOpen ? (
                  <DoorOpen className="h-9 w-9 text-[#F59E0B]" />
                ) : (
                  <Lock className="h-8 w-8 text-[#A8A29E]" />
                )}
              </motion.div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#8A91A3]">
                  {trainedDoorCount}/5 doors
                </p>
                <p className="text-base font-bold text-[#1F2430]">
                  {allDoorsOpen ? "Vowel Dojo open" : "Train vowel doors"}
                </p>
              </div>
            </div>

            <div className="absolute left-1/2 top-[50%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="rounded-full bg-white/95 px-5 py-2 text-sm font-black text-[#F59E0B] shadow-sm">
                Vowel Dojo
              </p>
              <p className="mt-2 max-w-[260px] rounded-2xl bg-white/90 px-4 py-2 text-xs font-bold leading-snug text-[#4B5266] shadow-sm">
                Choose a station to practice Milo's vowel powers.
              </p>
            </div>

            {allDoorsOpen && showUnlockNotice && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute left-1/2 top-28 z-30 w-[min(92%,520px)] -translate-x-1/2 rounded-3xl border border-white bg-white/95 px-5 py-4 shadow-[0_24px_48px_-24px_rgba(31,36,48,0.5)] sm:top-8"
              >
                <button
                  onClick={() => setShowUnlockNotice(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC] text-[#8A91A3] hover:text-[#1F2430]"
                  aria-label="Dismiss gate unlocked message"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-4 pr-8 text-left">
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 border-[#F59E0B] bg-[#FFF7ED]"
                  >
                    <DoorOpen className="h-8 w-8 text-[#F59E0B]" />
                  </motion.div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#8A91A3]">
                      Gate unlocked
                    </p>
                    <p className="text-lg font-bold text-[#1F2430]">
                      The Valley road is open.
                    </p>
                    <p className="mt-1 text-sm text-[#4B5266]">
                      You can still revisit the Dojo anytime to practice vowel powers.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="absolute inset-x-4 top-[190px] z-20 grid grid-cols-2 gap-3 sm:hidden">
              {GATE_LEVELS.map((node, index) => {
                const status = valleyStatus(node.id, completed);
                const accent = VOWEL_SECTIONS[index].accent;
                const station = VOWEL_DOJO_STATIONS[index];
                return (
                  <motion.button
                    key={`mobile-${node.id}`}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.06, ease: "easeOut" }}
                    onClick={() => status !== "locked" && onSelectLevel(node.id)}
                    disabled={status === "locked"}
                    className={`rounded-2xl border-2 bg-white/95 p-3 text-left shadow-[0_12px_26px_-20px_rgba(31,36,48,0.55)] ${
                      index === 4 ? "col-span-2 mx-auto w-1/2 min-w-[150px]" : ""
                    }`}
                    style={{ borderColor: status === "locked" ? "#D6D3D1" : accent }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 text-lg font-black ${
                          status === "locked" ? "grayscale" : ""
                        }`}
                        style={{ borderColor: status === "locked" ? "#D6D3D1" : accent, color: accent, background: "#FFF7ED" }}
                      >
                        {status === "done" ? <Check className="h-5 w-5" strokeWidth={3} /> : node.label}
                      </span>
                      <span>
                        <span className="block text-sm font-black leading-tight text-[#1F2430]">{station.name}</span>
                        <span className="block text-[11px] font-bold text-[#8A91A3]">{station.figure}</span>
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {GATE_LEVELS.map((node, index) => {
              const status = valleyStatus(node.id, completed);
              const accent = VOWEL_SECTIONS[index].accent;
              const station = VOWEL_DOJO_STATIONS[index];
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
                  className="absolute z-20 hidden w-44 -translate-x-1/2 -translate-y-1/2 text-center sm:block"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <span
                    className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border-[6px] bg-white text-4xl font-bold shadow-[0_12px_28px_-16px_rgba(31,36,48,0.5)] ${
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
                  <span className="mt-2 block rounded-2xl bg-white/95 px-3 py-2 text-sm font-bold leading-tight text-[#1F2430] shadow-sm">
                    {station.name}
                    <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-wide text-[#8A91A3]">
                      {station.figure}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-bold" style={{ color: accent }}>
                      {station.cue}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="sticky bottom-4 z-30 mt-6 rounded-2xl border border-[#1F243014] bg-white/95 p-4 shadow-[0_18px_38px_-24px_rgba(31,36,48,0.35)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#1F2430]">
                  {allDoorsOpen ? "The Vowel Dojo stays open" : `Next door: ${GATE_LEVELS[completed]?.word ?? "Valley"}`}
                </p>
                <p className="text-xs text-[#8A91A3]">
                  {allDoorsOpen ? "Practice a door again or continue to the Valley road." : "Train each vowel sound to unlock the map."}
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
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] px-4 py-2 text-sm font-bold text-white sm:w-auto"
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
  onShowVowelRoom,
}: {
  completed: number;
  onBack: () => void;
  onSelectLevel: (levelId: number) => void;
  onShowVowelRoom: () => void;
}) {
  const currentSection = sectionForProgress(completed);
  const valleyCompleted = Math.max(0, completed - GATE_LEVELS.length);
  const valleyPathReach = Math.min(VALLEY_LEVELS.length, valleyCompleted + 1);
  const recentSegmentPath =
    valleyCompleted > 1
      ? routeSegmentPath(VALLEY_LEVELS[valleyCompleted - 2], VALLEY_LEVELS[valleyCompleted - 1])
      : "";
  const recentNodeId = valleyCompleted > 0 ? VALLEY_LEVELS[valleyCompleted - 1]?.id : null;
  const focusLevelId = Math.min(completed + 1, VALLEY_TOTAL_LEVELS);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`valley-node-${focusLevelId}`)?.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusLevelId]);

  return (
    <div className="size-full bg-[#FAF7F2] overflow-auto">
      <div className="min-h-full px-4 sm:px-6 md:px-10 py-6">
        <ValleyHeader completed={completed} total={VALLEY_TOTAL_LEVELS} onBack={onBack} />

        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-x-auto rounded-[2rem] border border-[#1F243014] bg-white shadow-[0_18px_48px_-28px_rgba(31,36,48,0.35)]">
            <div
              className="relative min-w-[980px]"
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT + 140 }}
            >
              <div className="absolute inset-0 bg-[#BFC4B7]" />
              {VOWEL_SECTIONS.map((section, index) => {
                const restoredCount = sectionCompletedCount(index, completed);
                const sectionSize = section.words.length;
                const isRestored = restoredCount >= sectionSize;
                return (
                  <motion.div
                    key={`${section.vowel}-terrain`}
                    className="absolute inset-x-0 overflow-hidden transition-all duration-700"
                    animate={{ filter: restorationFilter(restoredCount, sectionSize) }}
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
                    {restoredCount < sectionSize && (
                      <div className="absolute inset-0 bg-[#2F3130] opacity-[0.22]" />
                    )}
                    {restoredCount > 0 && restoredCount < sectionSize && (
                      <div
                        className="absolute inset-y-0 left-0 bg-white/10"
                        style={{ width: `${(restoredCount / sectionSize) * 100}%` }}
                      />
                    )}
                  </motion.div>
                );
              })}

              <svg className="absolute inset-0" width={BOARD_WIDTH} height={BOARD_HEIGHT + 140} viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT + 140}`}>
                <path d={routePath(VALLEY_ROUTE_WITH_DOJO)} stroke="#F7EFE0" strokeWidth="48" strokeLinecap="round" fill="none" />
                <path d={routePath(VALLEY_ROUTE_WITH_DOJO)} stroke="#7ED957" strokeWidth="9" strokeDasharray="20 17" strokeLinecap="round" fill="none" />
                {valleyPathReach > 1 && (
                  <>
                    <motion.path
                      key={`road-underpaint-${valleyPathReach}`}
                      d={routePath(VALLEY_ROUTE_WITH_DOJO.slice(0, valleyPathReach + 1))}
                      stroke="#F59E0B"
                      strokeWidth="24"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.24"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.95, ease: "easeInOut" }}
                    />
                    <motion.path
                      key={`road-gold-${valleyPathReach}`}
                      d={routePath(VALLEY_ROUTE_WITH_DOJO.slice(0, valleyPathReach + 1))}
                      stroke="#FBBF24"
                      strokeWidth="16"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.96"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.05, ease: "easeInOut", delay: 0.04 }}
                    />
                    <motion.path
                      key={`road-spark-${valleyPathReach}`}
                      d={routePath(VALLEY_ROUTE_WITH_DOJO.slice(0, valleyPathReach + 1))}
                      stroke="#FFE8A3"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="18 18"
                      fill="none"
                      opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.12, ease: "easeInOut", delay: 0.08 }}
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
                    className="pointer-events-none absolute left-10 z-30 w-[300px] rounded-2xl border border-white bg-white px-5 py-3 shadow-[0_12px_28px_-18px_rgba(31,36,48,0.45)]"
                    style={{ top: index * SECTION_HEIGHT + 26 }}
                  >
                    <p className="text-[11px] uppercase tracking-wider text-[#8A91A3]">
                      {sectionCompletedCount(index, completed) >= section.words.length
                        ? "Restored"
                        : sectionCompletedCount(index, completed) > 0
                        ? "Restoring"
                        : "Muted region"}
                    </p>
                    <p className="text-xl font-bold leading-tight" style={{ color: section.accent }}>
                      {section.title}
                    </p>
                    <p className="mt-1 text-xs text-[#4B5266]">
                      {sectionCompletedCount(index, completed)}/{section.words.length} quests
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
                const sectionSize = VOWEL_SECTIONS[sectionIndex].words.length;
                return (
                  <span
                    key={`${icon}-${x}-${y}`}
                    className="absolute text-5xl opacity-80 transition-all duration-700"
                    style={{
                      left: x,
                      top: y,
                      filter: restorationFilter(restoredCount, sectionSize),
                    }}
                  >
                    {icon}
                  </span>
                );
              })}

              <motion.button
                type="button"
                onClick={onShowVowelRoom}
                initial={{ opacity: 0, y: 16, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ y: -5, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="group absolute z-40 w-44 -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ left: `${VOWEL_DOJO_NODE.x}%`, top: VOWEL_DOJO_NODE.y + 72 }}
                aria-label="Return to the Vowel Dojo training room"
              >
                <div className="relative rounded-[1.4rem] border-[5px] border-[#F59E0B] bg-white p-2.5 shadow-[0_18px_34px_-20px_rgba(31,36,48,0.55)]">
                  <div className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-[0_10px_20px_-14px_rgba(245,158,11,0.9)]">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-2xl font-black text-[#F59E0B]">
                    A
                  </div>
                  <p className="mt-2 text-base font-black leading-tight text-[#1F2430]">Vowel Dojo</p>
                  <p className="mt-1 text-xs font-bold text-[#B45309]">Train powers again</p>
                </div>
                <div className="pointer-events-none mx-auto mt-2 w-max max-w-[220px] rounded-xl bg-[#1F2430] px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Go back to the training room
                </div>
              </motion.button>

              {VALLEY_LEVELS.map((node) => {
                const section = VOWEL_SECTIONS[sectionIndexForLevelId(node.id)];
                const status = valleyStatus(node.id, completed);
                const isDone = status === "done";
                const isNext = status === "next";
                return (
                  <motion.button
                    key={node.id}
                    id={`valley-node-${node.id}`}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: ((node.id - 6) % 6) * 0.03, ease: "easeOut" }}
                    whileHover={status !== "locked" ? { y: -5 } : {}}
                    whileTap={status !== "locked" ? { scale: 0.96 } : {}}
                    onClick={() => status !== "locked" && onSelectLevel(node.id)}
                    disabled={status === "locked"}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{ left: `${node.x}%`, top: node.y + 72 }}
                    aria-label={`Level ${node.id}: ${node.word}`}
                  >
                    <span
                      className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[7px] bg-white text-2xl font-bold shadow-[0_14px_30px_-16px_rgba(31,36,48,0.55)] ${
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
                    <span className="mt-2 block rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-[#1F2430] shadow-sm">
                      {node.word}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-4 z-30 mt-6 rounded-2xl border border-[#1F243014] bg-white/95 p-4 shadow-[0_18px_38px_-24px_rgba(31,36,48,0.35)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#1F2430]">
                  {completed < VALLEY_TOTAL_LEVELS ? `Next: Level ${completed + 1}` : "Valley restored"}
                </p>
                <p className="text-xs text-[#8A91A3]">
                  {completed < VALLEY_TOTAL_LEVELS
                    ? `${VALLEY_LEVELS.find((node) => node.id === completed + 1)?.word ?? "Valley"} vowel power practice`
                    : "Review the Vowel Dojo or revisit completed trail levels."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onShowVowelRoom}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F59E0B]/30 bg-[#FFF7ED] px-4 py-2 text-sm font-bold text-[#B45309] hover:text-[#92400E]"
                >
                  <DoorOpen className="w-4 h-4" />
                  Vowel Dojo
                </button>
                {completed < VALLEY_TOTAL_LEVELS && (
                  <button
                    onClick={() => onSelectLevel(completed + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm text-white"
                    style={{ background: currentSection.accent }}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
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
  const completed = Math.min(completedCount, VALLEY_TOTAL_LEVELS);
  const [showRoadAfterGate, setShowRoadAfterGate] = useState(completedCount > GATE_LEVELS.length);

  if (completed < GATE_LEVELS.length || !showRoadAfterGate) {
    return (
      <VowelDoorIntro
        completed={completed}
        onBack={onBack}
        onSelectLevel={onSelectLevel}
        onRevealRoad={() => setShowRoadAfterGate(true)}
      />
    );
  }

  return (
    <ValleyRoadMap
      completed={completed}
      onBack={onBack}
      onSelectLevel={onSelectLevel}
      onShowVowelRoom={() => setShowRoadAfterGate(false)}
    />
  );
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
    <div className="size-full bg-[#FAF7F2] overflow-auto relative">
      <div className="relative z-10 min-h-full px-6 md:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1F243014] text-[#4B5266] hover:text-[#1F2430] text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#8A91A3]">
              <MapIcon className="w-3.5 h-3.5" />
              Level Map
            </span>
          </div>

          <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: stage.accent }}>
              {stage.chapter}
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[#1F2430] tracking-tight">{stage.title}</h1>
              <p className="text-[#4B5266]">
                <span style={{ color: stage.accent }}>{completed}</span>
                <span className="text-[#8A91A3]"> / {total} levels</span>
              </p>
            </div>
          </motion.div>

          <div className="bg-white rounded-2xl p-5 border border-[#1F243014] mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[#8A91A3]">Chapter progress</span>
              <span className="text-sm text-[#1F2430]">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#F2EEE6] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-1.5 rounded-full"
                style={{ background: stage.accent }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-10 border border-[#1F243014]">
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
                        status === "locked" ? "bg-[#F2EEE6] text-[#8A91A3] cursor-not-allowed" : "bg-white text-[#1F2430] cursor-pointer"
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
                      <p className={`text-sm ${status === "locked" ? "text-[#8A91A3]" : "text-[#1F2430]"}`}>Level {i + 1}</p>
                      <p className="text-xs text-[#8A91A3] mt-0.5">{node.hint}</p>
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
