import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {validateSubmission,SURVEY_VERSION,questions,choices} from '../src/modules/admin/survey.data.js';
process.env.SUPABASE_URL='http://127.0.0.1:1';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
const {supabase}=await import('../src/database/db.js');
const {submitSurvey,assignSurvey,surveyWorkbook}=await import('../src/modules/admin/survey.controller.js');
const valid=()=>({version:SURVEY_VERSION,language:'ceb',section:'Sunflower',answers:[...Array(12).fill(3),'characters','nothing']});
const response=()=>({statusCode:200,body:null as any,status(n:number){this.statusCode=n;return this;},json(d:any){this.body=d;return this;}});
test('questionnaire matches 12 ratings and two single choices, and permits skips',()=>{
  assert.equal(questions.length,14);assert.equal(choices[13].length,6);assert.equal(choices[14].length,6);
  assert.equal(validateSubmission(valid()),true);assert.equal(validateSubmission({...valid(),answers:Array(14).fill(null)}),true);
  for(const value of [0,6,2.5,'5',{},false]){const b=valid();b.answers[0]=value as any;assert.equal(validateSubmission(b),false);}
  for(const patch of [{section:''},{section:' '.repeat(5)},{section:'x'.repeat(81)},{language:'xx'},{version:'old'},{answers:Array(13).fill(2)}])assert.equal(validateSubmission({...valid(),...patch}),false);
  const b=valid();b.answers[13]='characters';assert.equal(validateSubmission(b),false);
});
test('submission uses authenticated identity and rejects revoked assignments',async()=>{
  const original=supabase.rpc;let args:any;let permitted=true;
  supabase.rpc=(async(_:string,a:any)=>{args=a;return {data:permitted,error:null};}) as any;
  try{let res=response();await submitSurvey({userId:2,body:{...valid(),user_id:999,name:'Spoof'}} as any,res as any);assert.equal(args.p_user,2);assert.equal(res.statusCode,200);permitted=false;res=response();await submitSurvey({userId:2,body:valid()} as any,res as any);assert.equal(res.statusCode,403);}finally{supabase.rpc=original;}
});
test('assignment rejects invalid input and handles concurrent admin writes',async()=>{
  const original=supabase.rpc;let count=0;
  supabase.rpc=(async()=>{count++;return {data:false,error:null};}) as any;
  try{let res=response();await assignSurvey({body:{target:'class',enabled:null,revision:0}} as any,res as any);assert.equal(res.statusCode,400);assert.equal(count,0);res=response();await assignSurvey({userId:1,body:{target:'class',enabled:true,revision:0}} as any,res as any);assert.equal(res.statusCode,409);}finally{supabase.rpc=original;}
});
test('Excel roundtrip preserves numeric ratings, skipped blanks, and untrusted text as strings',async()=>{
  const book=surveyWorkbook([{user_id:2,name:'=HYPERLINK("evil")',section:'+SUM(1,2)',language:'ceb',submitted_at:'2026-10-02T00:00:00Z',answers:[null,...Array(11).fill(4),'games','nothing']}]);
  const read=new ExcelJS.Workbook();await read.xlsx.load(await book.xlsx.writeBuffer());
  const s=read.getWorksheet('Responses')!;
  assert.equal(s.getCell('B2').type,ExcelJS.ValueType.String);assert.equal(s.getCell('C2').value,'+SUM(1,2)');assert.equal(s.getCell('G2').value,null);assert.equal(s.getCell('H2').value,4);assert.equal(s.getCell('T2').value,'nothing');assert.equal(read.getWorksheet('Question key')!.rowCount,16);
});
