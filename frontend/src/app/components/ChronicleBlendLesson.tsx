import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Volume2 } from 'lucide-react';
import { CharacterCompanion } from './CharacterCompanion';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { chronicleBlendWords } from './chronicleLessons';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { clearGuidedBlendStep, readGuidedBlendStep, saveGuidedBlendStep } from '../../hooks/readingLocalProgress';

export function ChronicleBlendLesson({learnerId,index,onBack,onComplete}:{learnerId:number;index:number;onBack:()=>void;onComplete:()=>void}) {
  const words=chronicleBlendWords(index);
  const reduced=useReducedMotion();
  const [step,setStep]=useState(()=>Math.min(words.length-1,readGuidedBlendStep(learnerId,index))),[joined,setJoined]=useState(false),[heard,setHeard]=useState(false),[message,setMessage]=useState('');
  const [activeLetter,setActiveLetter]=useState(-1),[pulled,setPulled]=useState<number[]>([]),[joining,setJoining]=useState(false);
  const finished=useRef(false);
  const sound=useBridgeAudio('/audio/stage3');
  const word=words[step];
  async function listen(){
    setMessage('');
    const shortVowels:Record<string,string>={a:'/audio/stage1/classic-milo/A.wav',e:'/audio/stage1/classic-milo/E.wav',i:'/audio/stage1/classic-milo/I.wav',o:'/audio/stage1/classic-milo/O.wav',u:'/audio/stage1/classic-milo/U.wav'};
    // Silent-e and vowel-team words such as cape and tree must not sound out short vowels.
    const singleVowel=word.match(/[aeiou]/g)?.length===1;
    // In a silent-e word such as cape, the vowel plays its long sound and the final e stays silent.
    const silentE=/^[^aeiou]*[aeiou][^aeiou]e$/.test(word);
    try{
      for(let i=0;i<word.length;i++){
        setActiveLetter(i);
        if(silentE&&i===word.length-1){await sound.wait(500);continue;}
        const file=/[bcdfghj-np-tv-z]/.test(word[i])?`/audio/stage2/classic-milo/SoundShelf-${word[i].toUpperCase()}.wav`:singleVowel?shortVowels[word[i]]:silentE?`/audio/stage3/classic-milo/VowelSound-${word.toUpperCase()}.wav`:undefined;
        if(file)await sound.play(file);else await sound.narrateText({file:'',text:word[i]});
        await sound.wait(140);
      }
      setActiveLetter(-1);
      await sound.narrateText({file:`Pronounce${word.toUpperCase()}.wav`,text:word});
      setHeard(true);
    }catch(e){setActiveLetter(-1);if((e as Error).name!=='AbortError')setMessage('Tap to hear the sounds again.');}
  }
  async function join(){
    setJoining(true);setMessage('The sounds are sliding together.');
    try{await sound.wait(reduced?0:620);setJoined(true);setJoining(false);await sound.narrateText({file:`Pronounce${word.toUpperCase()}.wav`,text:word});}
    catch(e){setJoining(false);if((e as Error).name!=='AbortError')setMessage('The word audio could not play.');}
  }
  function placeLetter(index:number,target=index){
    if(!heard||joining||joined)return;
    if(index!==target){setMessage('That letter has its own dotted space. Try the matching space.');return;}
    const next=[...new Set([...pulled,index])];setPulled(next);setMessage('');
    const required=[...word].map((_,i)=>i);
    if(required.every(i=>next.includes(i)))void join();
  }
  function dropLetter(index:number,x:number,y:number){
    const slot=document.elementsFromPoint(x,y).find(element=>element instanceof HTMLElement&&element.dataset.blendSlot!==undefined) as HTMLElement|undefined;
    if(!slot){setMessage('Drop the tile inside its dotted space.');return;}
    placeLetter(index,Number(slot.dataset.blendSlot));
  }
  function nextWord(){
    sound.stop();
    if(step===words.length-1){finishLesson();return;}
    const next=step+1;saveGuidedBlendStep(learnerId,index,next);
    setStep(next);setJoined(false);setHeard(false);setPulled([]);setActiveLetter(-1);setMessage('');
  }
  function finishLesson(){
    if(finished.current)return;
    finished.current=true;sound.stop();clearGuidedBlendStep(learnerId,index);onComplete();
  }
  useEffect(()=>{
    if(!joined||step!==words.length-1)return;
    const timer=window.setTimeout(finishLesson,1600);
    return()=>window.clearTimeout(timer);
  },[joined,step,words.length]);
  return <div className="book-blending-lesson">
    <header className="book-blend-toolbar"><button className="reading-icon activity-back-button" title="Back to book" aria-label="Back to book" onClick={()=>{sound.stop();onBack();}}><ArrowLeft/></button><span>Word {step+1} of {words.length}</span></header>
    <div className="book-blend-scene"><CharacterCompanion state={sound.isPlaying?'speaking':joined?'celebrating':'idle'} size={150}/><ReadingAnchorArt word={word}/></div>
    <h2>{joined?'The sounds made a word!':!heard?'Listen to the word':joining?'The sounds are joining...':'Bring the sounds together'}</h2>
    <p>{index===0?'Keep /m/ humming, use short /a/, and make /t/ quick.':index===1?'Listen for the middle light: short /a/, /e/, or /i/.':'Listen to the word. Notice how its letters work together.'}</p>
    <LayoutGroup id={`blend-${word}`}><div className="book-blend-board">
      <div className={`blend-word-dock ${heard?'is-ready':''} ${joined?'is-filled':''}`} aria-label={joined?`Blended word: ${word}`:'Dotted letter spaces'}>
        {joined?<motion.strong layoutId={`whole-${word}`} className="blend-docked-word">{word}</motion.strong>:[...word].map((letter,i)=><i data-blend-slot={i} className={pulled.includes(i)?'has-letter':''} key={i}>{pulled.includes(i)&&<motion.span layoutId={`blend-${word}-${i}`} transition={{duration:reduced?0:.38,ease:[.22,.7,.2,1]}} className={`${/[aeiou]/i.test(letter)?'blend-vowel':'blend-consonant'} ${activeLetter===i?'is-sounding':''}`}><span className="blend-letter-glyph">{letter}</span></motion.span>}</i>)}
      </div>
      <div key={word} className={`book-sound-join ${joining?'is-joining':''} ${joined?'is-joined':''}`} aria-label={joined?`Blended word: ${word}`:`Letter tiles: ${[...word].join(', ')}`}>
        {!joined&&[...word].map((letter,i)=>pulled.includes(i)?null:<motion.span layoutId={`blend-${word}-${i}`} drag={heard&&!joining} dragConstraints={{left:-320,right:320,top:-190,bottom:190}} dragElastic={.08} whileDrag={{scale:reduced?1:1.08,cursor:'grabbing',zIndex:4}} onDragEnd={(_,info)=>dropLetter(i,info.point.x,info.point.y)} tabIndex={heard?0:-1} role="button" aria-label={`Drag ${letter} to dotted space ${i+1}`} onKeyDown={event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();placeLetter(i);}}} transition={{duration:reduced?0:.38,ease:[.22,.7,.2,1]}} className={`${/[aeiou]/i.test(letter)?'blend-vowel':'blend-consonant'} ${activeLetter===i?'is-sounding':''}`} key={i}><span className="blend-letter-glyph">{letter}</span></motion.span>)}
      </div>
      <p className="blend-result-label" aria-live="polite">{joined?`${word}! You built the word.`:joining?'Blending...':heard?'Drag every colored tile into its dotted space.':'Listen. Then bring the letters together.'}</p>
    </div></LayoutGroup>
    {(!heard||joined)&&<div className="reading-actions book-sequential-action" aria-live="polite">
      {!heard?<button className="world-primary" disabled={sound.isPlaying} onClick={()=>void listen()}><Volume2/>{sound.isPlaying?'Listening...':`Hear ${word}`}</button>
        :<button className="world-primary" disabled={sound.isPlaying} onClick={nextWord}>{step===words.length-1?'Return to my trail':'Next word'}<ArrowRight/></button>}
    </div>}
    {heard&&!joining&&<details key={word} className="book-practice-help"><summary>Practice again</summary><button className="reading-icon" title="Listen again" aria-label="Listen again" disabled={sound.isPlaying} onClick={()=>void listen()}><Volume2/></button>{joined&&<button className="reading-icon" title="Separate the letters" aria-label="Separate the letters" disabled={sound.isPlaying} onClick={()=>{setJoined(false);setPulled([]);}}><RotateCcw/></button>}</details>}
    <p role="status">{message}</p>
  </div>;
}
