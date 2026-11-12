import { useEffect, useRef, useState } from 'react';
import { Mic, SkipForward, Check, WifiOff } from 'lucide-react';
import { useCvcRecorder } from '../../hooks/useCvcRecorder';
import { CLASSROOM_API } from '../hooks/useClassroom';
import type { StudyState } from '../hooks/useStudySession';
import './study.css';

type Status = 'ready' | 'recording' | 'saved';
interface Answer { word: string; blob: Blob | null }

/**
 * Pretest/posttest: the child reads each printed word once. There is deliberately no
 * word audio, hint, correctness feedback, or reward, so the test measures independent reading.
 * Answers upload in the background so the next word appears immediately.
 */
export function StudyWordTest({ token, test, onUpdate, onRefresh }: { token: string; test: NonNullable<StudyState['test']>; onUpdate: (state: StudyState) => void; onRefresh: () => void }) {
  const recorder = useCvcRecorder();
  const [started, setStarted] = useState(false);
  const [micChecked, setMicChecked] = useState(false);
  const [status, setStatus] = useState<Status>('ready');
  const [seconds, setSeconds] = useState(4);
  const [message, setMessage] = useState('');
  const [local, setLocal] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);
  const queue = useRef<Answer[]>([]);
  const uploading = useRef(false);
  const latest = useRef<StudyState | null>(null);
  const dropReason = useRef('');
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const finished = new Set([...test.answered, ...local]);
  const remaining = test.words.filter(word => !finished.has(word));
  const word = remaining[0];
  const number = test.words.length - remaining.length + 1;

  async function upload(answer: Answer): Promise<'ok' | 'drop' | 'retry'> {
    const form = new FormData();
    form.append('phase', test.phase);
    form.append('word', answer.word);
    if (answer.blob) form.append('audio', answer.blob, `answer.${answer.blob.type.includes('mp4') ? 'mp4' : answer.blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
    else form.append('skip', 'true');
    try {
      const response = await fetch(`${CLASSROOM_API}/study/me/answer`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(30000) });
      if (response.ok) { latest.current = await response.json(); return 'ok'; }
      // 400/409: the server refused this answer; retrying the same upload cannot help.
      if (response.status === 400 || response.status === 409) {
        dropReason.current = (await response.json().catch(() => null) as { message?: string } | null)?.message ?? '';
        return 'drop';
      }
      return 'retry';
    } catch { return 'retry'; }
  }

  async function drain() {
    if (uploading.current) return;
    uploading.current = true;
    let dropped = false;
    while (queue.current.length && live.current) {
      const result = await upload(queue.current[0]);
      if (result === 'retry') { setOffline(true); await new Promise(resolve => setTimeout(resolve, 3000)); continue; }
      if (result === 'drop') dropped = true;
      queue.current.shift();
      setOffline(false);
      setPending(queue.current.length);
    }
    uploading.current = false;
    if (!live.current) return;
    // Words count as done on screen only while they wait to upload; after that the server's saved
    // list decides. Without this, a refused answer looked finished, the server never reached the
    // last word, and the test sat on "Getting the next part ready" instead of starting learning time.
    const keepPending = () => setLocal(list => list.filter(word => queue.current.some(answer => answer.word === word)));
    if (dropped) {
      if (latest.current) onUpdate(latest.current);
      keepPending();
      setMessage(`${dropReason.current || 'That answer was not saved.'} Let's read that word again.`);
      onRefresh();
    } else if (latest.current && (latest.current.phase !== test.phase || queue.current.length === 0)) {
      onUpdate(latest.current);
      keepPending();
    }
  }

  function submit(answer: Answer) {
    queue.current.push(answer);
    setPending(queue.current.length);
    setLocal(list => [...list, answer.word]);
    void drain();
  }

  async function record(practice = false) {
    setMessage('');
    setStatus('recording');
    try {
      const blob = await recorder.capture(setSeconds, async () => undefined, { endOnSilence: true });
      if (practice) { setStatus('ready'); setMicChecked(true); setMessage('I can hear you. You are ready!'); return; }
      const current = word;
      setStatus('saved');
      window.setTimeout(() => { if (live.current) { setStatus('ready'); submit({ word: current, blob }); } }, 300);
    } catch (error) {
      setStatus('ready');
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(error instanceof Error && error.name === 'NoVoiceError' ? 'I could not hear you. Tap the microphone and read the word out loud.' : 'The microphone is not working. Please ask your teacher.');
    }
  }

  if (!started) {
    return <section className="study-card study-intro" aria-labelledby="study-test-heading">
      <h1 id="study-test-heading">Word game</h1>
      <p>You will see some words. Read each word out loud.</p>
      <ol>
        <li>Tap the <strong>microphone</strong>.</li>
        <li>Read the word.</li>
        <li>If you do not know a word, tap <strong>Skip</strong>. That is okay!</li>
      </ol>
      <div className="study-mic-check">
        <p><strong>First, let's check the microphone.</strong> Tap it and say your name.</p>
        <button className="study-mic" disabled={status === 'recording'} onClick={() => void record(true)} aria-label="Check the microphone">
          {status === 'recording' ? <span className="study-countdown">{seconds}</span> : <Mic size={40} />}
        </button>
        {message && <p role="status" className={micChecked ? 'study-ok' : 'study-warn'}>{message}</p>}
      </div>
      <button className="study-primary" disabled={!micChecked || status === 'recording'} onClick={() => { setStarted(true); setMessage(''); }}>Start the word game</button>
    </section>;
  }

  if (!word) {
    return <section className="study-card study-intro">
      <Check size={44} className="study-ok mx-auto" />
      <h1>All done!</h1>
      <p>{pending ? `Saving your answers... (${pending} left)` : 'Getting the next part ready...'}</p>
      {offline && <p className="study-warn" role="alert"><WifiOff size={18} className="inline mr-1" />Waiting for the internet. Please keep this screen open.</p>}
    </section>;
  }

  return <section className="study-card study-test" aria-labelledby="study-word">
    <p className="study-progress">Word {number} of {test.words.length}</p>
    <div className="study-progress-bar" aria-hidden="true"><span style={{ width: `${((number - 1) / test.words.length) * 100}%` }} /></div>
    <p id="study-word" className="study-word" lang="en">{word}</p>
    {status === 'saved' ? <p className="study-ok study-saved"><Check size={28} /> Thank you!</p> :
      <div className="study-actions">
        <button className="study-mic" disabled={status !== 'ready'} onClick={() => void record()} aria-label="Record yourself reading the word">
          {status === 'recording' ? <span className="study-countdown">{seconds}</span> : <Mic size={48} />}
        </button>
        <button className="study-skip" disabled={status !== 'ready'} onClick={() => submit({ word, blob: null })}><SkipForward size={20} /> Skip</button>
      </div>}
    <p className="study-hint">{status === 'recording' ? 'Read the word now.' : status === 'ready' ? 'Tap the microphone, then read the word.' : ''}</p>
    {message && <p role="alert" className="study-warn">{message}</p>}
    {offline && <p className="study-hint"><WifiOff size={14} className="inline mr-1" />Saving is slow. Keep going!</p>}
  </section>;
}
