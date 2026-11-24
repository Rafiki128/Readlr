import {CHAPTER_IDS} from '../evidence/reading-catalog.js';
export interface PathEvent {kind:string;book:string;stop:string;task:string;occurred_at:string}
const dayFmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'});
export const dayOf=(t:string)=>dayFmt.format(new Date(t));
const rate=(n:number,d:number,scale=100)=>({n,d,value:d?Math.round(n/d*scale*100)/100:null});
export function pathway(events:PathEvent[]){
  const rows=events.filter(e=>CHAPTER_IDS.includes(e.book));
  const unique=(kind:string)=>[...new Set(rows.filter(e=>e.kind===kind).map(e=>e.book))];
  const starts=unique('book-start'),ends=unique('book-complete');
  const stops=(kind:string)=>new Set(rows.filter(e=>e.kind===kind).map(e=>e.book+':'+e.stop));
  const startedStops=stops('stop-start'), finishedStops=stops('stop-complete');
  const tasks=new Set(events.filter(e=>e.kind==='task-start'&&e.task).map(e=>e.task));
  const taskEvents=events.filter(e=>tasks.has(e.task));
  const count=(kind:string)=>taskEvents.filter(e=>e.kind===kind).length;
  const distinct=(kinds:string[])=>new Set(taskEvents.filter(e=>kinds.includes(e.kind)).map(e=>e.task)).size;
  return {starts,ends,resumed:events.some(e=>e.kind==='resume'&&['2026-11-24','2026-11-25'].includes(dayOf(e.occurred_at))),
    rates:{'Books explored (of 10)':rate(starts.length,CHAPTER_IDS.length),'Opened books completed':rate(starts.filter(b=>ends.includes(b)).length,starts.length),
    'Opened stops completed':rate([...startedStops].filter(s=>finishedStops.has(s)).length,startedStops.size),
    'Tasks using support':rate(distinct(['hint','replay','retry','mic-free']),tasks.size),'Tasks skipped':rate(distinct(['skip']),tasks.size),
    'Retries per task':rate(count('retry'),tasks.size,1),'Technical incidents per 100 tasks':rate(count('incident'),tasks.size)}};
}
