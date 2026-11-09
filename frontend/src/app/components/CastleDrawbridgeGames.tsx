import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Hammer, Shield } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { DRAWBRIDGE_WORDS, drawbridgePlankFits, readDrawbridgePlankStep, saveDrawbridgePlankStep } from './castleDrawbridgeLogic';
import './castleDrawbridgeGames.css';
import { MiloSays } from './MiloSays';

export function DrawbridgePlankBuilder({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readDrawbridgePlankStep(learnerId),DRAWBRIDGE_WORDS.length-1);
  const [wordIndex,setWordIndex]=useState(initial);
  const [fitted,setFitted]=useState('');
  const [message,setMessage]=useState('Choose the short-u plank that completes the word.');
  const word=DRAWBRIDGE_WORDS[wordIndex];
  const choices=useMemo(()=>wordIndex%2?['o','u','i']:['u','a','o'],[wordIndex]);
  const finished=fitted==='u';

  function fit(vowel:string) {
    if(finished)return;
    if(!drawbridgePlankFits(word,vowel)){setMessage(`That plank makes a different sound. We can try ${word} again.`);return;}
    setFitted(vowel);setMessage(`${word} has short u. This bridge plank is strong!`);
  }
  function drop(vowel:string,x:number,y:number) {
    const target=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.drawbridgeGap==='vowel');
    if(!target){setMessage('Bring the plank into the dotted middle space.');return;}
    fit(vowel);
  }
  function nextWord() {
    const next=wordIndex+1;saveDrawbridgePlankStep(learnerId,next);
    if(next===DRAWBRIDGE_WORDS.length){onComplete();return;}
    setWordIndex(next);setFitted('');setMessage('The next gap is ready. Listen for short u.');
  }

  return <section className={`drawbridge-builder ${finished?'is-fitted':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>Castle Drawbridge</span><h2>{finished?`${word} joined the crossing!`:'Repair the next word plank'}</h2><MiloSays text={message}/></div><b>Plank {wordIndex+1} of {DRAWBRIDGE_WORDS.length}</b></header>
    <div className="drawbridge-builder-scene">
      <div className="drawbridge-castle" aria-hidden="true"><i/><i/><span><Shield/></span></div>
      <div className="drawbridge-river" aria-hidden="true"/>
      <div className="drawbridge-word-workbench">
        <Hammer aria-hidden="true"/>
        <div className="drawbridge-word-frame" aria-label={`Complete ${word}`}><span>{word[0]}</span><span className={finished?'is-fitted':''} data-drawbridge-gap="vowel">{fitted||<small>?</small>}{finished&&<Check/>}</span><span>{word[2]}</span></div>
        <strong>{finished?word:`${word[0]}_${word[2]}`}</strong>
      </div>
      <div className="drawbridge-plank-tray">
        <span>Vowel planks</span>
        <div>{!finished&&choices.map(vowel=><motion.div className="drawbridge-choice-plank" key={vowel} drag dragSnapToOrigin dragElastic={.08} whileDrag={{scale:reduced?1:1.08,zIndex:5}} onDragEnd={(_,info)=>drop(vowel,info.point.x,info.point.y)}><button onClick={()=>fit(vowel)} aria-label={`Vowel ${vowel}. Drag or tap to fit it.`}>{vowel}</button></motion.div>)}</div>
        {finished&&<motion.div className="drawbridge-fit-note" initial={reduced?false:{y:12,opacity:0}} animate={{y:0,opacity:1}}><Hammer/><span><small>Short u found</small><strong>{word}</strong></span><Check/></motion.div>}
        {finished&&<button className="reading-primary drawbridge-next-plank" onClick={nextWord}>{wordIndex+1===DRAWBRIDGE_WORDS.length?<>Lower the bridge<Shield/></>:<>Next bridge plank<ArrowRight/></>}</button>}
      </div>
    </div>
  </section>;
}

export function DrawbridgeVoiceTrail({active,raised}:{active:string;raised:string[]}) {
  return <div className="drawbridge-voice-trail" aria-label={`${raised.length} of ${DRAWBRIDGE_WORDS.length} drawbridge words read`}>
    <span className="drawbridge-rope drawbridge-rope--top" aria-hidden="true"/><span className="drawbridge-rope drawbridge-rope--bottom" aria-hidden="true"/>
    {DRAWBRIDGE_WORDS.map((word,index)=><div className={`${raised.includes(word)?'is-raised':''} ${active===word?'is-active':''}`} style={{'--plank-delay':`${index*70}ms`} as CSSProperties} key={word}><span className="drawbridge-voice-plank"><strong>{word}</strong></span>{raised.includes(word)&&<Check/>}</div>)}
  </div>;
}
