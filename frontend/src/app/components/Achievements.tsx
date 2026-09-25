import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import "./rewardsCollection.css";
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
  learnerId?: number | null;
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

const STAGE_TOTALS: Record<number, number> = { 1: 20, 2: 20, 3: 20 };
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

function getSoundLibraryRecordingCount(learnerId?: number | null): Promise<number> {
  if (!learnerId) return Promise.resolve(0);
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
      const prefix = `learner:${learnerId}:`;
      const countRequest = tx.objectStore(STORE_NAME).count(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
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

export function Achievements({ onBack, completedByStage = {}, learnerId }: AchievementsProps) {
  const [filter, setFilter] = useState<Category>("all");
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [soundRecordingCount, setSoundRecordingCount] = useState(0);

  useEffect(() => {
    let active = true;
    setAttempts(readAttemptRecords());
    setSoundRecordingCount(0);
    getSoundLibraryRecordingCount(learnerId).then(count => { if (active) setSoundRecordingCount(count); }).catch(() => { if (active) setSoundRecordingCount(0); });
    return () => { active = false; };
  }, [learnerId]);

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

  const [view, setView] = useState<"all" | "earned" | "next">("all");
  const shown = visible.filter(item => view === "all" || (view === "earned" ? item.unlocked : !item.unlocked));
  const next = withState.filter(item => !item.unlocked).sort((a,b) => b.progress/b.total - a.progress/a.total)[0];
  const reducedMotion = useReducedMotion();
  return <main className="rewards-page">
    <div className="rewards-inner">
      <div className="rewards-topline"><button className="rewards-back" onClick={onBack}><ArrowLeft size={17}/>Stages</button><span><Award size={17}/>My milestones</span></div>
      <header className="rewards-heading"><div><p className="rewards-eyebrow">A little braver, every day</p><h1>Achievements</h1></div><p>Every sound is a step forward.</p></header>
      <section className="rewards-overview" aria-label="Achievement summary">
        <div className="reward-medallion overview-medal"><Trophy size={40}/></div>
        <div className="rewards-count"><strong>{unlockedCount}<span> / {withState.length}</span></strong><p>badges earned</p></div>
        <div className="rewards-summary-track"><div><span>Your growing collection</span><b>{Math.round(unlockedCount / withState.length * 100)}%</b></div><progress value={unlockedCount} max={withState.length} aria-label="Badges earned"/></div>
        <div className="rewards-next"><Sparkles size={20}/><div><small>{next ? "Next within reach" : "What a journey!"}</small><b>{next?.title ?? "Every badge is yours"}</b><span>{next ? `${next.total - next.progress} more to go` : "Look how far you have come."}</span></div></div>
      </section>
      <div className="rewards-toolbar"><nav className="rewards-tabs" aria-label="Achievement status">
        {([{id:"all",label:"All badges"},{id:"earned",label:"Earned"},{id:"next",label:"Still to discover"}] as const).map(tab=><button key={tab.id} aria-pressed={view===tab.id} onClick={()=>setView(tab.id)}>{tab.label}<span>{tab.id==="all"?withState.length:tab.id==="earned"?unlockedCount:withState.length-unlockedCount}</span></button>)}
      </nav><label className="rewards-filter">Category<select value={filter} onChange={event=>setFilter(event.target.value as Category)}>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
      <div className="achievement-grid">
        {shown.map((achievement,index)=>{const Icon=achievement.icon;return <motion.article key={achievement.id} initial={reducedMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index*.025,.15)}} className={`achievement-card ${achievement.unlocked?"is-earned":"is-growing"}`} style={{"--reward-color":achievement.accent,"--reward-tint":achievement.tint} as CSSProperties}>
          <div className="achievement-card-top"><div className="reward-medallion"><Icon size={30}/></div><span className="reward-state">{achievement.unlocked?<><Check size={14}/>Earned</>:<><Lock size={13}/>Not yet</>}</span></div>
          <h2>{achievement.title}</h2><p>{achievement.description}</p>
          <div className="achievement-progress"><span>{achievement.progress} / {achievement.total}</span><span>{achievement.unlocked?"Complete":`${achievement.total-achievement.progress} to go`}</span></div>
          <progress value={achievement.progress} max={achievement.total} aria-label={`${achievement.title} progress`}/>
        </motion.article>})}
      </div>
      {shown.length===0&&<div className="rewards-empty"><Award size={38}/><h2>{view==="earned"&&unlockedCount===0?"Your first badge is waiting":"No badges in this view yet"}</h2><p>{view==="earned"&&unlockedCount===0?"Finish a lesson to begin your collection.":"Try another category to see your badges."}</p><button className="rewards-back" onClick={()=>{setFilter("all");setView("all");}}>All badges</button></div>}
    </div>
  </main>;
}
