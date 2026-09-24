import { motion } from "motion/react";
import { Trophy, Star, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface LevelCompleteProps {
  score: number;
  sticker?: string;
  onContinue: () => void;
}

export function LevelComplete({ score, sticker, onContinue }: LevelCompleteProps) {
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
    <div className="size-full bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-400 flex items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="bg-card rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="inline-block mb-6"
        >
          <Trophy className="w-24 h-24 text-yellow-500" />
        </motion.div>

        <h1 className="text-5xl font-bold text-purple-600 mb-4">
          Level Complete!
        </h1>

        <p className="text-2xl text-gray-700 mb-8">
          You did an amazing job! 🎉
        </p>

        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="w-8 h-8 text-yellow-500" />
            <span className="text-3xl font-bold text-purple-600">+{score} points</span>
          </div>

          {sticker && <div className="border-t-2 border-purple-200 pt-4">
            <p className="text-lg text-gray-700 mb-3 font-medium">
              New Sticker Unlocked!
            </p>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-8xl"
            >
              {sticker}
            </motion.div>
          </div>}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-4 rounded-full text-2xl font-bold shadow-lg flex items-center gap-3 mx-auto"
        >
          Continue
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    </div>
  );
}
