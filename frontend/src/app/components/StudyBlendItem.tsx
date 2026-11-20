import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Mic, RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import { CharacterCompanion } from './CharacterCompanion';
import { MiloSays } from './MiloSays';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import './study.css';

// Same per-letter recordings as ChronicleBlendLesson for short-vowel CVC words.
const VOWELS: Record<string, string> = { a: '/audio/stage1/classic-milo/A.wav', e: '/audio/stage1/classic-milo/E.wav', i: '/audio/stage1/classic-milo/I.wav', o: '/audio/stage1/classic-milo/O.wav', u: '/audio/stage1/classic-milo/U.wav' };
// Pause between sounds, long enough that the child hears separate sounds and not the word.
const SOUND_GAP_MS = 500;

async function saySounds(sound: ReturnType<typeof useBridgeAudio>, word: string) {
  for (let i = 0; i < word.length; i++) {
    if (i) await sound.wait(SOUND_GAP_MS);
    await sound.play(VOWELS[word[i]] ?? `/audio/stage2/classic-milo/SoundShelf-${word[i].toUpperCase()}.wav`);
  }
}

/** Part 2 intro: Milo models one practice item (mat) that is never recorded or stored. */
export function StudyBlendIntro({ onStart }: { onStart: () => void }) {
  const sound = useBridgeAudio('/audio/stage3');
  const [heard, setHeard] = useState(false);
  async function practice() {
    try {
      await saySounds(sound, 'mat');
      await sound.wait(SOUND_GAP_MS);
      await sound.play('/audio/stage3/classic-milo/PronounceMAT.wav');
    } catch { /* Stopped or blocked; the teacher can still start the game. */ }
    setHeard(true);
  }
  return <section className="study-card study-intro" aria-labelledby="study-blend-heading">
    <CharacterCompanion state={sound.isPlaying ? 'speaking' : 'encouraging'} size={120} />
    <h1 id="study-blend-heading">Sound game</h1>
    <MiloSays text={heard ? 'Your turn.' : 'Bring the sounds together.'} />
    <div className="study-actions">
      <button className="study-mic" disabled={sound.isPlaying} onClick={() => void practice()} aria-label="Hear Milo bring the sounds together"><Volume2 size={44} /></button>
      <button className="study-primary" disabled={!heard || sound.isPlaying} onClick={onStart}>Start the sound game</button>
    </div>
  </section>;
}

/**
 * One scored blending item: Milo says each sound, then the child says the whole word.
 * No printed word, whole-word audio, hint, feedback, or reward; one replay is allowed and reported.
 */
export function StudyBlendItem({ word, number, total, status, seconds, onRecord, onSkip, children }: {
  word: string; number: number; total: number; status: 'ready' | 'recording' | 'saved'; seconds: number;
  onRecord: (replayed: boolean) => void; onSkip: (replayed: boolean) => void; children?: ReactNode;
}) {
  const sound = useBridgeAudio('/audio/stage3');
  const [playing, setPlaying] = useState(true);
  const [replayed, setReplayed] = useState(false);
  const heard = useRef(false);
  const run = useRef(0);
  async function play() {
    const id = ++run.current;
    setPlaying(true);
    try { await saySounds(sound, word); heard.current = true; } catch { /* Stopped, or blocked until the next tap. */ }
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
    <CharacterCompanion state={playing ? 'speaking' : 'idle'} size={150} />
    {status === 'saved' ? <p className="study-ok study-saved"><Check size={28} /> Thank you!</p> :
      <div className="study-actions">
        <button className="study-mic" disabled={!ready} onClick={() => onRecord(replayed)} aria-label="Record yourself saying the whole word">
          {status === 'recording' ? <span className="study-countdown">{seconds}</span> : <Mic size={48} />}
        </button>
        {!replayed && <button className="study-skip" disabled={!ready} onClick={replay}><RotateCcw size={20} /> Hear again</button>}
        <button className="study-skip" disabled={status !== 'ready'} onClick={() => onSkip(replayed)}><SkipForward size={20} /> Skip</button>
      </div>}
    <p className="study-hint">{status === 'recording' ? 'Say the whole word now.' : playing ? 'Listen to Milo.' : status === 'ready' ? 'Tap the microphone, then say the whole word.' : ''}</p>
    {children}
  </section>;
}
