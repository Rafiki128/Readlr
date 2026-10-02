import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
process.env.SUPABASE_URL='http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
process.env.JWT_SECRET='test-only-recovery';
const {supabase}=await import('../src/database/db.js');
const {requestRecovery,approveRecovery,completeRecovery,recoveryHash,listRecovery}=await import('../src/modules/auth/recovery.controller.js');
const {authMiddleware}=await import('../src/middleware/auth.js');
function response(){return {statusCode:200,body:undefined as any,setHeader(){},status(n:number){this.statusCode=n;return this;},json(data:unknown){this.body=data;return this;}};}
const id='00000000-0000-4000-8000-000000000001',secret='a'.repeat(64);
test('request list explicitly joins the learner, not the approving admin',async()=>{
  const original=supabase.from;
  let selection='';
  supabase.from=(()=>{const q:any={select:(value:string)=>{selection=value;return q;},in:()=>q,gt:()=>q,order:()=>q,limit:async()=>({data:[],error:null})};return q;}) as any;
  try {
    const res=response();await listRecovery({} as any,res as any);
    assert.equal(res.statusCode,200);
    assert.match(selection,/users!password_recovery_user_id_fkey\(email\)/);
    assert.deepEqual(res.body.requests,[]);
  }finally{supabase.from=original;}
});
test('requests return an opaque ticket and never expose account existence or store plaintext ticket secrets',async()=>{
  const original=supabase.rpc;let args:any;
  supabase.rpc=(async (_:string,a:any)=>{args=a;return {data:null,error:null};}) as any;
  try {const res=response();await requestRecovery({body:{email:' CHILD@EXAMPLE.COM '}} as any,res as any);
    assert.equal(res.statusCode,200);assert.equal(args.p_email,'child@example.com');assert.equal(args.p_hash,recoveryHash(res.body.secret));assert.notEqual(args.p_hash,res.body.secret);
  }finally{supabase.rpc=original;}
});
test('only verified requests issue codes and only hashes reach the database',async()=>{
  const original=supabase.rpc;let calls=0,args:any;
  supabase.rpc=(async (_:string,a:any)=>{calls++;args=a;return {data:true,error:null};}) as any;
  try {
    const rejected=response();await approveRecovery({userId:7,params:{id},body:{action:'approve'}} as any,rejected as any);assert.equal(rejected.statusCode,400);assert.equal(calls,0);
    const res=response();await approveRecovery({userId:7,params:{id},body:{action:'approve',verified:true}} as any,res as any);
    assert.match(res.body.code,/^[A-F0-9]{12}$/);assert.equal(args.p_actor,7);assert.equal(args.p_code,recoveryHash(res.body.code));
    const bad=response();await completeRecovery({body:{id,secret,code:res.body.code,password:'abcdefgh',confirmPassword:'different'}} as any,bad as any);assert.equal(bad.statusCode,400);assert.equal(calls,1);
    const good=response();await completeRecovery({body:{id,secret,code:res.body.code,password:'abcdefgh',confirmPassword:'abcdefgh'}} as any,good as any);
    assert.equal(good.statusCode,200);assert.match(args.p_password,/^\$2/);assert.notEqual(args.p_password,'abcdefgh');assert.equal(args.p_request,recoveryHash(secret));
  }finally{supabase.rpc=original;}
});
test('password changes invalidate older sessions including legacy tokens',async()=>{
  const original=supabase.from;
  supabase.from=(()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{auth_version:1},error:null})};return q;}) as any;
  try {for(const version of [undefined,0,1]) {
    const token=jwt.sign({id:7,role:'learner',...(version===undefined?{}:{authVersion:version})},process.env.JWT_SECRET!);
    let next=false;const res=response();await authMiddleware({headers:{authorization:`Bearer ${token}`}} as any,res as any,()=>{next=true;});
    assert.equal(next,version===1);if(version!==1)assert.equal(res.statusCode,401);
  }}finally{supabase.from=original;}
});
