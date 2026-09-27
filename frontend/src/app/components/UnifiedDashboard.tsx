import { useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, Crown, Flag, Lock, Sparkles, Star, Zap } from "lucide-react";
import { VowelPowerSymbol } from "./VowelPowerSymbol";
import { CvcCrown } from "./CvcArt";
import { STICKERS, isStickerEarned } from "./stickers";
import { progressSummary } from "./progressSummary";
import { MyPractice } from "./MyPractice";
import "./rewardsCollection.css";
import "./readingProgress.css";

const STAGES=[
  {title:"Valley of Vowels",color:"#b45309",tint:"#fff3d0",icon:Star,skill:"Five vowel powers. Fifteen trails.",finish:"The valley is alive!"},
  {title:"Blending Bridges",color:"#6550c5",tint:"#eeeaff",icon:Zap,skill:"Two sounds become a team.",finish:"Every bridge is restored!"},
  {title:"CVC Kingdom",color:"#087f68",tint:"#ddf7eb",icon:Crown,skill:"Three sounds become a word.",finish:"The crown shines again!"},
];
export function UnifiedDashboard({learnerId,userName="Student",completedByStage={},onBack,onContinue}: {
  learnerId?:number|null;userName?:string;completedByStage?:Record<number,number>;onBack?:()=>void;onContinue?:(stage:number)=>void;
}) {
  const [tab,setTab]=useState<"journey"|"milestones"|"practice">("journey");
  const summary=progressSummary(completedByStage);
  const earned=STICKERS.filter(sticker=>isStickerEarned(sticker,completedByStage));
  const next=STAGES[(summary.next||3)-1];
  const nextCount=summary.stages[(summary.next||3)-1];
  return <main className="rewards-page reading-progress"><div className="rewards-inner">
    <div className="rewards-topline">{onBack?<button className="rewards-back" onClick={onBack}><ArrowLeft size={17}/>Stages</button>:<span/>}<span><Flag size={17}/>My journey</span></div>
    <header className="rewards-heading"><div><p className="rewards-eyebrow">From first sounds to whole words</p><h1>{userName}'s Progress</h1></div><p>{summary.total===60?"Look how far your voice has taken you.":"One little step. A little more confidence."}</p></header>
    <section className="reading-summary" aria-label="Reading progress summary">
      <div className="reading-total"><span className="reading-completion" style={{"--completion":`${summary.total/60*100}%`} as CSSProperties}><strong>{Math.round(summary.total/60*100)}<small>%</small></strong></span><div><h2>{summary.total} of 60 lessons</h2><p>{summary.finished} of 3 stages complete</p></div></div>
      <div className="reading-stat"><Star size={22}/><strong>{summary.vowels}<small>/ 5</small></strong><span>Vowel powers</span></div>
      <div className="reading-stat"><Zap size={22}/><strong>{summary.bridges}<small>/ 15</small></strong><span>Bridges restored</span></div>
      <div className="reading-stat"><BookOpen size={22}/><strong>{summary.words}<small>/ 19</small></strong><span>Word challenges</span></div>
    </section>
    <nav className="rewards-tabs reading-tabs" aria-label="Progress views"><button aria-pressed={tab==="journey"} onClick={()=>setTab("journey")}>My journey</button><button aria-pressed={tab==="practice"} onClick={()=>setTab("practice")}>My Practice</button><button aria-pressed={tab==="milestones"} onClick={()=>setTab("milestones")}>My milestones<span>{earned.length}</span></button></nav>
    {tab==="practice"?<MyPractice learnerId={learnerId}/>:tab==="journey"?<>
      <div className="reading-stage-list">{STAGES.map((stage,index)=>{const count=summary.stages[index];const locked=index>0&&summary.stages[index-1]<20&&count===0;const Icon=stage.icon;return <section key={stage.title} className={`reading-stage ${locked?"is-locked":""}`} style={{"--reward-color":stage.color,"--reward-tint":stage.tint} as CSSProperties}>
        <div className="reading-stage-art" aria-hidden="true">{index===0?<div className="reading-vowel-art"><VowelPowerSymbol vowel="A"/><VowelPowerSymbol vowel="E"/></div>:index===1?<div className="reading-blend-art"><b>m</b><b>a</b><span/></div>:<CvcCrown jewels={count===20?3:0}/>}</div>
        <div className="reading-stage-info"><p className="reading-stage-kicker"><Icon size={15}/>Stage {index+1}<span>{count===20?<><Check size={14}/>Complete</>:locked?<><Lock size={14}/>Coming next</>:count===0?"Ready to begin":"In progress"}</span></p><h2>{stage.title}</h2><p>{count===20?stage.finish:stage.skill}</p><div className="reading-stage-count"><span>{count} / 20 lessons</span><span>{count===20?"All done":`${20-count} to go`}</span></div><progress value={count} max={20} aria-label={`${stage.title} completion`}/></div>
        {onContinue&&<button className="reading-stage-link" disabled={locked} onClick={()=>onContinue(index+1)}>{count===20?"Visit again":count?"Continue":"Start"}<ArrowRight size={18}/></button>}
      </section>;})}</div>
      <section className="reading-next"><Sparkles size={27}/><div><p>{summary.next?"Your next little step":"Your three-stage adventure"}</p><h2>{summary.next?next.title:"All three stages complete!"}</h2><span>{summary.next?`Lesson ${nextCount+1} is waiting for you.`:"Vowel powers, sound teams, and word magic. All yours."}</span></div>{onContinue&&<button className="rewards-back" onClick={()=>onContinue(summary.next||3)}>{summary.next?"Keep going":"Visit the kingdom"}<ArrowRight size={18}/></button>}</section>
    </>:<section className="reading-milestones" aria-label="Earned milestones"><header><h2>Your collected memories</h2><p>{earned.length} of {STICKERS.length} stickers earned</p></header>{earned.length===0?<div className="rewards-empty"><Award size={40}/><h2>Your story is just beginning</h2><p>Complete your first vowel lesson to earn your first sticker.</p></div>:<div>{earned.map(sticker=><article key={sticker.id}><span aria-hidden="true">{sticker.emoji}</span><div><h3>{sticker.name}</h3><p>{STAGES[sticker.stageId-1].title} / Level {sticker.at}</p></div><Check size={17}/></article>)}</div>}</section>}
  </div></main>;
}
