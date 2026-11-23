import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mic, RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import { CharacterCompanion } from './CharacterCompanion';
import { MiloSays } from './MiloSays';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import './study.css';

// Same per-letter recordings as ChronicleBlendLesson for short-vowel CVC words.
const VOWELS: Record<string, string> = { a: '/audio/stage1/classic-milo/A.wav', e: '/audio/stage1/classic-milo/E.wav', i: '/audio/stage1/classic-milo/I.wav', o: '/audio/stage1/classic-milo/O.wav', u: '/audio/stage1/classic-milo/U.wav' };
// Pause between sounds, long enough that the child hears separate sounds and not the word.
const SOUND_GAP_MS = 500;

async function saySounds(sound: ReturnType<typeof useBridgeAudio>, word: string, cue?: (i:number)=>void) {
  for (let i = 0; i < word.length; i++) {
    if (i) await sound.wait(SOUND_GAP_MS);
    cue?.(i);
    await sound.play(VOWELS[word[i]] ?? `/audio/stage2/classic-milo/SoundShelf-${word[i].toUpperCase()}.wav`);
  }
}

function SoundTiles({word,tile}:{word:string;tile:number}) {
  return <div className={'blend-tiles '+(tile===word.length?'joined':'')} role="group" aria-label="Sound letters">
    {Array.from(word,(letter,i)=><span key={i} className={tile===i?'active':''}>{tile>=i?letter:''}</span>)}
  </div>;
}

/** Part 2 intro: Milo models one practice item (mat) that is never recorded or stored. */
export function StudyBlendIntro({ onStart }: { onStart: () => void }) {
  const sound = useBridgeAudio('/audio/stage3');
  const [heard, setHeard] = useState(false);
  const [tile,setTile]=useState(-1);
  const [playing,setPlaying]=useState(false);
  async function practice() {
    setPlaying(true);setTile(-1);
    try {
      await saySounds(sound, 'mat',setTile);
      await sound.wait(SOUND_GAP_MS);
      setTile(3);
      await sound.play('/audio/stage3/classic-milo/PronounceMAT.wav');
    } catch { /* Stopped or blocked; the teacher can still start the game. */ }
    setHeard(true);setPlaying(false);
  }
  return <section className="study-card study-intro" aria-labelledby="study-blend-heading">
    <CharacterCompanion state={sound.isPlaying ? 'speaking' : 'encouraging'} size={120} />
    <h1 id="study-blend-heading">Sound game</h1>
    <MiloSays text={heard ? 'Your turn.' : 'Bring the sounds together.'} />
    <SoundTiles word="mat" tile={tile}/>
    <div className="study-actions">
      <button className="study-mic" disabled={playing} onClick={() => void practice()} aria-label="Hear Milo bring the sounds together"><Volume2 size={44} /></button>
      <button className="study-primary" disabled={!heard || playing} onClick={onStart}>Start the sound game</button>
    </div>
  </section>;
}

/**
 * One scored blending item: Milo says each sound, then the child says the whole word.
 * Letter cues accompany the individual sounds. No whole-word audio or correctness feedback.
 */
export function StudyBlendItem({ word, number, total, status, seconds, onRecord, onSkip, onFinish, onNext, sending, children }: {
  word: string; number: number; total: number; status: 'ready' | 'recording' | 'saved'; seconds: number;
  onFinish:()=>void; onNext:ReactNode; sending:boolean;
  onRecord: (replayed: boolean) => void; onSkip: (replayed: boolean) => void; children?: ReactNode;
}) {
  const sound = useBridgeAudio('/audio/stage3');
  const [playing, setPlaying] = useState(true);
  const [replayed, setReplayed] = useState(false);
  const [tile,setTile]=useState(-1);
  const heard = useRef(false);
  const run = useRef(0);
  async function play() {
    const id = ++run.current;
    setPlaying(true);setTile(-1);
    try { await saySounds(sound, word, setTile); setTile(3); heard.current = true; } catch { /* Stopped, or blocked until the next tap. */ }
    if (id === run.current) setPlaying(false);
  }
  // The parent keys this component by word, so the sounds play once per item.
  useEffect(() => { void play(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A tap after a failed first play is not a replay, since the child never heard the sounds.
  function replay() { if (heard.current) setReplayed(true); void play(); }
  const ready = status === 'ready' && !playing;
  return <section className="study-card study-test" aria-labelledby="study-blend-progress">
    <p id="study-blend-progress" className="study-progress">Sound game {number} of {total}</p>
    <div className="study-progress-bar" aria-hidden="true"><span style={{ width: `${((number - 1) / total) * 100}%` }} /></div>
    <div className="study-blend-guide"><CharacterCompanion state={playing ? 'speaking' : 'idle'} size={120} /></div>
    <SoundTiles word={word} tile={tile}/>
    {status === 'saved' ? onNext :
      <div className="study-actions">
        <button className="study-mic" disabled={sending || (!ready && status!=='recording')} onClick={() => status==='recording' ? onFinish() : onRecord(replayed)} aria-label="Record yourself saying the whole word">
          {status === 'recording' ? <span className="study-countdown">{seconds}</span> : <Mic size={48} />}
        </button>
        {!replayed && <button className="study-skip" disabled={!ready} onClick={replay}><RotateCcw size={20} /> Hear again</button>}
        <button className="study-skip" disabled={sending || status !== 'ready'} onClick={() => onSkip(replayed)}><SkipForward size={20} /> Skip</button>
      </div>}
    <p className="study-hint">{status === 'recording' ? 'Say the whole word now.' : playing ? 'Listen to Milo.' : status === 'ready' ? 'Tap the microphone, then say the whole word.' : ''}</p>
    {children}
  </section>;
}
