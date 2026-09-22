import { motion } from "motion/react";
import { readBridgeJourney } from "./stageTwoContent";
import {
  Crown,
  Zap,
  Star,
  Trophy,
  Book,
  Library,
  Award,
  ArrowRight,
  Lock,
} from "lucide-react";

interface Stage {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string; // hex
  accentSoft: string; // hex
  completed: number;
  total: number;
  locked: boolean;
}

interface StageSelectionProps {
  learnerId?: number | null;
  onSelectStage: (stageId: number) => void;
  onViewProgress: () => void;
  onViewStickers: () => void;
  onViewPhonemeBank?: () => void;
  onViewAchievements?: () => void;
  completedByStage?: Record<number, number>;
}

export function StageSelection({
  learnerId,
  onSelectStage,
  onViewProgress,
  onViewStickers,
  onViewPhonemeBank,
  onViewAchievements,
  completedByStage = { 1: 0, 2: 0, 3: 0 },
}: StageSelectionProps) {
  const bridgeJourney = readBridgeJourney(learnerId);
  const bridgeCompleted = bridgeJourney.training.length + bridgeJourney.crossings.length;
  const stageDefs = [
    { id: 1, total: 20, title: "Valley of Vowels", subtitle: "Train vowel powers, hear your voice, then cross the valley road.", accent: "#F59E0B", accentSoft: "#FEF3C7", icon: <Star className="w-6 h-6" /> },
    { id: 2, total: 20, title: "Blending Bridges", subtitle: "Train sound teams, then rebuild fifteen bridges from brook to sky.", accent: "#4F46E5", accentSoft: "#EEF2FF", icon: <Zap className="w-6 h-6" /> },
    { id: 3, total: 10, title: "CVC Kingdom", subtitle: "Read your first whole words.", accent: "#10B981", accentSoft: "#D1FAE5", icon: <Crown className="w-6 h-6" /> },
  ];

  const stages: Stage[] = stageDefs.map((def, idx) => ({
    id: def.id,
    title: def.title,
    subtitle: def.subtitle,
    icon: def.icon,
    accent: def.accent,
    accentSoft: def.accentSoft,
    completed: def.id === 2 ? bridgeCompleted : completedByStage[def.id] ?? 0,
    total: def.total,
    locked: def.id === 3
      ? bridgeCompleted < 20 && (completedByStage[2] ?? 0) < 8 && (completedByStage[3] ?? 0) === 0
      : idx > 0 && (completedByStage[idx] ?? 0) < stageDefs[idx - 1].total,
  }));

  const quickActions = [
    { label: "My Progress", icon: Trophy, onClick: onViewProgress, tint: "#EEF2FF", color: "#4F46E5" },
    { label: "Sticker Book", icon: Book, onClick: onViewStickers, tint: "#FFF7ED", color: "#F59E0B" },
    onViewPhonemeBank && {
      label: "Sound Library",
      icon: Library,
      onClick: onViewPhonemeBank,
      tint: "#D1FAE5",
      color: "#10B981",
    },
    onViewAchievements && {
      label: "Achievements",
      icon: Award,
      onClick: onViewAchievements,
      tint: "#FCE7F3",
      color: "#DB2777",
    },
  ].filter(Boolean) as Array<{
    label: string;
    icon: typeof Trophy;
    onClick: () => void;
    tint: string;
    color: string;
  }>;

  return (
    <div className="size-full bg-[#FAF7F2] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-[#8A91A3] mb-2">
                Pick a stage
              </p>
              <h1 className="text-4xl md:text-5xl text-[#1F2430] tracking-tight">
                Choose your adventure
              </h1>
            </div>
            <p className="text-[#4B5266] max-w-sm">
              Three stages, one path. Start with the vowel sounds and build up to your first words.
            </p>
          </motion.div>

          {/* Quick actions — refined chip row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {quickActions.map(({ label, icon: Icon, onClick, tint, color }) => (
              <motion.button
                key={label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="bg-white border border-[#1F243014] rounded-2xl p-4 flex items-center gap-3 hover:border-[#1F243029] transition-all text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tint }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-[#1F2430] text-sm md:text-base">{label}</p>
              </motion.button>
            ))}
          </div>

          {/* Stages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stages.map((stage, index) => {
              const completed = Math.min(stage.completed, stage.total);
              const pct = Math.round((completed / stage.total) * 100);
              const progressColor = stage.locked ? "#A8A29E" : stage.accent;
              return (
                <motion.button
                  key={stage.id}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08, ease: "easeOut" }}
                  whileHover={!stage.locked ? { y: -4 } : {}}
                  whileTap={!stage.locked ? { scale: 0.99 } : {}}
                  onClick={() => !stage.locked && onSelectStage(stage.id)}
                  disabled={stage.locked}
                  className={`rounded-2xl border text-left overflow-hidden transition-all relative min-h-[284px] ${
                    stage.locked
                      ? "bg-[#F6F3EE] border-[#D8D2C8] cursor-not-allowed grayscale-[0.35]"
                      : "bg-white border-[#1F243014] cursor-pointer hover:border-[#1F243029] hover:shadow-[0_2px_4px_rgba(31,36,48,0.05),0_18px_40px_-18px_rgba(31,36,48,0.18)]"
                  }`}
                >
                  {/* Top color band — single solid color, not a gradient */}
                  <div
                    className="absolute inset-x-0 top-0 z-20 h-1.5"
                    style={{ background: stage.locked ? "#BDB7AE" : stage.accent }}
                  />
                  <div className="relative z-10 p-6 pt-8">
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: stage.locked ? "#E7E2DA" : stage.accentSoft,
                          color: progressColor,
                        }}
                      >
                        {stage.icon}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
                          Stage {stage.id}
                        </span>
                        {stage.locked && (
                          <Lock className="w-3.5 h-3.5 text-[#8A91A3]" />
                        )}
                      </div>
                    </div>

                    <h3 className={`text-xl mb-1.5 ${stage.locked ? "text-[#6B7280]" : "text-[#1F2430]"}`}>
                      {stage.title}
                    </h3>
                    <p className={`text-sm mb-6 ${stage.locked ? "text-[#8A91A3]" : "text-[#4B5266]"}`}>
                      {stage.subtitle}
                    </p>

                    {/* Progress */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
                          Progress
                        </span>
                        <span className="text-sm text-[#1F2430]">
                          <span style={{ color: progressColor }}>{completed}</span>
                          <span className="text-[#8A91A3]"> / {stage.total}</span>
                        </span>
                      </div>
                      <div className="w-full bg-[#F2EEE6] rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + index * 0.08, duration: 0.7, ease: "easeOut" }}
                          className="h-1.5 rounded-full"
                          style={{ background: progressColor }}
                        />
                      </div>
                    </div>

                    {/* CTA */}
                    {stage.locked ? (
                      <p className="text-sm text-[#8A91A3] inline-flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Finish the previous stage to unlock
                      </p>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm"
                        style={{ color: stage.accent }}
                      >
                        {stage.completed === 0 ? "Start stage" : "Continue"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
