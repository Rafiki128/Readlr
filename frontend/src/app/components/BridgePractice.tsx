import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Headphones, Mic, RotateCcw, Volume2, Link2, Check } from "lucide-react";
import { BlendWorkbench, type BlendCue } from "./BlendWorkbench";
import "./blendWorkbench.css";
import { CharacterCompanion } from "./CharacterCompanion";
import { BridgeScene } from "./BridgeScene";
import { BRIDGE_LINES, hasVoiceSignal, type BridgeLine } from "./stageTwoContent";
import { CONSONANT_SOUND_FALLBACKS, lessonChoices, type BridgeLesson } from "./bridgeCurriculum";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { narrationLines } from "../../hooks/bridgeNarrationLines";

type Phase = "start" | "narrating" | "choice" | "join" | "ready" | "preparing" | "recording" | "playback" | "building" | "reward" | "error";

export function BridgePractice({ lesson, onBack, onComplete, onNext }: {
  lesson: BridgeLesson; onBack: () => void; onComplete: () => void; onNext?: () => void;
}) {
  const crossing = !lesson.training;
  const reducedMotion = useReducedMotion();
  const choice = lessonChoices(lesson);
  const [phase, setPhase] = useState<Phase>("start");
  const [message, setMessage] = useState(narrationLines(lesson.intro)[0]);
  const [retry, setRetry] = useState<"intro" | "record" | "join" | "choice">("intro");
  const retryStep = useRef<"intro" | "record" | "join" | "choice">("intro");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [selected, setSelected] = useState(false);
  const [cue, setCue] = useState<BlendCue>("none");
  const [choices] = useState(() => Math.random() < .5 ? [...(choice?.options ?? [])] : [...(choice?.options ?? [])].reverse());
  const sound = useBridgeAudio();
  const active = useRef(true);
  const busy = useRef(false);
  const saved = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingUrl = useRef<string | null>(null);
  const cancelCapture = useRef<(() => void) | null>(null);

  function releaseMicrophone() {
    if (interval.current) clearInterval(interval.current);
    if (timeout.current) clearTimeout(timeout.current);
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
  }

  useEffect(() => {
    active.current = true;
    const interrupt = () => {
      if (!document.hidden || !busy.current) return;
      sound.stop();
      cancelCapture.current?.();
      releaseMicrophone();
      setError("We paused your turn. Tap Try again when you are ready.");
      setRetry(retryStep.current);
      setPhase("error");
    };
    document.addEventListener("visibilitychange", interrupt);
    return () => {
      active.current = false;
      sound.stop();
      cancelCapture.current?.();
      releaseMicrophone();
      if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
      document.removeEventListener("visibilitychange", interrupt);
    };
  }, []);

  useEffect(() => {
    const start = setTimeout(introduce, 0);
    return () => clearTimeout(start);
  }, []);

  async function say(key: BridgeLine) {
    if (!active.current) throw new DOMException("Stopped", "AbortError");
    await sound.narrateText(BRIDGE_LINES[key], setMessage);
  }

  async function sayLesson(kind: "Intro" | "Success") {
    const text = kind === "Intro" ? lesson.intro : lesson.success;
    await sound.narrateText({ file: `${lesson.id}-${kind}.wav`, text }, setMessage);
  }

  async function playBlend() {
    await sound.narrateText({ file: `Pronounce${lesson.blend}.wav`, text: lesson.blend.toLowerCase() }, setMessage);
  }

  async function playConsonant() {
    const consonant = lesson.blend[0];
    await sound.narrateText({ file: `SoundShelf-${consonant}.wav`, text: CONSONANT_SOUND_FALLBACKS[consonant] });
  }

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try { await action(); }
    catch (cause) {
      releaseMicrophone();
      if (active.current && (cause as Error).name !== "AbortError") {
        setRetry(retryStep.current);
        setError((cause as Error).name === "NotAllowedError"
          ? retryStep.current === "intro" ? "Tap to hear Milo." : "Please allow the microphone and sound, then try again."
          : (cause as Error).message || "That did not play. Let us try again.");
        setPhase("error");
      }
    } finally { busy.current = false; }
  }

  function introduce() {
    retryStep.current = "intro";
    void run(async () => {
      sound.stop();
      setPhase("narrating");
      setJoined(false);
      setSelected(false);
      setCue("none");
      await sayLesson("Intro");
      if (!active.current) return;
      if (lesson.id === "workshop-1") {
        setCue("consonant");
        await explain("WorkshopMFirst.wav", "This is m. Close your lips and make a gentle humming sound. Watch our first sound piece glow.");
        await playConsonant();
        setCue("vowel");
        await explain("WorkshopAVowel.wav", "Here comes our a vowel power! Listen to its sound.");
        await sound.play("/audio/stage1/A.wav");
        await explain("WorkshopMASlide.wav", "Now watch m slide toward a. Listen to the two sounds together.");
      } else if (!choice) {
        setCue("consonant");
        await explain("BridgeFirstPiece.wav", "Look at the first sound piece.");
        await playConsonant();
        setCue("vowel");
        await explain("BridgeVowelPiece.wav", "Here is its vowel partner. Listen!");
        await sound.play(`/audio/stage1/${lesson.blend[1]}.wav`);
      }
      setCue("blend");
      setJoined(!choice);
      await playBlend();
      if (active.current) {
        setCue("none");
        setJoined(false);
        if(choice) await explain("BridgePickPiece.wav", "Which sound piece did you hear? Tap its match.");
        else await explain("BridgeJoinPieces.wav", "Your turn! Tap to join the two sound pieces.");
        if(active.current) setPhase(choice ? "choice" : "join");
      }
    });
  }

  async function explain(file: string, text: string) {
    await sound.narrateText({ file, text }, setMessage);
  }

  function joinPieces() {
    retryStep.current = "join";
    void run(async () => {
      setPhase("narrating");
      setJoined(true);
      setCue("blend");
      setMessage("Listen to our sound team.");
      await playBlend();
      if (active.current) { setCue("none"); setMessage("Tap Record my voice when you are ready."); setPhase("ready"); }
    });
  }

  function choose(value: string) {
    retryStep.current = "choice";
    void run(async () => {
      setPhase("narrating");
      if (value !== choice?.target) {
        await explain("BridgeChoiceRetry.wav", "Listen once more. Which sound piece matches Milo's blend?");
        await playBlend();
        if (active.current) setPhase("choice");
      } else {
        setSelected(true);
        setJoined(false);
        setCue("blend");
        setMessage("Listen to our sound team.");
        await playBlend();
        if (active.current) { setCue("none"); await explain("BridgeJoinPieces.wav", "Your turn! Tap to join the two sound pieces."); setPhase("join"); }
      }
    });
  }

  async function capture() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("This browser cannot record here. Ask a grown-up to try another browser.");
    const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (!active.current || document.hidden) {
      media.getTracks().forEach(track => track.stop());
      throw new DOMException("Stopped", "AbortError");
    }
    stream.current = media;
    const context = new AudioContext();
    audioContext.current = context;
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(media).connect(analyser);
    await say("ready");
    await sound.wait(250);
    if (!active.current) throw new DOMException("Stopped", "AbortError");
    setPhase("recording");
    setMessage(`Go! Say ${lesson.blend.toLowerCase()} together.`);
    return new Promise<Blob>((resolve, reject) => {
      let peak = 0;
      let voicedFrames = 0;
      const samples = new Float32Array(analyser.fftSize);
      const chunks: Blob[] = [];
      const recording = new MediaRecorder(media);
      recorder.current = recording;
      cancelCapture.current = () => reject(new DOMException("Stopped", "AbortError"));
      recording.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recording.onerror = () => { cancelCapture.current = null; reject(new Error("The microphone stopped. Please try again.")); };
      recording.onstop = () => {
        cancelCapture.current = null;
        const blob = new Blob(chunks, { type: recording.mimeType });
        releaseMicrophone();
        if (!active.current) { reject(new DOMException("Stopped", "AbortError")); return; }
        if (!hasVoiceSignal(peak, voicedFrames, blob.size)) { reject(new Error("A little louder! Let's record again.")); return; }
        resolve(blob);
      };
      recording.start();
      interval.current = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
        peak = Math.max(peak, rms);
        if (rms >= .018) voicedFrames++;
      }, 50);
      timeout.current = setTimeout(() => { if (recording.state === "recording") recording.stop(); }, 4000);
    });
  }

  function record() {
    retryStep.current = "record";
    void run(async () => {
      setPhase("preparing");
      if (recordingUrl.current) { URL.revokeObjectURL(recordingUrl.current); recordingUrl.current = null; }
      const blob = await capture();
      if (!active.current) return;
      const url = URL.createObjectURL(blob);
      recordingUrl.current = url;
      setPhase("playback");
      await say("playback");
      await sound.play(url);
      if (!active.current) return;
      setJoined(true);
      setCue("blend");
      setPhase("building");
      setMessage("Your sound team is helping Milo build!");
      await sound.wait(1600);
      if (!active.current) return;
      setPhase("reward");
      if (!saved.current) { saved.current = true; onComplete(); }
      if (lesson.training) await explain("WorkshopLinkPraise.wav", "Thank you for practising with me! Our sound team made a bridge piece. You helped Milo cross!");
      else await sayLesson("Success");
    });
  }

  const speaking = phase === "narrating" || phase === "preparing";
  const ready = phase === "ready";
  const reward = phase === "reward";
  const fastened = reward || phase === "building";
  const practiceLabel = `Practice my ${lesson.blend.toLowerCase()} sound`;
  const status = phase === "preparing" ? "Wait for your turn..." : phase === "recording" ? "Milo is listening..." : phase === "playback" ? "That is your voice!" : phase === "building" ? "Your sound is fastening the bridge." : ready ? "Your turn!" : "";
  const step = reward ? 3 : phase === "playback" || phase === "building" ? 2 : phase === "recording" || ready || phase === "preparing" ? 1 : 0;
  const targetPattern = new RegExp(`(\\b${lesson.blend}\\b|\\b${lesson.blend[0]}\\b|/${lesson.blend[1]}/|\\b${lesson.blend[1]}(?= vowel|\\.)|(?<=toward )${lesson.blend[1]}\\b)`,"gi");
  const highlightedMessage = (error || message).split(targetPattern).map((part, i) => i%2 ? <mark key={i} className={part.replaceAll("/", "").toUpperCase() === lesson.blend[1] ? "blend-word--vowel" : ""}>{part}</mark> : part);
  return <div className="bridge-practice" data-training={lesson.training} data-phase={phase}>
    <header className="bridge-nav"><button onClick={onBack}><ArrowLeft size={19} />{crossing ? "Journey map" : "Workshop"}</button><span>{crossing ? "Blending Bridges" : "Bridge Workshop"}</span></header>
    <main className="bridge-practice__main">
      <p className="bridge-eyebrow">{crossing ? "Lend Milo your building voice" : "Two sounds, one team"}</p>
      <h1>{reward ? "You helped Milo build!" : lesson.title}</h1>
      <ol className="bridge-practice__steps" aria-label="Challenge steps">
        {[{name:"Listen",icon:Volume2},{name:"Say it",icon:Mic},{name:"Hear it",icon:Headphones}].map((item,index)=><li key={item.name} data-current={step===index} data-done={step>index}>{step>index?<Check size={17}/>:<item.icon size={17}/>}<span>{item.name}</span></li>)}
      </ol>
      <section className="bridge-guided-frame" data-training={lesson.training}>
        <div className="bridge-dialogue" aria-live="polite" aria-atomic="true"><span>Milo says</span><motion.p key={message} initial={reducedMotion ? false : {opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.22}}>{highlightedMessage}</motion.p><div className="bridge-dialogue__dots" aria-hidden="true"><i /><i /><i /></div></div>
        <div className="bridge-practice__scene" data-workshop={lesson.training}><BridgeScene built={fastened} mode={lesson.mode} region={lesson.region} workshop={lesson.training} /><div className="bridge-practice__milo"><CharacterCompanion size={125} state={speaking ? "speaking" : phase === "recording" ? "listening" : fastened ? "celebrating" : "idle"} /></div>{phase === "building" && lesson.training && <motion.div className="sound-link-delivery" initial={{y:100,scale:1,opacity:1}} animate={{y:0,scale:.65,opacity:[1,1,0]}} transition={{duration:reducedMotion?0:1.5}}>{lesson.blend.toLowerCase()}<Link2 size={22}/></motion.div>}</div>
        <BlendWorkbench blend={lesson.blend} cue={cue} joined={joined} fastened={fastened} hidden={Boolean(choice && !selected)} />
      </section>
      {phase === "choice" && <div className="bridge-choices">{choices.map(value => <button key={value} onClick={() => choose(value)} aria-label={`Choose ${value}`}>{value}</button>)}</div>}
      <div className="bridge-practice__actions">
        {phase === "start" && <button className="bridge-practice__audio" onClick={introduce} aria-label="Hear Milo" title="Hear Milo"><Volume2 size={22} /></button>}
        {phase === "join" && <button className="bridge-primary" onClick={joinPieces}><Link2 size={22}/>Join my sounds</button>}
        {ready && <button className="bridge-practice__audio" aria-label="Hear the blend again" title="Hear the blend again" onClick={() => { retryStep.current="record"; void run(async () => { setPhase("narrating"); await playBlend(); if (active.current) setPhase("ready"); }); }}><Volume2 size={22} /></button>}
        {ready && <button className="bridge-primary" onClick={record}><Mic size={22} />{practiceLabel}</button>}
        {["narrating", "preparing", "recording", "playback", "building"].includes(phase) && <button className="bridge-primary bridge-practice__phase-action" data-state={phase} disabled>{phase === "recording" ? <Mic size={22} /> : phase === "building" ? <Check size={22} /> : <Headphones size={22} />}{phase === "recording" ? `Say ${lesson.blend.toLowerCase()}` : phase === "preparing" ? "Get ready..." : phase === "playback" ? "Hear your voice" : phase === "building" ? "Bridge repaired!" : "Listen to Milo"}</button>}
        {phase === "error" && <button className="bridge-primary" onClick={retry === "record" ? record : retry === "join" ? joinPieces : retry === "choice" ? ()=>{setError("");setPhase("choice");} : introduce}><RotateCcw size={20} />{retry === "record" ? "Record again" : retry === "intro" ? "Hear Milo" : "Try again"}</button>}
        {reward && <><button onClick={() => void run(async () => { if (recordingUrl.current) await sound.play(recordingUrl.current); })}><Headphones size={20} />My voice</button><button className="bridge-primary" onClick={onNext ?? onBack}>{onNext ? "Continue training" : lesson.training ? "Back to Workshop" : "Back to the map"}<ArrowRight size={20} /></button></>}
      </div>
      {status && <div className="bridge-practice__status" role="status">
        {phase === "recording" && <span className="bridge-practice__record-dot" />}{status}
      </div>}
    </main>
  </div>;
}
