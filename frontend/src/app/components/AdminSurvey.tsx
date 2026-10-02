import {useEffect,useState} from 'react';
import {ClipboardList,Download,RefreshCw,Save,CheckCircle2} from 'lucide-react';
import {CLASSROOM_API} from '../hooks/useClassroom';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './ui/select';
import type {SurveyData} from './StudentSurvey';

interface Assignment {enabled:boolean;overrides:Record<string,boolean>;revision:number}
export function AdminSurveyAssignment({token,target,name}:{token:string;target:string;name:string}) {
  const [state,setState]=useState<Assignment|null>(null);
  const [draft,setDraft]=useState('inherit');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setState(null);setNotice('');setError('');
    fetch(`${CLASSROOM_API}/admin/survey/assignments`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);if(active){setState(d);setDraft(target==='class'?String(d.enabled):d.overrides[target]===undefined?'inherit':String(d.overrides[target]));}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[token,target,retry]);
  async function save(){
    if(!state||busy)return;setBusy(true);setError('');setNotice('');
    try{const r=await fetch(`${CLASSROOM_API}/admin/survey/assignments`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({target:target==='class'?'class':Number(target),enabled:draft==='inherit'?null:draft==='true',revision:state.revision}),signal:AbortSignal.timeout(10000)});const d=await r.json();if(!r.ok)throw new Error(d.message);setState(d);setNotice('Survey assignment saved. Connected learners receive it within about 15 seconds.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="admin-access-section" aria-label="Student feedback assignment"><header className="admin-reset-heading"><span className="admin-access-icon"><ClipboardList size={22}/></span><div><h3>Student feedback survey</h3><p>Show or hide the survey for {name}. Separate from learning access.</p></div></header>
  {error&&<p role="alert" className="admin-control-notice is-error">{error}<button onClick={()=>setRetry(n=>n+1)}>Refresh</button></p>}{notice&&<p role="status" className="admin-control-notice"><CheckCircle2 size={18}/>{notice}</p>}
  {state&&<><div className="admin-access-fields"><label id="survey-assignment-label">Survey access</label><Select value={draft} disabled={busy} onValueChange={setDraft}><SelectTrigger aria-labelledby="survey-assignment-label"><SelectValue/></SelectTrigger><SelectContent>{target!=='class'&&<SelectItem value="inherit">Use class setting ({state.enabled?'shown':'hidden'})</SelectItem>}<SelectItem value="false">Hidden - not assigned</SelectItem><SelectItem value="true">Show survey in learner navigation</SelectItem></SelectContent></Select><p className="admin-muted">14 optional questions. English or Cebuano. One submission per learner. Hiding the survey keeps existing responses. {target==='class'?'Individual survey overrides take priority.':''}</p></div><footer className="admin-access-actions"><p>Saved progress and rewards are unchanged.</p><button className="admin-apply" disabled={busy} onClick={save}><Save size={17}/>{busy?'Saving...':'Save survey access'}</button></footer></>}
  </section>;
}
interface SurveyResponse {user_id:number;name:string;section:string;language:string;submitted_at:string;answers:(number|string|null)[]}
export function AdminSurveyResponses({token}:{token:string}) {
  const [data,setData]=useState<(SurveyData&{responses:SurveyResponse[]})|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0);
  const [query,setQuery]=useState('');const [page,setPage]=useState(1);const [chosen,setChosen]=useState<number|null>(null);
  useEffect(()=>{let active=true;setError('');fetch(`${CLASSROOM_API}/admin/survey/responses`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[token,retry]);
  async function download(){setBusy(true);setError('');try{const r=await fetch(`${CLASSROOM_API}/admin/survey/export`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error((await r.json()).message);const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=`readlr-feedback-${new Date().toISOString().slice(0,10)}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const filtered=data?.responses.filter(r=>`${r.name} ${r.section}`.toLowerCase().includes(query.toLowerCase()))??[];
  const pages=Math.max(1,Math.ceil(filtered.length/15));const current=Math.min(page,pages);
  const selected=data?.responses.find(r=>r.user_id===chosen);
  return <section aria-label="Survey responses"><div className="survey-response-toolbar"><div><h2>Student feedback</h2><p className="admin-muted">{data?.responses.length??0} submitted questionnaires. Feedback, not reading scores.</p></div><div className="flex gap-2"><button className="admin-icon-button" title="Refresh responses" aria-label="Refresh responses" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={18}/></button><button className="admin-apply" disabled={busy||!data} onClick={download}><Download size={18}/>{busy?'Exporting...':'Export Excel'}</button></div></div>
  {error&&<p role="alert" className="admin-control-notice is-error">{error}</p>}
  <label className="block my-4">Find learner or section<input className="block bg-white border rounded-lg p-3 mt-2 w-full" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label>
  <div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>Learner</th><th>Section</th><th>Language</th><th>Answered</th><th>Submitted</th><th>Answers</th></tr></thead><tbody>{filtered.slice((current-1)*15,current*15).map(r=><tr key={r.user_id}><td>{r.name}</td><td>{r.section}</td><td>{r.language==='ceb'?'Cebuano':'English'}</td><td>{r.answers.filter(a=>a!==null).length} / 14</td><td>{new Date(r.submitted_at).toLocaleString()}</td><td><button className="admin-icon-button" onClick={()=>setChosen(chosen===r.user_id?null:r.user_id)} aria-label={`View answers for ${r.name}`}><ClipboardList size={18}/></button></td></tr>)}</tbody></table></div>
  {!filtered.length&&<p className="admin-muted py-6">{data?'No responses match. Assign the survey in Classroom controls to invite learners.':'Loading responses...'}</p>}
  <div className="flex items-center gap-4 my-4"><button disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current} of {pages}</span><button disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div>
  {selected&&data&&<section className="admin-access-section p-5"><h3>{selected.name} - {selected.section}</h3><ol>{data.questions.map((q,i)=><li key={q.id} className="py-3 border-b"><strong>{q.id}. {selected.language==='ceb'?q.ceb:q.en}</strong><p>{selected.answers[i]===null?'Skipped':i<12?`${selected.answers[i]} / 5`:data.choices[q.id].find(c=>c[0]===selected.answers[i])?.[selected.language==='ceb'?2:1]}</p></li>)}</ol><button className="admin-icon-button mt-3" onClick={()=>setChosen(null)}>Close</button></section>}
  <p className="admin-muted mt-5">Exports contain learner names and sections. Keep them within the authorized research team. Blank answers mean skipped, never zero.</p>
  </section>;
}
