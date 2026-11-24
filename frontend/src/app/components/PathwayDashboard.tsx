import {useEffect,useState} from 'react';
import {BookOpen,Flag,Home,Users} from 'lucide-react';
import {READING_CHAPTERS} from './aralCurriculum';
import type {ValidationApi} from './ValidationDossier';

type Rate={n:number;d:number;value:number|null};
export type PathwayStats={starts:string[];ends:string[];resumed:boolean;rates:Record<string,Rate>};
type Event={book:string;stop:string;kind:string};
type Cohort={enrolled:number;resumed:number;books:{book:string;started:number;completed:number}[]};
const title=(id:string)=>READING_CHAPTERS.find(b=>b.id===id)?.title??id;
const pct=(n:number,d:number)=>d?Math.round(n/d*100):null;
function Bar({value,tone='teal'}:{value:number|null;tone?:string}){
  return <span aria-hidden="true" className={'vd-track '+tone}><i style={{width:Math.min(value??0,100)+'%'}}/></span>;
}
export function CohortDashboard({api}:{api:ValidationApi}){
  const [data,setData]=useState<Cohort>(),[error,setError]=useState(''),[version,reload]=useState(0);
  useEffect(()=>{let live=true;setError('');api('/pathway').then(r=>r.json()).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[api,version]);
  return <div className="vd-board"><div className="vd-heading"><div><small>COHORT ANALYTICS</small><h3>Book pathway</h3></div><button onClick={()=>reload(v=>v+1)}>Refresh</button></div>
    {error?<p role="alert">{error}</p>:!data?<p role="status">Loading pathway activity...</p>:<>
    <div className="vd-kpis"><div><Users/>Enrolled<strong>{data.enrolled}</strong></div><div><BookOpen/>Books reached<strong>{data.books.filter(b=>b.started).length} <small>of {data.books.length}</small></strong></div><div><Home/>Home-window continuation<strong>{pct(data.resumed,data.enrolled)===null?'No participants':pct(data.resumed,data.enrolled)+'%'}</strong><small>{data.resumed} resumed on Nov 24 or 25, Manila time</small></div></div>
    <h4>Reach and completion by book</h4><div className="vd-legend"><span>Started / enrolled</span><span>Finished / starters</span></div>
    <div className="vd-books">{data.books.map((b,i)=><div key={b.book}><strong><small>{String(i+1).padStart(2,'0')}</small>{title(b.book)}</strong>{[pct(b.started,data.enrolled),pct(b.completed,b.started)].map((v,k)=><div key={k} aria-label={k?'Completion among starters':'Reach among enrolled'}><Bar value={v} tone={k?'violet':'teal'}/><b>{v===null?(k?'No starters':'No cohort'):v+'%'}</b><small>{k?b.completed:b.started} of {k?b.started:data.enrolled}</small></div>)}</div>)}</div></>}
  </div>;
}
export function LearnerDashboard({path,events,general=false}:{path:PathwayStats;events:Event[];general?:boolean}){
  const signals=new Map<string,{book:string;stop:string;retry:number;skip:number;incident:number;starts:number}>();
  events.forEach(e=>{if(!e.book||!e.stop||!['retry','skip','incident','task-start'].includes(e.kind))return;
    const key=e.book+':'+e.stop,row=signals.get(key)??{book:e.book,stop:e.stop,retry:0,skip:0,incident:0,starts:0};
    if(e.kind==='task-start')row.starts++;else row[e.kind as 'retry'|'skip'|'incident']++;signals.set(key,row);});
  const flagged=[...signals.values()].filter(r=>r.retry+r.skip+r.incident).sort((a,b)=>(b.retry+b.skip+b.incident)-(a.retry+a.skip+a.incident));
  return <div className="vd-board"><div className="vd-kpis"><div><BookOpen/>Books explored<strong>{path.starts.length} <small>of {READING_CHAPTERS.length}</small></strong></div><div><Flag/>Books finished<strong>{path.ends.length} <small>of {READING_CHAPTERS.length}</small></strong></div>
    {general?<div><Home/>Book resumes<strong>{events.filter(e=>e.kind==='resume').length}</strong></div>:<div><Home/>Nov 24–25 continuation<strong className="vd-status">{path.resumed?'Resume recorded':'No resume recorded'}</strong></div>}</div>
    <h3>Pathway and self-learning indicators</h3><div className="vd-rates">{Object.entries(path.rates).map(([key,r])=>{
      const perTask=key==='Retries per task',incidents=key==='Technical incidents per 100 tasks',isCount=perTask||incidents;
      const base=key.startsWith('Books explored')?'catalog books':key==='Opened books completed'?'opened books':key==='Opened stops completed'?'opened stops':'task attempts';
      return <div key={key}><span>{key}</span><strong>{r.value===null?'Not measured':r.value+(isCount?'':'%')}</strong>{!isCount&&<Bar value={r.value}/>}<small>{r.d?r.n+' / '+r.d+' '+base:'No '+base+' recorded'}{incidents&&r.d?' · per 100 attempts':''}</small></div>;})}</div>
    <h3>Stops to review</h3>{flagged.length?<div className="vd-scroll"><table><thead><tr>{['Book / stop','Task starts','Retries','Skips','Incidents'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{flagged.map(r=><tr key={r.book+':'+r.stop}><th>{title(r.book)} · {r.stop}</th><td>{r.starts}</td><td>{r.retry}</td><td>{r.skip}</td><td>{r.incident}</td></tr>)}</tbody></table></div>:<p className="vd-empty">No retries, skips, or technical incidents recorded for a book stop.</p>}
  </div>;
}
