import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Sparkles, WandSparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { CHANGING_WORDS, WORD_TRANSFORMATIONS, changedLetterIndex, changingTileFits, readChangingHallStep, saveChangingHallStep } from './changingWordsLogic';
import './changingWordsGames.css';
import { MiloSays } from './MiloSays';

export function ChangingWordMirrors({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readChangingHallStep(learnerId),CHANGING_WORDS.length-1);
  const [wordIndex,setWordIndex]=useState(initial);
  const [chosen,setChosen]=useState('');
  const [message,setMessage]=useState('Change one sound to make the word in the glowing mirror.');
  const word=CHANGING_WORDS[wordIndex];
  const fromWord=WORD_TRANSFORMATIONS[word];
  const missing=changedLetterIndex(fromWord,word);
  const correct=word[missing];
  const choices=useMemo(()=>{
    const distractors=['r','d','c','t','s','l'].filter(letter=>letter!==correct&&letter!==fromWord[missing]);
    return wordIndex%2?[distractors[0],correct,fromWord[missing]]:[correct,fromWord[missing],distractors[0]];
  },[correct,fromWord,missing,wordIndex]);
  const finished=chosen===correct;

  function change(letter:string) {
    if(finished)return;
    if(!changingTileFits(fromWord,word,letter)){setMessage(`That makes a different word. We can try changing ${fromWord} again.`);return;}
    setChosen(letter);setMessage(`${fromWord} changed to ${word}. Only one sound moved!`);
  }
  function drop(letter:string,x:number,y:number) {
    const target=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.magicGap==='letter');
    if(!target){setMessage('Bring the letter into the glowing space in the mirror.');return;}
    change(letter);
  }
  function nextWord() {
    const next=wordIndex+1;saveChangingHallStep(learnerId,next);
    if(next===CHANGING_WORDS.length){onComplete();return;}
    setWordIndex(next);setChosen('');setMessage('A new mirror is ready. Change just one sound.');
  }

  return <section className={`changing-mirror-game ${finished?'is-transformed':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>Hall of Changing Words</span><h2>{finished?`${fromWord} became ${word}!`:'Change one sound'}</h2><MiloSays text={message}/></div><b>Mirror {wordIndex+1} of {CHANGING_WORDS.length}</b></header>
    <div className="changing-mirror-scene">
      <div className="hall-pillars" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="changing-word-stage">
        <span className="changing-old-word">{fromWord}</span><ArrowRight aria-label="changes to"/>
        <div className="changing-mirror" aria-label={`Change ${fromWord} to ${word}`}><Sparkles aria-hidden="true"/><div>{[...word].map((letter,index)=><span key={index} className={index===missing?'is-changing':''} data-magic-gap={index===missing?'letter':undefined}>{index===missing?(chosen||'?'):letter}{index===missing&&finished&&<Check/>}</span>)}</div><strong>{finished?word:'Change one letter'}</strong></div>
      </div>
      <div className="changing-letter-tray"><span>Magic letters</span><div>{!finished&&choices.map(letter=><motion.div className="changing-letter" key={letter} drag dragSnapToOrigin dragElastic={.08} whileDrag={{scale:reduced?1:1.1,zIndex:5}} onDragEnd={(_,info)=>drop(letter,info.point.x,info.point.y)}><button onClick={()=>change(letter)} aria-label={`Letter ${letter}. Drag or tap to change the word.`}><WandSparkles/>{letter}</button></motion.div>)}</div>{finished&&<motion.div className="changing-success" initial={reduced?false:{scale:.8,opacity:0}} animate={{scale:1,opacity:1}}><WandSparkles/><span><small>One sound changed</small><strong>{fromWord} → {word}</strong></span><Check/></motion.div>}{finished&&<button className="reading-primary changing-next" onClick={nextWord}>{wordIndex+1===CHANGING_WORDS.length?<>Open the hall<Sparkles/></>:<>Next mirror<ArrowRight/></>}</button>}</div>
    </div>
  </section>;
}

export function ChangingWordsVoiceTrail({active,transformed}:{active:string;transformed:string[]}) {
  return <div className="changing-voice-trail" aria-label={`${transformed.length} of ${CHANGING_WORDS.length} changing words read`}>
    <span className="changing-hall-beam" aria-hidden="true"/>
    {CHANGING_WORDS.map((word,index)=><div className={`${transformed.includes(word)?'is-transformed':''} ${active===word?'is-active':''}`} style={{'--rune-order':index} as CSSProperties} key={word}><span className="changing-rune"><WandSparkles/><strong>{word}</strong></span>{transformed.includes(word)&&<Check/>}</div>)}
  </div>;
}
