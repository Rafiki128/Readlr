import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, KeyRound, LockKeyhole, Sparkles, UnlockKeyhole } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { KEY_LOCKS, KEY_WORDS, keyFitsLock, readKeyKeeperStep, saveKeyKeeperStep } from './keyKeeperLogic';
import './keyKeeperGames.css';
import { MiloSays } from './MiloSays';

export function KeyKeeperLocks({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readKeyKeeperStep(learnerId),KEY_WORDS.length-1);
  const [wordIndex,setWordIndex]=useState(initial);
  const [chosen,setChosen]=useState('');
  const [message,setMessage]=useState('Listen from the first sound to the last. Find the key that completes the word.');
  const word=KEY_WORDS[wordIndex];
  const lock=KEY_LOCKS[word];
  const choices=useMemo(()=>wordIndex%2?[...lock.choices].reverse():[...lock.choices],[lock.choices,wordIndex]);
  const finished=chosen===lock.letter;

  function unlock(letter:string) {
    if(finished)return;
    if(!keyFitsLock(word,letter)){setMessage(`That key does not open ${word}. We can listen and try this lock again.`);return;}
    setChosen(letter);setMessage(`${letter} completes ${word}. The word door is open!`);
  }
  function drop(letter:string,x:number,y:number) {
    const target=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.wordLock==='key');
    if(!target){setMessage('Bring the key into the glowing word lock.');return;}
    unlock(letter);
  }
  function nextLock() {
    const next=wordIndex+1;saveKeyKeeperStep(learnerId,next);
    if(next===KEY_WORDS.length){onComplete();return;}
    setWordIndex(next);setChosen('');setMessage('A new word door is ready. Listen for its missing sound.');
  }

  return <section className={`key-keeper-game ${finished?'is-unlocked':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>The Key Keeper</span><h2>{finished?`${word} is unlocked!`:'Find the sound key'}</h2><MiloSays text={message}/></div><b>Lock {wordIndex+1} of {KEY_WORDS.length}</b></header>
    <div className="key-keeper-scene">
      <div className="key-hall-arches" aria-hidden="true"><i/><i/><i/></div>
      <div className="word-lock-stage">
        <div className="keeper-door" data-word-lock="key" aria-label={`Complete the word ${word}`}>
          <div className="keeper-door-crown"><Sparkles/></div>
          <div className="keeper-word">{[...word].map((letter,index)=><span className={index===lock.missing?'is-missing':''} key={index}>{index===lock.missing?(chosen||'?'):letter}</span>)}</div>
          <span className="keeper-lock">{finished?<UnlockKeyhole/>:<LockKeyhole/>}</span>
          <strong>{lock.missing===0?'Beginning sound':'Ending sound'}</strong>
        </div>
      </div>
      <div className="sound-key-tray"><span>Sound keys</span><div>{!finished&&choices.map(letter=><motion.div className="sound-key" key={letter} drag dragSnapToOrigin dragElastic={.08} whileDrag={{scale:reduced?1:1.08,zIndex:5}} onDragEnd={(_,info)=>drop(letter,info.point.x,info.point.y)}><button onClick={()=>unlock(letter)} aria-label={`Sound key ${letter}. Drag or tap it to try the lock.`}><KeyRound/><strong>{letter}</strong></button></motion.div>)}</div>{finished&&<motion.div className="key-unlocked-message" initial={reduced?false:{scale:.8,opacity:0}} animate={{scale:1,opacity:1}}><UnlockKeyhole/><span><small>Word unlocked</small><strong>{word}</strong></span><Check/></motion.div>}{finished&&<button className="reading-primary key-keeper-next" onClick={nextLock}>{wordIndex+1===KEY_WORDS.length?<>Open the key trail<Sparkles/></>:<>Next lock<ArrowRight/></>}</button>}</div>
    </div>
  </section>;
}

export function KeyKeeperVoiceTrail({active,unlocked}:{active:string;unlocked:string[]}) {
  return <div className="key-voice-trail" aria-label={`${unlocked.length} of ${KEY_WORDS.length} word locks opened`}>
    <span className="key-trail-ring" aria-hidden="true"/>
    {KEY_WORDS.map((word,index)=><div className={`${unlocked.includes(word)?'is-unlocked':''} ${active===word?'is-active':''}`} style={{'--key-order':index} as CSSProperties} key={word}><span className="voice-key"><KeyRound/><strong>{word}</strong></span>{unlocked.includes(word)&&<Check/>}</div>)}
  </div>;
}
