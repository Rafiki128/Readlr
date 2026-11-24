import { CLASSROOM_API } from './useClassroom';

type EventRow={id:string;kind:string;book:string;stop:string;task:string;occurred_at:string};
type ChannelName='validation'|'learner';
type Channel={token:string;key:string;rows:EventRow[];sending:boolean;retry?:ReturnType<typeof setTimeout>};
const channels:Partial<Record<ChannelName,Channel>>={};
const paths={validation:'/study/me/event',learner:'/learner/me/activity'};
const learnerAttempts=new Map<string,string>();
function learnerAttempt(task:string){
  if(!task)return '';
  const found=learnerAttempts.get(task);
  if(found)return found;
  if(learnerAttempts.size>=2048)learnerAttempts.clear();
  const id=crypto.randomUUID();
  learnerAttempts.set(task,id);
  return id;
}
function persist(c:Channel){
  try{if(c.rows.length)sessionStorage.setItem(c.key,JSON.stringify(c.rows));else sessionStorage.removeItem(c.key);}catch{/* Still queued in memory. */}
}
async function flush(name:ChannelName){
  const c=channels[name];if(!c||c.sending)return;c.sending=true;
  try{
    while(channels[name]===c&&c.rows.length){
      const row=c.rows[0];
      const r=await fetch(CLASSROOM_API+paths[name],{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(row),signal:AbortSignal.timeout(12000)});
      if(channels[name]!==c)return;
      if(!r.ok&&![400,409].includes(r.status))break;
      c.rows.shift();persist(c);
    }
  }catch{/* Keep unsent, non-audio events for the next connection. */}
  finally{c.sending=false;if(channels[name]===c&&c.rows.length){clearTimeout(c.retry);c.retry=setTimeout(()=>void flush(name),4000);}}
}
function enable(name:ChannelName,token:string|null,userId?:number){
  clearTimeout(channels[name]?.retry);delete channels[name];if(!token||!userId)return;
  const key='readlr-'+name+'-events:'+userId;
  let rows:EventRow[]=[];try{rows=JSON.parse(sessionStorage.getItem(key)??'[]');if(!Array.isArray(rows))rows=[];}catch{}
  channels[name]={token,key,rows,sending:false};void flush(name);
}
export const enableValidationEvents=(token:string|null,userId?:number)=>enable('validation',token,userId);
export const enableLearnerActivity=(token:string|null,userId?:number)=>{
  if(!token)learnerAttempts.clear();
  enable('learner',token,userId);
};
export function pathwayEvent(kind:string,book:string,stop='',task=''){
  if(!channels.validation&&!channels.learner)return;
  const row={id:crypto.randomUUID(),kind,book,stop,task,occurred_at:new Date().toISOString()};
  for(const name of ['validation','learner'] as const){
    const c=channels[name];if(!c)continue;
    if(name==='learner'&&c.rows.length>=1000)continue;
    c.rows.push(name==='learner'?{...row,task:learnerAttempt(task)}:row);
    persist(c);void flush(name);
  }
}
