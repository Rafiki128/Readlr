import { useEffect } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Shield, Sparkles } from "lucide-react";

type VowelKey = "A" | "E" | "I" | "O" | "U";

interface VowelPowerCompleteProps {
  levelId: number;
  onContinue: () => void;
  onBackToMap: () => void;
}

const POWER_REWARDS: Record<VowelKey, {
  sound: string;
  name: string;
  title: string;
  description: string;
  advantage: string;
  accent: string;
  tint: string;
}> = {
  A: {
    sound: "/a/",
    name: "A Armor",
    title: "Milo gained A Armor",
    description: "Your open /a/ sound forged a strong power for Milo.",
    advantage: "Now Milo can push open heavy valley gates and clear blocked paths.",
    accent: "#F59E0B",
    tint: "#FFF7ED",
  },
  E: {
    sound: "/e/",
    name: "E Echo",
    title: "Milo gained E Echo",
    description: "Your quick /e/ sound gave Milo a bright listening power.",
    advantage: "Now Milo can light tiny hidden marks and find safer trails.",
    accent: "#EC4899",
    tint: "#FCE7F3",
  },
  I: {
    sound: "/i/",
    name: "I Insight",
    title: "Milo gained I Insight",
    description: "Your short /i/ sound sharpened Milo's focus.",
    advantage: "Now Milo can reveal missing map lines and spot small clues.",
    accent: "#06B6D4",
    tint: "#CFFAFE",
  },
  O: {
    sound: "/o/",
    name: "O Orb",
    title: "Milo gained O Orb",
    description: "Your round /o/ sound woke a rolling valley power.",
    advantage: "Now Milo can open round gates and move rolling stones.",
    accent: "#8B5CF6",
    tint: "#EDE9FE",
  },
  U: {
    sound: "/u/",
    name: "U Uplift",
    title: "Milo gained U Uplift",
    description: "Your soft /u/ sound lifted Milo's path forward.",
    advantage: "Now Milo can raise sunken bridges and shield rainy trails.",
    accent: "#10B981",
    tint: "#D1FAE5",
  },
};

const VOWELS: VowelKey[] = ["A", "E", "I", "O", "U"];

export function VowelPowerComplete({ levelId, onContinue, onBackToMap }: VowelPowerCompleteProps) {
  const vowel = VOWELS[Math.max(0, Math.min(levelId - 1, VOWELS.length - 1))];
  const reward = POWER_REWARDS[vowel];

  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.55 },
      colors: [reward.accent, "#FFFFFF", "#FCD34D"],
    });
  }, [reward.accent]);

  return (
    <div className="size-full overflow-hidden bg-[#FAF7F2] relative">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-70" style={{ background: reward.tint }} />
      <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#EEF2FF] opacity-50" />

      <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:px-6">
        <button
          onClick={onBackToMap}
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-xl border border-[#1F243014] bg-white px-3 py-2 text-sm text-[#4B5266] transition-colors hover:text-[#1F2430]"
        >
          <ArrowLeft className="h-4 w-4" />
          Map
        </button>

        <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center pt-10">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full rounded-3xl border border-[#1F243014] bg-white p-5 text-center shadow-[0_24px_60px_-36px_rgba(31,36,48,0.45)] sm:p-8"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A91A3]">Vowel Power Gained</p>

            <motion.div
              animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mt-5 flex h-28 w-28 items-center justify-center rounded-[2rem] border-4 bg-white text-6xl font-black shadow-[0_18px_42px_-28px_rgba(31,36,48,0.55)]"
              style={{ borderColor: reward.accent, color: reward.accent, background: reward.tint }}
            >
              {vowel}
            </motion.div>

            <h1 className="mt-5 text-3xl font-bold text-[#1F2430] sm:text-4xl">{reward.title}</h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#4B5266]">
              {reward.description}
            </p>

            <div className="mx-auto mt-5 grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl p-4 text-left" style={{ background: reward.tint }}>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white" style={{ color: reward.accent }}>
                  <Shield className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-[#1F2430]">{reward.name}</p>
                <p className="mt-1 text-sm text-[#4B5266]">Powered by the {reward.sound} sound you practiced.</p>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-4 text-left">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white" style={{ color: reward.accent }}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-[#1F2430]">Milo's advantage</p>
                <p className="mt-1 text-sm text-[#4B5266]">{reward.advantage}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onBackToMap}
                className="flex-1 rounded-2xl border-2 border-[#1F243014] bg-white px-4 py-3 text-sm font-bold text-[#4B5266] transition-colors hover:text-[#1F2430]"
              >
                Back to Map
              </button>
              <button
                onClick={onContinue}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
                style={{ background: reward.accent }}
              >
                Help Milo Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
