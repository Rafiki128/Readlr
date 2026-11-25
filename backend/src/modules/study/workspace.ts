import {dayOf,pathway,type PathEvent} from './pathway.js';
import ExcelJS from 'exceljs';
import {incompletePretest} from './pretest-end.js';
import type { Request,Response } from 'express';
import {supabase,unwrap} from '../../database/db.js';
import {CHAPTER_IDS} from '../evidence/reading-catalog.js';
import {assessmentReview,getSession,learnerView,summarize,type StudyResponse,type StudyFluency} from './study.service.js';

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
      preReview:assessmentReview(s,'pretest',responses,fluency),postReview:assessmentReview(s,'posttest',responses,fluency),
      incompletePretest:incompletePretest(s,responses,fluency),result:summarize([s],responses,fluency).participants[0]});
  }catch{return unavailable(res);}
}
export async function checkExport(req:Request,res:Response){
  const {phase,counts,skips,exceptions,initials,checked}=req.body??{};
  const id=Number(req.params.userId);
  if(!Number.isSafeInteger(id)||!['pretest','posttest'].includes(phase)||![counts,skips,exceptions].every(x=>typeof x==='boolean')||typeof initials!=='string'||!initials.trim()||initials.length>20)return res.sendStatus(400);
  try{
    const session=await getSession(id);
    if(!session||session.withdrawn)return res.sendStatus(404);
    if(checked===true){
      const [items,timed]=await Promise.all([
        supabase.from('readlr_study_responses').select('user_id,phase,skipped,teacher_score').eq('user_id',id).eq('phase',phase),
        supabase.from('readlr_study_fluency').select('user_id,phase,skipped,scored_at').eq('user_id',id).eq('phase',phase),
      ]);
      if(!counts||!assessmentReview(session,phase,unwrap(items)??[],unwrap(timed)??[]).ready)
        return res.status(409).json({message:'Check the task counts and review all submitted items before marking this test checked.'});
    }
    unwrap(await supabase.from('readlr_study_sessions').update({[phase==='pretest'?'pre_check':'post_check']:{counts,skips,exceptions,initials:initials.trim(),...(checked===true?{checkedAt:new Date().toISOString()}:{})}}).eq('user_id',id).select('user_id').single());
    return res.sendStatus(204);
  }catch{return unavailable(res);}
}

export function systemUseWorkbook(code:string,events:PathEvent[]){
  const book=new ExcelJS.Workbook();
  const summary=book.addWorksheet('Summary');
  const activity=book.addWorksheet('Activity log');
  const stats=pathway(events);
  summary.addRow(['Indicator','Count','Base','Value']);
  summary.addRow(['Participant code','','',code]);
  summary.addRow(['Recorded events','','',events.length]);
  summary.addRow(['Last recorded use (UTC)','','',events.at(-1)?.occurred_at??'']);
  summary.addRow(['Study home-window resume','','',stats.resumed?'Recorded':'Not recorded']);
  for(const [label,rate] of Object.entries(stats.rates))summary.addRow([label,rate.n,rate.d,rate.value??'Not measured']);
  activity.addRow(['Manila date','Manila time','Occurred (UTC)','Event','Book ID','Stop ID','Task ID']);
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  for(const e of events)activity.addRow([dayOf(e.occurred_at),time.format(new Date(e.occurred_at)),e.occurred_at,e.kind,e.book,e.stop,e.task]);
  for(const [sheet,widths] of [[summary,[42,12,12,27]],[activity,[16,16,29,22,18,22,42]]] as const){
    sheet.views=[{state:'frozen',ySplit:1}];
    sheet.getRow(1).font={bold:true};
    widths.forEach((width,i)=>{sheet.getColumn(i+1).width=width;});
  }
  activity.autoFilter='A1:G1';
  return book;
}

export async function exportSystemUse(req:Request,res:Response){
  const id=Number(req.params.userId);
  if(!Number.isSafeInteger(id)||id<1)return res.sendStatus(400);
  try{
    const session=await getSession(id);
    if(!session||session.withdrawn)return res.sendStatus(404);
    const book=systemUseWorkbook(session.participant_code,await eventsFor(id));
    res.setHeader('Cache-Control','no-store');
    res.attachment('readlr-system-use.xlsx');
    return res.send(Buffer.from(await book.xlsx.writeBuffer()));
  }catch{return unavailable(res);}
}
