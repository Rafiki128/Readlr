import { useCallback, useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import './study.css';

type Api = (path: string, init?: RequestInit) => Promise<Response>;
interface Reading { id: string; word_order: string[]; duration_ms: number | null }

/** Blind Part 3 scoring: the teacher marks wrong words and the last word reached; the server computes the totals. */
export function StudyFluencyScoring({ api }: { api: Api }) {
  const [items, setItems] = useState<Reading[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [mode, setMode] = useState<'errors' | 'last'>('errors');
  const [undo, setUndo] = useState<Reading | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const item = items[0];
  const fetchBatch = useCallback(async () => {
    try { const data = await (await api('/fluency/scoring')).json(); setItems(data.items); setRemaining(data.remaining); setError(''); } catch (e) { setError((e as Error).message); }
  }, [api]);
  useEffect(() => { void fetchBatch(); }, [fetchBatch]);
  useEffect(() => {
    setErrors([]); setLast(null); setMode('errors');
    if (!item) { setAudioUrl(null); return; }
    let url: string | null = null, active = true;
    api(`/fluency/${item.id}/recording`).then(r => r.blob()).then(blob => { if (!active) return; url = URL.createObjectURL(blob); setAudioUrl(url); })
      .catch(e => active && setError((e as Error).message));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [item, api]);

  // Positions are 1-based to match the stored error positions and words attempted.
  const tap = (position: number) => mode === 'last' ? setLast(position) : setErrors(list => list.includes(position) ? list.filter(p => p !== position) : [...list, position]);
  const valid = last !== null && errors.every(p => p <= last);
  const correct = valid ? last - errors.length : null;
  const preview = correct !== null && item?.duration_ms ? Math.round(correct / (item.duration_ms / 60000) * 10) / 10 : null;

  async function send(target: Reading, marks: { errors: number[]; lastReached: number } | null) {
    setBusy(true); setError('');
    try {
      await api(`/fluency/${target.id}/score`, { method: 'PUT', body: JSON.stringify({ marks }) });
      if (!marks) { setUndo(null); setRemaining(n => (n ?? 0) + 1); setItems(list => [target, ...list.filter(x => x.id !== target.id)]); }
      else { setUndo(target); setRemaining(n => (n ?? 1) - 1); const rest = items.slice(1); setItems(rest); if (!rest.length) await fetchBatch(); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return <div className="study-admin-grid">
    <p className="admin-muted">Blind scoring: you hear each one-minute reading without the learner's name, group, or whether it is the pretest or posttest. The words are in the order the learner saw them. Tap each word read incorrectly, then choose <strong>Last word reached</strong> and tap the last word the learner got to.</p>
    {error && <p role="alert" className="admin-control-notice is-error">{error}</p>}
    <p><strong>{remaining ?? '...'}</strong> reading(s) left to score.</p>
    {item ? <div className="study-score-card">
      <audio src={audioUrl ?? undefined} controls preload="auto" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="What a tap marks">
        <button className={mode === 'errors' ? 'admin-apply' : 'admin-discard'} aria-pressed={mode === 'errors'} onClick={() => setMode('errors')}>Mark incorrect words</button>
        <button className={mode === 'last' ? 'admin-apply' : 'admin-discard'} aria-pressed={mode === 'last'} onClick={() => setMode('last')}>Last word reached</button>
        <button className="admin-discard" onClick={() => { setLast(0); setErrors([]); }}>No words read</button>
      </div>
      <ol className="study-fluency-score-words">{item.word_order.map((word, i) => {
        const position = i + 1;
        const state = [errors.includes(position) && 'is-error', position === last && 'is-last', last !== null && position > last && 'is-after'].filter(Boolean).join(' ');
        return <li key={word}><button className={state} aria-pressed={errors.includes(position) || position === last} onClick={() => tap(position)}><small>{position}</small>{word}</button></li>;
      })}</ol>
      <p>Attempted <strong>{last ?? '–'}</strong> · Incorrect <strong>{errors.length}</strong> · Correct <strong>{correct ?? '–'}</strong> · Time <strong>{item.duration_ms === null ? '–' : `${Math.round(item.duration_ms / 100) / 10} s`}</strong> · WCPM <strong>{preview ?? '–'}</strong></p>
      {last !== null && !valid && <p role="alert" className="admin-control-notice is-error">The last word reached must be at or after every word marked incorrect.</p>}
      <button className="admin-apply" disabled={busy || !valid || !audioUrl} onClick={() => void send(item, { errors, lastReached: last! })}>Save score</button>
    </div> : remaining === 0 && <p className="admin-empty">All readings are scored.</p>}
    {undo && <div><button className="admin-discard" disabled={busy} onClick={() => void send(undo, null)}><Undo2 size={16} className="inline mr-1" />Undo last score</button></div>}
  </div>;
}
