import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, Headphones, Volume2 } from "lucide-react";
import { StoryScene } from "./StoryScene";
import { VowelAdventureMap } from "./VowelAdventureMap";
import { VowelChallengeView } from "./VowelChallengeView";
import { CharacterCompanion } from "./CharacterCompanion";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { useCvcRecorder } from "../../hooks/useCvcRecorder";
import { useMicrophonePermission } from "../../hooks/useMicrophonePermission";
import { MicrophonePermissionHelp } from "./MicrophonePermissionHelp";

const steps = [
  {title:"Open your first chapter",text:"This page tells you about the adventure. Tap Begin chapter to enter the Vowel Dojo.",selector:"[data-tour='begin-chapter']"},
  {title:"Choose your first vowel",text:"The bright A Armor door is ready. Tap it to begin. The other powers will open as you learn.",selector:".dojo-station:not(:disabled)"},
  {title:"Follow Milo's words",text:"This is where Milo's words appear. Important sounds light up. The three steps are Listen, Say it, and Hear it.",selector:".vowel-play__dialogue"},
  {title:"Hear the sound again",text:"Tap the small speaker to hear the vowel sound. You can use it whenever you need a reminder.",selector:".vowel-play__replay"},
  {title:"Now try the microphone",text:"Tap the big button. Allow the microphone if asked. Wait for the pink listening button, then say the sound.",selector:".vowel-play__record"},
  {title:"Listen to yourself",text:"Tap Hear my voice to play your recording. It is just practice, not a score.",selector:"[data-tour='my-voice']"},
  {title:"You know the buttons!",text:"The Dojo button takes you back to the training doors. Tap it to finish our practice tour.",selector:".vowel-play__nav button"},
] as const;
type CaptureState = "idle"|"preparing"|"recording"|"playing";
export function GuidedLessonTour({onDone,onSkip}:{onDone:()=>void;onSkip:()=>void}) {
  const [step,setStep]=useState(0),[capture,setCapture]=useState<CaptureState>("idle");
  const [error,setError]=useState("");
  const permission = useMicrophonePermission();
  const [permissionFailed,setPermissionFailed]=useState(false);
  useEffect(()=>{if(permission==="granted")setPermissionFailed(false);},[permission]);
  const [rect,setRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const surface=useRef<HTMLDivElement>(null),coach=useRef<HTMLDivElement>(null);
  const alive=useRef(true),busy=useRef(false),generation=useRef(0),url=useRef<string|null>(null);
  const sound=useBridgeAudio("/audio/stage1"),recorder=useCvcRecorder();
  const current=steps[step];
  const target=()=>surface.current?.querySelector<HTMLElement>(current.selector);
  function cancel(){generation.current++;sound.stop();recorder.stop();busy.current=false;}
  function advance(){cancel();setError("");setCapture("idle");setStep(value=>Math.min(value+1,steps.length-1));}
  function leave(skip=false){cancel();skip&&step<4?onSkip():onDone();}
  useEffect(()=>{
    alive.current=true;
    const hide=()=>{if(document.hidden){cancel();setCapture("idle");setError("We paused. Tap the highlighted button when you're ready.");}};
    document.addEventListener("visibilitychange",hide);
    return()=>{alive.current=false;cancel();if(url.current)URL.revokeObjectURL(url.current);document.removeEventListener("visibilitychange",hide);};
  },[]);
  useEffect(()=>{
    void sound.narrateText({file:"",text:current.text}).catch(()=>{});
    return()=>sound.stop();
  },[step]);
  useEffect(()=>{
    const element=target();if(!element)return;
    const frame=requestAnimationFrame(()=>element.scrollIntoView({block:"center",behavior:"instant"}));
    const update=()=>{
      const box=element.getBoundingClientRect(), area=surface.current?.getBoundingClientRect();
      if(!area)return;
      const top=Math.max(box.top-6,area.top),bottom=Math.min(box.bottom+6,area.bottom);
      setRect({left:Math.max(6,box.left-6),top,width:Math.min(box.width+12,window.innerWidth-12),height:Math.max(0,bottom-top)});
    };
    const observer=new ResizeObserver(update);observer.observe(element);if(surface.current)observer.observe(surface.current);
    const timer=setTimeout(update,500);
    document.addEventListener("scroll",update,true);window.addEventListener("resize",update);update();
    if(element.matches("button"))element.focus({preventScroll:true});
    else coach.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();document.removeEventListener("scroll",update,true);window.removeEventListener("resize",update);};
  },[step,error]);
  async function run(action:()=>Promise<void>){
    if(busy.current)return;
    sound.stop();busy.current=true;setError("");const runId=++generation.current;
    try{await action();}catch(cause){
      if(alive.current&&generation.current===runId&&(cause as Error).name!=="AbortError"){
        setCapture("idle");
        const denied=(cause as Error).name==="NotAllowedError";
        setPermissionFailed(denied);
        setError(denied?"":(cause as Error).message||"Let's try again.");
      }
    }finally{if(generation.current===runId)busy.current=false;}
  }
  async function record(){
    setCapture("preparing");const runId=generation.current;
    const blob=await recorder.capture(()=>setCapture("recording"),async()=>{
      try{await sound.play("/audio/stage1/RecordingStarts.wav");}catch(cause){if((cause as Error).name==="AbortError")throw cause;}
      await sound.wait(300);
    });
    if(!alive.current||runId!==generation.current)return;
    if(url.current)URL.revokeObjectURL(url.current);
    url.current=URL.createObjectURL(blob);advance();
  }
  return <div className="guided-tour guided-lesson" onKeyDown={event=>{
    if(event.key!=="Tab")return;
    const items=[target()?.matches("button:not(:disabled)")?target():null,...(coach.current?.querySelectorAll<HTMLElement>("button:not(:disabled)")??[]),document.querySelector<HTMLElement>(".guided-lesson .guided-tour__skip")].filter(Boolean) as HTMLElement[];
    event.preventDefault();const index=items.indexOf(document.activeElement as HTMLElement);items[(index+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();
  }}>
    <header className="guided-tour__header"><span><Compass size={22}/><strong>Try your first lesson</strong><small>Practice only - no progress saved</small></span><button className="guided-tour__skip" onClick={()=>leave(true)}>{step>=4?"Do this later":"Skip lesson tour"}</button></header>
    <div ref={coach} className="lesson-coach" role="region" aria-label="Milo's lesson guide">
      <CharacterCompanion size={80} state={capture==="recording"||capture==="playing"?"listening":sound.isPlaying?"speaking":error?"encouraging":"idle"}/>
      <div><span className="lesson-coach__step">FIRST LESSON / {step+1} OF {steps.length}</span><h2>{capture==="recording"?"Your turn! Say /a/":capture==="preparing"?"Wait for the listening cue":capture==="playing"?"That's your voice!":current.title}</h2><p>{capture==="idle"?current.text:capture==="recording"?"Milo is listening. The recording will stop by itself.":capture==="playing"?"Listen to your recording.":"Choose Allow if your browser asks. Your turn is coming."}</p>
      {step===4&&(permission==="denied"||permissionFailed)?<MicrophonePermissionHelp disabled={capture!=="idle"} onRetry={()=>void run(record)}/>:error&&<p className="intro-error" role="alert">{error}</p>}
      {step===2&&<button className="lesson-coach__next" onClick={advance}>Let's listen <ArrowRight size={18}/></button>}
      </div>
      <button aria-label="Hear this instruction" title="Hear this instruction" disabled={capture!=="idle"} onClick={()=>void run(()=>sound.narrateText({file:"",text:current.text}))}><Volume2 size={20}/></button>
    </div>
    <div ref={surface} className="guided-lesson__surface" onClickCapture={event=>{
      if(!(event.target instanceof Node)||!target()?.contains(event.target)){event.preventDefault();event.stopPropagation();return;}
      sound.stop();
    }}>
      {step===0?<StoryScene guided stageId={1} onBack={()=>leave(true)} onBegin={advance}/>:
      step===1?<VowelAdventureMap guided initialView="dojo" completedCount={0} onBack={()=>leave(true)} onSelectLevel={advance}/>:
      <><VowelChallengeView vowel="A" sound="/a/" ability="A Armor" title="Train your vowel power" message={capture==="recording"?"Your turn! Say /a/.":step===5?"Tap Hear my voice to listen to yourself.":"Listen, say /a/, then hear your voice."} characterState={capture==="recording"||capture==="playing"?"listening":sound.isPlaying?"speaking":error?"encouraging":"idle"} training ready recording={capture==="recording"} preparing={capture==="preparing"} recorded={step===5} celebrating={false}
        onBack={()=>leave()} onReplay={()=>void run(async()=>{const id=generation.current;await sound.play("/audio/stage1/A.wav");if(alive.current&&generation.current===id)advance();})} onRecord={()=>void run(record)}/>
      {step===5&&<div className="lesson-voice"><button data-tour="my-voice" disabled={capture==="playing"} onClick={()=>void run(async()=>{if(!url.current)return;const id=generation.current;setCapture("playing");await sound.play(url.current);if(alive.current&&generation.current===id)advance();})}><Headphones size={22}/>{capture==="playing"?"Playing your recording...":"Hear my voice"}</button></div>}</>}
    </div>
    {rect&&rect.height>0&&<div className="guided-tour__spotlight" aria-hidden="true" style={rect}/>}
  </div>;
}
