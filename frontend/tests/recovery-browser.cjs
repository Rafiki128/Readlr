const {chromium}=require(process.argv[2] || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const learner=await browser.newContext({viewport:{width:393,height:852}});
  const admin=await browser.newContext({viewport:{width:1440,height:1000}});
  await admin.addInitScript(()=>localStorage.setItem('auth_token','mock-admin'));
  const id='00000000-0000-4000-8000-000000000001',secret='a'.repeat(64),code='ABCDEF123456';
  let state='none',submitted=null;
  const errors=[];
  for(const context of [learner,admin]) await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url());let data={},status=200;
   if(url.pathname.endsWith('/auth/profile'))data={user:{id:7,email:'admin@example.com',role:'admin',name:'Admin'}};
   else if(url.pathname.endsWith('/auth/recovery/request')){state='pending';data={id,secret,message:'Speak to your administrator.'};}
   else if(url.pathname.endsWith('/auth/recovery/status'))data={status:state};
   else if(url.pathname.endsWith('/auth/recovery/complete')){submitted=req.postDataJSON();state='used';data={message:'Password updated.'};}
   else if(url.pathname.endsWith('/admin/password-requests'))data={requests:['pending','approved'].includes(state)?[{id,user_id:11,status:state,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+900000).toISOString(),users:{email:'child@example.com'}}]:[]};
   else if(url.pathname.endsWith(`/admin/password-requests/${id}`)){assert.equal(req.postDataJSON().verified,true);state='approved';data={code};}
   else if(url.pathname.endsWith('/admin/learners'))data={learners:[]};
   else if(url.pathname.endsWith('/admin/classroom'))data={policy:{mode:'open',stage:null,message:'',surveyUrl:''},overrides:{},revision:1};
   await route.fulfill({status,json:data});
  });
  const child=await learner.newPage();child.on('pageerror',e=>errors.push(e.message));
  await child.goto('http://127.0.0.1:5173/login');
  await child.getByRole('button',{name:'Forgot password?'}).click();
  await child.getByRole('dialog').getByLabel('Email address',{exact:true}).fill('child@example.com');
  await child.getByRole('button',{name:'Request password reset',exact:true}).click();
  await child.getByText('Waiting for administrator',{exact:true}).waitFor();
  const staff=await admin.newPage();staff.on('pageerror',e=>errors.push(e.message));
  await staff.goto('http://127.0.0.1:5173/admin/learners');
  await staff.getByRole('button',{name:/Password requests/}).click();
  const requestHeader=await staff.getByRole('region',{name:'Password requests',exact:true}).locator('.admin-section-heading').boundingBox();
  const requestSearch=await staff.getByRole('textbox',{name:'Search password requests'}).boundingBox();
  assert.ok(requestSearch.y-(requestHeader.y+requestHeader.height)>=19,'Search must have spacing below the header');
  await staff.getByRole('button',{name:'Review request',exact:true}).click();
  assert.equal(await staff.getByRole('button',{name:'Issue reset code'}).isDisabled(),true);
  await staff.getByRole('checkbox').check();
  await staff.getByRole('button',{name:'Issue reset code'}).click();
  await staff.getByText(code,{exact:true}).waitFor();
  if(process.argv[3])await staff.screenshot({path:path.join(process.argv[3],'recovery-admin.png')});
  await child.getByLabel('One-time code',{exact:true}).waitFor({timeout:20000});
  await child.getByLabel('One-time code',{exact:true}).fill(code);
  await child.getByLabel('New password',{exact:true}).fill('new-password-123');
  await child.getByLabel('Confirm new password',{exact:true}).fill('not-the-same');
  await child.getByRole('button',{name:'Set new password'}).click();
  await child.getByRole('alert').filter({hasText:'do not match'}).waitFor();assert.equal(submitted,null);
  await child.getByLabel('Confirm new password',{exact:true}).fill('new-password-123');
  assert.equal(await child.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.argv[3])await child.screenshot({path:path.join(process.argv[3],'recovery-learner-mobile.png')});
  await child.getByRole('button',{name:'Set new password'}).click();
  await child.getByRole('button',{name:'Back to sign in'}).waitFor();
  assert.equal(submitted.code,code);assert.equal(submitted.secret,secret);
  assert.equal(await child.evaluate(()=>sessionStorage.getItem('readlr_pending_recovery')),null);
  assert.deepEqual(errors,[]);
  console.log('Forgot-password request, admin verification/code, mobile password confirmation, and completion passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
