import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole, BookOpen, Check, ArrowRight, Sparkles } from 'lucide-react';
import { LandmarkArt } from './AdventureArt';
import { ReadingWorldBackdrop } from './ReadingWorldBackdrop';
import { CHRONICLES } from './chronicleContent';
import { READING_CHAPTERS } from './aralCurriculum';
import { CharacterCompanion } from './CharacterCompanion';
import { loadReadingProgress, loadDevelopmentReadingProgress } from '../../hooks/readingCheckpoints';
import { devicePracticeNotice } from '../../hooks/readingProgressError';
import { useWorldExit } from './useWorldExit';
import { consumeReadingBookUnlock, readReadingAccessSnapshot, readReadingCarouselFocus, saveReadingAccessSnapshot, saveReadingCarouselFocus, type ReadingBookUnlockTransition } from '../../hooks/readingLocalProgress';
import { curriculumUnlocks, DEV_UNLOCK_ALL, emptyLearnerCurriculumState, type LearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import './chronicleWorld.css';
import './campArrival.css';
import { HearMiloButton, useMiloInstruction } from './MiloSays';

const CAMP_ARRIVAL_MS=1100;

interface Props {
  learnerId?:number|null; reviewMode?:boolean; blocked?:boolean;
  initialIndex?:number; onFocusBook?:(index:number)=>void;
  curriculumState?:LearnerCurriculumState; completedBooks?:string[];
  onOpenBook:(index:number)=>void; onOpenCamp:()=>void;
  onProgress?:()=>void; onStickers?:()=>void; onSounds?:()=>void; onAchievements?:()=>void;
}
export function ChronicleHome({learnerId,reviewMode=false,blocked=false,initialIndex,onFocusBook,onOpenBook,onOpenCamp,onProgress,onStickers,onSounds,onAchievements,curriculumState=emptyLearnerCurriculumState(),completedBooks=[]}:Props) {
  const cached=learnerId?readReadingAccessSnapshot(learnerId):null;
  const storedFocus=readReadingCarouselFocus(learnerId);
  const suggestedFocus=cached?Math.max(0,READING_CHAPTERS.findIndex(c=>cached.available.includes(c.id)&&!cached.completed.includes(c.id))):0;
  const [index,setIndex]=useState(()=>storedFocus??initialIndex??suggestedFocus);
  const focusChosen=useRef(storedFocus!==null||initialIndex!==undefined);
  const [completed,setCompleted]=useState<string[]>(cached?.completed??[]);
  const [available,setAvailable]=useState<string[]>(reviewMode?READING_CHAPTERS.map(c=>c.id):cached?.available??[]);
  const [status,setStatus]=useState('');
  const [retry,setRetry]=useState(0);
  const [loadingBooks,setLoadingBooks]=useState(!reviewMode);
  const [opening,setOpening]=useState(false);
  const [destination,setDestination]=useState('');
  const [unlocking,setUnlocking]=useState<number|null>(null);
  const [unlockMessage,setUnlockMessage]=useState('');
  const unlockHandoff=useRef<ReadingBookUnlockTransition|null>(null);
  const transition=useWorldExit();
  const access=curriculumUnlocks(curriculumState,[...new Set([...completedBooks,...completed])]);
  const focusBook=(next:number)=>{
    const safe=Math.max(0,Math.min(READING_CHAPTERS.length-1,next));
    focusChosen.current=true;
    setIndex(safe);
    saveReadingCarouselFocus(learnerId,safe);
    onFocusBook?.(safe);
  };
  useEffect(()=>{
    if(reviewMode||learnerId===null||learnerId===undefined)return;
    if(!unlockHandoff.current)unlockHandoff.current=consumeReadingBookUnlock(learnerId);
    const handoff=unlockHandoff.current;
    if(!handoff)return;
    focusChosen.current=true;
    if(index!==handoff.from)setIndex(handoff.from);
    const move=window.setTimeout(()=>focusBook(handoff.to),380);
    const reveal=window.setTimeout(()=>{setUnlocking(handoff.to);setUnlockMessage(`Book ${handoff.to+1} unlocked!`);},1050);
    const settle=window.setTimeout(()=>{setUnlocking(null);setUnlockMessage('');unlockHandoff.current=null;},2450);
    return()=>{window.clearTimeout(move);window.clearTimeout(reveal);window.clearTimeout(settle);};
  },[learnerId,reviewMode]);
  useEffect(()=>{
    if(!learnerId||localStorage.getItem(`readlr_camp_unlock_v1_${learnerId}`)!=='ready')return;
    localStorage.removeItem(`readlr_camp_unlock_v1_${learnerId}`);focusBook(0);
    const reveal=window.setTimeout(()=>{setUnlocking(0);setUnlockMessage('Book 1 unlocked!');},450);
    const settle=window.setTimeout(()=>{setUnlocking(null);setUnlockMessage('');},2100);
    return()=>{window.clearTimeout(reveal);window.clearTimeout(settle);};
  },[learnerId]);
  useEffect(()=>{
    saveReadingCarouselFocus(learnerId,index);
    onFocusBook?.(index);
  },[index,learnerId,onFocusBook]);
  useEffect(()=>{
    if(!opening)return;
    const timer=setTimeout(()=>onOpenBook(index),650);
    return()=>clearTimeout(timer);
  },[opening,index,onOpenBook]);
  useEffect(()=>{
    if(reviewMode)return;
    setLoadingBooks(true);
    const cachedAccess=learnerId?readReadingAccessSnapshot(learnerId):null;
    if(cachedAccess){setCompleted(cachedAccess.completed);setAvailable(cachedAccess.available);if(!focusChosen.current)setIndex(Math.max(0,READING_CHAPTERS.findIndex(c=>cachedAccess.available.includes(c.id)&&!cachedAccess.completed.includes(c.id))));}
    const controller=new AbortController();
    let initialLoad=true;
    const refresh=()=>void loadReadingProgress(controller.signal).then(p=>{
      if(controller.signal.aborted)return;
      setCompleted(p.completed);setAvailable(p.available);if(learnerId)saveReadingAccessSnapshot(learnerId,{completed:p.completed,available:p.available,openChallenges:p.openChallenges??[]});
      if(initialLoad&&!focusChosen.current)setIndex(Math.max(0,READING_CHAPTERS.findIndex(c=>p.available.includes(c.id)&&!p.completed.includes(c.id))));
      initialLoad=false;
      setStatus('');
    }).catch(async error=>{
      if(controller.signal.aborted)return;
      if(import.meta.env.DEV&&learnerId){try{const p=await loadDevelopmentReadingProgress(learnerId,controller.signal);if(controller.signal.aborted)return;setCompleted(p.completed);setAvailable(p.available);saveReadingAccessSnapshot(learnerId,{completed:p.completed,available:p.available,openChallenges:p.openChallenges??[]});setStatus(devicePracticeNotice(error));}catch{if(!controller.signal.aborted)setStatus('Teacher access could not be verified. Please reconnect.');}}
      else setStatus('Your books could not load. Please try again.');
    }).finally(()=>{if(!controller.signal.aborted)setLoadingBooks(false);});
    refresh();
    const timer=window.setInterval(refresh,15000);
    return()=>{controller.abort();window.clearInterval(timer);};
  },[learnerId,reviewMode,retry]);
  const book=CHRONICLES[index],chapter=READING_CHAPTERS[index];
  const unlocked=!blocked&&(reviewMode||DEV_UNLOCK_ALL||(index===0?access.bookOne:true)&&available.includes(chapter.id));
  const sayBook=useMiloInstruction(opening?undefined:unlocked?`${chapter.title}. ${book.subtitle}. Tap ${completed.includes(chapter.id)?'Read again':'Open this book'} to start.`:`${chapter.title}. This book is still locked.`);
  const openBook=()=>{if(unlocked&&!opening&&!transition.leaving){saveReadingCarouselFocus(learnerId,index);onFocusBook?.(index);setOpening(true);}};
  const places=[
    {kind:'camp',label:'Learning Camp',hint:access.camp?'Sounds & blending':'Finish your 3 guided practices',action:onOpenCamp,unlocked:true},
    {kind:'progress',label:'My Progress',hint:access.progress?'See how you grow':'Complete Book 1',action:onProgress,unlocked:access.progress},
    {kind:'stickers',label:'Sticker Book',hint:access.stickers?'Your collection':'Finish Book 1’s first 3 stops',action:onStickers,unlocked:access.stickers},
    {kind:'sound',label:'Sound Library',hint:access.sounds?'Listen & explore':'Finish Book 1’s first 3 stops',action:onSounds,unlocked:access.sounds},
  ];
  return <main data-destination={destination} className={`chronicle-home ${transition.leaving?'world-is-leaving':''} ${opening?'world-is-opening':''}`} onAnimationEnd={event=>{if(event.target===event.currentTarget&&event.animationName==='world-depart')transition.finish();}}><div className="chronicle-home-scene" inert={transition.leaving}>
    <ReadingWorldBackdrop/>
    <header className="world-welcome"><div><p>Your reading world</p><h1>A new story awaits.</h1></div><div className="world-milo"><CharacterCompanion state="idle" gesture="wave" size={108}/><span>Come read with me!<HearMiloButton onClick={sayBook}/></span></div></header>
    <div className="home-landmarks" aria-label="Places to visit">{places.map(place=>place.action&&<button key={place.kind} disabled={opening||transition.leaving||!place.unlocked} className={`world-place world-place--${place.kind} ${place.unlocked?'':'is-locked'}`} onClick={()=>{setDestination(place.kind);if(place.action)transition.exit(place.action,place.kind==='camp'?CAMP_ARRIVAL_MS:650);}} data-tour={place.label}><LandmarkArt kind={place.kind}/>{!place.unlocked&&<LockKeyhole className="world-place-lock"/>}<span className="world-sign">{place.label}<small>{place.hint}</small></span></button>)}</div>
    <section className="chronicle-carousel" aria-label="Adventure books" aria-roledescription="carousel" onKeyDown={event=>{if(opening)return;if(event.key==='ArrowLeft'){event.preventDefault();focusBook(index-1);}if(event.key==='ArrowRight'){event.preventDefault();focusBook(index+1);}}}>
      <div className="chronicle-heading"><span>The reading chronicles</span><h2>{chapter.title}</h2><p>{book.subtitle}</p></div>
      <div className="book-carousel-stage">
        <button className="carousel-arrow carousel-arrow--prev" aria-label="Previous book" disabled={opening||transition.leaving||index===0} onClick={()=>focusBook(index-1)}><ChevronLeft/></button>
        <div className="book-carousel-track">{CHRONICLES.map((entry,i)=>{
          const distance=i-index;
          if(Math.abs(distance)>2)return null;
          const locked=blocked||!reviewMode&&!DEV_UNLOCK_ALL&&(!available.includes(READING_CHAPTERS[i].id)||(i===0&&!access.bookOne));
          return <button key={entry.emblem} tabIndex={distance===0?0:-1} className={`chronicle-book ${opening&&distance===0?'is-opening':''} ${distance===0?'is-current':''} ${locked?'is-locked':''} ${unlocking===i?'is-unlocking':''}`} style={{'--book-color':entry.color,'--book-light':entry.light,'--offset':distance,'--distance':Math.abs(distance),'--turn':`${distance===0?-7:distance<0?22:-22}deg`,zIndex:5-Math.abs(distance)} as CSSProperties} aria-label={`${i+1}. ${READING_CHAPTERS[i].title}${locked?', locked':''}`} onClick={()=>distance===0?openBook():focusBook(i)}>
            <span className="book-pages"/><span className="book-cover"><span className="book-corner book-corner--tl"/><span className="book-corner book-corner--br"/><span className="book-volume">CHRONICLE {String(i+1).padStart(2,'0')}</span><span className="book-cover-title">{READING_CHAPTERS[i].title}</span><span className="book-emblem"><LandmarkArt kind={entry.emblem}/></span><span className="book-cover-skill">{entry.skill}</span><span className="book-seal">{completed.includes(READING_CHAPTERS[i].id)?<Check/>:locked?<LockKeyhole/>:<BookOpen/>}</span></span>
          </button>;
        })}</div>
        <button className="carousel-arrow carousel-arrow--next" aria-label="Next book" disabled={opening||transition.leaving||index===9} onClick={()=>focusBook(index+1)}><ChevronRight/></button>
      </div>
      <div className="book-carousel-footer" aria-live="polite"><span className="book-position">Book {index+1} of 10 {completed.includes(chapter.id)&&' · Complete'}</span>{unlockMessage&&<span className="book-unlock-message"><Sparkles/>{unlockMessage}</span>}<button className="world-primary" disabled={!unlocked} onClick={openBook}>{unlocked?<BookOpen/>:<LockKeyhole/>}{unlocked?completed.includes(chapter.id)?'Read again':'Open this book':blocked?'Adventure is paused':loadingBooks?'Loading books...':status?'Book access unavailable':index===0?'Visit Learning Camp to begin':`Finish Book ${index} to unlock`} {unlocked&&<ArrowRight/>}</button>{status&&<p role="status">{status} <button disabled={loadingBooks} onClick={()=>setRetry(value=>value+1)}>Retry</button></p>}</div>
    </section>
    <footer className="world-footer"><span>{completed.length} of 10 chronicles complete</span>{onAchievements&&<button disabled={!access.achievements} onClick={()=>access.achievements&&transition.exit(onAchievements)}>{access.achievements?'My achievements':'Achievements unlock after Book 1'} {access.achievements?<ArrowRight size={16}/>:<LockKeyhole size={16}/>}</button>}</footer>
  </div>{transition.leaving&&destination==='camp'&&<div className="camp-arrival" role="status" aria-live="polite">
    <div className="camp-arrival-scene" aria-hidden="true">
      <div className="camp-arrival-milo"><CharacterCompanion state="encouraging" gesture="wave" size={150}/></div>
      <LandmarkArt kind="camp"/>
      <div className="camp-arrival-letters"><span>m</span><span>a</span><span>t</span></div>
    </div>
    <p>On our way to Camp!</p>
    <div className="camp-arrival-progress" aria-hidden="true" style={{'--camp-arrival-duration':`${CAMP_ARRIVAL_MS}ms`} as CSSProperties}><span/></div>
  </div>}</main>;
}
