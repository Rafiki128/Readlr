import { motion } from "motion/react";
import { useEffect, useState } from 'react';
import { loadReadingProgress } from '../../hooks/readingCheckpoints';
import { readLocalReadingProgress } from '../../hooks/readingLocalProgress';
import { type LearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import { ChronicleHome } from './ChronicleHome';
import { readBridgeJourney } from "./stageTwoContent";
import { readCvcJourney } from "./cvcContent";
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
  TentTree,
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
  allowedStage?: number | null;
  allowedStages?: number[] | null;
  learnerId?: number | null;
  onSelectStage: (stageId: number, chapter?:number) => void;
  onViewProgress: () => void;
  onViewStickers: () => void;
  onViewPhonemeBank?: () => void;
  onViewAchievements?: () => void;
  completedByStage?: Record<number, number>;
  unlockThrough?: Record<number, number>;
  learningCampEnabled?: boolean;
  expandedKingdom?: boolean;
  onOpenLearningCamp?: () => void;
  curriculumState?:LearnerCurriculumState;
  completedBooks?:string[];
  bookOneOverride?:boolean;
}

export function StageSelection({
  allowedStage,
  allowedStages,
  unlockThrough,
  learnerId,
  onSelectStage,
  onViewProgress,
  onViewStickers,
  onViewPhonemeBank,
  onViewAchievements,
  learningCampEnabled = false,
  expandedKingdom = false,
  onOpenLearningCamp,
  curriculumState,
  completedBooks=[],
  bookOneOverride=false,
  completedByStage = { 1: 0, 2: 0, 3: 0 },
}: StageSelectionProps) {
  const [readingCompleted,setReadingCompleted]=useState<number|null>(null);
  useEffect(()=>{
    if(!expandedKingdom)return;
    const controller=new AbortController();
    void loadReadingProgress(controller.signal).then(p=>setReadingCompleted(p.completed.length)).catch(()=>setReadingCompleted(import.meta.env.DEV&&learnerId?readLocalReadingProgress(learnerId).length:null));
    return()=>controller.abort();
  },[learnerId,expandedKingdom]);
  const bridgeJourney = readBridgeJourney(learnerId);
  const bridgeCompleted = bridgeJourney.training.length + bridgeJourney.crossings.length;
  const stageDefs = [
    { id: 1, total: 20, title: "Valley of Vowels", subtitle: "Train vowel powers, hear your voice, then cross the valley road.", accent: "#F59E0B", accentSoft: "#FEF3C7", icon: <Star className="w-6 h-6" /> },
    { id: 2, total: 20, title: "Blending Bridges", subtitle: "Train sound teams, then rebuild fifteen bridges from brook to sky.", accent: "#4F46E5", accentSoft: "#EEF2FF", icon: <Zap className="w-6 h-6" /> },
    { id: 3, total: 20, title: "CVC Kingdom", subtitle: "Bring words to life and restore the Crown of Three Lights.", accent: "#10B981", accentSoft: "#D1FAE5", icon: <Crown className="w-6 h-6" /> },
  ];

  const stages: Stage[] = stageDefs.map((def, idx) => ({
    id: def.id,
    title: def.id===3&&expandedKingdom?'CVC Kingdom & Beyond':def.title,
    subtitle: def.id===3&&expandedKingdom?'Ten chapters of word games and reading checkpoints.':def.subtitle,
    icon: def.icon,
    accent: def.accent,
    accentSoft: def.accentSoft,
    completed: def.id === 3 ? expandedKingdom ? readingCompleted ?? 0 : readCvcJourney(learnerId).completed : def.id === 2 ? bridgeCompleted : completedByStage[def.id] ?? 0,
    total: def.id===3&&expandedKingdom?10:def.total,
    locked: allowedStages ? !allowedStages.includes(def.id) : allowedStage ? def.id !== allowedStage : expandedKingdom&&def.id===3 ? false : (unlockThrough?.[def.id] ?? 0) > 0 ? false : def.id === 3
      ? bridgeCompleted < 20 && (completedByStage[2] ?? 0) < 20 && readCvcJourney(learnerId).completed === 0
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

  if(expandedKingdom&&learningCampEnabled&&onOpenLearningCamp)return <ChronicleHome learnerId={learnerId} curriculumState={curriculumState} completedBooks={completedBooks} bookOneOverride={bookOneOverride} blocked={stages[2].locked} onOpenBook={index=>onSelectStage(3,index)} onOpenCamp={onOpenLearningCamp} onProgress={onViewProgress} onStickers={onViewStickers} onSounds={onViewPhonemeBank} onAchievements={onViewAchievements}/>;

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">{expandedKingdom?'Your reading journey':'Pick a stage'}</p>
              <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">
                {expandedKingdom?'Where shall we read today?':'Choose your adventure'}
              </h1>
            </div>
            <p className="text-[var(--ink-soft)] max-w-sm">
              {expandedKingdom?'Practice sounds at Camp or follow the word quest through the Kingdom. Your earlier adventures are still here.':'Three stages, one path. Start with the vowel sounds and build up to your first words.'}
            </p>
          </motion.div>

          {/* Quick actions — refined chip row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {quickActions.map(({ label, icon: Icon, onClick, tint, color }) => (
              <motion.button
                key={label}
                data-tour={label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="bg-card border border-[var(--hairline)] rounded-2xl p-4 flex items-center gap-3 hover:border-[var(--hairline-strong)] transition-all text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tint }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-[var(--ink)] text-sm md:text-base">{label}</p>
              </motion.button>
            ))}
          </div>

          {expandedKingdom && learningCampEnabled && onOpenLearningCamp && <section className="grid md:grid-cols-2 gap-4 mb-10" aria-label="Reading destinations">
            <button onClick={onOpenLearningCamp} className="min-h-40 flex flex-col items-start justify-between text-left rounded-lg border border-[#c4ded5] bg-[#e9f6f1] p-6 hover:border-[#20836d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20836d]"><TentTree className="w-8 h-8 text-[#15816c]"/><span><strong className="block text-xl font-medium text-[var(--ink)]">Learning Camp</strong><small className="block mt-1 text-[var(--ink-soft)]">Vowels, consonants, pictures, and blending. Visit any time.</small></span><span className="inline-flex gap-1.5 items-center text-[#15816c]">Practice sounds <ArrowRight className="w-4 h-4"/></span></button>
            <button data-tour="stage-3" disabled={stages[2].locked} onClick={()=>onSelectStage(3)} className="min-h-40 flex flex-col items-start justify-between text-left rounded-lg border border-[#d6c9ef] bg-[#f0eaff] p-6 hover:border-[#7f62c9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f62c9] disabled:opacity-60"><Crown className="w-8 h-8 text-[#7f62c9]"/><span><strong className="block text-xl font-medium text-[var(--ink)]">CVC Kingdom</strong><small className="block mt-1 text-[var(--ink-soft)]">Ten places to explore, from the first gate to the crown.</small></span><span className="inline-flex gap-1.5 items-center text-[#7252c4]">{readingCompleted?'Continue your quest':'Begin the word quest'} <ArrowRight className="w-4 h-4"/></span></button>
          </section>}
          {expandedKingdom&&<div className="mb-4"><h2 className="text-xl text-[var(--ink)]">Earlier adventures</h2><p className="text-sm text-[var(--ink-soft)]">Your saved vowel and blending journeys are ready to revisit.</p></div>}
          {/* Stages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stages.filter(stage=>!expandedKingdom||stage.id!==3).map((stage, index) => {
              const unknownProgress=stage.id===3&&expandedKingdom&&readingCompleted===null;
              const completed = Math.min(stage.completed, stage.total);
              const pct = Math.round((completed / stage.total) * 100);
              const progressColor = stage.locked ? "#A8A29E" : stage.accent;
              return (
                <motion.button
                  key={stage.id}
                  data-tour={`stage-${stage.id}`}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08, ease: "easeOut" }}
                  whileHover={!stage.locked ? { y: -4 } : {}}
                  whileTap={!stage.locked ? { scale: 0.99 } : {}}
                  onClick={() => !stage.locked && onSelectStage(stage.id)}
                  disabled={stage.locked}
                  className={`rounded-2xl border text-left overflow-hidden transition-all relative min-h-[284px] ${
                    stage.locked
                      ? "bg-[var(--paper-soft)] border-[#D8D2C8] cursor-not-allowed grayscale-[0.35]"
                      : "bg-card border-[var(--hairline)] cursor-pointer hover:border-[var(--hairline-strong)] hover:shadow-[0_2px_4px_rgba(31,36,48,0.05),0_18px_40px_-18px_rgba(31,36,48,0.18)]"
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
                        <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                          Stage {stage.id}
                        </span>
                        {stage.locked && (
                          <Lock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                        )}
                      </div>
                    </div>

                    <h3 className={`text-xl mb-1.5 ${stage.locked ? "text-[#6B7280]" : "text-[var(--ink)]"}`}>
                      {stage.title}
                    </h3>
                    <p className={`text-sm mb-6 ${stage.locked ? "text-[var(--ink-muted)]" : "text-[var(--ink-soft)]"}`}>
                      {stage.subtitle}
                    </p>

                    {/* Progress */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                          Progress
                        </span>
                        <span className="text-sm text-[var(--ink)]">
                          {unknownProgress?'Progress unavailable':<><span style={{ color: progressColor }}>{completed}</span><span className="text-[var(--ink-muted)]"> / {stage.total}</span></>}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--paper-deep)] rounded-full h-1.5 overflow-hidden">
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
                      <p className="text-sm text-[var(--ink-muted)] inline-flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        {allowedStages || allowedStage ? 'Not in today\'s activity' : 'Finish the previous stage to unlock'}
                      </p>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm"
                        style={{ color: stage.accent }}
                      >
                        {unknownProgress ? 'Open kingdom' : stage.completed === 0 ? "Start stage" : "Continue"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {!expandedKingdom && learningCampEnabled && onOpenLearningCamp && (
            <motion.section
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-8 overflow-hidden rounded-xl border border-[#D9D5EF] bg-white shadow-[var(--shadow-card)]"
            >
              <div className="grid md:grid-cols-[1fr_auto] items-center gap-6 p-6 md:p-8 border-l-[6px] border-[var(--accent)]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center flex-shrink-0">
                    <TentTree className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-[var(--accent)] mb-1">New reading trail</p>
                    <h2 className="text-2xl text-[var(--ink)] mb-1">Learning Camp</h2>
                    <p className="text-[var(--ink-soft)] max-w-2xl">
                        Revisit sounds and blends, then follow Milo into a growing kingdom of words.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenLearningCamp}
                  className="min-h-11 px-5 rounded-lg bg-[var(--sun)] hover:bg-[#D98208] !text-white hover:!text-white inline-flex items-center justify-center gap-2 font-semibold shadow-[0_3px_0_#B86F06]"
                >
                  Visit Camp <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
