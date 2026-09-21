/**
 * Unified Dashboard Component
 * Per-student analytics dashboard showing personal progress and fluency heatmap
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Target,
  TrendingUp,
  Award,
  Flame,
  ArrowLeft,
} from 'lucide-react';
import { FluencyHeatmap } from './FluencyHeatmap';

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

const STAGE_NAMES: Record<number, string> = {
  1: 'Valley of Vowels',
  2: 'Blending Bridges',
  3: 'CVC Kingdom',
};

function buildProgressStats() {
  let records: AttemptRecord[] = [];
  try {
    records = JSON.parse(localStorage.getItem('readlr_attempt_records') || '[]');
    // durationMs measured wall-clock (tap → ASR result) so the ratio easily exceeds
    // the 2.0× threshold even for correct, confident answers. Reclassify any record
    // where confidence was good (≥0.70) but tier was wrongly set to syllabic.
    records = records.map((r) =>
      r.tier === 'syllabic' && r.confidence >= 0.70 ? { ...r, tier: 'fluent' } : r
    );
  } catch {
    records = [];
  }

  // Word-level mastery: per unique word, take the best tier ever achieved.
  // Consistent with the Fluency tab which also measures per-word mastery.
  const wordBestTier = new Map<string, string>();
  for (const r of records) {
    const key = `${r.stageId}-${r.word}`;
    const current = wordBestTier.get(key);
    if (!current || r.tier === 'fluent' || (r.tier === 'halting' && current === 'syllabic')) {
      wordBestTier.set(key, r.tier);
    }
  }
  const uniqueWordCount = wordBestTier.size;
  const masteredWordCount = [...wordBestTier.values()].filter((t) => t === 'fluent').length;
  const pronunciationAccuracy = uniqueWordCount > 0
    ? Math.round((masteredWordCount / uniqueWordCount) * 100)
    : 0;

  const activeDays = [...new Set(records.map((r) => r.timestamp.slice(0, 10)))];
  const streak = computeStreak(activeDays);

  const totalPlayTime = Math.round(
    records.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / 60000,
  );

  // Weekly activity grouped by day-of-week (Mon=0 … Sun=6), counted as words practiced
  const weeklyWords = [0, 0, 0, 0, 0, 0, 0];
  for (const r of records) {
    const dow = (new Date(r.timestamp).getDay() + 6) % 7;
    weeklyWords[dow] += 1;
  }
  const weeklyProgress = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
    day,
    minutes: weeklyWords[i],
  }));

  // Recent activity: last 3 unique sessions sorted newest first
  const sessionMap = new Map<string, AttemptRecord[]>();
  for (const r of records) {
    if (!sessionMap.has(r.sessionId)) sessionMap.set(r.sessionId, []);
    sessionMap.get(r.sessionId)!.push(r);
  }
  const recentActivity = Array.from(sessionMap.entries())
    .sort(([, a], [, b]) => {
      const latest = (recs: AttemptRecord[]) =>
        Math.max(...recs.map((r) => new Date(r.timestamp).getTime()));
      return latest(b) - latest(a);
    })
    .slice(0, 3)
    .map(([, sessionRecords]) => {
      const fluent = sessionRecords.filter((r) => r.tier === 'fluent').length;
      const correct = sessionRecords.length; // all saved records are matched attempts
      const accuracy = Math.round((fluent / correct) * 100);
      const latestTs = sessionRecords.map((r) => r.timestamp).sort().reverse()[0];
      const date = new Date(latestTs).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const { stageId, levelId } = sessionRecords[0];
      const level = `${STAGE_NAMES[stageId] ?? `Stage ${stageId}`} - Level ${levelId}`;
      return { date, level, score: correct * 100, accuracy };
    });

  return { pronunciationAccuracy, streak, totalPlayTime, weeklyProgress, recentActivity };
}

interface UnifiedDashboardProps {
  userName?: string;
  completedByStage?: Record<number, number>;
  onBack?: () => void;
}

interface StudentStats {
  totalScore: number;
  levelsCompleted: number;
  totalLevels: number;
  pronunciationAccuracy: number;
  streak: number;
  totalPlayTime: number;
}

interface RecentActivity {
  date: string;
  level: string;
  score: number;
  accuracy: number;
}

interface WeeklyProgress {
  day: string;
  minutes: number;
}

export function UnifiedDashboard({
  userName = 'Student',
  completedByStage = {},
  onBack,
}: UnifiedDashboardProps) {
  const [activeTab, setActiveTab] = useState<'progress' | 'heatmap'>('progress');

  const stageTotals: Record<number, number> = { 1: 20, 2: 8, 3: 10 };
  const totalLevels = Object.values(stageTotals).reduce((sum, total) => sum + total, 0);
  const levelsCompleted = Object.entries(stageTotals).reduce((sum, [stageId, total]) => {
    const completed = completedByStage[Number(stageId)] ?? 0;
    return sum + Math.min(completed, total);
  }, 0);

  const { pronunciationAccuracy, streak, totalPlayTime, weeklyProgress, recentActivity } =
    buildProgressStats();

  const studentStats: StudentStats = {
    totalScore: levelsCompleted * 100,
    levelsCompleted,
    totalLevels,
    pronunciationAccuracy,
    streak,
    totalPlayTime,
  };

  const maxMinutes = Math.max(...weeklyProgress.map((d) => d.minutes), 1);
  const totalWeekMin = weeklyProgress.reduce((a, b) => a + b.minutes, 0);
  const activeDays = weeklyProgress.filter((d) => d.minutes > 0).length;

  const statCards = [
    {
      label: 'Total Score',
      value: studentStats.totalScore.toLocaleString(),
      icon: Trophy,
      tint: '#FFF7ED',
      color: '#F59E0B',
    },
    {
      label: 'Accuracy',
      value: `${studentStats.pronunciationAccuracy}%`,
      icon: Target,
      tint: '#EEF2FF',
      color: '#4F46E5',
    },
    {
      label: 'Levels',
      value: `${studentStats.levelsCompleted}/${studentStats.totalLevels}`,
      icon: Award,
      tint: '#FCE7F3',
      color: '#DB2777',
    },
    {
      label: 'Streak',
      value: `${studentStats.streak} days`,
      icon: Flame,
      tint: '#D1FAE5',
      color: '#10B981',
    },
  ];

  return (
    <div className="size-full bg-[#FAF7F2] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {onBack ? (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1F243014] text-[#4B5266] hover:text-[#1F2430] hover:border-[#1F243029] transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : <div />}
            <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
              Learning Dashboard
            </span>
            <div className="w-16" />
          </div>

          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8"
          >
            <p className="text-xs uppercase tracking-wider text-[#8A91A3] mb-2">
              Your progress
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[#1F2430] tracking-tight">
                {userName}'s Progress
              </h1>
              <p className="text-[#4B5266]">
                {totalWeekMin} words this week · {activeDays} active days
              </p>
            </div>
          </motion.div>

          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'progress'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white text-[#4B5266] border border-[#1F243014] hover:border-[#1F243029]'
              }`}
            >
              Progress
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'heatmap'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white text-[#4B5266] border border-[#1F243014] hover:border-[#1F243029]'
              }`}
            >
              Fluency
            </button>
          </div>

          {activeTab === 'progress' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {statCards.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={s.label}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05, ease: 'easeOut' }}
                      className="bg-white rounded-2xl p-5 border border-[#1F243014]"
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: s.tint }}
                        >
                          <Icon className="w-4 h-4" style={{ color: s.color }} />
                        </div>
                        <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
                          {s.label}
                        </span>
                      </div>
                      <p className="text-3xl text-[#1F2430] tracking-tight">
                        {s.value}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl p-6 border border-[#1F243014] mb-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
                    </div>
                    <h2 className="text-lg text-[#1F2430]">Weekly Activity</h2>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
                    Words Practiced
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3 h-44">
                  {weeklyProgress.map((day, index) => {
                    const h = Math.max((day.minutes / maxMinutes) * 100, 2);
                    const active = day.minutes > 0;
                    return (
                      <div
                        key={day.day}
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                      >
                        <span className="text-xs text-[#8A91A3]">
                          {day.minutes || ''}
                        </span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{
                            delay: 0.3 + index * 0.05,
                            duration: 0.6,
                            ease: 'easeOut',
                          }}
                          className="w-full rounded-md"
                          style={{
                            background: active ? '#4F46E5' : '#F2EEE6',
                            minHeight: 4,
                          }}
                        />
                        <span
                          className={`text-xs ${
                            active ? 'text-[#1F2430]' : 'text-[#8A91A3]'
                          }`}
                        >
                          {day.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="bg-white rounded-2xl p-6 border border-[#1F243014]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg text-[#1F2430]">Recent Activity</h2>
                  <span className="text-xs uppercase tracking-wider text-[#8A91A3]">
                    Last {recentActivity.length} sessions
                  </span>
                </div>

                {recentActivity.length > 0 ? (
                  <ul className="divide-y divide-[#1F243014]">
                    {recentActivity.map((activity, index) => (
                      <li
                        key={index}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
                          <div className="leading-tight">
                            <p className="text-[#1F2430]">{activity.level}</p>
                            <p className="text-xs text-[#8A91A3] mt-0.5">
                              {activity.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right leading-tight">
                          <p className="text-[#1F2430]">+{activity.score} pts</p>
                          <p className="text-xs text-[#8A91A3] mt-0.5">
                            {activity.accuracy}% accuracy
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-8 text-center text-sm text-[#8A91A3]">
                    No completed sessions yet.
                  </div>
                )}
              </motion.div>
            </>
          )}

          {activeTab === 'heatmap' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <FluencyHeatmap />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
