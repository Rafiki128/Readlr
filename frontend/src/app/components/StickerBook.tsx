import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Star, Lock, Check, Sparkles } from "lucide-react";
import { TRAIL_STICKERS, POINT_STICKERS, getTrailPoints } from "./trailRewards";
import { readBridgeJourney } from "./stageTwoContent";

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
  learnerId?: number | null;
  onBack: () => void;
  completedByStage?: Record<number, number>;
}

interface Sticker {
  id: number;
  emoji: string;
  name: string;
  stage: string;
  stageId: number;
  levelId: number;
}

const STICKER_DEFS: Sticker[] = [
  { id: 1,  emoji: "🦋", name: "Butterfly", stage: "Valley of Vowels — A",  stageId: 1, levelId: 1 },
  { id: 2,  emoji: "🐝", name: "Bee",       stage: "Valley of Vowels — E",  stageId: 1, levelId: 2 },
  { id: 3,  emoji: "🐞", name: "Ladybug",   stage: "Valley of Vowels — I",  stageId: 1, levelId: 3 },
  { id: 4,  emoji: "🦉", name: "Owl",       stage: "Valley of Vowels — O",  stageId: 1, levelId: 4 },
  { id: 5,  emoji: "🦄", name: "Unicorn",   stage: "Valley of Vowels — U",  stageId: 1, levelId: 5 },
  { id: 6,  emoji: "🐸", name: "Frog",      stage: "Blending Bridges 1",    stageId: 2, levelId: 1 },
  { id: 7,  emoji: "🐢", name: "Turtle",    stage: "Blending Bridges 2",    stageId: 2, levelId: 2 },
  { id: 8,  emoji: "🦎", name: "Lizard",    stage: "Blending Bridges 3",    stageId: 2, levelId: 3 },
  { id: 9,  emoji: "🦜", name: "Parrot",    stage: "CVC Kingdom 1",         stageId: 3, levelId: 1 },
  { id: 10, emoji: "🦚", name: "Peacock",   stage: "CVC Kingdom 2",         stageId: 3, levelId: 2 },
  { id: 11, emoji: "🦁", name: "Lion",      stage: "CVC Kingdom 3",         stageId: 3, levelId: 3 },
  { id: 12, emoji: "🐯", name: "Tiger",     stage: "CVC Kingdom Final",     stageId: 3, levelId: 4 },
];

