import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Volume2, Mic, Headphones, Check, Shield, Sparkles, Eye, Circle, Wind } from "lucide-react";
import { CharacterCompanion, type CharacterState } from "./CharacterCompanion";
import "./vowelChallenge.css";
import { TrailPowerScene } from "./TrailPowerScene";

interface Props {
  vowel: string; sound: string; ability: string; title: string; message: string;
  characterState: CharacterState; training: boolean; ready: boolean;
  recording: boolean; recorded: boolean; celebrating: boolean;
  preparing?: boolean;
  onBack: () => void; onReplay: () => void; onRecord: () => void;
}

export function VowelChallengeView(p: Props) {
  const reduced = useReducedMotion();
  const PowerIcon = ({ A: Shield, E: Sparkles, I: Eye, O: Circle, U: Wind })[p.vowel] ?? Sparkles;
  const phase = p.celebrating ? 3 : p.recorded ? 2 : p.recording || p.ready ? 1 : 0;
  const busy = !p.ready || p.preparing || p.recording || p.recorded || p.celebrating;
  const label = p.preparing ? "Get ready..." : p.celebrating ? "You helped Milo!" : p.recording ? `Say ${p.sound}` : p.recorded ? "Hear your voice" : !p.ready ? "Listen to Milo" : `${p.training ? "Learn" : "Use"} my ${p.ability}`;
  const ActionIcon = p.celebrating ? Check : p.recorded ? Headphones : !p.ready ? Volume2 : Mic;
  return (
    <div className="vowel-play">
      <header className="vowel-play__nav">
        <button onClick={p.onBack}><ArrowLeft size={19} />Map</button>
        <span>{p.training ? "Vowel Dojo" : "Milo's adventure"}</span>
      </header>
      <main className="vowel-play__main">
        <h1>{p.title}</h1>
        <ol className="vowel-play__steps" aria-label="Challenge steps">
          {[{ name: "Listen", icon: Volume2 }, { name: "Say it", icon: Mic }, { name: "Hear it", icon: Headphones }].map((step, index) => (
            <li key={step.name} data-current={phase === index} data-done={phase > index} aria-current={phase === index ? "step" : undefined}>
              {phase > index ? <Check size={17} /> : <step.icon size={17} />}<span>{step.name}</span>
            </li>
          ))}
        </ol>
        <div className="vowel-play__dialogue" aria-live="polite" aria-atomic="true">
          <span>Milo says</span>
          <motion.p key={p.message} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>{p.message}</motion.p>
        </div>
        <div className="vowel-play__scene" data-trail={!p.training}>
          <div className="vowel-play__milo"><CharacterCompanion state={p.characterState} phoneme={p.vowel} size={180} /></div>
          {!p.training && <TrailPowerScene title={p.title} vowel={p.vowel} active={p.celebrating} />}
          <motion.div className="vowel-play__power" animate={p.celebrating && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ duration: 0.7 }}>
            <PowerIcon className="vowel-play__power-icon" aria-hidden="true" />
            <strong>{p.vowel.toLowerCase()}</strong>
            <span>{p.ability}</span>
            {p.celebrating && <Check className="vowel-play__power-check" aria-label="Power activated" />}
          </motion.div>
        </div>
        <footer className="vowel-play__controls">
          <div className="vowel-play__action-row">
            <button className="vowel-play__replay" onClick={p.onReplay} disabled={busy} title="Hear the vowel again" aria-label="Hear the vowel again"><Volume2 size={24} /></button>
            <button className="vowel-play__record" data-recording={p.recording} data-celebrating={p.celebrating} disabled={busy} onClick={p.onRecord}><ActionIcon size={25} /><span>{label}</span></button>
          </div>
          <div className="vowel-play__status" role="status">
            {p.preparing ? "Wait for your turn..." : p.recording ? <><span className="vowel-play__record-dot" />Milo is listening...</> : p.recorded && !p.celebrating ? "That's your voice!" : p.celebrating ? "Your voice brings the valley to life." : p.ready ? "Your turn!" : "Your turn is coming."}
          </div>
        </footer>
      </main>
    </div>
  );
}
