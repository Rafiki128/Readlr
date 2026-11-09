import { useRef, useState, type ReactNode } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, RotateCcw, TrainFront, Flag, Volume2, Check, Undo2 } from 'lucide-react';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { ActivityScene } from './ActivityScene';
import { shuffleReading } from './aralCurriculum';
import './firstGateGames.css';
import { FIRST_GATE_WORDS, ORCHARD_ANCHORS, orchardMatch, placeTrainTile } from './firstGateLogic';
import { MiloSays } from './MiloSays';

function Piece({id,children,selected,disabled,onSelect,onPlace}:{id:string;children:ReactNode;selected:boolean;disabled?:boolean;onSelect:()=>void;onPlace:(target:string)=>void}) {
  const dragging=useRef(false);
  const reduced=useReducedMotion();
  return <motion.button className="gate-piece" aria-pressed={selected} disabled={disabled} aria-label={id}
    layout drag={!disabled} dragSnapToOrigin dragMomentum={false} whileDrag={{scale:reduced?1:1.04,zIndex:10}}
    transition={{layout:{duration:reduced?0:0.28,ease:'easeOut'}}}
    dragTransition={{bounceStiffness:420,bounceDamping:32}}
    onDragStart={()=>{dragging.current=true;}}
    onDragEnd={(event)=>{const point=event as PointerEvent;const target=document.elementsFromPoint(point.clientX,point.clientY).find(el=>el.hasAttribute('data-gate-drop'));if(target)onPlace(target.getAttribute('data-gate-drop')!);}}
    onPointerDown={()=>{dragging.current=false;}}
    onClick={event=>{if(event.detail===0||!dragging.current)onSelect();}}>{children}</motion.button>;
}

function Token({id,children,className=''}:{id:string;children:ReactNode;className?:string}) {
  const reduced=useReducedMotion();
  return <motion.span layoutId={id} className={`gate-token ${className}`} transition={{duration:reduced?0:0.34,ease:[0.22,1,0.36,1]}}>{children}</motion.span>;
}

export function SoundOrchard({onComplete,onHear,onAttempt}:{onComplete:()=>void;onHear:(word:string)=>void;onAttempt:(word:string,letter:string,correct:boolean)=>void}) {
  const [pictures]=useState(()=>shuffleReading(ORCHARD_ANCHORS));
  const [selected,setSelected]=useState<string|null>(null);
  const [matched,setMatched]=useState<string[]>([]);
  const [message,setMessage]=useState('Find a home for each picture.');
  function place(word:string,letter:string) {
    if(matched.includes(word))return;
    const correct=orchardMatch(word,letter);onAttempt(word,letter,correct);
    if(!correct){setMessage(`Listen to ${word}. Try another basket.`);return;}
    setMatched(previous=>[...previous,word]);setSelected(null);setMessage(`${word} starts with ${letter}.`);
  }
  return <LayoutGroup id="sound-orchard"><section className="gate-orchard" aria-label="Sound orchard"><ActivityScene/>
    <h2>The sound orchard</h2><MiloSays text={message} role="status"/>
    <div className="gate-pictures">{pictures.filter(word=>!matched.includes(word)).map(word=><motion.div layout key={word}>
      <Piece id={word} selected={selected===word} onSelect={()=>setSelected(word)} onPlace={letter=>place(word,letter)}><Token id={word}><ReadingAnchorArt word={word}/><span>{word}</span></Token></Piece>
      <button className="reading-icon" aria-label={`Hear ${word}`} title={`Hear ${word}`} onClick={()=>onHear(word)}><Volume2/></button>
    </motion.div>)}</div>
    <div className="gate-baskets">{['m','a','t'].map(letter=>{const word=matched.find(word=>word[0]===letter);return <button key={letter} className={`gate-basket sound-${letter} ${word?'is-filled':''}`} data-gate-drop={letter} aria-label={word?`${word} collected in ${letter} basket`:`Place in ${letter} basket`} onClick={()=>!word&&selected&&place(selected,letter)}><strong>{letter}</strong>{word&&<Token id={word}><ReadingAnchorArt word={word}/><span>{word}</span></Token>}</button>;})}</div>
    <div className="gate-orchard-progress" aria-label={`${matched.length} of 3 pictures sorted`}>{ORCHARD_ANCHORS.map(word=><span key={word} className={matched.includes(word)?'is-collected':''}>{matched.includes(word)?<Check/>:word[0]}</span>)}</div>
    {matched.length===3&&<button className="reading-primary" onClick={onComplete}>To the word train<ArrowRight/></button>}
  </section></LayoutGroup>;
}

