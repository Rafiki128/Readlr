import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ReadingWorldBackdrop } from './ReadingWorldBackdrop';
import { CharacterCompanion } from './CharacterCompanion';
import { WorldLandmarkArt } from './WorldLandmarkArt';
import { useWorldExit } from './useWorldExit';
import { playMiloScript, stopMiloScript } from '../../hooks/miloScripts';

interface WelcomeScreenProps {
  onStart: () => void;
  userName?: string;
}

export function WelcomeScreen({ onStart, userName }: WelcomeScreenProps) {
  const transition=useWorldExit(1800);
  const [loadingMs,setLoadingMs]=useState(1800);
  const reduced=useReducedMotion();
  // Browsers may block this until the learner has interacted; the welcome then stays silent.
  useEffect(()=>{void playMiloScript('HOME-001');},[]);
  // Keep the loading scene open until Milo's line ends (never shorter than 1.8s).
  const enter=()=>{
    const started=performance.now();
    stopMiloScript();
    transition.exit(onStart,8000);
    void playMiloScript('HOME-002').then(seconds=>{
      const total=Math.max(1800,seconds*1000+300);
      setLoadingMs(total);
      window.setTimeout(transition.finish,Math.max(0,total-(performance.now()-started)));
    });
  };
  return (
    <div className={`world-welcome-screen reading-world-welcome welcome-story-entry ${transition.leaving?'is-preparing-adventure':''}`}>
      <ReadingWorldBackdrop welcome/>

      <motion.div
        initial={reduced?false:{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="welcome-invitation"
      >
        <div inert={transition.leaving}>
          <div className="welcome-brand"><img src="/readlr-mark.svg" alt=""/><span>Readlr</span><small>THE READING CHRONICLES</small></div>
          <CharacterCompanion state="encouraging" gesture="wave" size={180}/>

          <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight mb-3">
            Welcome{userName ? `, ${userName}` : ""}!
          </h1>
          <p className="text-[var(--ink-soft)] text-lg mb-8">
            Milo saved a place for you. Let’s open a book and discover new words together!
          </p>


          <motion.button
            whileHover={reduced?undefined:{ y: -2 }}
            whileTap={reduced?undefined:{ scale: 0.98 }}
            onClick={enter}
            disabled={transition.leaving}
            className="world-primary"
          >
            Enter my adventure <ArrowRight className="w-5 h-5" />
          </motion.button>
          <span className="welcome-small-print">Little sounds. Wonderful stories.</span>
        </div>
      </motion.div>
      {transition.leaving&&<div className="adventure-loading" role="status" aria-live="polite">
        <div className="loading-storybook" aria-hidden="true"><div className="loading-book-page page-left"><span>a</span><span>m</span></div><div className="loading-book-page page-right"><WorldLandmarkArt kind="storybook"/><span>Once upon a word...</span></div><div className="loading-turning-page"/><CharacterCompanion state="encouraging" gesture="wave" size={150}/></div>
        <h2>Your story is opening...</h2><p>Milo is finding your next adventure.</p>
        <div className="adventure-loading-track" aria-hidden="true" style={{"--loading-ms":`${loadingMs}ms`} as CSSProperties}><span/></div>
      </div>}
    </div>
  );
}
