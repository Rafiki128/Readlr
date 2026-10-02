import type { Request,Response } from 'express';
import ExcelJS from 'exceljs';
import { supabase,unwrap } from '../../database/db.js';
import { SURVEY_VERSION,questions,choices,scale,validateSubmission } from './survey.data.js';

export async function surveyAssigned(userId:number) {
  const row=unwrap(await supabase.from('survey_assignment').select('*').eq('id',1).single());
  return row.overrides[String(userId)] ?? row.enabled;
}
const unavailable=(res:Response)=>res.status(503).json({message:'Survey is unavailable. Ask your administrator to check the student survey migration.'});
export async function getSurvey(req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  try {
    if (!await surveyAssigned((req as any).userId)) {res.status(403).json({message:'The survey is not assigned to you.'});return;}
    const response=unwrap(await supabase.from('survey_responses').select('submitted_at').eq('user_id',(req as any).userId).eq('version',SURVEY_VERSION).maybeSingle());
    res.json({version:SURVEY_VERSION,questions,choices,scale,submittedAt:response?.submitted_at??null});
  } catch {unavailable(res);}
}
export async function submitSurvey(req:Request,res:Response) {
  if (!validateSubmission(req.body)) {res.status(400).json({message:'Check your section and survey answers.'});return;}
  try {
    const ok=unwrap(await supabase.rpc('submit_student_survey',{p_user:(req as any).userId,p_version:SURVEY_VERSION,p_section:req.body.section.trim(),p_language:req.body.language,p_answers:req.body.answers}));
    if (!ok) {res.status(403).json({message:'Your survey assignment has ended. Your answers were not submitted.'});return;}
    res.json({success:true});
  } catch {unavailable(res);}
}
export async function getSurveyAssignments(_req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  try {res.json(unwrap(await supabase.from('survey_assignment').select('*').eq('id',1).single()));} catch {unavailable(res);}
}
export async function assignSurvey(req:Request,res:Response) {
  const {target,enabled,revision}=req.body??{};
  if (!(target==='class'||Number.isSafeInteger(target)&&target>0) || !(typeof enabled==='boolean'||enabled===null&&target!=='class') || !Number.isSafeInteger(revision)||revision<0) {res.status(400).json({message:'Invalid survey assignment.'});return;}
  try {
    const ok=unwrap(await supabase.rpc('assign_student_survey',{p_actor:(req as any).userId,p_target:target==='class'?null:target,p_enabled:enabled,p_revision:revision}));
    if(!ok){res.status(409).json({message:'Assignments changed. Refresh and try again.'});return;}
    await getSurveyAssignments(req,res);
  } catch {unavailable(res);}
}
async function responseRows() {
  const rows:any[]=[];
  for(let start=0;;start+=500){
    const batch=unwrap(await supabase.from('survey_responses').select('*').eq('version',SURVEY_VERSION).order('user_id').range(start,start+499))??[];
    if(batch.length){
      const profiles=unwrap(await supabase.from('learner_profiles').select('user_id,name').in('user_id',batch.map(r=>r.user_id)))??[];
      const names=new Map(profiles.map(p=>[p.user_id,p.name]));
      rows.push(...batch.map(r=>({...r,name:names.get(r.user_id)??'Learner'})));
    }
    if(batch.length<500)return rows;
  }
}
export async function listSurveyResponses(_req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  try {res.json({responses:await responseRows(),questions,choices,scale,version:SURVEY_VERSION});}catch{unavailable(res);}
}
export function surveyWorkbook(rows:any[]) {
  const book=new ExcelJS.Workbook();
  book.creator='Readlr';
  const sheet=book.addWorksheet('Responses');
  sheet.addRow(['Learner ID','Learner','Section','Language','Submitted (UTC)','Questionnaire version',...questions.map(q=>`Q${q.id}`)]);
  for(const row of rows)sheet.addRow([row.user_id,String(row.name),String(row.section),row.language,new Date(row.submitted_at),SURVEY_VERSION,...row.answers]);
  sheet.getColumn(5).numFmt='yyyy-mm-dd hh:mm:ss';
  const key=book.addWorksheet('Question key');
  key.addRow(['Question','English','Cebuano','Answer values']);
  for(const q of questions)key.addRow([`Q${q.id}`,q.en,q.ceb,q.kind==='rating'?scale.map((s,i)=>`${i+1}: ${s[0]} / ${s[1]}`).join('; '):choices[q.id as 13|14].map(c=>`${c[0]}: ${c[1]} / ${c[2]}`).join('; ')]);
  key.addRow(['Notes','Blank answers mean skipped, never zero. One response per learner. This survey measures learner feedback, not reading achievement.']);
  for(const tab of [sheet,key]){
    tab.views=[{state:'frozen',ySplit:1}];tab.autoFilter={from:'A1',to:{row:1,column:tab.columnCount}};
    tab.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};tab.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF087F73'}};
    tab.columns.forEach((col,i)=>{col.width=tab===key?(i?58:12):(i<6?25:10);});
    tab.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
  }
  return book;
}
export async function exportSurvey(_req:Request,res:Response){
  res.setHeader('Cache-Control','no-store');
  try{
    const buffer=await surveyWorkbook(await responseRows()).xlsx.writeBuffer();
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="readlr-feedback-${new Date().toISOString().slice(0,10)}.xlsx"`);
    res.send(Buffer.from(buffer));
  }catch{unavailable(res);}
}
