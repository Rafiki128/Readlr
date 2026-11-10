import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, LockKeyhole, BookOpen, ArrowRight, Sparkles, Flag, MapPin, Star } from 'lucide-react';
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
import { MILO_NOD_EVENT } from '../../hooks/miloReactions';

const CAMP_ARRIVAL_MS=1100;
// One smooth wave through the ten stepping stones of the reading trail (stones alternate above and below the middle).
const TRAIL_PATH=Array.from({length:10},(_,i)=>[50+i*100,60+(i%2?24:-24)]).map(([x,y],i,all)=>i===0?`M${x} ${y}`:`C${all[i-1][0]+50} ${all[i-1][1]} ${x-50} ${y} ${x} ${y}`).join(' ');

interface Props {
  learnerId?:number|null; reviewMode?:boolean; blocked?:boolean;
  initialIndex?:number; onFocusBook?:(index:number)=>void;
  curriculumState?:LearnerCurriculumState; completedBooks?:string[];
  onOpenBook:(index:number)=>void; onOpenCamp:()=>void;
  onProgress?:()=>void; onStickers?:()=>void; onSounds?:()=>void; onAchievements?:()=>void;
}
export function ChronicleHome({learnerId,reviewMode=false,blocked=false,initialIndex,onFocusBook,onOpenBook,onOpenCamp,curriculumState=emptyLearnerCurriculumState(),completedBooks=[]}:Props) {
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
  // Which way the book turns when the learner moves to another book; cleared when the turn finishes.
  const [turnDir,setTurnDir]=useState<'next'|'prev'|null>(null);
  // Milo reacts on the home screen: he waves hello, glances between the child and the book, and nods at locked taps.
  const [miloWave,setMiloWave]=useState(true),[miloNodding,setMiloNodding]=useState(false),[miloLook,setMiloLook]=useState<'viewer'|'right'>('viewer');
  const bookHover=useRef(false);
  useEffect(()=>{
    let nodTimer=0;
    const hello=window.setTimeout(()=>{setMiloWave(false);setMiloLook('right');},1800);
    const glance=window.setInterval(()=>{if(!bookHover.current)setMiloLook(look=>look==='right'?'viewer':'right');},4500);
    const nod=()=>{setMiloNodding(true);window.clearTimeout(nodTimer);nodTimer=window.setTimeout(()=>setMiloNodding(false),1600);};
    window.addEventListener(MILO_NOD_EVENT,nod);
    return()=>{window.clearTimeout(hello);window.clearInterval(glance);window.clearTimeout(nodTimer);window.removeEventListener(MILO_NOD_EVENT,nod);};
  },[]);
  useEffect(()=>{if(turnDir)setMiloLook('right');},[turnDir]);
  const lookAtBook=(on:boolean)=>{bookHover.current=on;if(on)setMiloLook('right');};
  const unlockHandoff=useRef<ReadingBookUnlockTransition|null>(null);
  const transition=useWorldExit();
  // The book and Milo grow to fill the first screen: measure the home screen and size them from its height.
  const homeRef=useRef<HTMLElement>(null);
  useLayoutEffect(()=>{
    const home=homeRef.current;
    if(!home||typeof ResizeObserver==='undefined')return;
    const fit=()=>{
      const height=home.clientHeight,width=home.clientWidth;
      // Room left for the book after the title, pager, open button and trail hint; the book is 304px tall at size 1.
      const size=width<700?1:Math.max(1,Math.min(1.85,(height-205)/304,(width-120)/(2*(109+175))));
      home.style.setProperty('--home-h',`${height}px`);
      home.style.setProperty('--book-s',size.toFixed(3));
    };
    fit();
    const observer=new ResizeObserver(fit);
    observer.observe(home);
    return()=>observer.disconnect();
  },[]);
  const access=curriculumUnlocks(curriculumState,[...new Set([...completedBooks,...completed])]);
  const focusBook=(next:number)=>{
    const safe=Math.max(0,Math.min(READING_CHAPTERS.length-1,next));
    focusChosen.current=true;
    setTurnDir(safe>index?'next':safe<index?'prev':null);
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
  const doneBooks=new Set([...completedBooks,...completed]);
  const unlocked=!blocked&&(reviewMode||DEV_UNLOCK_ALL||(index===0?access.bookOne:true)&&available.includes(chapter.id));
  const sayBook=useMiloInstruction(opening?undefined:unlocked?`${chapter.title}. ${book.subtitle}. Tap ${completed.includes(chapter.id)?'Read again':'Open this book'} to start.`:`${chapter.title}. This book is still locked.`);
  // Book 1 opens after the Learning Camp practices, so its button leads there instead of sitting disabled.
  const campFirst=index===0&&!unlocked&&!blocked&&!loadingBooks&&!status&&!access.bookOne;
  const goTo=(kind:string,action:()=>void)=>{setDestination(kind);transition.exit(action,kind==='camp'?CAMP_ARRIVAL_MS:650);};
  const bookLocked=(i:number)=>blocked||!reviewMode&&!DEV_UNLOCK_ALL&&(!available.includes(READING_CHAPTERS[i].id)||(i===0&&!access.bookOne));
  const openBook=()=>{if(unlocked&&!opening&&!transition.leaving){saveReadingCarouselFocus(learnerId,index);onFocusBook?.(index);setOpening(true);}};
  return <main ref={homeRef} data-destination={destination} className={`chronicle-home ${transition.leaving?'world-is-leaving':''} ${opening?'world-is-opening':''}`} onAnimationEnd={event=>{if(event.target===event.currentTarget&&event.animationName==='world-depart')transition.finish();}}><div className="chronicle-home-scene" inert={transition.leaving}>
    <ReadingWorldBackdrop bookFocus/>
    <div className="home-tint" style={{'--tint':book.light} as CSSProperties} aria-hidden="true"/>
    <div className="home-stage">
    <section className="chronicle-carousel" aria-label="Adventure books" aria-roledescription="carousel" onKeyDown={event=>{if(opening)return;if(event.key==='ArrowLeft'){event.preventDefault();focusBook(index-1);}if(event.key==='ArrowRight'){event.preventDefault();focusBook(index+1);}}}>
      <h2 className="sr-only">{chapter.title}</h2>
      <div className="book-carousel-stage"><div className="home-guide"><CharacterCompanion state={opening?'celebrating':miloNodding?'encouraging':'idle'} gesture={miloWave||campFirst?'wave':'point'} lookAt={miloLook} size={150}/><HearMiloButton className="home-guide-hear" onClick={sayBook}/></div>
        <div className="book-carousel-track">{CHRONICLES.map((entry,i)=>{
          const distance=i-index;
          if(distance!==0)return null; // one book at a time
          const locked=blocked||!reviewMode&&!DEV_UNLOCK_ALL&&(!available.includes(READING_CHAPTERS[i].id)||(i===0&&!access.bookOne));
          return <button key={entry.emblem} tabIndex={distance===0?0:-1} onMouseEnter={()=>lookAtBook(true)} onMouseLeave={()=>lookAtBook(false)} onFocus={()=>lookAtBook(true)} onBlur={()=>lookAtBook(false)} onAnimationEnd={event=>{if(event.animationName.startsWith('book-turn'))setTurnDir(null);}} className={`chronicle-book ${turnDir&&!opening?`is-turn-${turnDir}`:''} ${opening&&distance===0?'is-opening':''} ${distance===0?'is-current':''} ${locked?'is-locked':''} ${doneBooks.has(READING_CHAPTERS[i].id)?'is-complete':locked?'':'is-ready'} ${unlocking===i?'is-unlocking':''}`} style={{'--book-color':entry.color,'--book-light':entry.light,'--offset':distance,'--distance':Math.abs(distance),'--turn':`${distance===0?-7:distance<0?22:-22}deg`,zIndex:5-Math.abs(distance)} as CSSProperties} aria-label={`${i+1}. ${READING_CHAPTERS[i].title}${locked?', locked':''}`} onClick={()=>distance===0?openBook():focusBook(i)}>
            <span className="book-pages"/><span className="book-cover"><span className="book-corner book-corner--tl"/><span className="book-corner book-corner--br"/><span className="book-volume">CHRONICLE {String(i+1).padStart(2,'0')}</span><span className="book-cover-title">{READING_CHAPTERS[i].title}</span><span className="book-emblem"><LandmarkArt kind={entry.emblem}/></span><span className="book-cover-skill">{entry.skill}</span>{locked&&<span className="book-seal"><LockKeyhole/></span>}{doneBooks.has(READING_CHAPTERS[i].id)&&<span className="book-ribbon" aria-hidden="true"><Star/></span>}{locked&&!doneBooks.has(READING_CHAPTERS[i].id)&&<span className="book-mist" aria-hidden="true"/>}</span>{distance===0&&!locked&&!doneBooks.has(READING_CHAPTERS[i].id)&&<span className="book-sparkles" aria-hidden="true"><i/><i/><i/><i/><i/></span>}
          </button>;
        })}</div>
      </div>
      <div className="book-carousel-footer" aria-live="polite"><span className="sr-only">Book {index+1} of 10</span>{unlockMessage&&<span className="book-unlock-message"><Sparkles/>{unlockMessage}</span>}<div className="home-pager"><button className="carousel-arrow carousel-arrow--prev" aria-label="Previous book" disabled={opening||transition.leaving||index===0} onClick={()=>focusBook(index-1)}><ChevronLeft/></button>{campFirst?<button className="world-primary" disabled={opening||transition.leaving} onClick={()=>goTo('camp',onOpenCamp)}><Sparkles/>Start at Learning Camp <ArrowRight/></button>:<button className="world-primary" disabled={!unlocked} onClick={openBook}>{unlocked?<BookOpen/>:<LockKeyhole/>}{unlocked?completed.includes(chapter.id)?'Read again':'Open this book':blocked?'Adventure is paused':loadingBooks?'Loading books...':status?'Book access unavailable':index===0?'Visit Learning Camp to begin':`Finish Book ${index} to unlock`} {unlocked&&<ArrowRight/>}</button>}<button className="carousel-arrow carousel-arrow--next" aria-label="Next book" disabled={opening||transition.leaving||index===9} onClick={()=>focusBook(index+1)}><ChevronRight/></button></div>{status&&<p role="status">{status} <button disabled={loadingBooks} onClick={()=>setRetry(value=>value+1)}>Retry</button></p>}</div>
    </section>
    <button type="button" className="home-trail-hint" onClick={()=>document.getElementById('home-reading-trail')?.scrollIntoView({behavior:'smooth',block:'center'})}><MapPin aria-hidden="true"/>My reading trail<ChevronDown aria-hidden="true"/></button>
    </div>
    <nav className="book-trail" id="home-reading-trail" aria-label="My reading trail">
      <div className="book-trail-head"><span><MapPin aria-hidden="true"/>My reading trail</span><strong>{completed.length} of 10 books read</strong></div>
      <div className="book-trail-track"><svg className="book-trail-line" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path className="book-trail-road" d={TRAIL_PATH}/><path className="book-trail-dash" d={TRAIL_PATH}/></svg>
        <ol>{READING_CHAPTERS.map((entry,i)=>{const done=completed.includes(entry.id),locked=bookLocked(i)&&!done,here=i===index;return <li key={entry.id} style={{'--step':i,'--dy':i%2?'1':'-1'} as CSSProperties}>
          <button className={`book-trail-stone ${done?'is-done':''} ${locked?'is-locked':''} ${here?'is-here':''}`} style={{'--book-color':CHRONICLES[i].color,'--book-light':CHRONICLES[i].light} as CSSProperties} aria-current={here?'true':undefined} aria-label={`Book ${i+1}: ${entry.title}${done?', read':locked?', locked':''}`} title={`Book ${i+1}: ${entry.title}`} disabled={opening||transition.leaving} onClick={()=>focusBook(i)}>{done?<Star/>:locked?<LockKeyhole/>:<span>{i+1}</span>}</button>
          {here&&<span className="book-trail-flag" aria-hidden="true"><Flag/></span>}
        </li>;})}</ol>
      </div>
    </nav>
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
