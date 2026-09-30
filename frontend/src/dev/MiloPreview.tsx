import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../app/components/ui/select";
import { useEffect, useState } from "react";
import { ArrowLeft, AudioLines, Hand, Headphones, Lightbulb, Link2, Mic, Play, RotateCcw, Sparkles, Square, Volume2 } from "lucide-react";
import { CharacterCompanion } from "../app/components/CharacterCompanion";
import type { CharacterState, MiloGesture, MiloLook } from "../app/components/miloBehavior";
import { useBridgeAudio } from "../hooks/useBridgeAudio";
import "./miloPreview.css";

const poses: { name: string; state: CharacterState; gesture: MiloGesture; lookAt: MiloLook; icon: typeof Hand }[] = [
  { name: "At rest", state: "idle", gesture: "rest", lookAt: "viewer", icon: Hand },
  { name: "Explaining", state: "speaking", gesture: "point", lookAt: "right", icon: Volume2 },
  { name: "Listening", state: "listening", gesture: "rest", lookAt: "viewer", icon: Mic },
  { name: "Thinking", state: "thinking", gesture: "rest", lookAt: "viewer", icon: Lightbulb },
  { name: "Try again", state: "encouraging", gesture: "wave", lookAt: "viewer", icon: RotateCcw },
  { name: "Celebrating", state: "celebrating", gesture: "reveal", lookAt: "right", icon: Sparkles },
  { name: "Join sounds", state: "idle", gesture: "join", lookAt: "down", icon: Link2 },
];
const clips = [
  { label: "Milo's introduction", path: "/audio/stage1/Stage1MiloIntro.wav" },
  { label: "Blended sound: ma", path: "/audio/stage2/PronounceMA.wav" },
  { label: "Word: sun", path: "/audio/stage3/PronounceSUN.wav" },
];

export function MiloPreview({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0), [take, setTake] = useState(0);
  const [quiet, setQuiet] = useState(false), [clip, setClip] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false), [error, setError] = useState("");
  const sound = useBridgeAudio();
  const pose = poses[index];
  const state = voiceMode ? sound.isPlaying ? "speaking" : "idle" : pose.state;
  useEffect(() => {
    const hide = () => { if (document.hidden) sound.stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  function select(value: number) { sound.stop(); setVoiceMode(false); setIndex(value); setTake(n => n + 1); setError(""); }
  async function play() {
    sound.stop(); setVoiceMode(true); setIndex(1); setError("");
    try { await sound.play(clips[clip].path); }
    catch (cause) { if ((cause as Error).name !== "AbortError") setError("The recording could not play. Try again."); }
  }
  return <main className="milo-preview" data-reduced-motion={quiet}>
    <header><button onClick={onBack}><ArrowLeft size={18}/>Scenes</button><span>CHARACTER STUDIO</span><label><input type="checkbox" checked={quiet} onChange={event => setQuiet(event.target.checked)}/>Reduced motion</label></header>
    <div className="milo-preview__heading"><p>YOUR READING BUDDY</p><h1>Meet Milo</h1></div>
    <div className="milo-preview__stage">
      <div className="milo-preview__character"><CharacterCompanion key={take} size={300} state={state} gesture={pose.gesture} lookAt={pose.lookAt} reducedMotion={quiet}/></div>
      <div className="milo-preview__letters" data-joined={pose.gesture === "join"} aria-label="M and A sound pieces"><span>m</span><span>a</span></div>
      <span className="milo-preview__state" role="status">{voiceMode ? sound.isPlaying ? "Speaking with your recording" : "Ready for your recording" : pose.name}</span>
    </div>
    <div className="milo-preview__poses" role="group" aria-label="Milo poses">{poses.map((item, value) => <button key={item.name} aria-pressed={index === value && !voiceMode} onClick={() => select(value)}><item.icon size={19}/>{item.name}</button>)}</div>
    <div className="milo-preview__audio"><Headphones size={21}/><Select value={String(clip)} onValueChange={value => { sound.stop(); setClip(Number(value)); }}><SelectTrigger aria-label="Milo voice recording"><SelectValue/></SelectTrigger><SelectContent>{clips.map((item, value) => <SelectItem key={item.path} value={String(value)}>{item.label}</SelectItem>)}</SelectContent></Select><button onClick={() => sound.isPlaying ? sound.stop() : void play()}>{sound.isPlaying ? <Square size={18}/> : <Play size={18}/>}<span>{sound.isPlaying ? "Stop voice" : "Hear Milo"}</span></button></div>
    {error && <p role="alert">{error}</p>}
    <footer><AudioLines size={17}/><span>Portrait</span><CharacterCompanion size={72} state={state} reducedMotion={quiet}/><span>Lesson size</span><CharacterCompanion size={132} state={state} gesture={pose.gesture} reducedMotion={quiet}/></footer>
  </main>;
}
