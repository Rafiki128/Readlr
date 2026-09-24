import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Flame,
  Lock,
  Mic,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";

interface AchievementsProps {
  onBack: () => void;
  completedByStage?: Record<number, number>;
}

type Category = "all" | "milestone" | "mastery" | "streak" | "special";

interface AttemptRecord {
  word?: string;
  tier?: string;
  selfCorrected?: boolean;
  timestamp?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  accent: string;
  tint: string;
  progress: number;
  total: number;
  category: Exclude<Category, "all">;
}

const STAGE_TOTALS: Record<number, number> = { 1: 55, 2: 8, 3: 10 };
const DB_NAME = "readlr_sound_library";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

function readAttemptRecords(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem("readlr_attempt_records");
    const parsed = raw ? JSON.parse(raw) : [];
    const records: AttemptRecord[] = Array.isArray(parsed) ? parsed : [];
    return records.map((r) =>
      r.tier === "syllabic" && (r as any).confidence >= 0.70 ? { ...r, tier: "fluent" } : r
    );
  } catch {
    return [];
  }
}

function clampProgress(value: number, total: number) {
  return Math.max(0, Math.min(value, total));
}

function dateKey(timestamp?: string) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function longestConsecutiveDayStreak(days: string[]) {
  if (days.length === 0) return 0;

  const sorted = [...new Set(days)].sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const previous = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
    const next = new Date(`${sorted[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((next - previous) / 86400000);

    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return best;
}

function getSoundLibraryRecordingCount(): Promise<number> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onerror = () => resolve(0);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readonly");
      const countRequest = tx.objectStore(STORE_NAME).count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        resolve(0);
      };
    };
  });
}

export function Achievements({ onBack, completedByStage = {} }: AchievementsProps) {
  const [filter, setFilter] = useState<Category>("all");
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [soundRecordingCount, setSoundRecordingCount] = useState(0);

  useEffect(() => {
    setAttempts(readAttemptRecords());
    getSoundLibraryRecordingCount().then(setSoundRecordingCount);
  }, []);

  const achievements = useMemo<Achievement[]>(() => {
    const completedStage1 = clampProgress(completedByStage[1] ?? 0, STAGE_TOTALS[1]);
    const completedStage2 = clampProgress(completedByStage[2] ?? 0, STAGE_TOTALS[2]);
    const completedStage3 = clampProgress(completedByStage[3] ?? 0, STAGE_TOTALS[3]);
    const totalCompleted = completedStage1 + completedStage2 + completedStage3;

    const fluentAttempts = attempts.filter((attempt) => attempt.tier === "fluent").length;
    const selfCorrections = attempts.filter((attempt) => attempt.selfCorrected === true).length;
    const practicedWords = new Set(attempts.map((attempt) => attempt.word).filter(Boolean)).size;
    const activeDays = attempts.map((attempt) => dateKey(attempt.timestamp)).filter(Boolean) as string[];
    const activeDayCount = new Set(activeDays).size;
    const bestStreak = longestConsecutiveDayStreak(activeDays);

    return [
      {
        id: "first-steps",
        title: "First Steps",
        description: "Complete your first level.",
        icon: Trophy,
        accent: "#4F46E5",
        tint: "#EEF2FF",
        progress: totalCompleted,
        total: 1,
        category: "milestone",
      },
      {
        id: "five-doors",
        title: "Five Doors Open",
        description: "Complete the five vowel door levels.",
        icon: Star,
        accent: "#F59E0B",
        tint: "#FFF7ED",
        progress: completedStage1,
        total: 5,
        category: "mastery",
      },
      {
        id: "valley-explorer",
        title: "Valley Explorer",
        description: "Complete 10 Valley of Vowels levels.",
        icon: Sparkles,
        accent: "#F59E0B",
        tint: "#FFF7ED",
        progress: completedStage1,
        total: 10,
        category: "milestone",
      },
      {
        id: "valley-restored",
        title: "Valley Restored",
        description: "Complete every Valley of Vowels level.",
        icon: Award,
        accent: "#F59E0B",
        tint: "#FFF7ED",
        progress: completedStage1,
        total: STAGE_TOTALS[1],
        category: "mastery",
      },
      {
        id: "blend-builder",
        title: "Blend Builder",
        description: "Complete your first blending level.",
        icon: Zap,
        accent: "#4F46E5",
        tint: "#EEF2FF",
        progress: completedStage2,
        total: 1,
        category: "milestone",
      },
      {
        id: "blend-champion",
        title: "Blend Champion",
        description: "Complete all Blending Bridges levels.",
        icon: Target,
        accent: "#4F46E5",
        tint: "#EEF2FF",
        progress: completedStage2,
        total: STAGE_TOTALS[2],
        category: "mastery",
      },
      {
        id: "cvc-reader",
        title: "CVC Reader",
        description: "Complete your first CVC Kingdom word.",
        icon: BookOpen,
        accent: "#10B981",
        tint: "#D1FAE5",
        progress: completedStage3,
        total: 1,
        category: "milestone",
      },
      {
        id: "kingdom-reader",
        title: "Kingdom Reader",
        description: "Complete all CVC Kingdom levels.",
        icon: Award,
        accent: "#10B981",
        tint: "#D1FAE5",
        progress: completedStage3,
        total: STAGE_TOTALS[3],
        category: "mastery",
      },
      {
        id: "fluent-reader",
        title: "Fluent Reader",
        description: "Earn 10 fluent reading attempts.",
        icon: Volume2,
        accent: "#DB2777",
        tint: "#FCE7F3",
        progress: fluentAttempts,
        total: 10,
        category: "special",
      },
      {
        id: "self-corrector",
        title: "Self Corrector",
        description: "Fix your reading after a tricky attempt 3 times.",
        icon: Target,
        accent: "#DB2777",
        tint: "#FCE7F3",
        progress: selfCorrections,
        total: 3,
        category: "special",
      },
      {
        id: "word-collector",
        title: "Word Collector",
        description: "Practice 10 different words.",
        icon: BookOpen,
        accent: "#10B981",
        tint: "#D1FAE5",
        progress: practicedWords,
        total: 10,
        category: "special",
      },
      {
        id: "voice-library",
        title: "Voice Library",
        description: "Save 5 Sound Library recordings.",
        icon: Mic,
        accent: "#10B981",
        tint: "#D1FAE5",
        progress: soundRecordingCount,
        total: 5,
        category: "special",
      },
      {
        id: "daily-spark",
        title: "Daily Spark",
        description: "Practice on any day.",
        icon: Flame,
        accent: "#DC2626",
        tint: "#FEE2E2",
        progress: activeDayCount,
        total: 1,
        category: "streak",
      },
      {
        id: "three-day-streak",
        title: "3-Day Streak",
        description: "Practice for 3 days in a row.",
        icon: Flame,
        accent: "#DC2626",
        tint: "#FEE2E2",
        progress: bestStreak,
        total: 3,
        category: "streak",
      },
      {
        id: "week-warrior",
        title: "Week Warrior",
        description: "Practice for 7 days in a row.",
        icon: Flame,
        accent: "#DC2626",
        tint: "#FEE2E2",
        progress: bestStreak,
        total: 7,
        category: "streak",
      },
    ];
  }, [attempts, completedByStage, soundRecordingCount]);

  const categories: Array<{ id: Category; name: string; icon: typeof Trophy }> = [
    { id: "all", name: "All", icon: Award },
    { id: "milestone", name: "Milestones", icon: Trophy },
    { id: "mastery", name: "Mastery", icon: Target },
    { id: "streak", name: "Streaks", icon: Flame },
    { id: "special", name: "Special", icon: Star },
  ];

  const withState = achievements.map((achievement) => {
    const progress = clampProgress(achievement.progress, achievement.total);
    return {
      ...achievement,
      progress,
      unlocked: progress >= achievement.total,
    };
  });
  const unlockedCount = withState.filter((achievement) => achievement.unlocked).length;
  const visible = filter === "all" ? withState : withState.filter((achievement) => achievement.category === filter);

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--hairline-strong)] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
              {unlockedCount} of {withState.length} unlocked
            </span>
          </div>

          <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
            <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Recognition</p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">Achievements</h1>
              <p className="text-[var(--ink-soft)] max-w-md">
                Badges earned from levels, fluency practice, streaks, and saved voice recordings.
              </p>
            </div>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => {
              const Icon = category.icon;
              const active = filter === category.id;
              const categoryAchievements =
                category.id === "all"
                  ? withState
                  : withState.filter((achievement) => achievement.category === category.id);
              const earned = categoryAchievements.filter((achievement) => achievement.unlocked).length;

              return (
                <button
                  key={category.id}
                  onClick={() => setFilter(category.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] border-[#4F46E5] text-[#4F46E5]"
                      : "bg-card border-[var(--hairline)] text-[var(--ink-soft)] hover:border-[var(--hairline-strong)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                  <span className={`text-xs ${active ? "text-[#4F46E5]" : "text-[var(--ink-muted)]"}`}>
                    {earned}/{categoryAchievements.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((achievement, index) => {
              const Icon = achievement.icon;
              const pct = Math.round((achievement.progress / achievement.total) * 100);

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.035 }}
                  whileHover={achievement.unlocked ? { y: -3 } : {}}
                  className={`rounded-2xl p-5 border transition-colors ${
                    achievement.unlocked
                      ? "bg-card border-[var(--hairline)] hover:border-[var(--hairline-strong)]"
                      : "bg-[var(--paper-soft)] border-[#D8D2C8] grayscale-[0.2]"
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: achievement.unlocked ? achievement.tint : "#E7E2DA" }}
                    >
                      {achievement.unlocked ? (
                        <Icon className="w-6 h-6" style={{ color: achievement.accent }} />
                      ) : (
                        <Lock className="w-5 h-5 text-[var(--ink-muted)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={achievement.unlocked ? "text-[var(--ink)]" : "text-[#6B7280]"}>
                          {achievement.title}
                        </p>
                        {achievement.unlocked && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: achievement.tint, color: achievement.accent }}
                          >
                            <Check className="w-3 h-3" strokeWidth={3} />
                            Earned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">{achievement.description}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Progress</span>
                      <span className="text-xs text-[var(--ink)]">
                        {achievement.progress}<span className="text-[var(--ink-muted)]"> / {achievement.total}</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#ECE7DE] rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-1.5 rounded-full"
                        style={{ background: achievement.unlocked ? achievement.accent : "#A8A29E" }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 bg-card rounded-2xl p-6 border border-[var(--hairline)] flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <div>
              <p className="text-[var(--ink)]">Keep going</p>
              <p className="text-sm text-[var(--ink-soft)]">
                {unlockedCount === 0
                  ? "Start your journey to unlock your first achievement."
                  : unlockedCount === withState.length
                    ? "Every achievement is unlocked. Excellent work."
                    : `${withState.length - unlockedCount} more achievements to unlock.`}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
