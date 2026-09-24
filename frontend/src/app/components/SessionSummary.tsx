import { motion } from "motion/react";
import { Trophy, Target, TrendingUp, Star, ArrowRight } from "lucide-react";

interface SessionSummaryProps {
  levelsCompleted: number;
  totalScore: number;
  accuracy: number;
  stickersEarned: number;
  timeSpent: number;
  nextLevel: string;
  onContinue: () => void;
}

export function SessionSummary({
  levelsCompleted,
  totalScore,
  accuracy,
  stickersEarned,
  timeSpent,
  nextLevel,
  onContinue,
}: SessionSummaryProps) {
  return (
    <div className="size-full bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 flex items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-3xl p-8 max-w-3xl w-full shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block mb-4"
          >
            <Trophy className="w-16 h-16 text-yellow-500" />
          </motion.div>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">
            Session Complete!
          </h1>
          <p className="text-xl text-gray-600">
            Great learning today! Here's what you achieved:
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-4 text-center"
          >
            <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{totalScore}</p>
            <p className="text-sm text-blue-600">Points Earned</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-4 text-center"
          >
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{accuracy}%</p>
            <p className="text-sm text-green-600">Accuracy</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-4 text-center"
          >
            <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-700">{stickersEarned}</p>
            <p className="text-sm text-purple-600">New Stickers</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-4 text-center"
          >
            <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-700">{levelsCompleted}</p>
            <p className="text-sm text-orange-600">Levels Done</p>
          </motion.div>
        </div>

        {/* Time Spent */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Time Learning Today</p>
              <p className="text-3xl font-bold text-indigo-600">{timeSpent} minutes</p>
            </div>
            <div className="text-6xl">⏱️</div>
          </div>
        </motion.div>

        {/* Next Level Preview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 mb-8"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-2">Coming Next:</h3>
          <p className="text-xl text-gray-700 mb-3">{nextLevel}</p>
          <p className="text-sm text-gray-600">
            💡 Come back tomorrow to continue your adventure!
          </p>
        </motion.div>

        {/* Continue Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full text-xl font-bold shadow-lg flex items-center justify-center gap-3"
        >
          Back to Stages
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    </div>
  );
}
