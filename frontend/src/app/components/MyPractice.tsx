import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Mic, Star, TrendingUp } from "lucide-react";
import { PRACTICE_CHANGED, readPractice, summarizePractice, weekStart, type PracticeAttempt } from "../../hooks/practiceRecords";
import "./myPractice.css";

const names = ["Valley of Vowels", "Blending Bridges", "CVC Kingdom"];
const dateLabel = (time: number) => new Date(time).toLocaleDateString(undefined,{month:"short",day:"numeric"});
const percent = (value: number | null) => value === null ? "Not assessed" : `${Math.round(value*100)}%`;
const duration = (ms: number) => { const seconds = Math.round(ms/1000); return `${Math.floor(seconds/60)}m ${seconds%60}s`; };

export function MyPractice({learnerId, records: previewRecords}: {learnerId?:number|null; records?:PracticeAttempt[]}) {
  const [records,setRecords] = useState(()=>previewRecords ?? readPractice(learnerId));
  const [week,setWeek] = useState(0);
  const [stage,setStage] = useState(0);
  const [page,setPage] = useState(0);
  useEffect(()=>{setWeek(0);setStage(0);setPage(0);},[learnerId]);
  useEffect(()=>{
    const refresh=()=>setRecords(previewRecords ?? readPractice(learnerId));
    refresh(); window.addEventListener(PRACTICE_CHANGED,refresh); window.addEventListener("storage",refresh);
    return ()=>{window.removeEventListener(PRACTICE_CHANGED,refresh);window.removeEventListener("storage",refresh);};
  },[learnerId,previewRecords]);
  const start=weekStart(Date.now(),week), end=weekStart(Date.now(),week+1);
  const visible=records.filter(r=>(!stage||r.stageId===stage)&&r.timestamp>=start&&r.timestamp<end&&r.timestamp<=Date.now());
  const summary=summarizePractice(visible);
  const sessions=Array.from(new Set(visible.map(r=>r.sessionId))).map(id=>visible.filter(r=>r.sessionId===id)).reverse();
  const days=Array.from({length:7},(_,i)=>{const date=new Date(start);date.setDate(date.getDate()+i);const next=new Date(date);next.setDate(next.getDate()+1);return {date:date.getTime(),...summarizePractice(visible.filter(r=>r.timestamp>=date.getTime()&&r.timestamp<next.getTime()))};});
  return <section className="my-practice" aria-label="My Practice">
    <header className="practice-toolbar"><div><h2>My Practice</h2><p>Little efforts, day by day.</p></div><label>Stage<Select value={String(stage)} onValueChange={value=>{setStage(Number(value));setPage(0);}}><SelectTrigger aria-label="Stage"><SelectValue/></SelectTrigger><SelectContent><SelectItem value={String(0)}>All stages</SelectItem>{names.map((name,i)=><SelectItem key={name} value={String(i+1)}>{name}</SelectItem>)}</SelectContent></Select></label><div className="practice-week"><button aria-label="Previous week" title="Previous week" onClick={()=>{setWeek(week-1);setPage(0);}}><ChevronLeft size={19}/></button><span><CalendarDays size={16}/>{week===0?"This week":`${dateLabel(start)} - ${dateLabel(end-1)}`}</span><button aria-label="Next week" title="Next week" disabled={week===0} onClick={()=>{setWeek(week+1);setPage(0);}}><ChevronRight size={19}/></button></div></header>
    <div className="practice-summary">
      <div><Mic size={21}/><strong>{summary.attempts}</strong><span>Recording attempts</span></div>
      <div><CalendarDays size={21}/><strong>{summary.sessions}</strong><span>Practice sessions</span></div>
      <div><Clock3 size={21}/><strong>{duration(summary.durationMs)}</strong><span>Recorded time</span></div>
      <div><Star size={21}/><strong>{summary.stars ?? "Not assessed"}</strong><span>Self-Correction Stars</span></div>
    </div>
    <p className="practice-data-note">Guided recordings count as practice, not pronunciation scores. Accuracy, fluency and Self-Correction Stars need a valid assessment. History is saved on this device; audio is not stored here.</p>
    {visible.some(r=>r.wordRecognition)&&<p>Stage 3 word checks: {visible.filter(r=>r.wordRecognition==='matched').length} matched, {visible.filter(r=>r.wordRecognition==='different').length} different word, {visible.filter(r=>r.wordRecognition==='uncertain'||r.wordRecognition==='unavailable').length} unclear or unavailable. These are recognition results, not pronunciation scores.</p>}
    <div className="practice-analysis">
      <section aria-label="Accuracy trends"><h3><TrendingUp size={19}/>Accuracy this week</h3><strong className="practice-score">{percent(summary.accuracy)}</strong><p>{summary.assessed} assessed / {summary.attempts} attempts</p><div className="practice-days">{days.map(day=><div key={day.date}><span>{percent(day.accuracy)}</span><div className="practice-bar">{day.accuracy!==null&&<i style={{height:`${day.accuracy*100}%`}}/>}</div><b>{new Date(day.date).toLocaleDateString(undefined,{weekday:"short"})}</b><small>{day.attempts} tries</small></div>)}</div></section>
      <section aria-label="Fluency distribution"><h3>Fluency by stage</h3><p>All assessed attempts, not just the best attempt.</p>{names.map((name,i)=>{if(stage&&stage!==i+1)return null;const stats=summarizePractice(visible.filter(r=>r.stageId===i+1));return <div className="practice-fluency" key={name}><h4>{name}</h4>{stats.assessed===0?<p>Not assessed</p>:<ul>{stats.tiers.map(t=><li key={t.tier}><span>{t.tier}</span><progress value={t.count} max={stats.assessed} aria-label={`${name} ${t.tier}`}/><span>{t.count} ({Math.round(t.count/stats.assessed*100)}%)</span></li>)}</ul>}</div>;})}</section>
    </div>
    <section className="practice-history"><header><h3>Session history</h3><span>{summary.sessions} sessions this week</span></header>{sessions.length===0?<div className="practice-empty"><Mic size={28}/><h4>No practice recorded this week</h4><p>{learnerId||previewRecords?"Your next recording will appear here. Earlier lessons are not counted as new attempts.":"Sign in as a learner to keep your practice history."}</p></div>:<div className="practice-table-wrap"><table><thead><tr><th>When / Stage</th><th>Sound or word</th><th>Attempts</th><th>Recorded time</th><th>Accuracy</th></tr></thead><tbody>{sessions.slice(page*8,page*8+8).map(items=>{const first=items[0],stats=summarizePractice(items);return <tr key={first.sessionId}><td><strong>{dateLabel(first.timestamp)} / {new Date(first.timestamp).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</strong><small>{names[first.stageId-1]}</small></td><td className="practice-target">{first.target.toLowerCase()}</td><td>{items.length}<small>{items.filter(r=>r.outcome==="silence").length} quiet / {items.filter(r=>r.outcome==="interrupted"||r.outcome==="error").length} interrupted</small></td><td>{duration(stats.durationMs)}</td><td>{percent(stats.accuracy)}</td></tr>;})}</tbody></table></div>}{sessions.length>8&&<div className="practice-pagination"><button disabled={page===0} aria-label="Previous sessions" onClick={()=>setPage(page-1)}><ChevronLeft size={18}/></button><span>Page {page+1} of {Math.ceil(sessions.length/8)}</span><button disabled={(page+1)*8>=sessions.length} aria-label="More sessions" onClick={()=>setPage(page+1)}><ChevronRight size={18}/></button></div>}</section>
  </section>;
}
