import {pathway} from './pathway.js';
import {incompletePretest} from './pretest-end.js';
import type { Request,Response } from 'express';
import {supabase,unwrap} from '../../database/db.js';
import {CHAPTER_IDS} from '../evidence/reading-catalog.js';
import {getSession,learnerView,summarize,type StudyResponse,type StudyFluency} from './study.service.js';

const user=(req:Request)=>(req as Request & {userId:number}).userId;
const unavailable=(res:Response)=>res.status(503).json({message:'Validation data unavailable. Check connectivity and the validation workspace migration.'});
export async function enterWorld(req:Request,res:Response){
  try{
    if(!['learning','done'].includes(req.body?.phase))return res.sendStatus(400);
    unwrap(await supabase.from('readlr_study_sessions').update({entry_pending:false}).eq('user_id',user(req)).eq('phase',req.body.phase));
    return res.json(await learnerView(await getSession(user(req))));
  }catch{return unavailable(res);}
}
const kinds=['screen-view','book-start','resume','book-complete','stop-start','stop-complete','task-start','retry','hint','replay','mic-free','skip','incident'];
export async function addEvent(req:Request,res:Response){
  const {id,kind,book,stop,task,occurred_at}=req.body??{};
  if(!/^[a-f0-9-]{36}$/i.test(id)||!kinds.includes(kind)||(kind==='screen-view'?book!==''||!/^[-a-z0-9]{1,50}$/.test(stop):!CHAPTER_IDS.includes(book))||![stop,task].every(v=>typeof v==='string'&&v.length<=128))return res.sendStatus(400);
  try{
    const session=await getSession(user(req));
    if(!session||!['learning','done'].includes(session.phase))return res.sendStatus(409);
    const when=Date.parse(occurred_at);
    if(!Number.isFinite(when)||when<Date.parse(session.created_at)-60000||when>Date.now()+60000)return res.sendStatus(400);
    unwrap(await supabase.from('readlr_validation_events').upsert({id,user_id:user(req),kind,book,stop,task,occurred_at:new Date(when).toISOString()},{onConflict:'id',ignoreDuplicates:true}));
    return res.sendStatus(204);
  }catch{return unavailable(res);}
}
export async function eventsFor(userId:number){
  const events:Array<{kind:string;book:string;stop:string;task:string;occurred_at:string}>=[];
  for(let i=0;;i+=500){
    const rows=unwrap(await supabase.from('readlr_validation_events').select('kind,book,stop,task,occurred_at').eq('user_id',userId).order('occurred_at').order('id').range(i,i+499))??[];
    events.push(...rows);if(rows.length<500)return events;
  }
}
export async function cohortPathway(_req:Request,res:Response){
  res.setHeader('Cache-Control','no-store');
  try{
    const ids=unwrap(await supabase.from('readlr_study_sessions').select('user_id').eq('withdrawn',false))??[];
    const summaries:ReturnType<typeof pathway>[]=[];
    for(let i=0;i<ids.length;i+=5){
      summaries.push(...await Promise.all(ids.slice(i,i+5).map(async s=>pathway(await eventsFor(s.user_id)))));
    }
    return res.json({enrolled:ids.length,resumed:summaries.filter(p=>p.resumed).length,
      books:CHAPTER_IDS.map(book=>({book,started:summaries.filter(p=>p.starts.includes(book)).length,
        completed:summaries.filter(p=>p.starts.includes(book)&&p.ends.includes(book)).length}))});
  }catch{return unavailable(res);}
}
export async function participantDetail(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store');
  const id=Number(req.params.userId);
  if(!Number.isSafeInteger(id)||id<1)return res.sendStatus(400);
  try{
    const s=await getSession(id);if(!s)return res.sendStatus(404);
    const [a,b,events]=await Promise.all([supabase.from('readlr_study_responses').select('*').eq('user_id',id).order('position'),
      supabase.from('readlr_study_fluency').select('*').eq('user_id',id),eventsFor(id)]);
    const responses=unwrap(a) as StudyResponse[],fluency=unwrap(b) as StudyFluency[];
    return res.json({responses:responses.map(({recording_path,app_transcript,...r})=>({...r,audio:!!recording_path})),
      fluency:fluency.map(({recording_path,...f})=>({...f,audio:!!recording_path})),events,pathway:pathway(events),
      pre:s.pre_check,post:s.post_check,pretestEndedEarly:!!s.pretest_ended_early_at,
      incompletePretest:incompletePretest(s,responses,fluency),result:summarize([s],responses,fluency).participants[0]});
  }catch{return unavailable(res);}
}
export async function checkExport(req:Request,res:Response){
  const {phase,counts,skips,exceptions,initials}=req.body??{};
  const id=Number(req.params.userId);
  if(!Number.isSafeInteger(id)||!['pretest','posttest'].includes(phase)||![counts,skips,exceptions].every(x=>typeof x==='boolean')||typeof initials!=='string'||!initials.trim()||initials.length>20)return res.sendStatus(400);
  try{
    unwrap(await supabase.from('readlr_study_sessions').update({[phase==='pretest'?'pre_check':'post_check']:{counts,skips,exceptions,initials:initials.trim()}}).eq('user_id',id).select('user_id').single());
    return res.sendStatus(204);
  }catch{return unavailable(res);}
}