export function LetterTrain({word,done,showModel,onAnswer}:{word:string;done:boolean;showModel:boolean;onAnswer:(word:string)=>void}) {
  const [tiles]=useState(()=>shuffleReading([...word].map((letter,id)=>({letter,id:String(id)}))));
  const [slots,setSlots]=useState<(string|null)[]>(()=>Array(word.length).fill(null));
  const [selected,setSelected]=useState<string|null>(null);
  function place(id:string,target:string){
    if(done)return;
    const next=placeTrainTile(slots,tiles.map(tile=>tile.id),id,target);
    if(!next)return;
    setSlots(next);setSelected(null);
    if(next.every(value=>value!==null))onAnswer(next.map(value=>tiles.find(tile=>tile.id===value)!.letter).join(''));
  }
  return <LayoutGroup id={`train-${word}`}><div className={`gate-train-builder ${done?'is-joined':''}`}>{showModel?<p className="gate-word-model">Look closely: <strong>{word}</strong></p>:<p className="gate-word-model gate-word-model--memory">Build the word you heard.</p>}
    <div className="gate-carriages"><TrainFront aria-hidden="true"/>{slots.map((id,i)=>{const letter=tiles.find(tile=>tile.id===id)?.letter;return <button className={`gate-carriage ${letter?'is-filled':''}`} key={i} data-gate-drop={String(i)} aria-label={`Letter position ${i+1}`} disabled={done} onClick={()=>selected!==null&&place(selected,String(i))}>{id!==null&&<Token id={id} className={`sound-${letter}`}>{letter}</Token>}</button>;})}</div>
    <div className="gate-letter-bank">{tiles.filter(tile=>!slots.includes(tile.id)).map(tile=><Piece key={tile.id} id={`Letter ${tile.letter}`} selected={selected===tile.id} disabled={done} onSelect={()=>setSelected(tile.id)} onPlace={target=>place(tile.id,target)}><Token id={tile.id} className={`sound-${tile.letter}`}>{tile.letter}</Token></Piece>)}<button className="reading-icon" title="Remove last letter" aria-label="Remove last letter" disabled={done||slots.every(id=>id===null)} onClick={()=>{const last=slots.length-1-[...slots].reverse().findIndex(id=>id!==null);setSlots(slots.map((id,i)=>i===last?null:id));setSelected(null);}}><Undo2/></button><button className="reading-icon" title="Reset letters" aria-label="Reset letters" disabled={done} onClick={()=>{setSlots(Array(word.length).fill(null));setSelected(null);}}><RotateCcw/></button></div>
  </div></LayoutGroup>;
}

export function VoiceRail({word,spoken}:{word:string;spoken:readonly string[]}) {
  const reduced=useReducedMotion();
  const count=FIRST_GATE_WORDS.filter(target=>spoken.includes(target)).length;
  const last=spoken.length?spoken[spoken.length-1]:'start';
  const previous=Math.max(0,count-(spoken.includes(word)?1:0));
  const trainStops=[1,14,47,84];
  const railStops=[8,26,59,96];
  return <div className={`gate-voice-journey ${spoken.includes(word)?'is-departing':''}`}><div className="gate-stations" aria-label="Word stations">{FIRST_GATE_WORDS.map((target,index)=><span className={spoken.includes(target)?'is-arrived':''} style={{left:`${[20,53,90][index]}%`}} key={target}><small>Station {index+1}</small><strong>{spoken.includes(target)&&<Check/>}{target}</strong></span>)}</div><div className="gate-voice-rail" aria-label={`${count} of 3 word stations reached`}><span className="gate-depot">Start</span><div className="gate-rail-line"/><motion.div className="gate-rail-progress" animate={{width:`${railStops[count]}%`}} transition={{duration:reduced?0:1.1,ease:'easeInOut'}}/><motion.div key={`${count}-${word}`} className="gate-voice-train" initial={{left:`${trainStops[previous]}%`,scale:1}} animate={{left:`${trainStops[count]}%`,scale:spoken.includes(word)?[1,1.12,1]:1}} transition={{duration:reduced?0:1.15,ease:'easeInOut'}}><TrainFront/><span>{last}</span></motion.div>{spoken.includes(word)&&<motion.strong key={`arrival-${count}`} className="gate-arrival" initial={{opacity:0,scale:.6}} animate={{opacity:[0,1,1,0],scale:[.6,1.1,1,1]}} transition={{duration:reduced?0:1.6}}>{count===3?'Finish reached!':`Station ${count} reached!`}</motion.strong>}<div className="gate-finish-marker"><Flag/><span>First Gate</span></div></div></div>;
}
