import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Headphones, Mic, Volume2, MapPin, ShieldCheck, RotateCcw } from "lucide-react";
import { CharacterCompanion } from "./CharacterCompanion";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { useCvcRecorder } from "../../hooks/useCvcRecorder";
import "./learningIntroduction.css";
import { GuidedHomeTour } from "./GuidedHomeTour";
import { GuidedLessonTour } from "./GuidedLessonTour";
import { useMicrophonePermission } from "../../hooks/useMicrophonePermission";
import { MicrophonePermissionHelp } from "./MicrophonePermissionHelp";

const lines = [
  "Hi! I'm Milo. Let's try our adventure buttons together.",
  "Follow the bright next stop. Tap it to keep going!",
  "Tap the speaker to hear my sound again.",
  "Let's check your microphone. Choose Allow when your browser asks. Wait for pink, then say hello!",
];
export function LearningIntroduction({ onDone, onLessonDone, learnerId, completedByStage, userName }: { onDone: () => void; onLessonDone?: () => void; learnerId?:number|null; completedByStage?:Record<number,number>; userName?:string }) {
  const [homeTour,setHomeTour]=useState(true);
  const [lessonTour,setLessonTour]=useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "preparing" | "recording" | "recorded" | "playing">("idle");
  const [error, setError] = useState("");
  const permission = useMicrophonePermission();
  const [permissionFailed,setPermissionFailed]=useState(false);
  useEffect(()=>{if(permission==="granted")setPermissionFailed(false);},[permission]);
  const [heard, setHeard] = useState(false);
  const [seconds, setSeconds] = useState(4);
  const sound = useBridgeAudio();
  const recorder = useCvcRecorder();
  const alive = useRef(true), busy = useRef(false), url = useRef<string | null>(null);
  useEffect(() => {
    if(homeTour||lessonTour)return;
    void sound.narrateText({file:"", text:lines[step]}).catch(() => { /* The speaker remains available if autoplay is blocked. */ });
    return () => sound.stop();
  }, [step,homeTour,lessonTour]);
  useEffect(() => {
    alive.current = true;
    const hide = () => { if (document.hidden) { sound.stop(); recorder.stop(); setStatus(url.current ? "recorded" : "idle"); } };
    document.addEventListener("visibilitychange", hide);
    return () => { alive.current = false; sound.stop(); recorder.stop(); if (url.current) URL.revokeObjectURL(url.current); document.removeEventListener("visibilitychange", hide); };
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    sound.stop();
    busy.current = true; setError("");
    try { await action(); } catch (cause) {
      if (alive.current && (cause as Error).name !== "AbortError") {
        setPermissionFailed((cause as Error).name === "NotAllowedError");
        setError((cause as Error).name === "NotAllowedError"
          ? "Microphone blocked. Open this site's permissions beside the browser address, allow Microphone, then try again. You can do this later."
          : (cause as Error).message || "That did not work. Try again or do this later.");
        setStatus(url.current ? "recorded" : "idle");
      }
    } finally { busy.current = false; }
  }
  function next(value: number) { sound.stop(); recorder.stop(); setStep(value); setError(""); setStatus("idle"); }
  async function testMicrophone() {
    sound.stop(); setStatus("preparing"); setHeard(false);
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
    const blob = await recorder.capture(left => { setStatus("recording"); setSeconds(left); }, async () => {
      try { await sound.narrateText({file:"", text:"Say hello. Ready? Go!"}); }
      catch (cause) { if ((cause as Error).name === "AbortError") throw cause; }
      await sound.wait(350);
    });
    if (!alive.current) return;
    url.current = URL.createObjectURL(blob); setStatus("recorded");
  }
  async function replay() {
    if (!url.current) return;
    setStatus("playing"); await sound.play(url.current);
    if (alive.current) { setHeard(true); setStatus("recorded"); }
  }
  if(homeTour)return <GuidedHomeTour learnerId={learnerId} completedByStage={completedByStage} userName={userName} onFinish={(skipped)=>{setHomeTour(false);if(skipped)next(3);else setLessonTour(true);}}/>;
  if(lessonTour)return <GuidedLessonTour onDone={onLessonDone ?? onDone} onSkip={()=>{setLessonTour(false);next(3);}}/>;
  if(step===3){
    const active = status === "preparing" || status === "recording" || status === "playing";
    const currentStep = heard ? 2 : url.current ? 1 : 0;
    return <main className="learning-intro mic-setup" data-status={status} data-heard={heard}>
      <header><span className="mic-setup__brand"><Mic size={22}/><strong>A little sound check</strong></span><button onClick={onDone}>Do this later <ArrowRight size={17}/></button></header>
      <section aria-labelledby="mic-title">
        <p className="intro-step">BEFORE YOUR ADVENTURE</p>
        <h1 id="mic-title">Let's hear your hello!</h1>
        <ol className="mic-setup__steps" aria-label="Microphone setup progress">
          {["Say hello", "Hear it back", "Ready to play"].map((label,index)=><li key={label} data-active={index===currentStep} data-done={index<currentStep} aria-current={index===currentStep?"step":undefined}><span>{index<currentStep?<Check size={15}/>:index+1}</span>{label}</li>)}
        </ol>
        <div className="mic-studio">
          <div className="mic-studio__scene" aria-hidden="true">
            <div className="mic-studio__milo"><CharacterCompanion size={140} state={status==="recording"||status==="playing"?"listening":sound.isPlaying?"speaking":error?"encouraging":heard?"celebrating":"idle"}/></div>
            <div className="mic-studio__sound">{[14,24,38,26,48,32,20].map((height,index)=><i key={index} style={{height,animationDelay:`${index*90}ms`}}/>)}</div>
            <div className="mic-studio__microphone">{heard?<Check size={42}/>:status==="playing"?<Headphones size={42}/>:<Mic size={42}/>}</div>
          </div>
          <div className="mic-studio__caption" aria-live="polite">
            <span>{status==="recording"?"MILO IS LISTENING":status==="playing"?"YOUR RECORDING":heard?"SOUND CHECK COMPLETE":"MILO SAYS"}</span>
            <h2>{status==="recording"?'Say "hello!"':status==="preparing"?"Your turn is coming...":status==="playing"?"That's your voice!":heard?"You're ready for your adventure!":url.current?"Now, listen to your hello":"Your voice is part of the adventure"}</h2>
            <p>{status==="recording"?"The recording will stop by itself.":status==="preparing"?"Choose Allow if your browser asks. Wait for pink.":status==="playing"?"Can you hear yourself clearly?":heard?"Heard yourself clearly? Let's begin.":url.current?"Tap the headphones to hear yourself.":"Allow the microphone. Wait for pink, then say hello."}</p>
          </div>
          <div className="mic-studio__timer" aria-label={status==="recording"?`${seconds} seconds remaining`:undefined}>{[0,1,2,3].map(index=><i key={index} data-lit={status==="recording"&&index<seconds}/> )}</div>
        </div>
        <div className="mic-setup__controls">
          <button className="intro-speaker" title="Hear Milo's instructions" aria-label="Hear Milo's instructions" disabled={active} onClick={()=>void run(()=>sound.narrateText({file:"",text:lines[3]}))}><Volume2 size={22}/></button>
          {heard?<button className="intro-primary mic-setup__main" onClick={onDone}><Check size={22}/>Let's play <ArrowRight size={20}/></button>:
            url.current?<button className="intro-primary mic-setup__main" disabled={active} onClick={()=>void run(replay)}><Headphones size={22}/>{status==="playing"?"Playing your voice...":"Hear my voice"}</button>:
            <button className="intro-primary mic-setup__main" disabled={active} onClick={()=>void run(testMicrophone)}><Mic size={22}/>{status==="recording"?"I'm listening...":status==="preparing"?"Getting ready...":"Try my microphone"}</button>}
          {url.current&&<button className="mic-setup__retry" title="Record another hello" disabled={active} onClick={()=>void run(testMicrophone)}><RotateCcw size={18}/><span>Try again</span></button>}
        </div>
        {permission==="denied"||permissionFailed?<MicrophonePermissionHelp disabled={active} onRetry={()=>void run(testMicrophone)}/>:error&&<p role="alert" className="intro-error mic-setup__error">{error}</p>}
        <p className="mic-setup__privacy"><ShieldCheck size={17}/><span>Just practice. This recording stays on this device and is discarded when you leave.</span></p>
      </section>
    </main>;
  }
  return <main className="learning-intro">
    <header><span>Meet your reading buddy</span><button onClick={() => step < 3 ? next(3) : onDone()}>{step < 3 ? "Skip tutorial" : "Do this later"}</button></header>
    <section aria-labelledby="intro-title">
      <CharacterCompanion size={145} state={status === "recording" || status === "playing" ? "listening" : sound.isPlaying ? "speaking" : error ? "encouraging" : heard ? "celebrating" : "idle"}/>
      <p className="intro-step">{step < 3 ? `Step ${step + 1} of 3` : "Microphone check"}</p>
      <h1 id="intro-title">{["Let's begin together", "Find your next adventure", "Listen again", "Your voice matters"][step]}</h1>
      <p className="intro-line">{lines[step]}</p>
      <button className="intro-speaker" title="Hear this instruction" aria-label="Hear this instruction" disabled={status !== "idle" && status !== "recorded"} onClick={() => void run(() => sound.narrateText({file:"",text:lines[step]}))}><Volume2 size={23}/></button>
      <div className="intro-playground">
        {step === 0 && <button className="intro-primary" onClick={() => next(1)}>Continue adventure <ArrowRight/></button>}
        {step === 1 && <div className="intro-map"><span aria-label="Completed stop"><Check/></span><i/><button className="intro-next" aria-label="Next challenge" onClick={() => next(2)}><MapPin/><strong>Next stop</strong><ArrowRight/></button></div>}
        {step === 2 && <button className="intro-primary" onClick={() => void run(async () => { await sound.play("/audio/stage1/A.wav"); next(3); })}><Volume2/>Hear a sound</button>}
        {step === 3 && <>
          <div className="intro-mic" data-status={status} aria-live="polite"><Mic size={42}/><strong>{status === "recording" ? `Say hello! ${seconds}` : status === "preparing" ? "Getting ready..." : status === "playing" ? "Listen to your voice" : status === "recorded" ? "Your recording is ready" : "Ready to try?"}</strong></div>
          <div className="intro-actions"><button className="intro-primary" disabled={["preparing","recording","playing"].includes(status)} onClick={() => void run(testMicrophone)}><Mic/>{url.current ? "Try again" : "Enable microphone & try"}</button>
          {url.current && <button disabled={status !== "recorded"} onClick={() => void run(replay)}><Headphones/>Hear my voice</button>}</div>
          {heard && <button className="intro-primary" onClick={onDone}><Check/>I heard it! Let's play <ArrowRight/></button>}
          <p className="intro-privacy">This test stays on this device and is discarded when you leave. It does not count as a lesson.</p>
        </>}
      </div>
      {error && <p role="alert" className="intro-error">{error}</p>}
    </section>
  </main>;
}
