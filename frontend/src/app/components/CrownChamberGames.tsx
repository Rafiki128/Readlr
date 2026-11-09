import { useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Crown, Gem, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { CROWN_CHAMBER_STEPS, CROWN_CHAMBER_WORDS, crownJewelFits, readCrownChamberStep, saveCrownChamberStep } from './crownChamberLogic';
import './crownChamberGames.css';
import { MiloSays } from './MiloSays';

export function CrownJewelForge({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readCrownChamberStep(learnerId),CROWN_CHAMBER_STEPS.length-1);
  const [stepIndex,setStepIndex]=useState(initial);
  const [chosen,setChosen]=useState('');
  const [message,setMessage]=useState('Choose the vowel jewel that completes the word.');
  const step=CROWN_CHAMBER_STEPS[stepIndex];
  const finished=chosen===step.vowel;

  function choose(vowel:string) {
    if(finished)return;
    setChosen(vowel);
    setMessage(crownJewelFits(stepIndex,vowel)?`${step.word} is restored. You found ${step.cue}!`:'That jewel has another word. We can try this again.');
  }
  function next() {
    const nextStep=stepIndex+1;saveCrownChamberStep(learnerId,nextStep);
    if(nextStep===CROWN_CHAMBER_STEPS.length){onComplete();return;}
    setStepIndex(nextStep);setChosen('');setMessage('Another crown jewel needs its vowel sound.');
  }

  return <section className={`crown-forge-game ${finished?'is-restored':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>The Crown Chamber</span><h2>{finished?'The jewel is shining!':'Restore a word jewel'}</h2><MiloSays text={message}/></div><b>Jewel {stepIndex+1} of {CROWN_CHAMBER_STEPS.length}</b></header>
    <div className="crown-forge-scene">
      <div className="crown-window" aria-hidden="true"><i/><i/><i/></div>
      <div className="crown-forge-display">
        <motion.div className="great-reading-crown" animate={finished&&!reduced?{scale:[1,1.06,1],rotate:[0,-1,1,0]}:{}}><Crown/><div>{CROWN_CHAMBER_STEPS.map((item,index)=><i key={item.word} className={`${index<stepIndex||index===stepIndex&&finished?'is-lit':''} ${index===stepIndex?'is-current':''}`}/>)}</div></motion.div>
        <span className="crown-word-socket">{finished?step.word:step.display}</span>
        <small>{finished?step.cue:'One vowel jewel is missing'}</small>
      </div>
      <div className="crown-jewel-tray"><span>Choose a vowel jewel</span><div>{step.choices.map((vowel,index)=><motion.button key={vowel} className={chosen===vowel&&!finished?'is-tried':''} disabled={finished} onClick={()=>choose(vowel)} initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.08}}><Gem/><strong>{vowel}</strong>{finished&&vowel===step.vowel&&<Check/>}</motion.button>)}</div></div>
      {finished&&<button className="reading-primary crown-forge-next" onClick={next}>{stepIndex+1===CROWN_CHAMBER_STEPS.length?<>Enter the word trial<Sparkles/></>:<>Next jewel<ArrowRight/></>}</button>}
    </div>
  </section>;
}

export function CrownChamberVoiceTrail({active,restored}:{active:string;restored:string[]}) {
  return <div className="crown-voice-trail" aria-label={`${restored.length} of ${CROWN_CHAMBER_WORDS.length} crown words restored`}>
    <span className="crown-voice-band" aria-hidden="true"/>
    {CROWN_CHAMBER_WORDS.map((word,index)=><div className={`${restored.includes(word)?'is-restored':''} ${active===word?'is-active':''}`} style={{'--crown-order':index} as CSSProperties} key={word}><Gem/><strong>{word}</strong>{restored.includes(word)&&<Check/>}</div>)}
  </div>;
}
