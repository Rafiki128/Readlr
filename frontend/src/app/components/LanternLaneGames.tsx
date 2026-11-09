import { useMemo, useState, type CSSProperties } from 'react';
import { Check, Lightbulb, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { lanternVowel, LANTERN_WORDS, type LanternVowel, type LanternWord } from './lanternLaneLogic';
import './lanternLaneGames.css';
import { MiloSays } from './MiloSays';

const VOWELS:LanternVowel[]=['a','e','i'];

export function LanternVowelSort({onAttempt,onComplete}:{onAttempt?:(word:string,vowel:string,correct:boolean)=>void;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const [placed,setPlaced]=useState<Partial<Record<LanternWord,LanternVowel>>>({});
  const [message,setMessage]=useState('Drag each word to the lantern with its middle sound.');
  const order=useMemo(()=>['lit','sat','met','sit','let','set'] as LanternWord[],[]);
  const finished=order.every(word=>placed[word]);
  function place(word:LanternWord,vowel:LanternVowel){
    if(placed[word])return;
    const correct=lanternVowel(word)===vowel;onAttempt?.(word,vowel,correct);
    if(!correct){setMessage(`Listen to the middle of ${word}. Try another lantern.`);return;}
    const next={...placed,[word]:vowel};setPlaced(next);setMessage(`${word} lights the ${vowel} lantern!`);
  }
  function drop(word:LanternWord,x:number,y:number){
    const bin=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.lanternVowel) as HTMLElement|undefined;
    if(!bin){setMessage('Drop the word inside one of the glowing lanterns.');return;}
    place(word,bin.dataset.lanternVowel as LanternVowel);
  }
  return <section className={`lantern-sort ${finished?'is-complete':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={78}/><div><span>Lantern Lane</span><h2>{finished?'Every vowel lantern is glowing!':'Light the vowel lanterns'}</h2><MiloSays text={message}/></div></header>
    <div className="lantern-sort-scene">
      <div className="lantern-word-bank" aria-label="Words to sort">{finished?<button className="reading-primary" onClick={onComplete}><Sparkles/>Follow the lanterns</button>:order.map((word,index)=>placed[word]?null:<motion.button drag dragSnapToOrigin dragElastic={.08} whileDrag={{scale:reduced?1:1.08,zIndex:5}} onDragEnd={(_,info)=>drop(word,info.point.x,info.point.y)} onKeyDown={event=>{const vowel=lanternVowel(word);if(vowel&&['Enter',' '].includes(event.key)){event.preventDefault();place(word,vowel);}}} style={{'--tile-turn':`${[-4,3,-2,4,-3,2][index]}deg`} as CSSProperties} key={word}>{word}</motion.button>)}</div>
      <div className="lantern-vowel-row">{VOWELS.map(vowel=>{const words=order.filter(word=>placed[word]===vowel);return <div className={`vowel-lantern ${words.length?'is-lit':''}`} data-lantern-vowel={vowel} key={vowel}><Lightbulb/><strong>short {vowel}</strong><div>{words.map(word=><motion.span initial={{scale:.5,opacity:0}} animate={{scale:1,opacity:1}} key={word}><Check/>{word}</motion.span>)}</div></div>})}</div>
    </div>
  </section>;
}

export function LanternVoiceTrail({active,lit}:{active:string;lit:string[]}) {
  return <div className="lantern-voice-trail" aria-label={`${lit.length} of ${LANTERN_WORDS.length} word lanterns lit`}>
    <div className="lantern-lane-line" aria-hidden="true"/>
    {LANTERN_WORDS.map(word=><div className={`voice-lantern ${lit.includes(word)?'is-lit':''} ${active===word?'is-active':''}`} key={word}><Lightbulb/><span>{word}</span>{lit.includes(word)&&<Check/>}</div>)}
  </div>;
}
