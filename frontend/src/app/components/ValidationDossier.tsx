import {useEffect,useState} from 'react';
import {READING_CHAPTERS} from './aralCurriculum';
import {LearnerDashboard} from './PathwayDashboard';
import {Download,Play} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';
import {AdminSurveyAssignment} from './AdminSurvey';
import {ActivityTimeline} from './LearnerActivityTimeline';
export type ValidationApi=(path:string,init?:RequestInit)=>Promise<Response>;
type Phase='pretest'|'posttest';
type Tab=Phase|'System use'|'Results'|'Survey';
interface Item {id:string;word:string;item_type:string;phase:Phase;audio:boolean;skipped:boolean;teacher_score:string|null;app_result:string|null}
interface Reading {id:string;phase:Phase;skipped:boolean;audio:boolean;word_order:string[];duration_ms:number;words_attempted:number|null;error_positions:number[]|null;review_status:string|null;technical_note:string|null}
interface Checklist {counts:boolean;skips:boolean;exceptions:boolean;initials:string}
export interface ReviewStatus {submitted:number;pending:number;incomplete:boolean;ready:boolean;checked:boolean}
export function ReviewTag({review}:{review?:ReviewStatus}){
  if(!review)return null;
  return <span className="vd-review-tag" data-checked={review.checked}>
    {review.checked?(review.incomplete?'Checked · incomplete':'Checked'):review.ready?'Ready to check':review.pending?review.pending+' to review':review.submitted?'Awaiting completion':'Not submitted'}
  </span>;
}
interface Detail {responses:Item[];fluency:Reading[];pre?:Checklist;post?:Checklist;
  preReview?:ReviewStatus;postReview?:ReviewStatus;
  pretestEndedEarly?:boolean;incompletePretest?:{type:'word'|'blend'|'fluency';word:string;position:number}[];
  pathway:{starts:string[];ends:string[];resumed:boolean;rates:Record<string,{n:number;d:number;value:number|null}>};
  events:{kind:string;book:string;stop:string;task:string;occurred_at:string}[]}