export function StickerBook({ onBack, completedByStage = {}, learnerId }: StickerBookProps) {
  const bridgeProgress = readBridgeJourney(learnerId);
  const trailPoints = getTrailPoints(completedByStage[1] ?? 0);
  const nextBonus = POINT_STICKERS.find((item) => item.points > trailPoints);
  const stickers = [...STICKER_DEFS, ...TRAIL_STICKERS].map((s) => ({
    ...s,
    earned: (completedByStage[s.stageId] ?? 0) >= s.levelId,
  })).concat(POINT_STICKERS.map((item) => ({
    id: item.id, emoji: item.emoji, name: item.name,
    stage: `${item.points} trail points`, stageId: 1, levelId: 0,
    earned: trailPoints >= item.points,
  })));

  [{name:"Bridge Builder",points:100,emoji:"🌉"},{name:"Brook Keeper",points:500,emoji:"💧"},{name:"Waterfall Explorer",points:1000,emoji:"🌈"},{name:"Sky Connector",points:1500,emoji:"☁️"}].forEach((reward,index)=> {
    stickers.push({ id:2001+index, emoji:reward.emoji, name:reward.name, stage:`Blending Bridges - ${reward.points} bridge points`, stageId:2, levelId:0, earned:bridgeProgress.points>=reward.points });
  });
  const earnedCount = stickers.filter((s) => s.earned).length;
  const pct = Math.round((earnedCount / stickers.length) * 100);
  const selfCorrections = useMemo(() => loadSelfCorrections(), []);

  return (
    <div className="size-full bg-[#FAF7F2] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1F243014] text-[#4B5266] hover:text-[#1F2430] hover:border-[#1F243029] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#8A91A3]">
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
            <p className="text-xs uppercase tracking-wider text-[#8A91A3] mb-2">Collection</p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[#1F2430] tracking-tight">My Sticker Book</h1>
              <p className="text-[#4B5266]">Finish a level to earn an animal friend.</p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="bg-white rounded-2xl p-5 border border-[#1F243014] mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[#8A91A3]">Album completion</span>
              <span className="text-sm text-[#1F2430]">
                <span className="text-[#4F46E5]">{pct}%</span>
                <span className="text-[#8A91A3]"> · {stickers.length - earnedCount} to go</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#F2EEE6] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-1.5 rounded-full bg-[#4F46E5]"
              />
            </div>
          </div>

          {/* Sticker grid */}
          <section className="mb-8 border-y border-amber-200 py-5" aria-label="Trail points">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Star className="h-5 w-5 text-amber-500" />{trailPoints} trail points</h2>
            <p className="mt-2 text-sm text-[#4B5266]">{nextBonus ? `${nextBonus.points - trailPoints} more points to unlock ${nextBonus.name}.` : "You earned every valley bonus sticker!"}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {POINT_STICKERS.map((bonus) => (
                <div key={bonus.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${trailPoints >= bonus.points ? "bg-[#FFF0C2]" : "bg-[#ECEEF2] grayscale"}`} aria-hidden="true">{bonus.emoji}</span>
                  <span className="text-sm font-bold text-[#4B5266]">{bonus.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[#707789]">{trailPoints >= bonus.points ? <><Check className="h-3 w-3" />Collected</> : `${bonus.points.toLocaleString()} points`}</span>
                </div>
              ))}
            </div>
          </section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stickers.map((sticker, index) => (
              <motion.div
                key={sticker.id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.03, ease: "easeOut" }}
                whileHover={sticker.earned ? { y: -3 } : {}}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  sticker.earned
                    ? "border-[#1F243014] hover:border-[#1F243029] cursor-pointer"
                    : "border-[#1F243014] opacity-70"
                }`}
              >
                <div
                  className={`aspect-square rounded-xl flex items-center justify-center mb-4 relative ${
                    sticker.earned ? "bg-[#FAF7F2]" : "bg-[#F2EEE6]"
                  }`}
                >
                  {sticker.earned ? (
                    <span className="text-6xl">{sticker.emoji}</span>
                  ) : (
                    <Lock className="w-7 h-7 text-[#8A91A3]" />
                  )}
                  {sticker.earned && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-[#1F2430]">
                    {sticker.earned ? sticker.name : "Locked"}
                  </p>
                  <p className="text-xs text-[#8A91A3] mt-0.5">{sticker.stage}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer message */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 bg-white rounded-2xl p-5 border border-[#1F243014] flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <p className="text-[#4B5266] text-sm">
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
              <h2 className="text-xl text-[#1F2430] tracking-tight">Self-Correction Stars</h2>
              <span className="ml-auto text-xs uppercase tracking-wider text-[#8A91A3]">
                {selfCorrections.length} earned
              </span>
            </div>

            <p className="text-xs text-[#8A91A3] mb-4">
              Earned when you fix a mistake on your own — without Milo's help!
            </p>

            {selfCorrections.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-[#1F243014] flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-[#FFF7ED] flex items-center justify-center">
                  <Star className="w-7 h-7 text-[#F59E0B]" />
                </div>
                <p className="text-[#1F2430]">No stars yet</p>
                <p className="text-xs text-[#8A91A3] max-w-xs">
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
                    className="bg-gradient-to-br from-[#FFF7ED] to-[#FEF3C7] rounded-2xl p-5 border border-[#F59E0B33] cursor-pointer"
                  >
                    <div className="aspect-square rounded-xl bg-white/60 flex items-center justify-center mb-4 relative">
                      <span className="text-5xl">⭐</span>
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </span>
                    </div>
                    <p className="text-[#1F2430] font-medium">{record.word}</p>
                    <p className="text-xs text-[#8A91A3] mt-0.5">
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
