import { CLASSROOM_API } from './useClassroom';

type EventRow={id:string;kind:string;book:string;stop:string;task:string;occurred_at:string};
let channel:{token:string;key:string;rows:EventRow[];sending:boolean}|null=null;
let retry:ReturnType<typeof setTimeout>|undefined;
function persist(c:NonNullable<typeof channel>){
  try{if(c.rows.length)sessionStorage.setItem(c.key,JSON.stringify(c.rows));else sessionStorage.removeItem(c.key);}catch{/* Still queued in memory. */}
}
async function flush(){
  const c=channel;if(!c||c.sending)return;c.sending=true;
  try{
    while(channel===c&&c.rows.length){
      const row=c.rows[0];
      const r=await fetch(CLASSROOM_API+'/study/me/event',{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(row),signal:AbortSignal.timeout(12000)});
      if(channel!==c)return;
      if(!r.ok&&![400,409].includes(r.status))break;
      c.rows.shift();persist(c);
    }
  }catch{/* Keep unsent, non-audio events for the next connection. */}
  finally{c.sending=false;if(channel===c&&c.rows.length){clearTimeout(retry);retry=setTimeout(()=>void flush(),4000);}}
}
export function enableValidationEvents(token:string|null,userId?:number){
  clearTimeout(retry);channel=null;if(!token||!userId)return;
  const key='readlr-validation-events:'+userId;
  let rows:EventRow[]=[];try{rows=JSON.parse(sessionStorage.getItem(key)??'[]');if(!Array.isArray(rows))rows=[];}catch{}
  channel={token,key,rows,sending:false};void flush();
}
export function pathwayEvent(kind:string,book:string,stop='',task=''){
  if(!channel)return;
  channel.rows.push({id:crypto.randomUUID(),kind,book,stop,task,occurred_at:new Date().toISOString()});
  persist(channel);void flush();
}