type Save=(path:string,body:object)=>Promise<void>;
function AudioClip({api,path}:{api:ValidationApi;path:string}){
  const [requested,request]=useState(false),[url,setUrl]=useState(''),[error,fail]=useState(false);
  useEffect(()=>{if(!requested)return;let live=true,obj='';
    api(path).then(r=>r.blob()).then(b=>{if(live){obj=URL.createObjectURL(b);setUrl(obj);}}).catch(()=>{if(live){fail(true);request(false);}});
    return()=>{live=false;if(obj)URL.revokeObjectURL(obj);};
  },[api,path,requested]);
  return url?<audio aria-label="Learner response" controls src={url}/>:<button className="admin-discard" disabled={requested} onClick={()=>request(true)}><Play size={14}/>{requested?'Loading':error?'Retry':'Listen'}</button>;
}
function Timed({r,api,save}:{r:Reading;api:ValidationApi;save:Save}){
  const [last,setLast]=useState(r.words_attempted??0),[errors,setErrors]=useState(r.error_positions??[]),[note,setNote]=useState(r.technical_note??''),[status,setStatus]=useState(r.review_status??(r.skipped?'skip':'complete'));
  const correct=last-errors.length,valid=Number.isInteger(last)&&last>=0&&last<=r.word_order.length&&errors.every(p=>p<=last);
  return <section><h3>One-minute reading</h3>{r.audio&&<AudioClip api={api} path={'/fluency/'+r.id+'/recording'}/>}
    <ol className="review-wall">{r.word_order.map((w,i)=><li key={w}><button disabled={status!=='complete'||i>=last} aria-pressed={errors.includes(i+1)} title="Mark incorrect" onClick={()=>setErrors(errors.includes(i+1)?errors.filter(x=>x!==i+1):[...errors,i+1])}>{w}</button></li>)}</ol>
    <label>Status <select disabled={r.skipped} value={status} onChange={e=>setStatus(e.target.value)}>{['complete','skip','unclear'].map(x=><option key={x}>{x}</option>)}</select></label>
    {status==='complete'&&<><label>Words attempted <input type="number" min={0} max={r.word_order.length} value={last} onChange={e=>{setLast(e.target.valueAsNumber);setErrors(errors.filter(x=>x<=e.target.valueAsNumber));}}/></label>
    <p>Mark any incorrect words above. Correct: {valid?correct:'N/A'} · Duration: {(r.duration_ms/1000).toFixed(1)} s · WCPM: {valid&&r.duration_ms?(correct*60000/r.duration_ms).toFixed(1):'N/A'}</p></>}
    {!r.skipped&&<><label>Technical note <input maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><button type="button" className="vd-confirm" disabled={status==='complete'&&!valid} onClick={()=>void save('/fluency/'+r.id+'/score',{status,note,marks:status==='complete'?{lastReached:last,errors}:null})}>Save reading review</button></>}
  </section>;
}
function CheckForm({value,phase,id,save,review}:{value?:Checklist;phase:Phase;id:number;save:Save;review?:ReviewStatus}){
  const [c,set]=useState<Checklist>(value??{counts:false,skips:false,exceptions:false,initials:''});
  return <section><h3>Assessment review <ReviewTag review={review}/></h3>{([['counts','Task counts checked'],['skips','Skips noted'],['exceptions','Exceptions logged']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={c[key]} onChange={e=>set({...c,[key]:e.target.checked})}/> {label}</label>)}<label>Initials <input maxLength={20} value={c.initials} onChange={e=>set({...c,initials:e.target.value})}/></label><div className="vd-review-actions"><button type="button" className="vd-open" disabled={!c.initials.trim()||review?.checked} onClick={()=>void save('/participants/'+id+'/check',{phase,...c})}>Save checklist</button><button type="button" className="vd-confirm" disabled={!c.initials.trim()||!c.counts||!review?.ready} onClick={()=>void save('/participants/'+id+'/check',{phase,...c,checked:true})}>{review?.checked?'Update checked review':'Mark as checked'}</button></div></section>;
}
function tally(rows:Item[]){
  const scored=rows.map(r=>r.skipped?'skip':r.teacher_score??({matched:'correct',different:'incorrect'}[r.app_result??''])).filter(s=>s&&s!=='unclear');
  return {n:scored.length,correct:scored.filter(s=>s==='correct').length};
}
export function ValidationDossier({api,token,id,name,initial,onClose}:{api:ValidationApi;token:string;id:number;name:string;initial:Tab;onClose:()=>void}){
  const [tab,setTab]=useState<Tab>(initial),[d,set]=useState<Detail|null>(null),[error,fail]=useState(''),[busy,wait]=useState(false),[tick,refresh]=useState(0),[notice,tell]=useState('');
  useEffect(()=>{let live=true;api('/participants/'+id).then(r=>r.json()).then(v=>{if(live)set(v);}).catch(e=>{if(live)fail(e.message);});return()=>{live=false;};},[api,id,tick]);
  const save:Save=async(path,body)=>{wait(true);fail('');tell('');try{await api(path,{method:'PUT',body:JSON.stringify(body)});set(await (await api('/participants/'+id)).json());tell('Review saved.');}catch(e){fail((e as Error).message);}finally{wait(false);}};
  useEffect(()=>{if(tab!=='System use')return;const timer=setInterval(()=>{if(!document.hidden)refresh(n=>n+1);},15000);return()=>clearInterval(timer);},[tab]);
  const [exporting,setExporting]=useState(false);
  async function downloadSystemUse(){
    setExporting(true);fail('');
    try {
      const file=await (await api('/participants/'+id+'/system-use.xlsx')).blob();
      const url=URL.createObjectURL(file);
      const link=document.createElement('a');link.href=url;link.download='readlr-system-use.xlsx';link.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){fail((e as Error).message);}finally{setExporting(false);}
  }
  const phase=tab==='pretest'||tab==='posttest'?tab:null;
  const title=(id:string)=>READING_CHAPTERS.find(b=>b.id===id)?.title??id;
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="validation-dossier vd-dialog"><header className="vd-record-head"><DialogTitle>{name}</DialogTitle><DialogDescription>Participant validation record</DialogDescription></header>
    <nav aria-label="Participant records">{(['pretest','System use','posttest','Results','Survey'] as Tab[]).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);tell('');}}>{t==='pretest'?'Pre-test':t==='posttest'?'Post-test':t}</button>)}</nav>
    {error&&<p role="alert">{error} <button onClick={()=>{fail('');refresh(tick+1);}}>Retry</button></p>}{notice&&<p role="status">{notice}</p>}
    {!d?<p>Loading participant record...</p>:<fieldset disabled={busy}>
    {phase==='pretest'&&d.pretestEndedEarly&&<p>Pre-test ended by staff. {d.incompletePretest?.length??0} incomplete tasks.</p>}
    {phase&&<>{(['word','blend'] as const).map(type=>{const rows=d.responses.filter(i=>i.phase===phase&&i.item_type===type);const missing=phase==='pretest'?d.incompletePretest?.filter(i=>i.type===type)??[]:[];return <details key={phase+type} className="vd-review"><summary>{type==='word'?'Printed words':'Sound blending'} · {rows.length}/{type==='word'?15:10} submitted{missing.length>0&&' · '+missing.length+' incomplete'}</summary>
    {rows.map(r=><div className="review-row" key={r.id}><strong>{r.word}</strong>{r.audio?<AudioClip api={api} path={'/recordings/'+r.id}/>:<span>No audio</span>}
    {r.skipped?'Skipped by learner':<select aria-label={'Outcome for '+r.word} value={r.teacher_score??''} onChange={e=>void save('/responses/'+r.id+'/score',{score:e.target.value||null})}>{['','correct','incorrect','skip','unclear'].map(x=><option key={x} value={x}>{x||'Not reviewed'}</option>)}</select>}</div>)}
    {missing.map(r=><div className="review-row" key={r.position}><strong>{r.word}</strong><span>Incomplete</span></div>)}</details>;})}
    {phase==='pretest'&&d.incompletePretest?.some(r=>r.type==='fluency')&&<section><h3>One-minute reading</h3><p>Incomplete</p></section>}
    {d.fluency.filter(f=>f.phase===phase).map(r=><Timed key={r.id} api={api} r={r} save={save}/>)}<CheckForm key={phase} phase={phase} value={phase==='pretest'?d.pre:d.post} id={id} save={save} review={phase==='pretest'?d.preReview:d.postReview}/></>}
    {tab==='System use'&&<div className="vd-review-actions"><button type="button" className="vd-confirm" disabled={exporting} onClick={()=>void downloadSystemUse()}><Download size={16}/>{exporting?'Exporting…':'Export System Use (.xlsx)'}</button></div>}
    {(tab==='System use'||tab==='Results')&&<LearnerDashboard path={d.pathway} events={d.events}/>}
    {tab==='System use'&&<section><h3>Book and stop activity</h3>{d.pathway.starts.map(book=>{const rows=d.events.filter(e=>e.book===book);return <details key={book}><summary>{title(book)} · {d.pathway.ends.includes(book)?'Completed':'Opened'}</summary>{[...new Set(rows.map(e=>e.stop).filter(Boolean))].map(stop=>{const events=rows.filter(e=>e.stop===stop);return <p key={stop}><strong>{stop}</strong>: {events.filter(e=>e.kind==='stop-start').length} visits · {events.some(e=>e.kind==='stop-complete')?'Completed':'No completion recorded'} · {events.filter(e=>e.kind==='retry').length} retries · {events.filter(e=>e.kind==='skip').length} skips · {events.filter(e=>e.kind==='incident').length} technical incidents</p>;})}</details>;})}</section>}
    {tab==='System use'&&<section><h3>Activity by date · Manila</h3><ActivityTimeline events={d.events}/></section>}
    {tab==='Results'&&<section><h3>Matched results</h3>{['word','blend'].map(type=>{const [a,b]=['pretest','posttest'].map(p=>tally(d.responses.filter(r=>r.phase===p&&r.item_type===type)));const total=type==='word'?15:10;return <p key={type}>{type==='word'?'Printed words':'Blending'}: Pre {a.correct}/{a.n} scored; Post {b.correct}/{b.n} scored. Change: {a.n===total&&b.n===total?b.correct-a.correct:'Pending full scoring'}.</p>;})}
    {(['pretest','posttest'] as Phase[]).map(p=>{const r=d.fluency.find(f=>f.phase===p);return <p key={p}>{p} WCPM: {r?.words_attempted!=null&&r.duration_ms?((r.words_attempted-(r.error_positions??[]).length)*60000/r.duration_ms).toFixed(1):'Not scored'}</p>;})}</section>}
    {tab==='Survey'&&<AdminSurveyAssignment token={token} target={String(id)} name={name}/>}</fieldset>}
  </DialogContent></Dialog>;
}
