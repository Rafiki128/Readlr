import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, PackageOpen, Sparkles, Store } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { MARKET_WORDS, marketLetterFits, readMarketBuilderStep, saveMarketBuilderStep } from './wordMarketLogic';
import './wordMarketGames.css';
import { MiloSays } from './MiloSays';

type LetterTile={id:number;letter:string};

function shuffledLetters(word:string):LetterTile[] {
  const letters=[...word].map((letter,id)=>({id,letter}));
  return word==='pin'?[letters[2],letters[0],letters[1]]:word==='fin'?[letters[1],letters[2],letters[0]]:[letters[2],letters[1],letters[0]];
}

export function WordMarketBuilder({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readMarketBuilderStep(learnerId),MARKET_WORDS.length-1);
  const [wordIndex,setWordIndex]=useState(initial);
  const word=MARKET_WORDS[wordIndex];
  const tiles=useMemo(()=>shuffledLetters(word),[word]);
  const [placed,setPlaced]=useState<Record<number,number>>({});
  const [message,setMessage]=useState('Drag each letter crate into its dotted space.');
  const finished=Object.keys(placed).length===word.length;

  function place(tile:LetterTile,slot:number) {
    if(Object.values(placed).includes(tile.id)||placed[slot]!==undefined)return;
    if(!marketLetterFits(word,tile.letter,slot)){setMessage(`That crate has another space. Try ${tile.letter} again.`);return;}
    const next={...placed,[slot]:tile.id};
    setPlaced(next);
    setMessage(Object.keys(next).length===word.length?`${word} is ready for its stall!`:`${tile.letter} is in the right space.`);
  }
  function drop(tile:LetterTile,x:number,y:number) {
    const target=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.marketSlot!==undefined) as HTMLElement|undefined;
    if(!target){setMessage('Bring the crate into one of the dotted spaces.');return;}
    place(tile,Number(target.dataset.marketSlot));
  }
  function nextWord() {
    const next=wordIndex+1;
    saveMarketBuilderStep(learnerId,next);
    if(next===MARKET_WORDS.length){onComplete();return;}
    setWordIndex(next);setPlaced({});setMessage('A new stall needs a word label.');
  }
  return <section className={`market-builder ${finished?'is-complete':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>Word Market</span><h2>{finished?`${word} is stocked!`:'Build the stall label'}</h2><MiloSays text={message}/></div><b>Stall {wordIndex+1} of {MARKET_WORDS.length}</b></header>
    <div className="market-builder-scene">
      <div className="market-stall-object"><span className="market-awning"/><ReadingAnchorArt word={word}/><strong>{finished?word:'?'}</strong></div>
      <div className="market-workbench">
        <div className="market-slots" aria-label={`Spaces for ${word}`}>{[...word].map((_,slot)=>{const tileId=placed[slot];const tile=tiles.find(item=>item.id===tileId);return <div className={tile?'is-filled':''} data-market-slot={slot} key={slot}>{tile&&<motion.span initial={{scale:.65,opacity:.3}} animate={{scale:1,opacity:1}}>{tile.letter}<Check/></motion.span>}</div>})}</div>
        {!finished&&<div className="market-crates" aria-label="Letter crates">{tiles.map((tile,index)=>Object.values(placed).includes(tile.id)?null:<motion.div className="market-crate" key={tile.id} drag dragSnapToOrigin dragElastic={.08} whileDrag={{scale:reduced?1:1.08,zIndex:5}} onDragEnd={(_,info)=>drop(tile,info.point.x,info.point.y)} style={{'--crate-turn':`${[-4,3,-2][index]}deg`} as CSSProperties}><button onClick={()=>place(tile,word.indexOf(tile.letter))} aria-label={`Letter ${tile.letter}. Drag or tap to place it.`}>{tile.letter}</button></motion.div>)}</div>}
        {finished&&<div className="market-label-ready"><PackageOpen/><span><small>Label attached</small><strong>{word}</strong></span><Check/></div>}
        {finished&&<button className="reading-primary market-next-stall" onClick={nextWord}>{wordIndex+1===MARKET_WORDS.length?<><Sparkles/>Open the market</>:<>Next stall<ArrowRight/></>}</button>}
      </div>
    </div>
  </section>;
}

export function MarketVoiceTrail({active,stocked}:{active:string;stocked:string[]}) {
  return <div className="market-voice-trail" aria-label={`${stocked.length} of ${MARKET_WORDS.length} market labels read`}>
    {MARKET_WORDS.map(word=><div className={`${stocked.includes(word)?'is-stocked':''} ${active===word?'is-active':''}`} key={word}><span className="market-mini-awning"/><Store/><strong>{word}</strong>{stocked.includes(word)&&<Check/>}</div>)}
  </div>;
}
