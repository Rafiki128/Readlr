import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Star, Lock, Check, Sparkles } from "lucide-react";
import { POINT_STICKERS, getTrailPoints } from "./trailRewards";
import { STICKERS, isStickerEarned } from "./stickers";
import { AvatarFrame } from "./AvatarFrame";
import { useFrames } from "../hooks/useFrames";

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

function loadSelfCorrections(): AttemptRecord[] {
  try {
    const records: AttemptRecord[] = JSON.parse(
      localStorage.getItem("readlr_attempt_records") || "[]"
    );
    // SDD UC-06: self-corrected flag is set explicitly when attempt N failed
    // and attempt N+1 succeeded without the learner pressing Listen between them
    return records.filter((r) => r.selfCorrected === true);
  } catch {
    return [];
  }
}

interface StickerBookProps {
  onBack: () => void;
  completedByStage?: Record<number, number>;
  avatar?: string;
}

const STAGE_PAGES = [
  { id: 1, title: "Valley of Vowels" },
  { id: 2, title: "Blending Bridges" },
  { id: 3, title: "CVC Kingdom" },
];

export function StickerBook({ onBack, completedByStage = {}, avatar = "" }: StickerBookProps) {
  const { frames } = useFrames();
  const trailPoints = getTrailPoints(completedByStage[1] ?? 0);
  const nextBonus = POINT_STICKERS.find((item) => item.points > trailPoints);
  const stickers = STICKERS.map((s) => ({ ...s, earned: isStickerEarned(s, completedByStage) }));
  const earnedCount = stickers.filter((s) => s.earned).length;
  const pct = Math.round((earnedCount / stickers.length) * 100);
  const selfCorrections = useMemo(() => loadSelfCorrections(), []);

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--hairline-strong)] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <Star className="w-3.5 h-3.5 text-[#F59E0B]" />
              {earnedCount} of {stickers.length} collected
            </span>
          </div>

          {/* Title */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Collection</p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">My Sticker Book</h1>
              <p className="text-[var(--ink-soft)]">Finish a level to earn an animal friend.</p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="bg-card rounded-2xl p-5 border border-[var(--hairline)] mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Album completion</span>
              <span className="text-sm text-[var(--ink)]">
                <span className="text-[#4F46E5]">{pct}%</span>
                <span className="text-[var(--ink-muted)]"> · {stickers.length - earnedCount} to go</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--paper-deep)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-1.5 rounded-full bg-[#4F46E5]"
              />
            </div>
          </div>

          {/* One page per stage, ending with that stage's frames */}
          {STAGE_PAGES.map((page) => {
            const pageStickers = stickers.filter((s) => s.stageId === page.id);
            const pageFrames = frames.filter((f) => f.unlock_stage_number === page.id);
            const framesUnlocked = pageFrames.length > 0 && pageFrames.every((f) => f.unlocked);
            return (
              <section key={page.id} className="mb-10" aria-label={page.title}>
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h2 className="text-2xl text-[var(--ink)] tracking-tight">{page.title}</h2>
                  <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                    {pageStickers.filter((s) => s.earned).length} of {pageStickers.length}
                  </span>
                </div>
                {page.id === 1 && (
                  <p className="mb-4 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                    <Star className="h-4 w-4 text-amber-500" />
                    {trailPoints} trail points · {nextBonus ? `${nextBonus.points - trailPoints} more to unlock ${nextBonus.name}` : "every valley bonus sticker earned!"}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pageStickers.map((sticker, index) => (
                    <motion.div
                      key={sticker.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.03, ease: "easeOut" }}
                      whileHover={sticker.earned ? { y: -3 } : {}}
                      className={`bg-card rounded-2xl p-5 border transition-all ${
                        sticker.earned
                          ? "border-[var(--hairline)] hover:border-[var(--hairline-strong)] cursor-pointer"
                          : "border-[var(--hairline)] opacity-70"
                      }`}
                    >
                      <div
                        className={`aspect-square rounded-xl flex items-center justify-center mb-4 relative ${
                          sticker.earned ? "bg-[var(--paper)]" : "bg-[var(--paper-deep)]"
                        }`}
                      >
                        {sticker.earned ? (
                          <span className="text-6xl">{sticker.emoji}</span>
                        ) : (
                          <Lock className="w-7 h-7 text-[var(--ink-muted)]" />
                        )}
                        {sticker.earned && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </div>
      
                      <div>
                        <p className="text-[var(--ink)]">
                          {sticker.earned ? sticker.name : "Locked"}
                        </p>
                        <p className="text-xs text-[var(--ink-muted)] mt-0.5">{sticker.stage}</p>
                      </div>
                    </motion.div>
                  ))}
                  {pageFrames.length > 0 && (
                    <div className={`rounded-2xl p-5 border-2 border-dashed ${framesUnlocked ? "border-[#F59E0B] bg-[var(--tint-amber)]" : "border-[var(--hairline-strong)] bg-card"}`}>
                      <div className="aspect-square rounded-xl flex items-center justify-center gap-1 mb-4">
                        {pageFrames.map((frame) => (
                          <div key={frame.id} className={framesUnlocked ? "" : "opacity-40 grayscale"}>
                            <AvatarFrame assetKey={frame.asset_key} size={64}>
                              {framesUnlocked ? <span className="text-2xl">{avatar}</span> : <Lock className="w-4 h-4 text-[var(--ink-muted)]" />}
                            </AvatarFrame>
                          </div>
                        ))}
                      </div>
                      <p className="text-[var(--ink)]">{framesUnlocked ? "Stage frames unlocked!" : "Stage frames"}</p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                        {framesUnlocked ? "Wear them from your profile" : `Finish ${page.title} to unlock`}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* Footer message */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 bg-card rounded-2xl p-5 border border-[var(--hairline)] flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--tint-amber)] flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <p className="text-[var(--ink-soft)] text-sm">
              {earnedCount === stickers.length
                ? "Amazing — you've collected every sticker in the album!"
                : `Keep learning to unlock ${stickers.length - earnedCount} more stickers.`}
            </p>
          </motion.div>

          {/* Self-Correction Stars */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-xl text-[var(--ink)] tracking-tight">Self-Correction Stars</h2>
              <span className="ml-auto text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                {selfCorrections.length} earned
              </span>
            </div>

            <p className="text-xs text-[var(--ink-muted)] mb-4">
              Earned when you fix a mistake on your own — without Milo's help!
            </p>

            {selfCorrections.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 border border-[var(--hairline)] flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--tint-amber)] flex items-center justify-center">
                  <Star className="w-7 h-7 text-[#F59E0B]" />
                </div>
                <p className="text-[var(--ink)]">No stars yet</p>
                <p className="text-xs text-[var(--ink-muted)] max-w-xs">
                  When you get a word wrong and then fix it yourself on the next try, you'll earn a Self-Correction Star!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selfCorrections.map((record, index) => (
                  <motion.div
                    key={`${record.stageId}-${record.levelId}-${record.timestamp}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -3 }}
                    className="bg-gradient-to-br from-[var(--tint-amber)] to-[var(--tint-yellow)] rounded-2xl p-5 border border-[#F59E0B33] cursor-pointer"
                  >
                    <div className="aspect-square rounded-xl bg-card/60 flex items-center justify-center mb-4 relative">
                      <span className="text-5xl">⭐</span>
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </span>
                    </div>
                    <p className="text-[var(--ink)] font-medium">{record.word}</p>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      Stage {record.stageId} · Try {record.attemptNumber}
                    </p>
                    <p className="text-xs text-[#F59E0B] mt-1 font-medium">Self-Correction!</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
