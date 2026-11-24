import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FlaskConical, Play, RefreshCw, Undo2 } from 'lucide-react';
import { CLASSROOM_API } from '../hooks/useClassroom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ValidationDossier } from './ValidationDossier';
import { StudyFluencyScoring } from './AdminStudyFluency';
import './study.css';
import './validationDashboard.css';
import {CohortDashboard} from './PathwayDashboard';

interface Session { reviewed:number; entryPending?:boolean; pretestEndedEarly?:boolean; userId: number; name: string; participantCode: string; group: 'A' | 'B'; phase: string; learningMinutes: number | null; learningEndsAt: string | null; pretestAnswered: number; posttestAnswered: number; itemCount: number; finishedAt: string | null }
interface Overview { sessions: Session[]; eligible: { id: number; name: string; email: string }[]; notConsented: number; unscored: number; appPending: number; groups: { A: number; B: number } }
interface Counts { correct: number; scored: number; total: number }
interface Reading { wordsAttempted: number; wordsCorrect: number; durationSeconds: number; wcpm: number | null }
interface Participant { participantCode: string; group: 'A' | 'B'; phase: string; complete: boolean; unscored: number; taught: { pre: Counts; post: Counts }; transfer: { pre: Counts; post: Counts }; control: { pre: Counts; post: Counts }; blend: { pre: Counts; post: Counts }; fluency: { pre: Reading | null; post: Reading | null } }
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
  const [tab, setTab] = useState('pathway');
  const api = useApi(token);
  return <section className="admin-access-section" aria-labelledby="study-heading">
    <header className="admin-section-heading"><div><h2 id="study-heading" className="flex items-center gap-2"><FlaskConical size={20} />Validation workspace</h2>
      <p>Assignments, participant records, and validation exports.</p></div></header>
    <Tabs value={tab} onValueChange={setTab} className="admin-section-tabs">
      <TabsList aria-label="Study sections" className="admin-section-nav vd-navigation">
        <TabsTrigger value="pathway">Pathway analytics</TabsTrigger>
        <TabsTrigger value="sessions">Participants</TabsTrigger>
        <TabsTrigger value="scoring">Scoring</TabsTrigger>
        <TabsTrigger value="fluency">One-minute reading</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>
      <TabsContent value="sessions" className="admin-section-panel"><StudySessions token={token} /></TabsContent>
      <TabsContent value="pathway" className="admin-section-panel"><CohortDashboard api={api}/></TabsContent>
      <TabsContent value="scoring" className="admin-section-panel"><StudyScoring token={token} /></TabsContent>
      <TabsContent value="fluency" className="admin-section-panel"><StudyFluencyScoring api={api} /></TabsContent>
      <TabsContent value="results" className="admin-section-panel"><StudyResults token={token} /></TabsContent>
    </Tabs>
  </section>;
}

function StudySessions({token}:{token:string}) {
  const api=useApi(token),[data,set]=useState<Overview|null>(null),[error,fail]=useState(''),[busy,wait]=useState(false);
  const [chosen,choose]=useState<number[]>([]),[mode,assign]=useState<'pre'|'post'>('pre'),[query,search]=useState('');
  const [review,open]=useState<{id:number;name:string;tab:'pretest'|'posttest'|'System use'|'Results'|'Survey'}|null>(null);
  const load=useCallback(async()=>{try{set(await(await api('/overview')).json());}catch(e){fail((e as Error).message);}},[api]);
  useEffect(()=>{void load();const t=setInterval(()=>{if(!document.hidden)void load();},15000);return()=>clearInterval(t);},[load]);
  const eligible=mode==='pre'?(data?.eligible??[]):(data?.sessions??[]).filter(s=>s.phase==='learning'&&!s.entryPending).map(s=>({id:s.userId,name:s.name}));
  const selected=eligible.filter(l=>chosen.includes(l.id));
  async function apply(){wait(true);fail('');try{
    if(mode==='pre')await api('/enroll',{method:'POST',body:JSON.stringify({userIds:selected.map(l=>l.id),learningMinutes:null})});
    else for(const s of selected)await api('/sessions/'+s.id,{method:'PUT',body:JSON.stringify({action:'start-posttest'})});
    choose([]);
  }catch(e){fail((e as Error).message);}finally{await load();wait(false);}}
  async function endPretest(s:Session){
    if(!window.confirm('End the pre-test for '+s.name+' and move them to System Use? Submitted answers are kept. Unsubmitted tasks will be marked incomplete.'))return;
    wait(true);fail('');
    try {
      await api('/sessions/'+s.userId,{method:'PUT',body:JSON.stringify({action:'end-pretest'})});
      await load();
    } catch(e) { fail((e as Error).message); }
    finally { wait(false); }
  }
  return <div className="study-admin-grid">{error&&<p role="alert">{error}</p>}
    <details><summary>Assign assessments</summary><fieldset disabled={busy}><label>Assessment <select value={mode} onChange={e=>{assign(e.target.value as 'pre'|'post');choose([]);}}><option value="pre">Pre-test</option><option value="post">Post-test</option></select></label>
    <label><input type="checkbox" checked={!!eligible.length&&selected.length===eligible.length} onChange={e=>choose(e.target.checked?eligible.map(l=>l.id):[])}/> Select all eligible</label>
    <div className="study-eligible">{eligible.map(l=><label key={l.id}><input type="checkbox" checked={chosen.includes(l.id)} onChange={e=>choose(e.target.checked?[...chosen,l.id]:chosen.filter(id=>id!==l.id))}/>{l.name}</label>)}{!eligible.length&&'No eligible learners.'}</div>
    <button className="admin-apply" disabled={!selected.length} onClick={()=>void apply()}>Assign {mode==='pre'?'pre-test':'post-test'} ({selected.length})</button></fieldset></details>
    <label className="vd-search">Find participant <input type="search" value={query} onChange={e=>search(e.target.value)}/></label>
    <div className="study-table-wrap"><table className="admin-table"><thead><tr><th>Participant</th><th>Assignment</th><th>Submitted</th><th>Record</th></tr></thead><tbody>
    {data?.eligible.filter(l=>l.name.toLowerCase().includes(query.toLowerCase())).map(l=><tr key={l.id}><td>{l.name}</td><td>Awaiting assignment</td><td>None</td><td><button onClick={()=>{assign('pre');choose([l.id]);const d=document.querySelector<HTMLDetailsElement>('.study-admin-grid>details');if(d)d.open=true;}}>Select for pre-test</button></td></tr>)}
    {data?.sessions.filter(s=>(s.name+s.participantCode).toLowerCase().includes(query.toLowerCase())).map(s=><tr key={s.userId}><td><strong>{s.name}</strong><small className="vd-sub">{s.participantCode}</small></td><td>{s.entryPending?'Completed · awaiting world entry':['done','learning','closed'].includes(s.phase)?'System use':PHASE_LABEL[s.phase]}</td><td>Pre {s.pretestAnswered}/{s.itemCount}{s.pretestEndedEarly&&<small className="vd-sub">Pre-test ended by staff</small>}<br/>Post {s.posttestAnswered}/{s.itemCount}<small className="vd-sub">Reviewed or skipped: {s.reviewed}</small></td><td><div className="flex flex-wrap gap-2"><button className="vd-open" onClick={()=>open({id:s.userId,name:s.name,tab:"System use"})}>Open record &rarr;</button>{s.phase==='pretest'&&<button type="button" className="vd-open" disabled={busy} onClick={()=>void endPretest(s)}>End pre-test and move to System Use</button>}</div></td></tr>)}</tbody></table></div>
    {review&&<ValidationDossier api={api} token={token} {...review} initial={review.tab} onClose={()=>open(null)}/>}</div>;
}

