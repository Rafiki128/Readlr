import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

interface LandingProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function Landing({ onGetStarted, onSignIn }: LandingProps) {
  return (
    <div className="size-full bg-[var(--paper)] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--accent-soft)] opacity-70" />
      <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[var(--tint-yellow)] opacity-60" />
      <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-[#FB7185]" />
      <div className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-[#10B981]" />

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center relative z-10 max-w-2xl w-full flex-1 flex flex-col items-center justify-center"
      >
        <div className="mb-8">
          <img
            src="/readlr-mark.svg"
            alt="Readlr"
            className="w-24 h-24 rounded-3xl mx-auto mb-6 shadow-[0_18px_40px_-18px_rgba(79,70,229,0.6)]"
          />
          <h1 className="text-5xl md:text-6xl text-[var(--ink)] mb-3 tracking-tight font-bold">Readlr</h1>
          <p className="text-lg text-[var(--ink-soft)] max-w-xl mx-auto">
            A gamified phonetics companion that helps Grade 1 learners read English with confidence.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <motion.button
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGetStarted}
            className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-semibold py-3 px-8 rounded-2xl inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.6)] hover:shadow-[0_12px_32px_-10px_rgba(79,70,229,0.8)] transition-all"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSignIn}
            className="border-2 border-[#4F46E5] text-[#4F46E5] font-semibold py-3 px-8 rounded-2xl hover:bg-[var(--accent-soft)] transition-all"
          >
            Already have an account? Sign In
          </motion.button>
        </div>
      </motion.div>

      <div className="mt-auto flex items-center gap-3 text-xs text-[var(--ink-muted)]">
        <span>© 2026 Readlr</span>
        <span className="w-1 h-1 rounded-full bg-[var(--ink-muted)]" />
        <span>All Rights Reserved</span>
      </div>
    </div>
  );
}
