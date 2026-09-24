import { useEffect } from "react";
import { ArrowRight, BookOpen, Star, Check, Flag, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import type { TrailReward } from "./trailRewards";
import { POINT_STICKERS } from "./trailRewards";
import type { StickerReward } from "./stickers";
import { useAudioManager } from "../../hooks/useAudioManager";
import "./trailReward.css";

// Placeholder cheer until a dedicated sticker line is recorded.
const STICKER_SOUND = "/audio/common/GreatJob.wav";

// Shows a trail reward with its points, or any other newly earned sticker on its own.
export function TrailRewardDialog({ reward, onClose, onBook }: {
  reward: TrailReward | StickerReward; onClose: () => void; onBook: () => void;
}) {
  const trail = "totalPoints" in reward ? reward : null;
  const isNew = !trail || trail.earnedPoints > 0;
  const next = trail && POINT_STICKERS.find((item) => item.points > trail.totalPoints);
  const reducedMotion = useReducedMotion();
  const previousMilestone = next ? next.points - 500 : 1000;
  const progress = trail ? Math.min(100, ((trail.totalPoints - previousMilestone) / 500) * 100) : 0;
  const { playAudio } = useAudioManager();

  // Trail levels already cheer before this dialog opens, so only other stickers play the sound.
  useEffect(() => {
    if (!trail) playAudio(STICKER_SOUND);
  }, []);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="trail-reward">
        <header className="trail-reward__header">
          <p className="trail-reward__eyebrow"><Flag size={15} />{trail ? "Trail complete" : "Sticker earned"}</p>
          <DialogTitle className="trail-reward__title">{isNew ? "A new friend joins you!" : "You did it again!"}</DialogTitle>
          <DialogDescription className="trail-reward__description">{isNew ? `Your voice helped Milo along the ${trail ? "trail" : "way"}.` : "Thanks for helping Milo practice."}</DialogDescription>
        </header>

        <section className="trail-reward__reveal" aria-label="Your sticker reward">
          <Sparkles className="trail-reward__spark trail-reward__spark--left" aria-hidden="true" />
          <Star className="trail-reward__spark trail-reward__spark--right" aria-hidden="true" />
          <motion.div
            className="trail-reward__sticker"
            initial={reducedMotion ? false : { scale: 0.65, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: -5, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 17, delay: 0.12 }}
          >
            <span role="img" aria-label={reward.sticker.name}>{reward.sticker.emoji}</span>
            <span className="trail-reward__seal" aria-label="Collected"><Check size={19} strokeWidth={3} /></span>
          </motion.div>
          <h2 className="trail-reward__name">{reward.sticker.name}</h2>
          <p className="trail-reward__saved"><BookOpen size={14} />{isNew ? "Added to your sticker book" : "Already in your sticker book"}</p>
        </section>

        <div className="trail-reward__details">
          {trail && <div className="trail-reward__points">
            <span className="trail-reward__point-icon"><Star size={24} fill="currentColor" /></span>
            <div><strong>{trail.earnedPoints ? `+${trail.earnedPoints}` : "Great practice!"}</strong><span>{trail.earnedPoints ? "trail points" : "Your points are safe"}</span></div>
            <div className="trail-reward__total"><strong>{trail.totalPoints.toLocaleString()}</strong><span>points collected</span></div>
          </div>}
          {reward.bonuses.map((bonus) => <p key={bonus.id} className="trail-reward__bonus"><span aria-hidden="true">{bonus.emoji}</span><span>Bonus sticker unlocked!<strong>{bonus.name}</strong></span><Sparkles size={20} /></p>)}
          {trail && <div className="trail-reward__milestone">
            <p>{next ? <>Next friend: <strong>{next.name}</strong></> : <strong>Every bonus friend collected!</strong>}<span aria-hidden="true">{next?.emoji ?? "\u{1F451}"}</span></p>
            <div className="trail-reward__meter" role="progressbar" aria-label="Next bonus sticker" aria-valuemin={0} aria-valuemax={500} aria-valuenow={Math.min(500, trail.totalPoints - previousMilestone)}><motion.div initial={false} animate={{ width: `${progress}%` }} transition={{ duration: reducedMotion ? 0 : 0.6 }} /></div>
            <p className="trail-reward__remaining">{next ? `${next.points - trail.totalPoints} more points to meet them` : "Milo's valley is full of friends."}</p>
          </div>}
          <footer className="trail-reward__actions">
            <button onClick={onClose} className="trail-reward__continue">Continue adventure <ArrowRight size={20} /></button>
            <button onClick={onBook} className="trail-reward__book"><BookOpen size={18} />My Sticker Book</button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
