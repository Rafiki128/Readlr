import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CvcKingdom } from "../app/components/CvcKingdom";
import { CvcChallenge } from "../app/components/CvcChallenge";
import { CVC_LESSONS } from "../app/components/cvcContent";
import { BridgePractice } from "../app/components/BridgePractice";
import { StoryScene } from "../app/components/StoryScene";
import { CvcRoyalBook } from "../app/components/CvcRoyalBook";
import { CROSSING_LESSONS, WORKSHOP_LESSONS } from "../app/components/bridgeCurriculum";
import "../app/components/blendingWorkshop.css";
import "../app/components/bridgeJourney.css";
import "../styles/index.css";

function CvcPreview() {
  const [selection,setSelection]=useState(0);
  const [visit,setVisit]=useState(0);
  const [completed,setCompleted]=useState(false);
  function select(value:number) {setSelection(value);setVisit(n=>n+1);setCompleted(false);}
  return <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:"#faf7f2"}}>
    <header style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap",padding:"10px 16px",background:"#ecfdf5",borderBottom:"1px solid #a7f3d0",color:"#065f46",flexShrink:0}}>
      <strong>Challenge Preview</strong>
      <label style={{display:"flex",alignItems:"center",gap:8}}>Open
        <select aria-label="Preview scene" value={selection} onChange={event=>select(Number(event.target.value))} style={{padding:8,border:"1px solid #a7f3d0",borderRadius:8,background:"white",maxWidth:240,color:"#1f2430"}}>
          <option value={0}>Castle map</option>
          <option value={23}>Storybook - all pages preview</option>
          <option value={-11}>Chapter 1 introduction</option>
          <option value={-12}>Chapter 2 introduction</option>
          <option value={-13}>Chapter 3 introduction</option>
          <option value={-1}>Stage 2 - Workshop</option>
          <option value={-2}>Stage 2 - Brook bridge</option>
          <option value={-3}>Stage 2 - Waterfall bridge</option>
          <option value={-4}>Stage 2 - Sky bridge</option>
          {CVC_LESSONS.map(lesson=><option key={lesson.id} value={lesson.id}>{lesson.id}. {lesson.word.toUpperCase()} - {lesson.title}</option>)}
          <option value={20}>Crown: vowel jewel</option><option value={21}>Crown: blend jewel</option><option value={22}>Crown: word jewel</option>
        </select>
      </label>
      <span style={{fontSize:12}} role="status">{completed?"Preview completed. Account progress unchanged.":"No account progress is changed."}</span>
    </header>
    <div style={{flex:1,minHeight:0,display:selection===23?"flex":undefined}}>
      {selection===23?<div className="cvc-root" style={{width:"100%"}}><CvcRoyalBook completed={19} onPractice={select}/></div>:<>
      {selection<=-11?<StoryScene key={`${selection}-${visit}`} stageId={-selection-10} dojoCompleted bridgeWorkshopCompleted onBack={()=>select(0)} onBegin={()=>select(selection===-12?-1:selection===-13?1:0)} onGoToValley={()=>select(0)} onGoToBridgeMap={()=>select(-2)}/>:selection<0?<BridgePractice key={`${selection}-${visit}`} lesson={selection===-1?WORKSHOP_LESSONS[0]:CROSSING_LESSONS[(-selection-2)*5]} onBack={()=>select(0)} onComplete={()=>setCompleted(true)}/>:selection===0?<CvcKingdom key={visit} onBack={()=>{location.href="/";}}/>:<CvcChallenge key={`${selection}-${visit}`} lesson={CVC_LESSONS.find(lesson=>lesson.id===selection)} jewel={Math.max(0,selection-20)} onBack={()=>select(0)} onComplete={()=>setCompleted(true)} onNext={()=>select(selection<22?selection+1:0)}/>}
      </>}
    </div>
  </div>;
}

// This separate development entry never reads or writes a learner's progress.
createRoot(document.getElementById("root")!).render(import.meta.env.DEV?<CvcPreview/>:<p>This preview is available only on the local development server.</p>);
