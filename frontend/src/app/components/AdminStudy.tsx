import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FlaskConical, Headphones, Play, RefreshCw, Undo2, UserPlus } from 'lucide-react';
import { CLASSROOM_API } from '../hooks/useClassroom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from './ui/alert-dialog';
import './study.css';

interface Session { userId: number; name: string; participantCode: string; group: 'A' | 'B'; phase: string; learningMinutes: number; learningEndsAt: string | null; pretestAnswered: number; posttestAnswered: number; finishedAt: string | null }
interface Overview { sessions: Session[]; eligible: { id: number; name: string; email: string }[]; notConsented: number; unscored: number; appPending: number; groups: { A: number; B: number }; wordCount: number }
interface Counts { correct: number; scored: number; total: number }
interface Participant { participantCode: string; group: 'A' | 'B'; phase: string; complete: boolean; unscored: number; taught: { pre: Counts; post: Counts }; transfer: { pre: Counts; post: Counts }; control: { pre: Counts; post: Counts } }
interface Results { participants: Participant[]; agreement: { compared: number; agree: number; percent: number | null } }

const PHASE_LABEL: Record<string, string> = { pretest: 'Pretest', learning: 'Learning', posttest: 'Posttest', done: 'Finished', closed: 'Back in normal app' };

function useApi(token: string) {
  return useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${CLASSROOM_API}/study/admin${path}`, {
      ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Request failed. Check that the study migration has been applied.');
    return response;
  }, [token]);
}

export function AdminStudy({ token }: { token: string }) {
  const [tab, setTab] = useState('sessions');
  return <section className="admin-access-section" aria-labelledby="study-heading">
    <header className="admin-section-heading"><div><h2 id="study-heading" className="flex items-center gap-2"><FlaskConical size={20} />Pretest &amp; posttest study</h2>
      <p>Group A learns Books 1–3 (short i/e). Group B learns Books 1, 4–5 (short o/u). Everyone takes the same word test before and after.</p></div></header>
    <Tabs value={tab} onValueChange={setTab} className="admin-section-tabs">
      <TabsList aria-label="Study sections" className="admin-section-nav">
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="scoring">Scoring</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>
      <TabsContent value="sessions" className="admin-section-panel"><StudySessions token={token} /></TabsContent>
      <TabsContent value="scoring" className="admin-section-panel"><StudyScoring token={token} /></TabsContent>
      <TabsContent value="results" className="admin-section-panel"><StudyResults token={token} /></TabsContent>
    </Tabs>
  </section>;
}

function StudySessions({ token }: { token: string }) {
  const api = useApi(token);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [chosen, setChosen] = useState<number[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Session | null>(null);
  const [confirmWord, setConfirmWord] = useState('');
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    try { setData(await (await api('/overview')).json()); setError(''); } catch (e) { setError((e as Error).message); }
  }, [api]);
  useEffect(() => { void load(); const timer = window.setInterval(() => { setNow(Date.now()); if (document.visibilityState === 'visible') void load(); }, 10000); return () => window.clearInterval(timer); }, [load]);
  async function act(run: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setNotice('');
    try { await run(); setNotice(done); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const enroll = () => act(async () => { await api('/enroll', { method: 'POST', body: JSON.stringify({ userIds: chosen, learningMinutes: minutes }) }); setChosen([]); },
    `Enrolled ${chosen.length} learner(s). They see the word game the next time their screen refreshes (within 15 seconds).`);
  const update = (s: Session, body: object, done: string) => act(() => api(`/sessions/${s.userId}`, { method: 'PUT', body: JSON.stringify(body) }), done);
  const remove = () => removing && act(async () => { await api(`/sessions/${removing.userId}`, { method: 'DELETE', body: JSON.stringify({ confirmation: confirmWord }) }); setRemoving(null); setConfirmWord(''); }, 'Session and recordings removed.');

  if (!data) return <p className={error ? 'admin-error' : 'admin-muted'} role={error ? 'alert' : undefined}>{error || 'Loading study sessions...'}</p>;
  return <div className="study-admin-grid">
    {error && <p role="alert" className="admin-control-notice is-error">{error}</p>}
    {notice && <p role="status" className="admin-control-notice">{notice}</p>}
    <div className="study-stat-row">
      <div className="study-stat"><strong>{data.sessions.length}</strong>Enrolled</div>
      <div className="study-stat"><strong>{data.groups.A} / {data.groups.B}</strong>Group A / Group B</div>
      <div className="study-stat"><strong>{data.sessions.filter(s => s.phase === 'done' || s.phase === 'closed').length}</strong>Finished</div>
      <div className="study-stat"><strong>{data.unscored}</strong>Recordings to score</div>
    </div>

    <section aria-labelledby="enroll-heading">
      <h3 id="enroll-heading" className="font-semibold mb-2">Enroll learners</h3>
      <p className="admin-muted mb-2">Only learners marked <em>Study participant</em> (signed guardian consent and child assent) are listed. Groups are assigned at random and kept balanced.
        {data.notConsented > 0 && ` ${data.notConsented} other learner(s) are not marked yet; mark them in Learner overview → details.`}</p>
      {data.eligible.length === 0 ? <p className="admin-empty">No consented learners waiting to be enrolled.</p> : <>
        <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={chosen.length === data.eligible.length} onChange={e => setChosen(e.target.checked ? data.eligible.map(l => l.id) : [])} />Select all ({data.eligible.length})</label>
        <div className="study-eligible">{data.eligible.map(l => <label key={l.id}><input type="checkbox" checked={chosen.includes(l.id)} onChange={e => setChosen(list => e.target.checked ? [...list, l.id] : list.filter(id => id !== l.id))} /><span><strong>{l.name}</strong> <small className="admin-muted">{l.email}</small></span></label>)}</div>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <label className="grid gap-1">Learning time (minutes)<input type="number" min={5} max={120} value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="rounded-lg border px-3 py-2 w-28" /></label>
          <button className="admin-apply" disabled={busy || !chosen.length || minutes < 5 || minutes > 120} onClick={() => void enroll()}><UserPlus size={17} />Enroll {chosen.length || ''} and assign groups</button>
        </div>
      </>}
    </section>

    <section aria-labelledby="sessions-heading">
      <div className="flex items-center justify-between"><h3 id="sessions-heading" className="font-semibold">Live sessions</h3><button className="admin-icon-button" aria-label="Refresh sessions" title="Refresh sessions" onClick={() => void load()}><RefreshCw size={18} /></button></div>
      {data.sessions.length === 0 ? <p className="admin-empty">No one is enrolled yet.</p> :
        <div className="study-table-wrap"><table className="admin-table"><thead><tr><th>Code</th><th>Learner</th><th>Group</th><th>Status</th><th>Pretest</th><th>Learning</th><th>Posttest</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {data.sessions.map(s => {
            const left = s.learningEndsAt ? Math.max(0, Date.parse(s.learningEndsAt) - now) : null;
            return <tr key={s.userId}>
              <td><strong>{s.participantCode}</strong></td><td>{s.name}</td>
              <td>{s.phase === 'pretest' ? <select aria-label={`Group for ${s.participantCode}`} value={s.group} disabled={busy} onChange={e => void update(s, { action: 'set-group', group: e.target.value }, `${s.participantCode} moved to group ${e.target.value}.`)} className="rounded border px-2 py-1"><option value="A">A</option><option value="B">B</option></select> : s.group}</td>
              <td><span className={`study-phase ${s.phase}`}>{PHASE_LABEL[s.phase] ?? s.phase}</span></td>
              <td>{s.pretestAnswered} / {data.wordCount}</td>
              <td>{s.phase === 'learning' && left !== null ? `${Math.ceil(left / 60000)} min left` : s.learningEndsAt ? 'Done' : `${s.learningMinutes} min`}</td>
              <td>{s.posttestAnswered} / {data.wordCount}</td>
              <td className="whitespace-nowrap">
                {s.phase === 'learning' && <button className="admin-discard" disabled={busy} onClick={() => void update(s, { action: 'start-posttest' }, `${s.participantCode} moved to the posttest.`)}>Start posttest now</button>}
                {s.phase === 'done' && <button className="admin-discard" disabled={busy} onClick={() => void update(s, { action: 'close' }, `${s.participantCode} returned to the normal app.`)}>Return to app</button>}
                <button className="admin-discard ml-2" disabled={busy} onClick={() => { setRemoving(s); setConfirmWord(''); }}>Remove</button>
              </td>
            </tr>;
          })}
        </tbody></table></div>}
      <p className="admin-muted mt-3"><Headphones size={15} className="inline mr-1" />Before starting: headsets with microphones, children seated apart, and Classroom controls set to <em>Normal book progression</em>. Assign the Student feedback survey if children should answer it at the end. After the pretest, children go straight into their learning books on their own, even if you pause the class while you check recordings.</p>
    </section>

    <AlertDialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}>
      <AlertDialogContent className="admin-confirm-dialog">
        <AlertDialogTitle>Remove {removing?.participantCode}'s session?</AlertDialogTitle>
        <AlertDialogDescription>This permanently deletes their test answers and recordings. Use it only for pilot runs or a withdrawn participant.</AlertDialogDescription>
        <label>Type DELETE to confirm<input className="admin-reset-confirmation" autoComplete="off" value={confirmWord} onChange={e => setConfirmWord(e.target.value)} /></label>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><button className="admin-confirm-apply admin-reset-submit" disabled={busy || confirmWord !== 'DELETE'} onClick={() => void remove()}>Remove session</button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function StudyScoring({ token }: { token: string }) {
  const api = useApi(token);
  const [items, setItems] = useState<{ id: string; word: string }[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [last, setLast] = useState<{ id: string; word: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  const item = items[0];
  const fetchBatch = useCallback(async () => {
    try { const data = await (await api('/scoring')).json(); setItems(data.items); setRemaining(data.remaining); setError(''); } catch (e) { setError((e as Error).message); }
  }, [api]);
  useEffect(() => { void fetchBatch(); }, [fetchBatch]);
  useEffect(() => {
    if (!item) { setAudioUrl(null); return; }
    let url: string | null = null, active = true;
    api(`/recordings/${item.id}`).then(r => r.blob()).then(blob => { if (!active) return; url = URL.createObjectURL(blob); setAudioUrl(url); })
      .catch(e => active && setError((e as Error).message));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [item, api]);
  useEffect(() => { if (audioUrl) void player.current?.play().catch(() => undefined); }, [audioUrl]);
  async function score(value: 'correct' | 'incorrect' | 'unclear' | null, target = item) {
    if (!target || busy) return;
    setBusy(true); setError('');
    try {
      await api(`/responses/${target.id}/score`, { method: 'PUT', body: JSON.stringify({ score: value }) });
      if (value === null) { setLast(null); setRemaining(n => (n ?? 0) + 1); setItems(list => [target, ...list.filter(x => x.id !== target.id)]); }
      else { setLast(target); setRemaining(n => (n ?? 1) - 1); const rest = items.slice(1); setItems(rest); if (!rest.length) await fetchBatch(); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === '1') void score('correct'); else if (event.key === '2') void score('incorrect'); else if (event.key === '3') void score('unclear'); else if (event.key === ' ') { event.preventDefault(); void player.current?.play(); }
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  });
  const rescore = async () => { setNotice(''); try { const data = await (await api('/rescore', { method: 'POST' })).json(); setNotice(`App checking started for ${data.queued} recording(s).`); } catch (e) { setError((e as Error).message); } };
  return <div className="study-admin-grid">
    <p className="admin-muted">Blind scoring: you hear each recording without the learner's name, group, or whether it is the pretest or posttest. Mark <strong>Correct</strong> only if the whole word was read accurately. Keys: 1 correct, 2 incorrect, 3 unclear, Space replay.</p>
    {error && <p role="alert" className="admin-control-notice is-error">{error}</p>}
    {notice && <p role="status" className="admin-control-notice">{notice}</p>}
    <p><strong>{remaining ?? '...'}</strong> recording(s) left to score.</p>
    {item ? <div className="study-score-card">
      <span className="admin-muted">Expected word</span>
      <span className="study-score-word">{item.word}</span>
      <audio ref={player} src={audioUrl ?? undefined} controls preload="auto" />
      <button className="admin-icon-button" onClick={() => void player.current?.play()} aria-label="Replay recording" title="Replay"><Play size={18} /></button>
      <div className="study-score-buttons">
        <button className="correct" disabled={busy || !audioUrl} onClick={() => void score('correct')}>Correct (1)</button>
        <button className="incorrect" disabled={busy || !audioUrl} onClick={() => void score('incorrect')}>Incorrect (2)</button>
        <button className="unclear" disabled={busy || !audioUrl} onClick={() => void score('unclear')}>Can't tell (3)</button>
      </div>
    </div> : remaining === 0 && <p className="admin-empty">All recordings are scored.</p>}
    <div className="flex flex-wrap gap-2">
      {last && <button className="admin-discard" disabled={busy} onClick={() => void score(null, last)}><Undo2 size={16} className="inline mr-1" />Undo last score</button>}
      <button className="admin-discard" onClick={() => void rescore()}>Re-run app checking on unchecked recordings</button>
    </div>
  </div>;
}

const pct = (c: Counts) => c.total ? Math.round(c.correct / c.total * 100) : 0;
/** Word totals differ by group (Group B has 3 transfer words), so show the range when they do. */
const outOf = (rows: Participant[], pick: (p: Participant) => number) => {
  const totals = [...new Set(rows.map(pick))].sort((a, b) => a - b);
  return totals.length ? totals.join(' or ') : '–';
};
const mean = (rows: Participant[], pick: (p: Participant) => number) => rows.length ? (rows.reduce((n, p) => n + pick(p), 0) / rows.length).toFixed(1) : '–';

function StudyResults({ token }: { token: string }) {
  const api = useApi(token);
  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setData(await (await api('/results')).json()); setError(''); } catch (e) { setError((e as Error).message); } }, [api]);
  useEffect(() => { void load(); }, [load]);
  async function download() {
    setBusy(true); setError('');
    try {
      const url = URL.createObjectURL(await (await api('/export')).blob());
      const a = document.createElement('a'); a.href = url; a.download = `readlr-study-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!data) return <p className={error ? 'admin-error' : 'admin-muted'}>{error || 'Loading results...'}</p>;
  const complete = data.participants.filter(p => p.complete);
  return <div className="study-admin-grid">
    {error && <p role="alert" className="admin-control-notice is-error">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="admin-muted">Scores use the teacher's score when available, otherwise the app's. Skipped words count as incorrect.</p>
      <div className="flex gap-2"><button className="admin-icon-button" aria-label="Refresh results" title="Refresh results" onClick={() => void load()}><RefreshCw size={18} /></button>
        <button className="admin-apply" disabled={busy} onClick={() => void download()}><Download size={17} />{busy ? 'Exporting...' : 'Export Excel'}</button></div>
    </div>
    <div className="study-stat-row">
      <div className="study-stat"><strong>{complete.length} / {data.participants.length}</strong>Completed both tests</div>
      <div className="study-stat"><strong>{mean(complete, p => p.taught.post.correct - p.taught.pre.correct)}</strong>Mean gain, taught words (of {outOf(data.participants, p => p.taught.pre.total)})</div>
      <div className="study-stat"><strong>{mean(complete, p => p.transfer.post.correct - p.transfer.pre.correct)}</strong>Mean gain, transfer words (of {outOf(data.participants, p => p.transfer.pre.total)})</div>
      <div className="study-stat"><strong>{mean(complete, p => p.control.post.correct - p.control.pre.correct)}</strong>Mean gain, control words (of {outOf(data.participants, p => p.control.pre.total)})</div>
      <div className="study-stat"><strong>{data.agreement.percent === null ? '–' : `${data.agreement.percent}%`}</strong>App agrees with teacher ({data.agreement.compared} compared)</div>
    </div>
    <p className="admin-muted">If the app teaches, taught and transfer gains should be clearly larger than control gains. Run the statistics (for example Wilcoxon signed-rank) on the exported file.</p>
    <div className="study-table-wrap"><table className="admin-table"><thead><tr><th>Code</th><th>Group</th><th>Taught pre → post</th><th>Transfer pre → post</th><th>Control pre → post</th><th>Unscored</th></tr></thead><tbody>
      {data.participants.map(p => <tr key={p.participantCode}>
        <td><strong>{p.participantCode}</strong>{!p.complete && <small className="admin-muted"> (in progress)</small>}</td><td>{p.group}</td>
        <td>{p.taught.pre.correct} → {p.taught.post.correct} <small className="admin-muted">/{p.taught.pre.total} ({pct(p.taught.pre)}% → {pct(p.taught.post)}%)</small></td>
        <td>{p.transfer.pre.correct} → {p.transfer.post.correct} <small className="admin-muted">/{p.transfer.pre.total}</small></td>
        <td>{p.control.pre.correct} → {p.control.post.correct} <small className="admin-muted">/{p.control.pre.total}</small></td>
        <td>{p.unscored}</td>
      </tr>)}
    </tbody></table></div>
  </div>;
}
