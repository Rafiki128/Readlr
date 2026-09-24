import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Mic, Volume2, Headphones, Check, Sparkles, BookOpen } from "lucide-react";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { useCvcRecorder } from "../../hooks/useCvcRecorder";
import { CharacterCompanion } from "./CharacterCompanion";
import { CastleBackdrop, CvcCrown } from "./CvcArt";
import { CROWN_PROMPTS, CROWN_RESULTS, CROWN_WORDS, cvcChoices, cvcReadyLine, type CvcLesson } from "./cvcContent";
import { CONSONANT_SOUND_FALLBACKS } from "./bridgeCurriculum";
import { cvcLetterTray, cvcWordChoices, placeCvcLetter, cvcPuzzleLine } from "./cvcContent";
import { CvcSpellScene } from "./CvcSpellScene";
import { ChallengeRoomFrame } from "./ChallengeRoomFrame";
import "./challengeRooms.css";
import "./challengeControls.css";

type Phase = "intro"|"speaking"|"choice"|"ready"|"preparing"|"recording"|"playback"|"magic"|"reward";
interface Props { lesson?:CvcLesson; jewel?:number; onBack:()=>void; onComplete:()=>void; onNext:()=>void }
export function CvcChallenge({lesson,jewel=0,onBack,onComplete,onNext}:Props) {
  const crown=!lesson, word=lesson?.word || CROWN_WORDS[jewel];
  const sound=useBridgeAudio("/audio/stage3");
  const recorder=useCvcRecorder();
  const [phase,setPhase]=useState<Phase>("intro");
  const [message,setMessage]=useState(lesson?.story || CROWN_PROMPTS[jewel]);
  const [error,setError]=useState("");
  const [seconds,setSeconds]=useState(4);
  const [activeLetter,setActiveLetter]=useState(-1);
  const [joined,setJoined]=useState(false);
  const [blending,setBlending]=useState(false);
  const [chosen,setChosen]=useState(false);
  const [wrong,setWrong]=useState("");
  const [isBusy,setIsBusy]=useState(false);
  const [placed,setPlaced]=useState("");
  const placedRef=useRef("");
  const busy=useRef(false), alive=useRef(true), saved=useRef(false);
  const resume=useRef<Phase>("intro");
  const recording=useRef<string|null>(null);
  const hasChoice=!!lesson && lesson.mode!=="read";
  const missingChoice=!!lesson && ["ending","middle","change"].includes(lesson.mode);
  const missing=lesson?.mode==="ending"?2:1;
  const showingResult=phase==="magic"||phase==="reward";

  useEffect(()=> {
    alive.current=true;
    const start=setTimeout(()=>void run(introduce),400);
    const hide=()=> {
      if(!document.hidden || !busy.current) return;
      sound.stop(); recorder.stop();
      if(alive.current) { setPhase(resume.current); setError("Ready when you are. Tap to try again."); }
    };
    document.addEventListener("visibilitychange",hide);
    return ()=> { alive.current=false; clearTimeout(start); sound.stop(); recorder.stop(); if(recording.current) URL.revokeObjectURL(recording.current); document.removeEventListener("visibilitychange",hide); };
  },[]);

  async function run(action:()=>Promise<void>) {
    if(busy.current) return;
    busy.current=true; setIsBusy(true); setError("");
    try { await action(); }
    catch(cause) {
      recorder.stop();
      if(alive.current) setBlending(false);
      if(alive.current && (cause as Error).name!=="AbortError") {
        setPhase(resume.current);
        setMessage(resume.current==="ready"?`Let's try ${word} again.`:resume.current==="choice"?`Find the missing letter in ${word}.`:"Tap to hear Milo.");
        setError((cause as Error).name==="NotAllowedError"?"Tap again to allow sound or your microphone.":(cause as Error).message || "Let's try again.");
      }
    } finally { busy.current=false; if(alive.current) setIsBusy(false); }
  }
  const say=(text:string,file="")=>sound.narrateText({text,file},setMessage);
  async function letterSound(index:number) {
    const letter=word[index].toUpperCase();
    setActiveLetter(index);
    if(index===1) await sound.play(`/audio/stage1/${letter}.wav`);
    else await sound.narrateText({file:`../stage2/SoundShelf-${letter}.wav`,text:CONSONANT_SOUND_FALLBACKS[letter] || letter.toLowerCase()});
    setActiveLetter(-1);
  }
  async function model() {
    setActiveLetter(-1); setMessage(word);
    if(word.length===3) {
      setJoined(false);setBlending(true);
      await sound.wait(650);
    }
    setJoined(true);setBlending(false);
    if(crown && jewel===0) await sound.play("/audio/stage1/A.wav");
    else if(crown && jewel===1) await sound.narrateText({file:"../stage2/PronounceMA.wav",text:"ma"});
    else await sound.narrateText({file:`Pronounce${word.toUpperCase()}.wav`,text:word});
  }
  async function teach() {
    setPhase("speaking"); setJoined(false);
    await say("A beginning sound. A middle vowel. An ending sound.","CvcThreeSounds.wav");
    for(let i=0;i<3;i++) {
      setActiveLetter(i); setMessage(word);
      await letterSound(i);
      await sound.wait(160);
    }
    setActiveLetter(-1);
    await say("Now slide the sounds together.","CvcSlideSounds.wav");
    await model();
    setPhase("ready"); resume.current="ready";
    setMessage(`Your turn! Say ${word}.`);
  }
  async function introduce() {
    resume.current="intro"; setPhase("speaking");
    await say(lesson?.story || CROWN_PROMPTS[jewel],lesson?`Cvc${lesson.id}Intro.wav`:`Crown${jewel+1}Intro.wav`);
    if(hasChoice && !chosen) {
      if(lesson!.mode!=="conjure") await model();
      setJoined(false); resume.current="choice";
      await say(cvcPuzzleLine(lesson!),`Cvc${lesson!.id}Puzzle.wav`);
      setPhase("choice");
    }
    else if(lesson && lesson.id<=5) await teach();
    else { if(lesson?.mode!=="read") await model(); setPhase("ready"); resume.current="ready"; setMessage(`Your turn! Say ${word}.`); }
  }
  async function finishPuzzle() {
    setWrong(""); setChosen(true); resume.current="ready";
    if(lesson!.id<=5 && lesson!.mode!=="conjure") await teach();
    else { setPhase("speaking"); await model(); setPhase("ready"); setMessage(`Your turn! Say ${word}.`); }
  }
  async function place(letter:string) {
    const before=placedRef.current;
    const after=placeCvcLetter(word,before,letter);
    if(after===before) { setWrong(letter); await say("Try the next sound. You can do it!","CvcTryNextSound.wav"); return; }
    await letterSound(before.length);
    placedRef.current=after; setPlaced(after); setWrong("");
    setMessage(after.length<3?`Now find the ${after.length===1?"middle":"last"} sound.`:`Your word is ${word}!`);
    if(after.length===3) await finishPuzzle();
  }
  async function match(candidate:string) {
    if(candidate!==word) { setWrong(candidate); await say("Listen to the middle sound.","CvcListenMiddle.wav"); await model(); setJoined(false); return; }
    await finishPuzzle();
  }
  async function choose(letter:string) {
    if(letter!==word[missing]) { setWrong(letter); await say(`Listen again. ${word}.`); await model(); setJoined(false); return; }
    await finishPuzzle();
  }
  async function record() {
    resume.current="ready"; setPhase("preparing");
    setMessage("Let's get your microphone ready.");
    const blob=await recorder.capture(left=>{setPhase("recording");setSeconds(left);}, async()=> {
      await say(lesson?.mode==="read"?"Read your word. Ready? Go!":crown&&jewel===0?"Say the vowel sound. Ready? Go!":cvcReadyLine(word),lesson?.mode==="read"?"CvcReadReady.wav":`CvcReady-${word.toUpperCase()}.wav`);
      await sound.wait(300);
      setMessage("I'm listening...");
    });
    if(!alive.current) return;
    if(recording.current) URL.revokeObjectURL(recording.current);
    recording.current=URL.createObjectURL(blob);
    setPhase("playback"); setMessage("Listen to your voice!");
    await sound.play(recording.current);
    setPhase("magic"); setJoined(true);
    await sound.wait(1200);
    if(!alive.current) return;
    if(!saved.current) { saved.current=true; onComplete(); }
    resume.current="reward"; setPhase("reward");
    await say(lesson?.result || CROWN_RESULTS[jewel],lesson?`Cvc${lesson.id}Success.wav`:`Crown${jewel+1}Success.wav`);
  }
  function highlight(text:string) {
    return text.split(/(\b[a-z]{1,3}\b)/gi).map((part,index)=>part.toLowerCase()===word?<strong key={index}>{part}</strong>:part);
  }
  const enabled=["intro","ready","reward"].includes(phase);
  const voiceStep = showingResult ? 3 : phase === "playback" ? 2 : ["ready", "preparing", "recording"].includes(phase) ? 1 : 0;
  const ActionIcon = showingResult ? Check : phase === "playback" ? Headphones : ["intro", "speaking"].includes(phase) ? Volume2 : Mic;
  return <div className={`cvc-root cvc-play cvc-phase-${phase}`}>
    <nav className="cvc-nav"><button onClick={onBack}><ArrowLeft size={18}/> Castle map</button><span>{crown?"The Crown of Three Lights":`${lesson.id} / 20`}</span></nav>
    <main className="cvc-play-main">
      <header><p className="cvc-eyebrow">{crown?`Jewel ${jewel+1} of 3`:lesson.id<=5?"Your first word magic":"Word magic"}</p><h1>{lesson?.title || "Restore the crown"}</h1></header>
      <ol className="cvc-voice-steps" aria-label="Challenge steps">
        {[{name:"Listen",icon:Volume2},{name:"Say it",icon:Mic},{name:"Hear it",icon:Headphones}].map((step,index)=><li key={step.name} data-current={voiceStep===index} data-done={voiceStep>index} aria-current={voiceStep===index?"step":undefined}>{voiceStep>index?<Check size={17}/>:<step.icon size={17}/>}<span>{step.name}</span></li>)}
      </ol>
      <div className="cvc-subtitle cvc-storybook-caption" aria-live="polite"><span><BookOpen size={15} aria-hidden="true"/> Milo says</span><p>{highlight(message)}</p><span className="cvc-caption-seal" aria-hidden="true"><Sparkles size={15}/></span></div>
      <div className={`cvc-theatre ${showingResult?"cvc-restored":""} ${lesson?"cvc-dynamic-scene":""} cvc-spell-${word}`}>
        <CastleBackdrop area={lesson?.area ?? 3}/>
        <div className="cvc-spell-dais" aria-hidden="true"><i/><i/><i/></div>
        {lesson&&<CvcSpellScene word={word} restored={showingResult}/>}
        <div className="cvc-milo"><CharacterCompanion size={108} state={phase==="recording"?"listening":phase==="reward"?"celebrating":phase==="speaking"||phase==="preparing"?"speaking":"idle"}/></div>
        {crown&&<div className="cvc-object is-visible"><CvcCrown jewels={jewel+(showingResult?1:0)}/></div>}
        <div className={`cvc-stones ${joined?"is-joined":""} ${blending?"is-blending":""}`} aria-label={`Letters in ${word}`}>
          {word.split("").map((letter,index)=>lesson?.mode==="conjure"&&!chosen?<button key={index} disabled={phase!=="choice"||isBusy||index!==placed.length} aria-label={`Sound ${index+1}: ${letter}`} onClick={()=>void run(()=>place(letter))} className={`cvc-stone ${/[aeiou]/.test(letter)?"is-vowel":""} ${index===placed.length?"is-next":""} ${index===activeLetter?"is-speaking":""}`}>{letter}</button>:<div key={index} className={`cvc-stone ${/[aeiou]/.test(letter)?"is-vowel":""} ${index===activeLetter?"is-speaking":""}`}>
            {lesson?.mode==="build"&&!chosen?(placed[index]||"?"):missingChoice&&!chosen&&index===missing?(lesson.from?.[index] || "?"):letter}
          </div>)}
        </div>
        <ChallengeRoomFrame kind="cvc"/>
      </div>
      <div className="cvc-room-status" aria-live="polite">{phase==="recording"?<><Mic size={17}/> Listening - {seconds}</>:phase==="playback"?<><Headphones size={17}/> Your voice</>:showingResult?<><Check size={17}/> {crown?"Jewel restored!":"Magic made!"}</>:<><Sparkles size={16}/> {joined?word:"Three sounds, one word"}</>}</div>
      <div className="cvc-action-area">
      {phase==="choice"&&lesson&&lesson.mode!=="conjure"&&<div className={`cvc-choices ${lesson.mode==="match"?"cvc-word-choices":""}`} aria-label={lesson.mode==="build"?"Build the word":lesson.mode==="match"?"Choose the word":"Choose the missing letter"}>{(lesson.mode==="build"?cvcLetterTray(lesson):lesson.mode==="match"?cvcWordChoices(lesson):cvcChoices(lesson)).map(letter=><button disabled={isBusy||(lesson.mode==="build"&&placed.includes(letter))} aria-label={`Choose ${letter}`} className={wrong===letter?"is-wrong":""} key={letter} onClick={()=>void run(()=>lesson.mode==="build"?place(letter):lesson.mode==="match"?match(letter):choose(letter))}>{letter}</button>)}</div>}
      <div className="cvc-controls">
        <button className="cvc-replay" title={phase==="reward"?"Hear your voice":"Hear Milo"} aria-label={phase==="reward"?"Hear your voice":"Hear Milo"} disabled={isBusy||(!enabled&&phase!=="choice")} onClick={()=>void run(async()=>{ if(phase==="reward"&&recording.current) await sound.play(recording.current); else if(phase==="intro") await introduce(); else { await model(); if(phase==="choice") setJoined(false); } })}>{phase==="reward"?<Headphones/>:<Volume2/>}</button>
        {phase==="reward"?<button className="cvc-primary" disabled={isBusy} onClick={onNext}>{crown&&jewel===2?"My crown":crown?"Next jewel":"Back to castle map"}<ArrowRight size={20}/></button>:phase!=="choice"&&<button className="cvc-primary" disabled={!enabled||isBusy} onClick={()=>void run(phase==="intro"?introduce:record)}><ActionIcon size={25}/>{phase==="intro"?"Listen to Milo":phase==="recording"?`Say ${word}`:phase==="preparing"?"Get ready...":phase==="playback"?"Hear your voice":phase==="magic"?"You helped Milo!":phase==="speaking"?"Listen to Milo":`Practice my ${word} ${word.length===3?"word":"sound"}`}</button>}
      </div>
      </div>
      {error&&<p className="cvc-error" role="alert">{error}</p>}
    </main>
  </div>;
}
