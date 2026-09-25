import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Crown, Lock, Printer, Sparkles } from "lucide-react";
import { CvcChallenge } from "./CvcChallenge";
import { CvcCastle, CvcCrown, WordObject } from "./CvcArt";
import { CvcSpellScene } from "./CvcSpellScene";
import { CvcCastleInterior } from "./CvcCastleInterior";
import { CASTLE_STOPS } from "./cvcCastleMap";
import { CvcRoyalBook } from "./CvcRoyalBook";
import { CVC_AREAS, CVC_LESSONS, cvcStorageKey, finishCvcLesson, readCvcJourney, restoreCrownJewel, type CvcJourney } from "./cvcContent";
import "./cvcKingdom.css";
import "./cvcCastleMap.css";
import "./cvcFinalRealm.css";
import { notifyJourneyChanged, JOURNEY_RESTORED } from "./journeySync";

interface Props { learnerId?:number|null; onBack:()=>void }
export function CvcKingdom({learnerId,onBack}:Props) {
  const [journey,setJourney]=useState(()=>readCvcJourney(learnerId));
  const current=useRef(journey);
  useEffect(()=> {
    const restore=(event:Event)=> { if((event as CustomEvent).detail===learnerId) {const saved=readCvcJourney(learnerId);current.current=saved;setJourney(saved);} };
    window.addEventListener(JOURNEY_RESTORED,restore);
    return()=>window.removeEventListener(JOURNEY_RESTORED,restore);
  },[learnerId]);
  const [activity,setActivity]=useState<{id:number;jewel:number}|null>(null);
  const [view,setView]=useState<"map"|"book"|"crown">("map");
  const [saveError,setSaveError]=useState(false);
  const [name,setName]=useState("");
  const [entering,setEntering]=useState(true);
  useEffect(()=>{const timer=setTimeout(()=>setEntering(false),2400);return()=>clearTimeout(timer);},[]);
  const viewport=useRef<HTMLDivElement>(null);
  const target=useRef<HTMLButtonElement>(null);
  const last=useRef(journey.completed+1);
  useEffect(()=> {
    if(activity || view!=="map" || entering) return;
    const timer=setTimeout(()=>{
      const node=target.current, container=viewport.current;
      if(node&&container) container.scrollTo({top:node.offsetTop-container.clientHeight*.48,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    },500);
    return ()=>clearTimeout(timer);
  },[activity,view,entering]);
  function save(next:CvcJourney) {
    current.current=next; setJourney(next);
    const key=cvcStorageKey(learnerId);
    if(key) { try { localStorage.setItem(key,JSON.stringify(next)); setSaveError(false); } catch { setSaveError(true); } }
    notifyJourneyChanged(learnerId);
  }
  function open(id:number) {
    if(id>current.current.completed+1) return;
    last.current=id;
    setActivity({id,jewel:id===20&&current.current.jewels<3?current.current.jewels:0});
  }
  function next() {
    if(activity?.id===20) {
      if(activity.jewel<2) setActivity({...activity,jewel:activity.jewel+1});
      else { setActivity(null); setView("crown"); }
    } else { setActivity(null); }
  }
  if(activity) return <CvcChallenge key={`${activity.id}-${activity.jewel}`} lesson={CVC_LESSONS.find(item=>item.id===activity.id)} jewel={activity.jewel}
    onBack={()=>setActivity(null)} onNext={next} onComplete={()=>save(activity.id===20?restoreCrownJewel(current.current,activity.jewel):finishCvcLesson(current.current,activity.id))}/>;
  const points=journey.completed*100;
  const positions=CASTLE_STOPS;
  return <div className="cvc-root cvc-kingdom">
    {entering&&<div className="cvc-realm-entry" role="status"><div className="cvc-entry-door cvc-entry-door--left"/><div className="cvc-entry-door cvc-entry-door--right"/><div className="cvc-entry-title"><Crown size={42}/><p>The final adventure</p><h1>CVC Kingdom</h1><button onClick={()=>setEntering(false)}>Enter the kingdom<ArrowRight size={18}/></button></div></div>}
    <nav className="cvc-nav"><button onClick={view==="map"?onBack:()=>setView("map")}><ArrowLeft size={18}/>{view==="map"?"Stages":"Castle map"}</button><span><Sparkles size={17}/> {points} magic points</span><button aria-label={view==="book"?"Castle map":"My storybook"} title={view==="book"?"Castle map":"My storybook"} onClick={()=>setView(view==="book"?"map":"book")}><BookOpen size={18}/><span>My storybook</span></button></nav>
    {saveError&&<p className="cvc-error" role="alert">Your progress could not be saved on this device. Keep this page open.</p>}
    {!learnerId&&<p className="cvc-session-note">Guest adventure: progress lasts for this visit.</p>}
    {view==="map"?<div className="cvc-map-scroll" ref={viewport}>
      <div className="cvc-map cvc-castle-map">
        <CvcCastleInterior completed={journey.completed}/>
        <header className="cvc-map-title"><p className="cvc-eyebrow">Chapter 3</p><h1>CVC Kingdom</h1><p>Through the town. Into the castle. Restore the crown.</p><CvcCastle/></header>
        {CVC_AREAS.map((area,i)=><div className={`cvc-area cvc-area-${i}`} key={area} style={{top:400+i*890}}><span>{i+1}</span><h2>{area}</h2></div>)}
        {[{word:"sun",at:1,top:1010,left:80,label:"Entrance magic"},{word:"bug",at:8,top:1940,left:18,label:"Glasshouse flowers"},{word:"bed",at:11,top:2820,left:18,label:"Royal guest room"},{word:"gem",at:16,top:3350,left:18,label:"Crystal lantern"}].map(landmark=><div key={landmark.word} className="cvc-landmark" style={{top:landmark.top,left:`${landmark.left}%`}}>
          <CvcSpellScene word={landmark.word} restored={journey.completed>=landmark.at} mini/>
          <span>{landmark.label}{journey.completed>=landmark.at&&<Check size={13}/>}</span>
        </div>)}
        {positions.map((position,i)=> {
          const id=i+1, done=journey.completed>=id, locked=id>journey.completed+1;
          const lesson=CVC_LESSONS[i];
          return <button key={id} ref={id===Math.min(20,Math.max(last.current,journey.completed+1))?target:undefined} disabled={locked}
            className={`cvc-map-stop ${done?"is-done":""} ${locked?"is-locked":""} ${!done&&!locked?"is-current":""}`} style={{left:`${position.x}%`,top:position.y}} aria-current={!done&&!locked?"step":undefined}
            aria-label={`${id}. ${lesson?.title || "The Crown of Three Lights"}${done?", completed":locked?", locked":""}`} onClick={()=>open(id)}>
            <div className="cvc-stop-art">{id===20?<CvcCrown jewels={journey.jewels}/>:<WordObject word={lesson.word}/>}<span>{locked?<Lock size={19}/>:done?<Check size={19}/>:<ArrowRight size={19}/>}</span></div>
            <b>{id===20?"The crown":lesson.title}</b><small>{locked?"Coming next":done?"Read again":id<=5?"Learn word magic":"Let's go!"}</small>
          </button>;
        })}
        <div className="cvc-map-finale"><Crown size={23}/><p>{journey.completed===20?"You brought word magic to the kingdom!":"The Crown of Three Lights awaits."}</p>{journey.completed===20&&<button className="cvc-primary" onClick={()=>setView("crown")}>My crown<ArrowRight size={18}/></button>}</div>
      </div>
    </div>:view==="book"?<CvcRoyalBook completed={journey.completed} onPractice={id=>{setView("map");open(id);}}/>:<main className="cvc-graduation"><div className="cvc-certificate"><p className="cvc-eyebrow">Readlr adventure completed</p><CvcCrown jewels={3}/><h1>The Crown of Three Lights</h1><p className="cvc-graduate-name">{name.trim() || "Our brave reader"}</p><p>Vowel powers. Sound teams. Whole words.</p><p>You brought light back to the kingdom!</p><div className="cvc-certificate-seals"><span>A<br/>Vowels</span><span>MA<br/>Blends</span><span>MAP<br/>Words</span></div><p>{points} magic points earned</p></div><label className="cvc-name-label">Name on your certificate<input value={name} maxLength={45} onChange={event=>setName(event.target.value)} autoComplete="off"/></label><div className="cvc-controls"><button onClick={()=>window.print()}><Printer size={18}/> Print certificate</button><button className="cvc-primary" onClick={()=>setView("book")}><BookOpen size={18}/> My storybook</button></div></main>}
  </div>;
}
