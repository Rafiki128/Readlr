import {useEffect,useState} from 'react';
import {READING_CHAPTERS} from './aralCurriculum';
import { CLASSROOM_API } from '../hooks/useClassroom';
import {LearnerDashboard,type PathwayStats} from './PathwayDashboard';

type Activity={id?:string;kind:string;book:string;stop:string;occurred_at:string};
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'});
const time=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',hour:'numeric',minute:'2-digit',second:'2-digit'});
const labels:Record<string,string>={
  'screen-view':'Opened screen','book-start':'Opened book',resume:'Resumed book','book-complete':'Completed book',
  'stop-start':'Opened stop','stop-complete':'Completed stop','task-start':'Started task',
  retry:'Retried',hint:'Used hint',replay:'Replayed audio','mic-free':'Practiced without microphone',
  skip:'Skipped task',incident:'Technical incident',
};

export function ActivityTimeline({events}:{events:Activity[]}){
  const dates=new Map<string,Activity[]>();
  for(const event of [...events].sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))){
    const date=day.format(new Date(event.occurred_at));
    const entries=dates.get(date)??[];
    entries.push(event);
    dates.set(date,entries);
  }
  return <>{!dates.size&&<p>No activity events recorded.</p>}{[...dates].map(([date,rows])=>
    <details className="admin-reading-evidence" key={date}>
      <summary>{date} · {rows.length} {rows.length===1?'event':'events'}</summary>
      <ul>{rows.map((e,i)=><li key={e.id??i}>
        <time dateTime={e.occurred_at}>{time.format(new Date(e.occurred_at))}</time> · {labels[e.kind]??e.kind}
        {e.book?' · '+(READING_CHAPTERS.find(b=>b.id===e.book)?.title??e.book):''}
        {e.stop?' · '+e.stop.replaceAll('-',' '):''}
      </li>)}</ul>
    </details>)}</>;
}

export function LearnerActivity({userId,token,refresh}:{userId:number;token:string;refresh:number}){
  const [data,setData]=useState<{events:Activity[];path?:PathwayStats;limit:number}|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    setError(false);
    fetch(`${CLASSROOM_API}/admin/learners/${userId}/activity`,{
      headers:{Authorization:`Bearer ${token}`},
      signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),
    }).then(async res=>{
      if(!res.ok)throw new Error('Activity unavailable');
      const result=await res.json();
      if(!controller.signal.aborted)setData(result);
    }).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return ()=>controller.abort();
  },[userId,token,refresh]);
  return <section aria-label="Learner activity">
    <h4>System Use</h4>
    {error&&<p role="alert">Activity could not load. Refresh learner details to retry.</p>}
    {data?<><small>{data.events.length===data.limit?'Charts and timeline cover the latest '+data.limit+' events.':'Charts reflect recorded activity, not lifetime saved progress.'}</small>
      {data.path&&data.events.length>0&&<LearnerDashboard path={data.path} events={data.events} general/>}
      <h4>Activity by date · Manila</h4><ActivityTimeline events={data.events}/></>:!error&&<p role="status">Loading activity…</p>}
  </section>;
}
