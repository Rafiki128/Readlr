import { motion } from "motion/react";
import { Trophy, Star, ArrowRight, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ChapterCelebrationProps {
  sticker: string;
  score: number;
  currentLevel: number;
  totalLevels: number;
  stageName: string;
  onContinueStory: () => void;
  onBackToMap: () => void;
}

export function ChapterCelebration({
  sticker,
  score,
  currentLevel,
  totalLevels,
  stageName,
  onContinueStory,
  onBackToMap,
}: ChapterCelebrationProps) {
  const remainingLevels = totalLevels - currentLevel;
  const isLastLevel = currentLevel === totalLevels;

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
    });

    const interval = setInterval(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="size-full bg-[var(--paper)] overflow-hidden relative flex flex-col">
      {/* Soft scenery accents */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-60" style={{ background: "#FFF7ED" }} />
      <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-[var(--accent-soft)] opacity-50" />

      <div className="relative z-10 flex-1 flex flex-col px-3 sm:px-6 md:px-10 py-4 sm:py-6">
        <div className="max-w-2xl mx-auto w-full flex flex-col h-full justify-between">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Chapter Complete</span>
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="flex-1 flex flex-col justify-center bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-xl border border-[var(--hairline)]"
          >
            {/* Trophy animation */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex justify-center mb-3 sm:mb-4"
            >
              <Trophy className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" style={{ color: "#F59E0B" }} />
            </motion.div>

            {/* Congratulations */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-[var(--ink)] mb-1 sm:mb-2"
            >
              Fantastic!
            </motion.h1>

            {/* Progress message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-sm sm:text-base md:text-lg text-[var(--ink-soft)] mb-4 sm:mb-6"
            >
              {isLastLevel ? (
                <span>
                  You've completed <span className="font-bold text-[#F59E0B]">{stageName}</span>! Amazing work! 🎉
                </span>
              ) : (
                <span>
                  You're one step closer! <span className="font-bold text-[#F59E0B]">{remainingLevels} more door{remainingLevels !== 1 ? "s" : ""} to go</span>
                </span>
              )}
            </motion.p>

            {/* Score and sticker section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-[var(--tint-amber)] to-[var(--tint-yellow)] rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-[#F59E0B]/20"
            >
              {/* Score */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-8">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3 }}>
                  <Star className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#F59E0B]" />
                </motion.div>
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--ink)]">+{score} points</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#F59E0B]/20 mb-4 sm:mb-8" />

              {/* Sticker */}
              <div className="text-center">
                <p className="text-xs sm:text-sm uppercase tracking-wider text-[var(--ink-muted)] mb-3 sm:mb-4 font-medium">
                  New Sticker Unlocked
                </p>
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, type: "spring" }}
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-9xl inline-block"
                >
                  {sticker}
                </motion.div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full mt-auto"
            >
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onBackToMap}
                className="flex-1 px-3 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[var(--ink-soft)] bg-card border-2 border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Back to Chapter Map</span><span className="sm:hidden">Back</span>
              </motion.button>

              {!isLastLevel && (
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onContinueStory}
                  className="flex-1 px-3 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                  style={{
                    boxShadow: "0 10px 28px -14px rgba(245, 158, 11, 0.6)",
                  }}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              )}
            </motion.div>

            {isLastLevel && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center text-xs sm:text-sm text-[var(--ink-muted)] mt-4 sm:mt-6"
              >
                You've mastered this chapter! Return to explore the next adventure.
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
