import { motion } from "motion/react";
import { CvcKingdom } from "./CvcKingdom";
import { ArrowLeft, Check, Lock, Map as MapIcon, Star } from "lucide-react";
import { VowelAdventureMap } from "./VowelAdventureMap";
import { BlendingWorkshop } from "./BlendingWorkshop";

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

interface LevelMapProps {
  learnerId?: number | null;
  stageId: number;
  completedCount?: number;
  initialView?: "dojo" | "valley" | "bridges";
  onBack: () => void;
  onSelectLevel: (levelId: number) => void;
}

type NodeStatus = "done" | "next" | "locked";

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

function StageTwoMap(props: LevelMapProps) {
  return <BlendingWorkshop learnerId={props.learnerId} initialView={props.initialView === "bridges" ? "bridges" : "workshop"} onBack={props.onBack} />;
}

export function LevelMap(props: LevelMapProps) {
  if (props.stageId === 1) {
    return <VowelAdventureMap {...props} initialView={props.initialView === "bridges" ? "valley" : props.initialView} />;
  }

  if (props.stageId === 2) return <StageTwoMap key={props.learnerId} {...props} />;
  if (props.stageId === 3) return <CvcKingdom key={props.learnerId} learnerId={props.learnerId} onBack={props.onBack} />;

  return <StandardLevelMap {...props} />;
}
