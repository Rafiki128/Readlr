import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Volume2, Compass, Sparkles } from "lucide-react";
import { CharacterCompanion } from "./CharacterCompanion";
import { StageSelection } from "./StageSelection";
import { UnifiedDashboard } from "./UnifiedDashboard";
import { StickerBookView } from "./StickerBook";
import { PhonemeBank } from "./PhonemeBank";
import { Achievements } from "./Achievements";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";

const stops = [
  {target:"My Progress", title:"See how far you've come", text:"This is your Progress page. Tap it to see your adventure and practice history.", hint:"Open My Progress"},
  {target:"Sticker Book", title:"A book of your discoveries", text:"Your adventure earns stickers! Tap your Sticker Book to look inside.", hint:"Open Sticker Book"},
  {target:"Sound Library", title:"Listen whenever you like", text:"Want to hear a sound again? Your Sound Library keeps sounds together. Tap to explore.", hint:"Open Sound Library"},
  {target:"Achievements", title:"Celebrate little milestones", text:"Every step counts. Your achievements show the milestones you reach. Let's take a look!", hint:"Open Achievements"},
  {target:"stage-1", title:"Your adventure starts here", text:"Start with vowel sounds. Finish each stage to unlock the next. Tap Valley of Vowels, then we'll try the speaking buttons together.", hint:"Tap Valley of Vowels"},
];
interface Props { onFinish:(skipped?:boolean)=>void; learnerId?:number|null; completedByStage?:Record<number,number>; userName?:string }
export function GuidedHomeTour({onFinish,learnerId,completedByStage={},userName="Reader"}:Props) {
  const [step,setStep]=useState(0), [exploring,setExploring]=useState(false);
  const [rect,setRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const home=useRef<HTMLDivElement>(null), bubble=useRef<HTMLDivElement>(null);
  const [placement,setPlacement]=useState({left:24,top:24});
  const [above,setAbove]=useState(false);
  const [tip,setTip]=useState(32);
  const sound=useBridgeAudio();
  const stop=stops[step];
  const target=()=>home.current?.querySelector<HTMLElement>(`[data-tour="${stop.target}"]`);
  useEffect(()=>{
    if(exploring) return;
    void sound.narrateText({file:"",text:stop.text}).catch(()=>{});
    return ()=>sound.stop();
  },[step,exploring]);
  useEffect(()=>{
    if(exploring) {setRect(null);return;}
    const element=target();
    if(!element)return;
    element.scrollIntoView({block:"center",behavior:"instant"});
    const update=()=>{
      const box=element.getBoundingClientRect();
      const padding=7;
      const hole={left:Math.max(8,box.left-padding),top:Math.max(8,box.top-padding),width:Math.min(box.width+padding*2,window.innerWidth-16),height:box.height+padding*2};
      setRect(hole);
      const coach=bubble.current?.getBoundingClientRect();
      const width=coach?.width??360, height=coach?.height??270;
      const below=hole.top+hole.height+18;
      const fitsBelow=below+height<window.innerHeight-12;
      const scroller=home.current?.firstElementChild as HTMLElement | null;
      // Make space above tall stage cards instead of covering their controls.
      if(!fitsBelow && hole.top<height+86 && scroller && scroller.scrollTop>0){
        scroller.scrollTop=Math.max(0,scroller.scrollTop-(height+88-hole.top));
        return;
      }
      const top=fitsBelow?below:Math.max(70,hole.top-height-18);
      const left=Math.max(12,Math.min(hole.left,window.innerWidth-width-12));
      setAbove(!fitsBelow);setTip(Math.max(20,Math.min(width-36,hole.left+hole.width/2-left-8)));
      setPlacement({left,top});
    };
    const observer=new ResizeObserver(update); observer.observe(element);
    if(bubble.current)observer.observe(bubble.current);
    window.addEventListener("resize",update);document.addEventListener("scroll",update,true);
    const frame=requestAnimationFrame(update); const settle=setTimeout(update,450);
    element.focus({preventScroll:true});
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);clearTimeout(settle);window.removeEventListener("resize",update);document.removeEventListener("scroll",update,true);};
  },[step,exploring]);
  function open(index:number){if(index!==step)return;sound.stop();setExploring(true);}
  function advance(){sound.stop();setExploring(false);if(step===stops.length-1)onFinish();else setStep(step+1);}
  return <div className="guided-tour" onKeyDown={event=>{
    if(exploring||event.key!=="Tab")return;
    const controls=[target(),...(bubble.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")??[]),document.querySelector<HTMLButtonElement>(".guided-tour__skip")].filter(Boolean) as HTMLElement[];
    const index=controls.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus();
  }}>
    <header className="guided-tour__header"><span><Compass size={22}/><strong>Readlr</strong><small>Your first adventure</small></span><button className="guided-tour__skip" onClick={()=>{sound.stop();onFinish(true);}}>Skip tour</button></header>
    {exploring?<><div className="guided-tour__explore">
      {step===0&&<UnifiedDashboard learnerId={learnerId} userName={userName} completedByStage={completedByStage} onBack={advance}/>}
      {step===1&&<StickerBookView completedByStage={completedByStage} onBack={advance}/>}
      {step===2&&<PhonemeBank learnerId={learnerId} completedByStage={completedByStage} onBack={advance}/>}
      {step===3&&<Achievements learnerId={learnerId} completedByStage={completedByStage} onBack={advance}/>}
    </div><div className="guided-tour__return"><Sparkles size={20}/><span>Take a look around. Your adventure is waiting!</span><button onClick={advance}>Continue tour <ArrowRight size={18}/></button></div></>:
    <><div ref={home} className="guided-tour__home" onClickCapture={event=>{
      if(!(event.target instanceof Node)||!target()?.contains(event.target)){event.preventDefault();event.stopPropagation();}
    }}><StageSelection learnerId={learnerId} completedByStage={completedByStage} onViewProgress={()=>open(0)} onViewStickers={()=>open(1)} onViewPhonemeBank={()=>open(2)} onViewAchievements={()=>open(3)} onSelectStage={()=>{sound.stop();onFinish();}}/></div>
    {rect&&<div className="guided-tour__spotlight" aria-hidden="true" style={rect}/>}
    <div ref={bubble} className="guided-tour__bubble" data-above={above} role="region" aria-label="Milo's guided tour" style={{...placement,"--tour-tip":`${tip}px`} as CSSProperties}>
      <div className="guided-tour__buddy"><CharacterCompanion size={78} state={sound.isPlaying ? "speaking" : "idle"}/><div><span>MILO'S QUICK TOUR</span><div className="guided-tour__dots" aria-label={`Step ${step+1} of ${stops.length}`}>{stops.map((_,i)=><i key={i} data-active={i===step} data-done={i<step}/>)}</div></div><button title="Hear Milo's guide" aria-label="Hear Milo's guide" onClick={()=>{sound.stop();void sound.narrateText({file:"",text:stop.text}).catch(()=>{});}}><Volume2 size={20}/></button></div>
      <h2>{stop.title}</h2><p>{stop.text}</p>
      <div className="guided-tour__hint"><ArrowRight size={17}/>{stop.hint}</div>
      <footer><button disabled={step===0} onClick={()=>setStep(step-1)} aria-label="Previous tour step" title="Previous tour step"><ArrowLeft size={18}/></button><span>{step+1} / {stops.length}</span><button onClick={advance}>{step===4?"Try the buttons":"Next"}<ArrowRight size={18}/></button></footer>
    </div></>}
  </div>;
}
