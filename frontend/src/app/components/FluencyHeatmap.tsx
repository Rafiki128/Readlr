import { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, TrendingUp, Volume2, Star, AlertCircle, CheckCircle2, Zap } from "lucide-react";

type FluencyTier = "fluent" | "halting" | "syllabic" | "untested";

interface FluencyStat {
  tier: FluencyTier;
  count: number;
  percentage: number;
}

interface StageFluency {
  stageId: number;
  stageName: string;
  fluencyRate: number;
  totalWords: number;
  fluentWords: number;
  practiceWords: string[];
}

interface StudentFluencyData {
  studentId: number;
  studentName: string;
  studentAvatar: string;
  overallFluency: number;
  totalAttempts: number;
  selfCorrections: number;
  streak: number;
  stages: StageFluency[];
  recentProgress: number[];
}

const STAGE_NAMES: Record<number, string> = {
  1: "Valley of Vowels",
  2: "Blending Bridges",
  3: "CVC Kingdom",
};

interface AttemptRecord {
  wordId: number;
  sessionId: string;
  stageId: number;
  levelId: number;
  word: string;
  attemptNumber: number;
  confidence: number;
  durationMs: number;
  tier: string;
  selfCorrected: boolean;
  timestamp: string;
}

function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let expected = today;
  for (const day of sorted) {
    if (day === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else if (day < expected) {
      break;
    }
  }
  return streak;
}

function buildFluencyData(studentId: number, studentName: string, avatar: string): StudentFluencyData {
  let records: AttemptRecord[] = [];
  try {
    records = JSON.parse(localStorage.getItem("readlr_attempt_records") || "[]");
    // durationMs measured wall-clock so ratio easily exceeded 2.0× threshold.
    // Reclassify any record with good confidence (≥0.70) wrongly marked syllabic.
    records = records.map((r) =>
      r.tier === "syllabic" && r.confidence >= 0.70 ? { ...r, tier: "fluent" } : r
    );
  } catch {
    records = [];
  }

  // Fall back to demo data so the heatmap always shows something
  if (records.length === 0) {
    return {
      studentId,
      studentName,
      studentAvatar: avatar,
      overallFluency: 0,
      totalAttempts: 0,
      selfCorrections: 0,
      streak: 0,
      stages: [],
      recentProgress: [],
    };
  }

  // Per-stage aggregation — seed all stages so they always appear
  const stageMap = new Map<number, AttemptRecord[]>([[1, []], [2, []], [3, []]]);
  for (const r of records) {
    if (!stageMap.has(r.stageId)) stageMap.set(r.stageId, []);
    stageMap.get(r.stageId)!.push(r);
  }

  const stages: StageFluency[] = Array.from(stageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([stageId, stageRecords]) => {
      // Deduplicate: keep the best attempt per unique word (fluent > halting > syllabic)
      const TIER_RANK: Record<string, number> = { fluent: 2, halting: 1, syllabic: 0 };
      const bestByWord = new Map<string, AttemptRecord>();
      for (const r of stageRecords) {
        const key = r.word.toUpperCase();
        const existing = bestByWord.get(key);
        if (!existing || (TIER_RANK[r.tier] ?? 0) > (TIER_RANK[existing.tier] ?? 0)) {
          bestByWord.set(key, r);
        }
      }
      const uniqueWords = Array.from(bestByWord.values());
      const fluentWords = uniqueWords.filter((r) => r.tier === "fluent").length;
      const fluencyRate = uniqueWords.length > 0 ? Math.round((fluentWords / uniqueWords.length) * 100) : 0;
      const practiceWords = uniqueWords
        .filter((r) => r.tier !== "fluent")
        .map((r) => r.word.toUpperCase())
        .slice(0, 5);

      return {
        stageId,
        stageName: STAGE_NAMES[stageId] ?? `Stage ${stageId}`,
        fluencyRate,
        totalWords: uniqueWords.length,
        fluentWords,
        practiceWords,
      };
    });

  const overallFluency =
    stages.length > 0
      ? Math.round(stages.reduce((sum, s) => sum + s.fluencyRate, 0) / stages.length)
      : 0;

  const selfCorrections = records.filter((r) => r.selfCorrected === true).length;

  const activeDays = [...new Set(records.map((r) => r.timestamp.slice(0, 10)))];
  const streak = computeStreak(activeDays);

  // Last 8 active days fluency trend
  const byDay = new Map<string, AttemptRecord[]>();
  for (const r of records) {
    const day = r.timestamp.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }
  const recentProgress = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, dayRecords]) => {
      const fluent = dayRecords.filter((r) => r.tier === "fluent").length;
      return Math.round((fluent / dayRecords.length) * 100);
    });

  return {
    studentId,
    studentName,
    studentAvatar: avatar,
    overallFluency,
    totalAttempts: records.length,
    selfCorrections,
    streak,
    stages,
    recentProgress,
  };
}

interface FluencyHeatmapProps {
  studentId?: number;
  studentName?: string;
  studentAvatar?: string;
}

