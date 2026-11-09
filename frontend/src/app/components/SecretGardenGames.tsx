import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Flower2, Sprout } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { GARDEN_WORDS, gardenSeedFits, gardenVowel, readGardenSeedStep, saveGardenSeedStep } from './secretGardenLogic';
import './secretGardenGames.css';
import { MiloSays } from './MiloSays';

export function GardenVowelBeds({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readGardenSeedStep(learnerId),GARDEN_WORDS.length-1);
  const [wordIndex,setWordIndex]=useState(initial);
  const [planted,setPlanted]=useState('');
  const [message,setMessage]=useState('Plant the vowel seed that completes the word.');
  const word=GARDEN_WORDS[wordIndex];
  const choices=useMemo(()=>word==='bin'?['i','o','a']:wordIndex%2?['a','o','i']:['o','i','a'],[word,wordIndex]);
  const finished=planted===gardenVowel(word);

  function plant(vowel:string) {
    if(finished)return;
    if(!gardenSeedFits(word,vowel)){setMessage(`That seed makes a different word. We can try ${word} again.`);return;}
    setPlanted(vowel);
    setMessage(word==='bin'?'bin uses short i. You found the contrast seed!':`${word} uses short o. The word bed is blooming!`);
  }
  function drop(vowel:string,x:number,y:number) {
    const target=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.gardenBed==='vowel');
    if(!target){setMessage('Bring the seed into the dotted middle space.');return;}
    plant(vowel);
  }
  function nextWord() {
    const next=wordIndex+1;
    saveGardenSeedStep(learnerId,next);
    if(next===GARDEN_WORDS.length){onComplete();return;}
    setWordIndex(next);setPlanted('');setMessage(next===GARDEN_WORDS.length-1?'One contrast word is waiting. Listen for a different middle sound.':'A new word bed is ready for a vowel seed.');
  }

  return <section className={`garden-seed-game ${finished?'is-blooming':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>Secret Garden</span><h2>{finished?`${word} is blooming!`:'Complete the garden word'}</h2><MiloSays text={message}/></div><b>Bed {wordIndex+1} of {GARDEN_WORDS.length}</b></header>
    <div className="garden-seed-scene">
      <div className="garden-sky" aria-hidden="true"><i/><i/><i/></div>
      <div className="garden-word-bed">
        <div className="garden-sprout" aria-hidden="true"><span/><Flower2/></div>
        <div className="garden-word-frame" aria-label={`Complete ${word}`}>
          <span>{word[0]}</span>
          <span className={finished?'is-planted':''} data-garden-bed="vowel">{planted||<small>?</small>}{finished&&<Check/>}</span>
          <span>{word[2]}</span>
        </div>
        <strong>{finished?word:`${word[0]}_${word[2]}`}</strong>
      </div>
      <div className="garden-seed-tray">
        <span>Vowel seeds</span>
        <div>{!finished&&choices.map(vowel=><motion.div className="garden-seed" key={vowel} drag dragSnapToOrigin dragElastic={.08} whileDrag={{scale:reduced?1:1.1,zIndex:5}} onDragEnd={(_,info)=>drop(vowel,info.point.x,info.point.y)}><button onClick={()=>plant(vowel)} aria-label={`Vowel ${vowel}. Drag or tap to plant it.`}><Sprout/>{vowel}</button></motion.div>)}</div>
        {finished&&<motion.div className="garden-bloom-note" initial={reduced?false:{scale:.75,opacity:0}} animate={{scale:1,opacity:1}}><Flower2/><span><small>{word==='bin'?'Different vowel found':'Short o found'}</small><strong>{word}</strong></span><Check/></motion.div>}
        {finished&&<button className="reading-primary garden-next-bed" onClick={nextWord}>{wordIndex+1===GARDEN_WORDS.length?<>Open the garden<Flower2/></>:<>Next word bed<ArrowRight/></>}</button>}
      </div>
    </div>
  </section>;
}

export function GardenVoiceTrail({active,bloomed}:{active:string;bloomed:string[]}) {
  return <div className="garden-voice-trail" aria-label={`${bloomed.length} of ${GARDEN_WORDS.length} garden words read`}>
    <span className="garden-trail-soil" aria-hidden="true"/>
    {GARDEN_WORDS.map((word,index)=><div className={`${bloomed.includes(word)?'is-bloomed':''} ${active===word?'is-active':''}`} key={word}>
      <span className="garden-word-flower" style={{'--flower-color':index%2?'#ef6d9b':'#f3bc4c'} as CSSProperties}><Flower2/></span>
      <strong>{word}</strong>{bloomed.includes(word)&&<Check/>}
    </div>)}
  </div>;
}
