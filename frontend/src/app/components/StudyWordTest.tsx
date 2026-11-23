import { useEffect, useRef, useState } from 'react';
import { Mic, SkipForward, Check } from 'lucide-react';
import { useCvcRecorder } from '../../hooks/useCvcRecorder';
import { CLASSROOM_API } from '../hooks/useClassroom';
import type { StudyState } from '../hooks/useStudySession';
import { StudyBlendIntro, StudyBlendItem } from './StudyBlendItem';
import { CharacterCompanion } from './CharacterCompanion';
import { StudyFluency } from './StudyFluency';
import './study.css';

type Status = 'ready' | 'recording' | 'saved';
interface Answer { word: string; blob: Blob | null; itemType: 'word' | 'blend'; replayed: boolean }

/**
 * Pretest/posttest: the child reads each printed word once. There is deliberately no
 * word audio, hint, correctness feedback, or reward, so the test measures independent reading.
 * Keep the current card until its saved response is acknowledged.
 */
export function StudyWordTest({ token, test, onUpdate, onRefresh }: { token: string; test: NonNullable<StudyState['test']>; onUpdate: (state: StudyState) => void; onRefresh: () => void }) {
  const recorder = useCvcRecorder();
  const leftMicCheck = useRef(false);
  const [level,setLevel]=useState(0);
  const [prepared, setPrepared] = useState(false);
  const [started, setStarted] = useState(false);
  const [micChecked, setMicChecked] = useState(false);
  const [status, setStatus] = useState<Status>('ready');
  const [seconds, setSeconds] = useState(4);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<Answer | null>(null);
  const uploading = useRef(false);
  const [blendStarted, setBlendStarted] = useState(false);
  const finished = new Set(test.answered);
  // Part 1 (printed words) always comes first; Part 2 (sound blending) starts only when it is done.
  const blends = test.blends ?? [];
  const remaining = test.words.filter(word => !finished.has(word));
  const remainingBlends = blends.filter(word => !finished.has(word));
  const part: Answer['itemType'] = remaining.length ? 'word' : 'blend';
  const word = remaining[0] ?? remainingBlends[0];
  const number = test.words.length - remaining.length + 1;
  // Part 3 (one-minute reading) follows Part 2 in sessions that have it.
  const fluency = test.fluency ?? [];
  const needsFluency = fluency.length > 0 && !test.fluencyDone;

  useEffect(()=>{if(!draft&&!sending&&status!=='recording')return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[draft,sending,status]);
  async function submit(answer: Answer) {
    if (uploading.current) return;
    uploading.current = true; setSending(true); setMessage('');
    const form = new FormData();
    form.append('phase', test.phase);
    form.append('word', answer.word);
    form.append('item_type', answer.itemType);
    if (answer.replayed) form.append('prompt_replayed', 'true');
    if (answer.blob) form.append('audio', answer.blob, `answer.${answer.blob.type.includes('mp4') ? 'mp4' : answer.blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
    else form.append('skip', 'true');
    try {
      const response = await fetch(`${CLASSROOM_API}/study/me/answer`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Your response could not be sent. Tap Next to try again.');
      const state = await response.json();
      setDraft(null); setStatus('ready'); onUpdate(state);
    } catch { setMessage('Connection interrupted. Keep this card open and try again.'); }
    finally { uploading.current = false; setSending(false); }
  }

  async function record(practice = false, replayed = false) {
    setMessage('');
    setStatus('recording');
    try {
      const blob = await recorder.capture(setSeconds, async () => undefined, { onLevel:practice?setLevel:undefined, acceptQuiet:!practice, endOnSilence: practice, maxMs: practice ? 4000 : 10000 });
      if (practice && leftMicCheck.current) return;
      if (practice) { setStatus('ready'); setMicChecked(true); setMessage('I can hear you. You are ready!'); return; }
      const current = word;
      const itemType = part;
      setStatus('saved');
      setDraft({ word: current, blob, itemType, replayed });
    } catch (error) {
      if (practice && leftMicCheck.current) return;
      setStatus('ready');
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(practice ? 'Try saying hello again, or skip this check.' : error instanceof Error && error.name === 'NoVoiceError' ? 'I could not hear you. Tap the microphone and read the word out loud.' : 'The microphone is not working. Please ask your teacher.');
    }
  }

  if (!prepared) return <section className="study-card study-intro study-invitation">
    <CharacterCompanion state="encouraging" gesture="wave" size={164}/>
    <p className="study-progress">The Reading Chronicles</p><h1>{test.phase === 'pretest' ? 'Welcome to Readlr!' : 'Welcome back, reader!'}</h1>
    <p>{test.phase === 'pretest' ? "Before we open your first book, let's try three little reading activities." : "Let's visit the word cards, sound tiles, and reading wall again."}</p>
    <button className="study-primary" onClick={()=>setPrepared(true)}>Let's Prepare</button></section>;
  const next = draft && <button className="study-primary" disabled={sending} onClick={()=>void submit(draft)}>{sending ? 'One moment...' : 'Next'}</button>;
  if (!started) {
    return <section className="study-card study-intro" aria-labelledby="study-test-heading">
      <CharacterCompanion state={status==='recording'?'listening':'encouraging'} size={126}/>
      <h1 id="study-test-heading">Mic check</h1>
      <div className="study-mic-check">
        <p><strong>First, let's check the microphone.</strong> Tap it and say hello.</p>
        <button className="study-mic" disabled={status === 'recording'} onClick={() => void record(true)} aria-label="Check the microphone">
          {status === 'recording' ? <span className="study-countdown">{seconds}</span> : <Mic size={40} />}
        </button>
        {status==='recording'&&<meter aria-label="Microphone input level" min={0} max={1} value={level}/>}
        {message && <p role="status" className={micChecked ? 'study-ok' : 'study-warn'}>{message}</p>}
      </div>
      <button className="study-primary" onClick={() => { leftMicCheck.current=true; recorder.stop(); setStatus('ready'); setStarted(true); setMessage(''); }}>{micChecked ? 'Start the word game' : 'Skip mic check'}</button>
    </section>;
  }

  if (!word && needsFluency) {
    return <StudyFluency token={token} phase={test.phase} words={fluency} onSaved={onUpdate} onRefused={onRefresh} />;
  }

  if (!word) {
    return <section className="study-card study-intro">
      <Check size={44} className="study-ok mx-auto" />
      <h1>All done!</h1>
      <p>Getting the next part ready...</p>
    </section>;
  }

  if (part === 'blend') {
    const notices = <>
      {message && <p role="alert" className="study-warn">{message}</p>}
    </>;
    // After a reload partway through Part 2 the practice is not repeated.
    if (!blendStarted && remainingBlends.length === blends.length) return <StudyBlendIntro onStart={() => setBlendStarted(true)} />;
    return <StudyBlendItem key={word} word={word} number={blends.length - remainingBlends.length + 1} total={blends.length} status={status} seconds={seconds}
      onRecord={replayed => void record(false, replayed)} onNext={next} sending={sending} onFinish={recorder.finish} onSkip={replayed => submit({ word, blob: null, itemType: 'blend', replayed })}>{notices}</StudyBlendItem>;
  }

  return <section className="study-card study-test" aria-labelledby="study-word">
    <p className="study-progress">Word {number} of {test.words.length}</p>
    <div className="study-progress-bar" aria-hidden="true"><span style={{ width: `${((number - 1) / test.words.length) * 100}%` }} /></div>
    <p id="study-word" className="study-word" lang="en">{word}</p>
    {status === 'saved' ? next :
      <div className="study-actions">
        <button className="study-mic" disabled={sending} onClick={() => status === 'recording' ? recorder.finish() : void record()} aria-label={status === "recording" ? "Finish speaking" : "Read the word aloud"}>
          {status === 'recording' ? <span className="study-countdown">{seconds}</span> : <Mic size={48} />}
        </button>
        <button className="study-skip" disabled={sending || status !== 'ready'} onClick={() => submit({ word, blob: null, itemType: 'word', replayed: false })}><SkipForward size={20} /> Skip</button>
      </div>}
    <p className="study-hint">{status === 'recording' ? 'Read the word. Tap the microphone when finished.' : status === 'ready' ? 'Tap the microphone, then read the word.' : ''}</p>
    {message && <p role="alert" className="study-warn">{message}</p>}
  </section>;
}
