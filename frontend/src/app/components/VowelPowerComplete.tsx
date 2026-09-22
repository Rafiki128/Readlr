import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { VowelPowerSymbol } from "./VowelPowerSymbol";
import { CharacterCompanion } from "./CharacterCompanion";
import "./vowelPowerComplete.css";

type VowelKey = "A" | "E" | "I" | "O" | "U";

interface VowelPowerCompleteProps {
  levelId: number;
  onContinue: () => void;
  onContinueTraining?: () => void;
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

export function VowelPowerComplete({ levelId, onContinue, onContinueTraining, onBackToMap }: VowelPowerCompleteProps) {
  const vowel = VOWELS[Math.max(0, Math.min(levelId - 1, VOWELS.length - 1))];
  const reward = POWER_REWARDS[vowel];
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.55 },
      colors: [reward.accent, "#FFFFFF", "#FCD34D"],
    });
  }, [reward.accent, reduced]);

  return (
    <div className="power-complete">
      <header className="power-complete__nav">
        <button onClick={onBackToMap}><ArrowLeft size={19} />Dojo</button>
        <span>Vowel Dojo</span>
      </header>
      <motion.main className="power-complete__main"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
        <p className="power-complete__eyebrow"><Check size={18} />You helped Milo!</p>
        <h1>{reward.title}</h1>
        <div className="power-complete__scene">
          <div className="power-complete__milo"><CharacterCompanion state="idle" phoneme={vowel} size={180} /></div>
          <motion.div animate={reduced ? undefined : { y: [0, -7, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <VowelPowerSymbol vowel={vowel} />
          </motion.div>
        </div>
        <p className="power-complete__description">{reward.description}</p>
        <p className="power-complete__advantage">{reward.advantage}</p>
        <div className="power-complete__actions">
          <button className={onContinueTraining ? "power-complete__back" : "power-complete__continue"} onClick={onContinue}><ArrowLeft size={20} />Back to the Dojo</button>
          {onContinueTraining && <button className="power-complete__continue" onClick={onContinueTraining}>Continue training <ArrowRight size={20} /></button>}
        </div>
      </motion.main>
    </div>
  );
}
