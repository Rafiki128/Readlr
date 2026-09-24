import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Volume2 } from "lucide-react";
import { CVC_LESSONS } from "./cvcContent";
import { CvcSpellScene } from "./CvcSpellScene";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";

export function CvcRoyalBook({completed,onPractice}:{completed:number;onPractice:(id:number)=>void}) {
  const [page,setPage]=useState(0);
  const [turning,setTurning]=useState<{from:number;to:number;direction:number}|null>(null);
  const turningRef=useRef(false);
  const [audioError,setAudioError]=useState("");
  const audio=useBridgeAudio("/audio/stage3");
  const lessons=CVC_LESSONS.slice(0,completed);
  const lesson=lessons[page];
  function finishTurn() { if(turning) setPage(turning.to);setTurning(null);turningRef.current=false; }
  useEffect(()=>{
    if(!turning) return;
    const timer=setTimeout(finishTurn,1000);
    return()=>clearTimeout(timer);
  },[turning]);
  function turn(next:number) {
    if(turningRef.current || next<0 || next>=lessons.length) return;
    audio.stop();setAudioError("");
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setPage(next);return;}
    turningRef.current=true;
    setTurning({from:page,to:next,direction:next>page?1:-1});
  }
  function illustration(index:number) {
    const entry=lessons[index];
    return <section className="cvc-illustrated-page"><span className="cvc-page-chapter">{entry?.title??"Once upon a sound..."}</span>{entry?<CvcSpellScene word={entry.word} restored mini/>:<BookOpen size={100} strokeWidth={1}/>}<p>{entry?.result??"A kingdom full of little words is waiting for you."}</p></section>;
  }
  function reading(index:number,decorative=false) {
    const lesson=lessons[index];
    return <section className="cvc-reading-page">
      <span className="cvc-page-chapter">{lesson?"A word I brought to life":"Your story begins"}</span>
      <div className="cvc-book-word">{lesson?lesson.word.split("").map((letter,i)=><span key={i} className={/[aeiou]/.test(letter)?"is-vowel":""}>{letter}</span>):"A + MA + MAP"}</div>
      {lesson&&<p className="cvc-book-blend">{lesson.word.slice(0,2)} + {lesson.word[2]} = <strong>{lesson.word}</strong></p>}
      <div className="cvc-controls">
        {lesson&&<button disabled={!!turning||decorative} tabIndex={decorative?-1:undefined} title="Hear this word" aria-label="Hear this word" onClick={()=>{audio.stop();setAudioError("");void audio.narrateText({text:lesson.word,file:`Pronounce${lesson.word.toUpperCase()}.wav`}).catch(error=>{if(error.name!=="AbortError")setAudioError("Sound couldn't play. Tap the speaker to try again.");});}}><Volume2 size={20}/></button>}
        <button disabled={!!turning||decorative} tabIndex={decorative?-1:undefined} onClick={()=>onPractice(lesson?.id??1)} className="cvc-primary">{lesson?"Read again":"Begin my story"}<ArrowRight size={18}/></button>
      </div><small>{lesson?`${index+1} / ${lessons.length}`:"Your first page awaits"}</small>
    </section>;
  }
  return <main className="cvc-royal-library">
    <header><p className="cvc-eyebrow">Your royal storybook</p><h1>My word magic</h1></header>
    <div className="cvc-bound-book" aria-busy={!!turning}>
      <div className="cvc-book-stage">
      <div className="cvc-book-spread">
        {illustration(turning?.direction===-1?turning.to:page)}
        {reading(turning?.direction===1?turning.to:page)}
      </div>
      {turning&&<div className="cvc-turning-leaf" data-direction={turning.direction} aria-hidden="true" onAnimationEnd={event=>{if(event.target===event.currentTarget)finishTurn();}}>
        <div className="cvc-leaf-face cvc-leaf-front"><div className="cvc-leaf-desktop">{turning.direction===1?reading(turning.from,true):illustration(turning.from)}</div><div className="cvc-leaf-mobile">{illustration(turning.from)}{reading(turning.from,true)}</div></div>
        <div className="cvc-leaf-face cvc-leaf-back"><div className="cvc-leaf-desktop">{turning.direction===1?illustration(turning.to):reading(turning.to,true)}</div></div>
      </div>}
      </div>
    </div>
    <nav className="cvc-book-pagination" aria-label="Storybook pages">
      <button disabled={!!turning||page===0} title="Previous page" aria-label="Previous page" onClick={()=>turn(page-1)}><ArrowLeft/></button>
      <span aria-live="polite">{lesson?`Page ${page+1} of ${lessons.length}`:"My storybook"}</span>
      <button disabled={!!turning||page>=lessons.length-1} title="Next page" aria-label="Next page" onClick={()=>turn(page+1)}><ArrowRight/></button>
    </nav>
    {audioError&&<p role="alert" className="cvc-error">{audioError}</p>}
  </main>;
}
