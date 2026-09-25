import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Check, Headphones, Lock, Mic, Square, Volume2 } from "lucide-react";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { useCvcRecorder } from "../../hooks/useCvcRecorder";
import { CVC_LESSONS } from "./cvcContent";
import { WordObject } from "./CvcArt";
import { VowelPowerSymbol } from "./VowelPowerSymbol";
import { LIBRARY_CONSONANTS, LIBRARY_VOWELS, libraryStageOpen, recordingKey, soundPath, type SoundGroup } from "./soundLibraryContent";
import { libraryRecording } from "./soundLibraryRecordings";
import "./soundLibrary.css";

const GROUPS = [
  { id: "vowels", name: "Vowel powers", stage: 1, title: "Valley of Vowels" },
  { id: "blends", name: "Sound teams", stage: 2, title: "Blending Bridges" },
  { id: "words", name: "Word magic", stage: 3, title: "CVC Kingdom" },
] as const;
const POWERS = ["Armor", "Echo", "Insight", "Orb", "Uplift"];

export function PhonemeBank({ onBack, completedByStage = {}, learnerId }: {
  onBack: () => void; completedByStage?: Record<number, number>; learnerId?: number | null;
}) {
  const [group, setGroup] = useState<SoundGroup>("vowels");
  const [vowel, setVowel] = useState("A");
  const [sound, setSound] = useState("A");
  const [phase, setPhase] = useState<"idle" | "playing" | "preparing" | "recording" | "saved">("idle");
  const [status, setStatus] = useState("");
  const [remaining, setRemaining] = useState(4);
  const [voice, setVoice] = useState<string>();
  const voiceRef = useRef<string | undefined>(undefined);
  const operation = useRef(0);
  const busy = useRef(false);
  const audio = useBridgeAudio();
  const recorder = useCvcRecorder();
  const category = GROUPS.find(item => item.id === group)!;
  const open = libraryStageOpen(category.stage, completedByStage);
  const sounds = group === "vowels" ? LIBRARY_VOWELS : group === "blends" ? LIBRARY_CONSONANTS.map(letter => letter + vowel) : CVC_LESSONS.map(lesson => lesson.word.toUpperCase());
  const recording = phase === "recording" || phase === "preparing";
  const locked = !open || (group === "vowels" && LIBRARY_VOWELS.indexOf(sound) > (completedByStage[1] ?? 0)) || (group === "words" && sounds.indexOf(sound) > (completedByStage[3] ?? 0));

  function replaceVoice(blob?: Blob) {
    if (voiceRef.current) URL.revokeObjectURL(voiceRef.current);
    voiceRef.current = blob ? URL.createObjectURL(blob) : undefined;
    setVoice(voiceRef.current);
  }
  function stop() {
    operation.current++;
    busy.current = false;
    audio.stop(); recorder.stop(); setPhase("idle");
  }
  useEffect(() => {
    stop(); setStatus(""); replaceVoice();
    let active = true;
    if (learnerId) void libraryRecording(recordingKey(learnerId, group, sound))
      .then(blob => { if (active) replaceVoice(blob); })
      .catch(() => { if (active) setStatus("Saved recordings are unavailable on this device."); });
    return () => { active = false; operation.current++; audio.stop(); recorder.stop(); if (voiceRef.current) URL.revokeObjectURL(voiceRef.current); };
  }, [learnerId, group, sound]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  async function listen(own = false) {
    if (locked || recording) return;
    stop(); const run = operation.current; setPhase("playing"); setStatus(own ? "Your voice" : "Listen to the sound");
    try {
      if (own && voice) await audio.play(voice);
      else {
        try { await audio.play(soundPath(group, sound)); }
        catch (error) {
          if ((error as Error).name === "AbortError" || run !== operation.current || group === "vowels") throw error;
          await audio.narrateText({ file: "", text: sound.toLowerCase() });
        }
      }
      if (run === operation.current) { setPhase("idle"); setStatus(""); }
    } catch (error) {
      if (run === operation.current && (error as Error).name !== "AbortError") { setPhase("idle"); setStatus("That sound could not play. Please try again."); }
    }
  }
  async function record() {
    if (locked || busy.current) return;
    stop(); busy.current = true; const run = operation.current;
    setPhase("preparing"); setStatus("Getting the microphone ready...");
    try {
      const blob = await recorder.capture(tick => { setRemaining(tick); setPhase("recording"); setStatus("Milo is listening..."); }, async () => { await audio.wait(300); });
      if (run !== operation.current) return;
      replaceVoice(blob); setPhase("saved"); setStatus("Your voice is ready to hear!");
      if (learnerId) {
        try { await libraryRecording(recordingKey(learnerId, group, sound), blob); }
        catch { if (run === operation.current) setStatus("You can listen now, but this recording could not be saved."); }
      }
    } catch (error) {
      if (run === operation.current && (error as Error).name !== "AbortError") { setPhase("idle"); setStatus((error as Error).message || "Please allow the microphone and try again."); }
    } finally { if (run === operation.current) busy.current = false; }
  }
  function selectGroup(next: SoundGroup) { stop(); setGroup(next); setVowel("A"); setSound(next === "vowels" ? "A" : next === "blends" ? "BA" : "SUN"); }

  return <main className={`sound-library ${group === "vowels" ? "library-vowel-collection" : `library-${group}`}`}>
    <header className="library-heading">
      <button className="library-back" onClick={onBack}><ArrowLeft size={18} />Stages</button>
      <div><BookOpen size={24} /><h1>Sound Library</h1></div>
      <span className="library-total">3 sound collections</span>
    </header>
    <nav className="library-tabs" aria-label="Sound collections">
      {GROUPS.map(item => <button key={item.id} aria-pressed={group === item.id} onClick={() => selectGroup(item.id)}>
        <span className={`library-number number-${item.stage}`}>{item.stage}</span>{item.name}
        {!libraryStageOpen(item.stage, completedByStage) && <Lock size={15} />}
      </button>)}
    </nav>
    <div className="library-layout">
      <section className="library-collection" aria-label={category.name}>
        <div className="library-section-title"><div><p>{category.title}</p><h2>{category.name}</h2></div><span>{sounds.length} sounds</span></div>
        {group === "blends" && <div className="library-vowels" aria-label="Choose a vowel">{LIBRARY_VOWELS.map(letter => <button key={letter} aria-pressed={vowel === letter} onClick={() => { stop(); setVowel(letter); setSound(sound[0] + letter); }}>{letter.toLowerCase()}</button>)}</div>}
        {!open && <p className="library-lock-note"><Lock size={16} />Finish Stage {category.stage - 1} to open this collection.</p>}
        <div className="library-shelf">
          {sounds.map((item, index) => {
            const unavailable = !open || (group !== "blends" && index > (completedByStage[category.stage] ?? 0));
            return <button className="library-tile" key={item} aria-pressed={sound === item} aria-label={`${item.toLowerCase()}${unavailable ? ", locked" : ""}`} onClick={() => { stop(); setSound(item); }}>
              {group === "vowels" ? <VowelPowerSymbol vowel={item} /> : group === "words" ? <WordObject word={item.toLowerCase()} /> : <span className="library-pair"><b>{item[0].toLowerCase()}</b><b>{item[1].toLowerCase()}</b></span>}
              <strong>{group === "vowels" ? `${item} ${POWERS[index]}` : item.toLowerCase()}</strong>
              {unavailable ? <Lock className="library-tile-marker" size={14} /> : sound === item && <Check className="library-tile-marker" size={16} />}
            </button>;
          })}
        </div>
      </section>
      <section className={`library-player is-${phase}`} aria-label="Sound practice">
        <p className="library-player-label">{locked ? "A sound to discover" : "Your listening nook"}</p>
        <div className="library-display">
          {group === "vowels" ? <VowelPowerSymbol vowel={sound} /> : group === "words" ? <WordObject word={sound.toLowerCase()} /> : <div className="library-joined"><span>{sound[0].toLowerCase()}</span><span>{sound[1].toLowerCase()}</span></div>}
          <div className="library-pedestal" />
        </div>
        <h2>{group === "vowels" ? `/${sound.toLowerCase()}/` : sound.toLowerCase()}</h2>
        {group !== "vowels" && <div className="library-letter-line">{sound.split("").map((letter, index) => <span key={index} className={LIBRARY_VOWELS.includes(letter) ? "is-vowel" : ""}>{letter.toLowerCase()}</span>)}</div>}
        {locked ? <p className="library-locked"><Lock size={20} />{open ? "Keep going on your journey to unlock this sound." : `Complete Stage ${category.stage - 1} to listen and practise.`}</p> : <>
          <div className="library-controls">
            <button className="library-speaker" aria-label="Listen to Milo" title="Listen to Milo" disabled={recording} onClick={() => void listen()}><Volume2 size={23} /></button>
            <button className="library-record" onClick={() => recording ? stop() : void record()}>
              {recording ? <Square size={20} /> : phase === "saved" ? <Check size={21} /> : <Mic size={21} />}
              {phase === "preparing" ? "Cancel" : phase === "recording" ? `Say ${sound.toLowerCase()} (${remaining})` : `Practise ${group === "vowels" ? `/${sound.toLowerCase()}/` : sound.toLowerCase()}`}
            </button>
          </div>
          <button className="library-my-voice" disabled={!voice || recording} onClick={() => void listen(true)}><Headphones size={18} />My voice</button>
        </>}
        <p className="library-status" role="status">{status || (voice ? "Your voice is ready to hear" : "")}</p>
      </section>
    </div>
  </main>;
}
