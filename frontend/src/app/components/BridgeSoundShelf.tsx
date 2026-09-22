import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Lock, Sparkles, Volume2, WandSparkles } from "lucide-react";
import { CONSONANTS, CONSONANT_SOUND_FALLBACKS } from "./bridgeCurriculum";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { CharacterCompanion } from "./CharacterCompanion";

const VOWELS = ["A", "E", "I", "O", "U"];
const PAGE_SIZE = 7;

export function BridgeSoundShelf({ unlocked = false }: { unlocked?: boolean }) {
  const [consonant, setConsonant] = useState<string | null>(null);
  const [vowel, setVowel] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [joining, setJoining] = useState(false);
  const [magic, setMagic] = useState(0);
  const [error, setError] = useState("");
  const run = useRef(0);
  useEffect(() => () => { run.current++; }, []);
  const audio = useBridgeAudio();
  const reducedMotion = useReducedMotion();
  const pageCount = Math.ceil(CONSONANTS.length / PAGE_SIZE);
  const pageLetters = CONSONANTS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const blend = consonant && vowel ? consonant + vowel : null;

  function stop() { run.current++; audio.stop(); setPlaying(false); setJoining(false); setError(""); }
  async function speak(text: string, file: string) {
    stop();
    const attempt = run.current;
    setPlaying(true);
    try { await audio.narrateText({ file, text }); }
    catch (reason) { if (attempt === run.current && (reason as Error).name !== "AbortError") setError("Sound unavailable. Please try again."); }
    finally { if (attempt === run.current) setPlaying(false); }
  }
  function pickConsonant(char: string) {
    setConsonant(char);
    setAssembled(false);
    void speak(CONSONANT_SOUND_FALLBACKS[char], `SoundShelf-${char}.wav`);
  }
  function pickVowel(char: string) {
    setVowel(char);
    setAssembled(false);
    stop();
    const attempt = run.current;
    setPlaying(true);
    void audio.play(`/audio/stage1/${char}.wav`).catch(reason => {
      if (attempt === run.current && (reason as Error).name !== "AbortError") return audio.narrateText({ file: `SoundShelf-${char}.wav`, text: char.toLowerCase() });
      return undefined;
    }).catch(reason => { if (attempt === run.current && (reason as Error).name !== "AbortError") setError("Sound unavailable. Please try again."); }).finally(() => { if (attempt === run.current) setPlaying(false); });
  }
  async function glueSounds() {
    if (!unlocked || !blend) return;
    stop();
    const attempt = run.current;
    setPlaying(true);
    setMagic(value => value + 1);
    setJoining(true);
    try {
      await audio.wait(560);
      if (attempt !== run.current) return;
      setAssembled(true);
      setJoining(false);
      await audio.narrateText({ file: `Pronounce${blend}.wav`, text: blend.toLowerCase() });
    } catch (reason) { if (attempt === run.current && (reason as Error).name !== "AbortError") setError("Sound unavailable. Please try again."); }
    finally { if (attempt === run.current) setPlaying(false); }
  }
  function repeatBlend() {
    if (!blend) return;
    void speak(blend.toLowerCase(), `Pronounce${blend}.wav`);
  }

  return <section className="sound-shelf" aria-label="Sound shelf" data-unlocked={unlocked}>
    <div className="sound-shelf__cabinet">
      <div className="sound-shelf__awning" aria-hidden="true"><span/><span/><span/><span/><span/><span/><span/></div>
      <div className="sound-shelf__sign"><Sparkles size={19}/><span>Milo's Sound Shelf</span><Sparkles size={19}/></div>
      <div className="sound-shelf__guide"><CharacterCompanion size={78} state={playing ? "speaking" : assembled ? "celebrating" : "idle"}/><p>{assembled ? "A new sound team!" : blend ? "Those two sounds can join!" : unlocked ? "Pick a sound from each shelf." : "Listen to the sounds, explorer!"}</p></div>
      <div className="sound-shelf__row-label"><span>Consonant shelf</span><small>{page + 1} of {pageCount}</small></div>
      <div className="sound-shelf__carousel">
        <button className="shelf-arrow" onClick={() => { stop(); setPage(value => (value + pageCount - 1) % pageCount); }} aria-label="Previous consonant shelf" title="Previous consonant shelf"><ChevronLeft /></button>
        <AnimatePresence mode="wait" initial={false}><motion.div key={page} className="sound-shelf__letters" role="group" aria-label="Consonants"
          initial={reducedMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0, x: -20 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
          {pageLetters.map(char => <button key={char} aria-pressed={consonant === char} onClick={() => pickConsonant(char)}><span>{char.toLowerCase()}</span><Volume2 size={14}/></button>)}
        </motion.div></AnimatePresence>
        <button className="shelf-arrow" onClick={() => { stop(); setPage(value => (value + 1) % pageCount); }} aria-label="Next consonant shelf" title="Next consonant shelf"><ChevronRight /></button>
      </div>
      <div className="sound-shelf__dots" aria-label="Consonant shelf pages">{Array.from({length:pageCount},(_,index)=><button key={index} aria-label={`Shelf ${index+1}`} aria-pressed={page===index} onClick={()=>{stop();setPage(index);}}><i data-active={page===index}/></button>)}</div>
      <div className="sound-shelf__row-label sound-shelf__row-label--vowel"><span>Vowel shelf</span><small>Choose one</small></div>
      <div className="sound-shelf__vowels" role="group" aria-label="Vowels">
        {VOWELS.map(char => <button key={char} aria-pressed={vowel === char} aria-label={`Choose ${char} vowel sound`} onClick={() => pickVowel(char)}><span>{char.toLowerCase()}</span><Volume2 size={16}/></button>)}
      </div>
      <div className="sound-shelf__spell-tray" aria-live="polite" data-magic={magic} data-ready={Boolean(blend)} data-assembled={assembled}>
        <div className="sound-shelf__tray-heading"><Sparkles size={17}/><span>Sound spell tray</span></div>
        <div className="sound-shelf__spell-pieces" data-joining={joining}>
          {assembled ? <motion.strong className="sound-shelf__joined" key={`blend-${magic}`} initial={reducedMotion?false:{scale:.8}} animate={{scale:1}}><span>{consonant?.toLowerCase()}</span><span>{vowel?.toLowerCase()}</span></motion.strong> : <>
          <motion.span key={`consonant-${consonant}`} className="sound-shelf__socket" data-filled={Boolean(consonant)} initial={reducedMotion ? false : { y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1, x: joining?32:0, rotate:joining?0:-5 }} transition={{ duration: reducedMotion ? 0 : .45 }}>{consonant?.toLowerCase() ?? "?"}</motion.span>
          <b style={{opacity:joining?0:1}}>+</b>
          <motion.span key={`vowel-${vowel}`} className="sound-shelf__socket sound-shelf__socket--vowel" data-filled={Boolean(vowel)} initial={reducedMotion ? false : { y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1, x: joining?-32:0, rotate:joining?0:5 }} transition={{ duration: reducedMotion ? 0 : .45 }}>{vowel?.toLowerCase() ?? "?"}</motion.span>
          </>}
        </div>
        {blend && !assembled && <p>You can glue them together! Let&apos;s do it.</p>}
        {assembled && <p>{blend?.toLowerCase()} is a sound team. Say it with Milo!</p>}
        <i key={magic} aria-hidden="true"><Sparkles size={18}/><Sparkles size={13}/><Sparkles size={16}/></i>
      </div>
      <div className="sound-shelf__actions">
        {!assembled && <button className="bridge-primary sound-shelf__magic-button" disabled={!unlocked || !blend || joining} onClick={() => void glueSounds()}>{unlocked ? <WandSparkles size={20}/> : <Lock size={20}/>} {unlocked ? blend ? `Glue ${blend.toLowerCase()} together` : "Choose two sound pieces" : "Finish training to glue sounds"}</button>}
        {assembled && <button className="bridge-primary sound-shelf__repeat-button" disabled={playing} onClick={repeatBlend}><Volume2 size={20}/>Hear {blend?.toLowerCase()} again</button>}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
