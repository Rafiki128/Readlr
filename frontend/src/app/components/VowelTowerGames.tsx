import { useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { VOWEL_TOWER_STEPS, VOWEL_TOWER_WORDS, readVowelTowerStep, saveVowelTowerStep, vowelTileFits } from './vowelTowerLogic';
import './vowelTowerGames.css';
import { MiloSays } from './MiloSays';

export function VowelLift({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readVowelTowerStep(learnerId),VOWEL_TOWER_STEPS.length-1);
  const [stepIndex,setStepIndex]=useState(initial);
  const [chosen,setChosen]=useState('');
  const [message,setMessage]=useState('Choose the vowel tile that wakes this tower window.');
  const step=VOWEL_TOWER_STEPS[stepIndex];
  const finished=chosen===step.tile;

  function choose(tile:string) {
    if(finished)return;
    setChosen(tile);
    setMessage(vowelTileFits(stepIndex,tile)?`${step.word} is awake! ${step.cue}`:'That tile makes a different word. We can try this again.');
  }
  function next() {
    const nextStep=stepIndex+1;
    saveVowelTowerStep(learnerId,nextStep);
    if(nextStep===VOWEL_TOWER_STEPS.length){onComplete();return;}
    setStepIndex(nextStep);setChosen('');setMessage('The lift has reached another sleeping window.');
  }

  return <section className={`vowel-lift-game ${finished?'is-awake':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>The Vowel Tower</span><h2>{finished?'A window is shining!':'Ride the vowel lift'}</h2><MiloSays text={message}/></div><b>Window {stepIndex+1} of {VOWEL_TOWER_STEPS.length}</b></header>
    <div className="vowel-tower-scene">
      <div className="tower-stars" aria-hidden="true">{[0,1,2,3,4,5].map(star=><i key={star}/>)}</div>
      <div className="tower-building" aria-hidden="true">
        <span className="tower-roof"/>
        {VOWEL_TOWER_STEPS.map((item,index)=><i key={item.word} className={`${index<stepIndex||index===stepIndex&&finished?'is-lit':''} ${index===stepIndex?'is-current':''}`}><small>{index<stepIndex||index===stepIndex&&finished?item.word:''}</small></i>)}
      </div>
      <motion.div className="vowel-lift-car" initial={false} animate={{y:-(stepIndex*23)}} transition={reduced?{duration:0}:{type:'spring',stiffness:85,damping:14}}>
        <span>{finished?step.word:step.display}</span><small>{step.from?`${step.from} + ?`:'Fill the vowel team'}</small>
      </motion.div>
      <div className="vowel-lift-choices"><span>Choose a tile</span><div>{step.choices.map((tile,index)=><motion.button key={tile} className={chosen===tile&&!finished?'is-tried':''} disabled={finished} onClick={()=>choose(tile)} initial={reduced?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.08}}><strong>{tile}</strong>{finished&&tile===step.tile&&<Check/>}</motion.button>)}</div></div>
      {finished&&<button className="reading-primary vowel-lift-next" onClick={next}>{stepIndex+1===VOWEL_TOWER_STEPS.length?<>Open the word trail<Sparkles/></>:<>Next window<ArrowRight/></>}</button>}
    </div>
  </section>;
}

export function VowelTowerVoiceTrail({active,awakened}:{active:string;awakened:string[]}) {
  return <div className="vowel-tower-voice-trail" aria-label={`${awakened.length} of ${VOWEL_TOWER_WORDS.length} tower windows awake`}>
    {VOWEL_TOWER_WORDS.map((word,index)=><div className={`${awakened.includes(word)?'is-awake':''} ${active===word?'is-active':''}`} style={{'--window-order':index} as CSSProperties} key={word}><span><small>{index%2===0?'short':'long'}</small><strong>{word}</strong></span>{awakened.includes(word)&&<Check/>}</div>)}
  </div>;
}
