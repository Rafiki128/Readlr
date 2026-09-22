import { motion, useReducedMotion } from "motion/react";
import { Link2, Shield, Volume2 } from "lucide-react";

export type BlendCue = "none" | "consonant" | "vowel" | "blend";

export function BlendWorkbench({ blend, cue, joined, fastened, hidden }: {
  blend: string; cue: BlendCue; joined: boolean; fastened: boolean; hidden: boolean;
}) {
  const reduced = useReducedMotion();
  return <div className="blend-bench" data-cue={cue} data-fastened={fastened} aria-label={hidden ? "Find the missing sound" : `${blend[0]} and ${blend[1]} join into ${blend}`}>
    <div className="blend-bench__rail" />
    <div className="blend-bench__pieces">
      <motion.div className="blend-piece blend-piece--consonant" animate={{ x: joined ? 0 : -65 }} transition={{ duration: reduced ? 0 : .8 }}>
        <span>{hidden ? "?" : blend[0].toLowerCase()}</span>
        {cue === "consonant" && <Volume2 size={22} />}
      </motion.div>
      <motion.div className="blend-piece blend-piece--vowel" animate={{ x: joined ? 0 : 65 }} transition={{ duration: reduced ? 0 : .8 }}>
        <span>{blend[1].toLowerCase()}</span>
        <Shield className="blend-piece__power" size={22} aria-label="Vowel power" />
      </motion.div>
      {fastened && <strong className="blend-bench__whole">{blend.toLowerCase()}</strong>}
      {fastened && <motion.div className="blend-bench__link" initial={{ scale: .2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduced ? 0 : .45 }}><Link2 size={28} /></motion.div>}
    </div>
    <div className="blend-bench__caption" aria-live="polite">{fastened ? `${blend.toLowerCase()} Sound Link earned` : cue === "consonant" ? "First sound" : cue === "vowel" ? "Vowel power" : cue === "blend" ? "Two sounds together" : joined ? "Ready for your voice" : "Two sound pieces"}</div>
  </div>;
}
