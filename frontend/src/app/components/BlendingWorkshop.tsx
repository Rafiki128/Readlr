import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Hammer, Lock, Mic, Star, Route, Volume2, Link2 } from "lucide-react";
import { BridgePractice } from "./BridgePractice";
import { WorkshopHouse } from "./BridgeJourneyArt";
import { ContinuousBridgeLandscape } from "./ContinuousBridgeLandscape";
import { CROSSING_SPOTS, LANDSCAPE_HEIGHT } from "./bridgeMapLayout";
import { CharacterCompanion } from "./CharacterCompanion";
import { bridgeStorageKey, finishBridgeJourney, readBridgeJourney } from "./stageTwoContent";
import { WORKSHOP_LESSONS, randomizedCrossingLessons, type BridgeLesson } from "./bridgeCurriculum";
import { BridgeSoundShelf } from "./BridgeSoundShelf";
import "./blendingWorkshop.css";
import "./bridgeJourney.css";
import "./continuousLandscape.css";

export function BlendingWorkshop({ learnerId, initialView = "workshop", onBack }: {
  learnerId?: number | null; initialView?: "workshop" | "bridges"; onBack: () => void;
}) {
  const [progress, setProgress] = useState(() => readBridgeJourney(learnerId));
  const [activity, setActivity] = useState<BridgeLesson | null>(null);
  const [room, setRoom] = useState(initialView !== "bridges");
  const [shelfOpen, setShelfOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const trained = progress.training.length === 5;
  const journeyLessons = useMemo(() => randomizedCrossingLessons(learnerId), [learnerId]);
  const next = journeyLessons.findIndex((_,i)=>!progress.crossings.includes(i+1));
  const nextTraining = WORKSHOP_LESSONS.findIndex((_,i)=>!progress.training.includes(i+1));
  function openLesson(lesson: BridgeLesson) { setActivity(lesson); }
  function complete() {
    if (!activity) return;
    const index = Number(activity.id.split("-")[1]);
    const updated = finishBridgeJourney(progress, activity.training, index);
    setProgress(updated);
    const key = bridgeStorageKey(learnerId);
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(updated)); setSaveError(false); }
      catch { setSaveError(true); }
    }
  }
  useEffect(() => {
    if (activity) return;
    if (scroll.current) scroll.current.scrollTop = 0;
    const timer=window.setTimeout(()=>{
      if (!scroll.current) return;
      if (!room && current.current) {
        const view = scroll.current;
        const target = current.current.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop - view.clientHeight * .48;
        view.scrollTo({ top: Math.max(0, target), behavior: reducedMotion ? "instant" : "smooth" });
      }
    }, reducedMotion ? 0 : 480);
    return ()=>window.clearTimeout(timer);
  },[room,activity,shelfOpen,progress.crossings.length,reducedMotion]);

  if (activity) return <BridgePractice key={activity.id} lesson={activity}
    onBack={() => { setRoom(activity.training); setActivity(null); }} onComplete={complete}
    onNext={activity.training && nextTraining >= 0 && nextTraining !== Number(activity.id.split("-")[1])-1
      ? ()=>openLesson(WORKSHOP_LESSONS[nextTraining]) : undefined} />;

  return <div className="bridge-adventure">
    <header className="bridge-nav">
      <button onClick={onBack}><ArrowLeft size={19} />Stages</button>
      <span><Star size={17} />{progress.points} points</span>
      <button onClick={()=>setRoom(!room)}>{room ? <Route size={19} /> : <Hammer size={19} />}{room ? "Journey map" : "Workshop"}</button>
    </header>
    <div className="bridge-adventure__scroll" ref={scroll}>
      <div className="journey-heading"><p>CHAPTER 2</p><h1>{room ? shelfOpen ? "Sound shelf" : "Milo's Bridge Workshop" : "Blending Bridges"}</h1><span>{room ? "Little sounds. Wonderful things to build." : "From the bubbling brook to the sky gardens."}</span></div>
      {saveError && <p role="alert" className="bridge-save-warning">Practice complete, but saving failed. Ask a grown-up to check browser storage.</p>}
      <AnimatePresence mode="wait">
      <motion.div key={room ? shelfOpen ? "sound-shelf" : "workshop" : "bridge-map"}
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: reducedMotion ? 0 : .3, ease: "easeOut" }}>
      {room ? <>
        <div className="workshop-views" role="group" aria-label="Workshop activities">
          <button aria-pressed={!shelfOpen} onClick={()=>setShelfOpen(false)}><Hammer size={20}/>Training</button>
          <button aria-pressed={shelfOpen} onClick={()=>setShelfOpen(true)}><Volume2 size={20}/>Sound shelf</button>
        </div>
        {shelfOpen ? <BridgeSoundShelf unlocked={trained} /> : <section className="sound-workshop" aria-label="Bridge Workshop training room">
          <div className="sound-workshop__art"><WorkshopHouse interior /></div>
          <div className="sound-workshop__crest"><Hammer size={24}/><span>{progress.training.length} / 5 training stations</span></div>
          <div className="sound-workshop__milo"><CharacterCompanion size={145} state="idle" /></div>
          <div className="sound-workshop__stations">
            {WORKSHOP_LESSONS.map((lesson,i)=>{
              const done=progress.training.includes(i+1);
              const locked=i>0&&!progress.training.includes(i)&&!done;
              return <button key={lesson.id} className="workshop-station" disabled={locked} data-done={done} data-next={i===nextTraining} onClick={()=>openLesson(lesson)} aria-label={`${lesson.title}, ${done?"practise again":locked?"locked":"start"}`}>
                <span className="workshop-station__piece">{lesson.blend.toLowerCase()}<i>{done?<Check size={15}/>:locked?<Lock size={15}/>:<Mic size={15}/>}</i></span>
                <strong>{lesson.title}</strong><small>{done?"Practise again":locked?"Coming next":"Let's build!"}</small>
              </button>;
            })}
          </div>
          <div className="sound-workshop__exit"><button className="bridge-primary" onClick={()=>trained?setRoom(false):openLesson(WORKSHOP_LESSONS[nextTraining])}>{trained?<Route size={20}/>:<Mic size={20}/>} {trained?"Into the adventure":progress.training.length?"Continue training":"Train with Milo"}</button></div>
        </section>}
        {!shelfOpen && progress.training.length > 0 && <div className="sound-link-kit" aria-label="Milo's Bridge Kit"><span>Milo's Bridge Kit</span>{WORKSHOP_LESSONS.filter((_,i)=>progress.training.includes(i+1)).map(item=><strong key={item.id}><Link2 size={18}/>{item.blend.toLowerCase()}</strong>)}</div>}
      </> : <>
        {!trained && <div className="journey-training-note"><Hammer size={20}/><span>Finish the five Workshop stations to begin repairing bridges.</span><button onClick={()=>setRoom(true)}>Back to training <ArrowRight size={18}/></button></div>}
        <section className="continuous-landscape" aria-label="Journey from brook to sky">
          <ContinuousBridgeLandscape completed={progress.crossings}/>
          <div className="sky-garden-title"><Star size={24}/><h2>Sky Garden</h2><p>{progress.crossings.length===15?"You made it bloom!":`${progress.crossings.length} / 15 bridges restored`}</p></div>
          <div className="kingdom-sign" data-ready={progress.crossings.length===15}><span>Next adventure</span><h3>CVC Kingdom</h3><p>{progress.crossings.length===15?"A new story awaits":<><Lock size={14}/> Restore all bridges</>}</p></div>
          {journeyLessons.map((lesson,i)=>{
            const index=i+1; const done=progress.crossings.includes(index);
            const locked=!done&&(!trained||(index>1&&!progress.crossings.includes(index-1)));
            const {x,y}=CROSSING_SPOTS[i];
            return <div key={lesson.id} className="journey-stop landscape-stop" style={{left:`${x/10}%`,top:`${y/LANDSCAPE_HEIGHT*100}%`}} data-done={done}>
              {index===next+1&&trained&&<div className="journey-stop__milo"><CharacterCompanion state="idle" size={65}/></div>}
              <button ref={index===next+1?current:undefined} disabled={locked} onClick={()=>openLesson(lesson)} aria-label={`${lesson.title}, ${done?"repaired, practise again":locked?"locked":"repair bridge"}`}>{done?<Check size={25}/>:locked?<Lock size={21}/>:<Hammer size={24}/>}</button>
              <span>{lesson.title}</span>
            </div>;
          })}
          <button className="landscape-workshop" onClick={()=>setRoom(true)}><WorkshopHouse/><strong>Bridge Workshop</strong><small>{trained?"Practise your sound teams":"Start here with Milo"}</small></button>
        </section>
      </>}
      </motion.div>
      </AnimatePresence>
    </div>
    {!room&&trained&&next>=0&&<footer className="journey-footer"><span>Next: {journeyLessons[next].title}</span><button className="bridge-primary" onClick={()=>openLesson(journeyLessons[next])}>Continue <ArrowRight size={19}/></button></footer>}
  </div>;
}