function StudyScoring({ token }: { token: string }) {
  const api = useApi(token);
  const [items, setItems] = useState<{ id: string; word: string; item_type: 'word' | 'blend' }[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [last, setLast] = useState<{ id: string; word: string; item_type: 'word' | 'blend' } | null>(null);
  const [error, setError] = useState('');
  
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
  return <div className="study-admin-grid">
    <p className="admin-muted">Blind scoring: you hear each recording without the learner's name, group, or whether it is the pretest or posttest. Mark <strong>Correct</strong> only if the whole word was read accurately (for blending items, said as one whole word). Keys: 1 correct, 2 incorrect, 3 unclear, Space replay.</p>
    {error && <p role="alert" className="admin-control-notice is-error">{error}</p>}
    <p><strong>{remaining ?? '...'}</strong> recording(s) left to score.</p>
    {item ? <div className="study-score-card">
      <span className="admin-muted">{item.item_type === 'blend' ? `Blending — target: ${item.word}` : 'Expected word'}</span>
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

    </div>
  </div>;
}

const scored=(v:Counts)=>v.scored ? v.correct+'/'+v.scored : 'Not scored';
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
  // WCPM gain counts only learners with both readings scored; skipped or unscored readings are left out, not treated as 0.
  const readers = complete.filter(p => p.fluency.pre?.wcpm != null && p.fluency.post?.wcpm != null);
  return <div className="study-admin-grid">
    {error && <p role="alert" className="admin-control-notice is-error">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="admin-muted">Scores use the teacher's score when available, otherwise the app's. Skipped words count as incorrect.</p>
      <div className="flex gap-2"><button className="admin-icon-button" aria-label="Refresh results" title="Refresh results" onClick={() => void load()}><RefreshCw size={18} /></button>
        <button className="admin-apply" disabled={busy} onClick={() => void download()}><Download size={17} />{busy ? 'Exporting...' : 'Export Excel'}</button></div>
    </div>
    <div className="study-stat-row">
      <div className="study-stat"><strong>{complete.length} / {data.participants.length}</strong>Completed both tests</div>
      <div className="study-stat"><strong>{mean(readers, p => p.fluency.post!.wcpm! - p.fluency.pre!.wcpm!)}</strong>Mean gain, one-minute reading (WCPM, {readers.length} scored)</div>
      <div className="study-stat"><strong>{data.agreement.percent === null ? '–' : `${data.agreement.percent}%`}</strong>App agrees with teacher ({data.agreement.compared} compared)</div>
    </div>
    <p className="admin-muted">Compare repeated assessments descriptively. Score change alone does not establish causation.</p>
    <div className="study-table-wrap"><table className="admin-table"><thead><tr><th>Code</th><th>Printed words pre → post</th><th>Blending pre → post</th><th>Unscored</th><th>One-minute WCPM pre → post</th></tr></thead><tbody>
      {data.participants.map(p => <tr key={p.participantCode}>
        <td><strong>{p.participantCode}</strong>{!p.complete && <small className="admin-muted"> (in progress)</small>}</td><td>{(['pre','post'] as const).map(k=>{const tallies=[p.taught[k],p.transfer[k],p.control[k]];return scored(tallies.reduce((a,b)=>({correct:a.correct+b.correct,scored:a.scored+b.scored,total:a.total+b.total}),{correct:0,scored:0,total:0}));}).join(' → ')}</td>
        <td>{scored(p.blend.pre)} → {scored(p.blend.post)}</td>
        <td>{p.unscored}</td>
        <td>{p.fluency.pre?.wcpm ?? '–'} → {p.fluency.post?.wcpm ?? '–'}</td>
      </tr>)}
    </tbody></table></div>
  </div>;
}