export function FluencyHeatmap({
  studentId = 1,
  studentName = "You",
  studentAvatar = "🦊",
}: FluencyHeatmapProps) {
  const [selectedStage, setSelectedStage] = useState(1);
  const data = buildFluencyData(studentId, studentName, studentAvatar);
  const currentStage = data.stages.find((s) => s.stageId === selectedStage) ?? data.stages[0];

  const getFluencyColor = (rate: number) => {
    if (rate >= 80) return "from-emerald-500 to-teal-500";
    if (rate >= 60) return "from-amber-500 to-orange-500";
    return "from-rose-500 to-red-500";
  };

  const getFluencyBgColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-50 border-emerald-200";
    if (rate >= 60) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  const getFluencyTextColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-700";
    if (rate >= 60) return "text-amber-700";
    return "text-rose-700";
  };

  if (data.totalAttempts === 0) {
    return (
      <div className="bg-card rounded-3xl p-10 shadow-xl flex flex-col items-center text-center gap-4">
        <Sparkles className="w-12 h-12 text-indigo-300" />
        <h2 className="text-2xl font-bold text-gray-800">No data yet!</h2>
        <p className="text-gray-500 max-w-sm">
          Complete some levels and your fluency progress will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 shadow-xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-800">Your Fluency Progress</h2>
        </div>
        <p className="text-sm text-gray-500">
          Track how smoothly you're reading across different stages
        </p>
      </div>

      {/* Overall Fluency Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overall fluency */}
          <div>
            <p className="text-xs text-indigo-700 font-bold uppercase tracking-wide mb-1">
              Overall Fluency
            </p>
            <p className="text-3xl font-bold text-indigo-700 mb-1">{data.overallFluency}%</p>
            <p className="text-xs text-indigo-600">across all stages</p>
          </div>

          {/* Total attempts */}
          <div>
            <p className="text-xs text-purple-700 font-bold uppercase tracking-wide mb-1">
              Total Attempts
            </p>
            <p className="text-3xl font-bold text-purple-700 mb-1">{data.totalAttempts}</p>
            <p className="text-xs text-purple-600">words practiced</p>
          </div>

          {/* Self-corrections */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
              <p className="text-xs text-amber-700 font-bold uppercase tracking-wide">Self-Corrections</p>
            </div>
            <p className="text-3xl font-bold text-amber-700 mb-1">{data.selfCorrections}</p>
            <p className="text-xs text-amber-600">great recovery!</p>
          </div>

          {/* Streak */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-orange-600 fill-orange-600" />
              <p className="text-xs text-orange-700 font-bold uppercase tracking-wide">Day Streak</p>
            </div>
            <p className="text-3xl font-bold text-orange-700 mb-1">{data.streak}</p>
            <p className="text-xs text-orange-600">keep it going!</p>
          </div>
        </div>
      </motion.div>

      {/* Progress Chart */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Your Improvement Over Time</h3>
        <div className="flex items-end justify-between gap-2 h-24 bg-gray-50 rounded-xl p-4">
          {data.recentProgress.map((rate, idx) => {
            const height = `${(rate / 100) * 80}%`;
            return (
              <motion.div
                key={idx}
                initial={{ height: "0%" }}
                animate={{ height }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500 to-indigo-400 hover:from-indigo-600 hover:to-indigo-500 transition-colors group relative"
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap transition-opacity">
                  {rate}%
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">Last 8 sessions</p>
      </div>

      {/* Stage Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Fluency by Stage</h3>
        {data.stages.length === 0 && (
          <p className="text-sm text-gray-400">No stage data yet — play some levels!</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {data.stages.map((stage) => {
            const isSelected = stage.stageId === selectedStage;
            return (
              <motion.button
                key={stage.stageId}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStage(stage.stageId)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? `border-indigo-500 bg-indigo-50`
                    : `border-gray-200 bg-card hover:border-indigo-300`
                }`}
              >
                <p className="text-sm font-bold text-gray-800 mb-2">{stage.stageName}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${stage.fluencyRate}%` }}
                      transition={{ delay: 0.1, duration: 0.6 }}
                      className={`h-full bg-gradient-to-r ${getFluencyColor(stage.fluencyRate)}`}
                    />
                  </div>
                  <span className={`text-sm font-bold ${getFluencyTextColor(stage.fluencyRate)}`}>
                    {stage.fluencyRate}%
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Current Stage Details */}
      <motion.div
        key={selectedStage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border rounded-2xl p-6 ${getFluencyBgColor(currentStage.fluencyRate)}`}
      >
        <div className="flex items-center gap-3 mb-4">
          {currentStage.fluencyRate >= 80 ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-600" />
          )}
          <div>
            <h4 className={`font-bold ${getFluencyTextColor(currentStage.fluencyRate)}`}>
              {currentStage.stageName}
            </h4>
            <p className="text-xs text-gray-600">
              {currentStage.fluentWords} of {currentStage.totalWords} words fluent
            </p>
          </div>
        </div>

        {currentStage.practiceWords.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Words to Practice:</p>
            <div className="flex flex-wrap gap-2">
              {currentStage.practiceWords.map((word) => (
                <motion.div
                  key={word}
                  whileHover={{ scale: 1.05 }}
                  className="px-3 py-1.5 bg-card/60 backdrop-blur border border-current/20 rounded-lg text-sm font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {word}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {currentStage.fluencyRate >= 80 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-3 bg-emerald-100/60 border border-emerald-300 rounded-lg"
          >
            <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              Amazing progress! You're ready for the next stage!
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Tips */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-bold text-gray-700 mb-3">Tips to Improve Your Fluency</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900">Practice Daily</p>
            <p className="text-xs text-blue-800 mt-1">Even 10 minutes a day helps build muscle memory.</p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs font-semibold text-purple-900">Speak Clearly</p>
            <p className="text-xs text-purple-800 mt-1">Enunciate each sound distinctly for better recognition.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
