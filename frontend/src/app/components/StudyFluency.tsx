import { useEffect, useRef, useState } from 'react';
import { Check, Mic, SkipForward, WifiOff } from 'lucide-react';
import { CharacterCompanion } from './CharacterCompanion';
import { CLASSROOM_API } from '../hooks/useClassroom';
import type { StudyState } from '../hooks/useStudySession';
import './study.css';

const MAX_MS = 60_000;

/**
 * Part 3 one-minute word reading: the child reads the list aloud in one recording that stops at 60 s
 * or when they tap Done. There is deliberately no word audio, hint, feedback, or reward.
 */
export function StudyFluency({ token, phase, words, onSaved, onRefused }: {
  token: string; phase: 'pretest' | 'posttest'; words: string[]; onSaved: (state: StudyState) => void; onRefused: () => void;
}) {
  const [stage, setStage] = useState<'intro' | 'starting' | 'reading' | 'saving'>('intro');
  const [message, setMessage] = useState('');
  const [offline, setOffline] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const live = useRef(true);
  // Leaving the screen mid-reading discards it, so the reading can start again cleanly.
  useEffect(() => { live.current=true; return () => { live.current = false; stop.current?.(); }; }, []);

  useEffect(()=>{
    if(stage==='intro')return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[stage]);

  async function save(reading: { blob: Blob; startedAt: string; durationMs: number } | null) {
    setStage('saving');
    const form = new FormData();
    form.append('phase', phase);
    if (reading) {
      form.append('started_at', reading.startedAt);
      form.append('duration_ms', String(reading.durationMs));
      form.append('audio', reading.blob, `reading.${reading.blob.type.includes('mp4') ? 'mp4' : reading.blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
    } else form.append('skip', 'true');
    while (live.current) {
      try {
        const response = await fetch(`${CLASSROOM_API}/study/me/fluency`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(60000) });
        if (response.ok) { const state = await response.json() as StudyState; if (live.current) onSaved(state); return; }
        // 400/409: the server refused this reading; retrying the same upload cannot help.
        if (response.status === 400 || response.status === 409) {
          const reason = (await response.json().catch(() => null) as { message?: string } | null)?.message;
          setOffline(false); setStage('intro'); setMessage(`${reason ?? 'That reading was not saved.'} Please ask your teacher.`); onRefused();
          return;
        }
      } catch { /* Network error: keep the reading and try again. */ }
      setOffline(true);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  async function start() {
    setMessage(''); setStage('starting');
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('No recorder');
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch { setStage('intro'); setMessage('The microphone is not working. Please ask your teacher.'); return; }
    if (!live.current) { stream.getTracks().forEach(track => track.stop()); return; }
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    let began = 0, ended = 0, startedAt = '', timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      if (!ended) ended = performance.now();
      if (recorder.state !== 'inactive') recorder.stop();
    };
    stop.current = finish;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    // The words appear only once recording has begun, so the minute starts with the reading.
    recorder.onstart = () => { began = performance.now(); startedAt = new Date().toISOString(); setStage('reading'); timer = window.setTimeout(finish, MAX_MS); };
    let failed=false;
    recorder.onerror = () => { failed=true; finish(); };
    recorder.onstop = () => {
      stop.current = null;
      stream.getTracks().forEach(track => track.stop());
      if (!live.current) return;
      if(failed || !chunks.length || !began){setStage('intro');setMessage('The microphone stopped. Please try again.');return;}
      void save({ blob: new Blob(chunks, { type: recorder.mimeType }), startedAt, durationMs: Math.min(MAX_MS, Math.round((ended || performance.now()) - began)) });
    };
    recorder.start();
  }

  if (stage === 'saving') {
    return <section className="study-card study-intro">
      <Check size={44} className="study-ok mx-auto" />
      <h1>All done!</h1>
      <p>Saving your reading...</p>
      {offline && <p className="study-warn" role="alert"><WifiOff size={18} className="inline mr-1" />Waiting for the internet. Please keep this screen open.</p>}
    </section>;
  }

  if (stage === 'reading') {
    return <section className="study-card study-test" aria-labelledby="study-fluency-hint">
      <p id="study-fluency-hint" className="study-progress"><Mic size={18} className="inline mr-1" />Read the words out loud.</p>
      <ol className="study-fluency-words" lang="en">{words.map(word => <li key={word}>{word}</li>)}</ol>
      <button className="study-primary study-fluency-done" onClick={() => stop.current?.()}><Check size={22} /> Done</button>
    </section>;
  }

  return <section className="study-card study-intro" aria-labelledby="study-fluency-heading">
    <CharacterCompanion state="encouraging" size={120} />
    <h1 id="study-fluency-heading">Reading game</h1>
    <p>Read the words out loud.</p>
    <p>Start at the top. Go across each row.</p>
    <p>Tap <strong>Done</strong> when you finish.</p>
    {message && <p role="alert" className="study-warn">{message}</p>}
    <div className="study-actions">
      <button className="study-primary" disabled={stage === 'starting'} onClick={() => void start()}><Mic size={22} /> Start</button>
      <button className="study-skip" disabled={stage === 'starting'} onClick={() => void save(null)}><SkipForward size={20} /> Skip</button>
    </div>
  </section>;
}
