import { useEffect, useState } from 'react';
import { RefreshCw, BookOpen, CheckCircle2 } from 'lucide-react';
import { READING_CHAPTERS } from './aralCurriculum';
import { adminReadingStops } from './adminReadingStops';
import { chronicleStopLocked } from './chronicleRoute';
import { LearnerActivity } from './LearnerActivityTimeline';
import type { LearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import type { ClassroomPolicy } from '../hooks/useClassroom';
import './adminReadingDetail.css';

interface Checkpoint {
  id:string;chapter_id:string;words:string[];results:Record<string,string>;passed:boolean;
  created_at:string;completed_at:string|null;expires_at:string;
}
interface Detail {curriculum:LearnerCurriculumState;policy:ClassroomPolicy;checkpoints:Checkpoint[]}
const date=(value:string)=>new Date(value).toLocaleString();
const resultLabel=(value?:string)=>({matched:'Matched',different:'Different word',uncertain:'Uncertain',unavailable:'Checking unavailable',skipped:'Skipped'}[value??'']??'Not answered');

export function AdminReadingDetail({userId,token}:{userId:number;token:string}) {
  const [data,setData]=useState<Detail|null>(null);
  const [error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [busy,setBusy]=useState(true);
  const [book,setBook]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    let active=true;
    setBusy(true);setError('');
    const timer=window.setTimeout(()=>controller.abort(),15000);
    fetch(`${import.meta.env.VITE_API_URL||'http://localhost:3000/api'}/admin/learners/${userId}/reading`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error('Details could not load.');return response.json();})
      .then(value=>{if(active&&!controller.signal.aborted)setData(value);})
      .catch(()=>{if(active)setError('Details could not load. Retry to see saved progress.');})
      .finally(()=>{window.clearTimeout(timer);if(active)setBusy(false);});
    return ()=>{active=false;window.clearTimeout(timer);controller.abort();};
  },[userId,token,refresh]);
  if(!data)return <section className="admin-reading-detail" aria-live="polite">{error||'Loading book and stop details...'}{error&&<button onClick={()=>setRefresh(n=>n+1)}>Retry</button>}</section>;
  const {curriculum:state,policy,checkpoints}=data;
  const completed=new Set(checkpoints.filter(row=>row.passed).map(row=>row.chapter_id));
  const chapter=READING_CHAPTERS[book];
  const attempts=checkpoints.filter(row=>row.chapter_id===chapter.id);
  const hasStop=(id:string)=>state.guidedStops.includes(`${chapter.id}:${id}`)||(chapter.id==='gate'&&state.guidedStops.includes(id));
  const stops=adminReadingStops(book).map(stop=>({...stop,done:stop.id==='check'?completed.has(chapter.id):hasStop(stop.id)}));
  const openStops=(policy.readingOpenStops??[]).filter(key=>key.startsWith(`${chapter.id}:`)).map(key=>key.split(':')[1]);
  const allOpen=policy.readingOpenChallenges?.includes(book+1)??false;
  const permitted=policy.mode==='open'||policy.mode==='stage'&&policy.stage===3||policy.mode==='stages'&&!!policy.stages?.includes(3);
  const available=permitted&&(book===0||book<(policy.readingUnlockThrough??0)||allOpen||openStops.length>0||completed.has(READING_CHAPTERS[book-1]?.id));
  const round=state.guidedRounds[chapter.id];
  const activities=Object.entries(state.guidedActivities).filter(([key,value])=>value&&key.startsWith(`${chapter.id}:`));
  const guided=stops.filter(stop=>stop.id!=='check');
  const practiced=guided.filter(stop=>stop.done).length;
  return <section className="admin-reading-detail">
    <header><div><h3><BookOpen size={20}/>Learner reading dashboard</h3><small>{Date.parse(state.updatedAt)>0?`Last saved ${date(state.updatedAt)}.`:'No saved curriculum activity yet.'} Guided activity is not an independent accuracy score.</small></div><button className="admin-icon-button" title="Refresh learner details" aria-label="Refresh learner details" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={18}/></button></header>
    {error&&<p role="alert">{error} Previously loaded data is shown.</p>}
    <div className="admin-reading-summary"><div><strong>{completed.size} / 10</strong><span>Final gates passed</span></div><div><strong>{state.guidedStops.length}</strong><span>Guided stops practiced</span></div><div><strong>{checkpoints.length}</strong><span>Checkpoint rounds</span></div><div><strong>{state.soundRecordings.length}</strong><span>Saved recording entries</span></div></div>
    <nav className="admin-book-selector" aria-label="Choose book">{READING_CHAPTERS.map((item,index)=><button key={item.id} aria-pressed={book===index} onClick={()=>setBook(index)}><span>Book {index+1}{completed.has(item.id)&&<CheckCircle2 size={15}/>}</span><strong>{item.title}</strong></button>)}</nav>
    <div className="admin-book-heading"><div><h4>{chapter.title}</h4><p>{completed.has(chapter.id)?'Final gate passed':available?'Book accessible':'Book locked'}{!permitted?' - activities paused':''}</p></div><div><span>{practiced} / {guided.length} guided stops practiced</span><progress aria-label="Guided stops practiced" value={practiced} max={guided.length}/></div></div>
    <div className="admin-reading-table-wrap"><table className="admin-stop-table"><thead><tr><th>Stop</th><th>Activity</th><th>Saved progress</th><th>Access</th></tr></thead><tbody>{stops.map((stop,index)=>{
      const unlocked=permitted&&!chronicleStopLocked(stops,index,{available,completed:completed.has(chapter.id),reviewMode:false,practiceDone:hasStop('games'),challengesOpen:allOpen,openStops});
      const started=stop.id==='games'&&(!!round||activities.length>0)||stop.id==='check'&&attempts.length>0;
      return <tr key={stop.id}><td><strong>{index+1}. {stop.label}</strong></td><td>{stop.kind}</td><td><span className={stop.done?'admin-stop-done':''}>{stop.done?(stop.id==='check'?'Passed':'Practiced'):started?(stop.id==='check'&&!attempts.some(row=>!row.completed_at&&Date.parse(row.expires_at)>Date.now())?'Attempted, not passed':'In progress'):'Not recorded'}</span></td><td>{!permitted?'Paused':allOpen||openStops.includes(stop.id)?'Admin override':unlocked?'Available':'Locked'}</td></tr>;
    })}</tbody></table></div>
    <details className="admin-reading-evidence"><summary>Practice details and saved activities ({activities.length})</summary>{round&&<p>Saved practice position: {round.step+1}. Spoken words: {round.spoken.join(', ')||'None recorded'}.</p>}{activities.length?<ul>{activities.map(([key])=><li key={key}>{key.slice(chapter.id.length+1).replaceAll('-',' ')}: practiced</li>)}</ul>:<p>No sub-activity records for this book.</p>}</details>
    <details className="admin-reading-evidence" open><summary>Independent checkpoint history ({attempts.length})</summary>{attempts.length===0?<p>No checkpoint rounds recorded for this book.</p>:attempts.map((attempt,index)=><details className="admin-checkpoint-attempt" key={attempt.id}><summary><strong>{attempt.passed?'Passed':attempt.completed_at?'Finished, not passed':Date.parse(attempt.expires_at)<Date.now()?'Expired':'In progress'}</strong><span>{date(attempt.created_at)}{index===0?' - latest':''}</span></summary><div className="admin-word-results">{attempt.words.map((word,i)=><div key={i}><strong>{word}</strong><span>{resultLabel(attempt.results[String(i)])}</span></div>)}{chapter.id==='gate'&&<div><strong>Picture meaning</strong><span>{resultLabel(attempt.results.meaning)}</span></div>}</div>{attempt.completed_at&&<p>Finished {date(attempt.completed_at)}</p>}</details>)}</details>
    <details className="admin-reading-evidence"><summary>Learning Camp and Sound Library</summary><div className="admin-camp-status">{['First sounds','Slide sounds forward','Read a little word'].map((title,index)=><p key={title}><strong>{title}</strong><span>{state.guidedActivities[`camp-orientation:skipped:${index}`]?'Skipped':state.campOrientationStep>index?'Practiced':'Not recorded'}</span></p>)}</div><h4>Sound Library recording entries</h4>{state.soundRecordings.length?<ul>{state.soundRecordings.map((record,index)=><li key={index}>{record.word} - {date(record.recordedAt)}</li>)}</ul>:<p>No saved recordings.</p>}</details>
    <LearnerActivity userId={userId} token={token} refresh={refresh}/>
  </section>;
}
