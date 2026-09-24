import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowRight, Check, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { AvatarFrame } from "./AvatarFrame";
import { useFrames } from "../hooks/useFrames";

export interface UnlockedFrame { id: number; name: string; asset_key: string }

// Full-screen celebration for finishing a stage that lets the learner wear a newly unlocked frame.
export function StageCompleteDialog({ stageTitle, frames, avatar, onClose }: {
  stageTitle: string; frames: UnlockedFrame[]; avatar: string; onClose: () => void;
}) {
  const { equipFrame } = useFrames();
  const [worn, setWorn] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) confetti({ particleCount: 160, spread: 100, origin: { y: 0.35 } });
  }, [reducedMotion]);

  const wear = async (frameId: number) => {
    const ok = await equipFrame(frameId);
    setFailed(!ok);
    if (ok) setWorn(frameId);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="top-0 left-0 translate-x-0 translate-y-0 h-[100dvh] w-screen max-w-none sm:max-w-none rounded-none border-0 bg-[var(--paper)] overflow-y-auto content-center justify-items-center gap-6 p-6">
        <motion.div
          initial={reducedMotion ? false : { scale: 0.6, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="w-20 h-20 rounded-full bg-[var(--tint-amber)] flex items-center justify-center"
        >
          <Trophy className="w-10 h-10 text-[#F59E0B]" />
        </motion.div>
        <div className="text-center max-w-md">
          <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Stage complete</p>
          <DialogTitle className="text-3xl md:text-4xl font-extrabold leading-tight text-[var(--ink)]">You finished {stageTitle}!</DialogTitle>
          <DialogDescription className="mt-3 text-[var(--ink-soft)]">
            You unlocked {frames.length === 1 ? "a new frame" : "new frames"} for your picture. Pick one to wear!
          </DialogDescription>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {frames.map((frame, index) => (
            <motion.div
              key={frame.id}
              initial={reducedMotion ? false : { y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 + index * 0.15 }}
              className="flex flex-col items-center gap-3"
            >
              <AvatarFrame assetKey={frame.asset_key} size={132}>
                <span className="text-5xl">{avatar}</span>
              </AvatarFrame>
              <p className="font-bold text-[var(--ink)]">{frame.name}</p>
              <button
                onClick={() => void wear(frame.id)}
                disabled={worn === frame.id}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#4F46E5] text-[#4F46E5] font-bold disabled:bg-[#4F46E5] disabled:text-white"
              >
                {worn === frame.id ? <><Check className="w-4 h-4" />Wearing it</> : "Wear this frame"}
              </button>
            </motion.div>
          ))}
        </div>
        {failed && <p role="alert" className="text-sm text-[#B91C1C]">Could not change your frame. You can pick it later in your profile.</p>}
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#F59E0B] text-white text-lg font-bold shadow-md"
        >
          Keep going <ArrowRight className="w-5 h-5" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
