const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const data=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {questions,choices,scale,SURVEY_VERSION} from './backend/src/modules/admin/survey.data.ts';console.log(JSON.stringify({questions,choices,scale,version:SURVEY_VERSION,submittedAt:null}))"],{encoding:'utf8'}));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  let assignment={enabled:false,overrides:{},revision:0};const submissions=[];const errors=[];
  for(const role of ['learner','admin']){
   const context=await browser.newContext({viewport:{width:1440,height:1000}});
   await context.addInitScript(()=>{localStorage.setItem('auth_token','mock-survey');});
   await context.route('**/api/**',async route=>{
    const req=route.request(),p=new URL(req.url()).pathname;let body={},status=200;
    if(p.endsWith('/auth/profile'))body={user:{id:7,email:'test@example.com',role,name:'Test'}};
    else if(p.endsWith('/learner/user/7'))body={id:15,name:'Test Student',avatar:''};
    else if(p.endsWith('/learner/me'))body={learner:{id:15}};
    else if(p.endsWith('/admin/classroom/me'))body={policy:{mode:'open',stage:null,message:'',surveyUrl:''},revision:0,surveyAssigned:true};
    else if(p.endsWith('/admin/classroom'))body={policy:{mode:'open',stage:null,message:'',surveyUrl:''},revision:0,overrides:{}};
    else if(p.endsWith('/admin/password-requests'))body={requests:[]};
    else if(p.endsWith('/admin/learners'))body={learners:[{id:7,email:'test@example.com',name:'Test Student',grade:1,avatar:'',progress:[],createdAt:new Date().toISOString()}]};
    else if(p.endsWith('/frames/me'))body={frames:[]};
    else if(p.endsWith('/progress/me/reset-state'))body={stages:[]};
    else if(p.endsWith('/admin/survey/me')){if(req.method()==='POST'){submissions.push(req.postDataJSON());body={success:true};}else body=data;}
    else if(p.endsWith('/admin/survey/assignments')){if(req.method()==='PUT'){const b=req.postDataJSON();if(b.target==='class')assignment.enabled=b.enabled;else assignment.overrides[b.target]=b.enabled;assignment.revision++;}body=assignment;}
    else if(p.endsWith('/admin/survey/responses'))body={...data,responses:[{user_id:7,name:'Test Student',section:'Sunflower',language:'ceb',submitted_at:new Date().toISOString(),answers:submissions[0].answers}]};
    else if(p.includes('/progress/'))body={progress:[],journeys:[]};
    await route.fulfill({status,json:body});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:5173/home');
   if(role==='learner'){
    await page.getByRole('button',{name:'Start Adventure'}).waitFor();
    await page.evaluate(()=>{history.pushState({},'','/survey');window.dispatchEvent(new PopStateEvent('popstate'));});
    await page.getByRole('heading',{name:'How was your adventure?'}).waitFor();
    if(process.argv[3])await page.screenshot({path:path.join(process.argv[3],'survey-welcome.png')});
    await page.getByRole('combobox',{name:'Survey language'}).click();
    await page.getByRole('option',{name:'Cebuano',exact:true}).click();
    await page.getByLabel('Imong seksyon').fill('Sunflower');
    await page.getByRole('button',{name:'Magsugod na ta'}).click();
    await page.getByRole('heading',{name:data.questions[0].ceb}).waitFor();
    if(process.argv[3])await page.screenshot({path:path.join(process.argv[3],'survey-desktop.png')});
    await page.setViewportSize({width:393,height:852});
    for(let i=0;i<14;i++){
     if(i===2){
      await page.evaluate(()=>{history.pushState({},'','/help');window.dispatchEvent(new PopStateEvent('popstate'));});
      await page.getByRole('heading',{name:'Help & guidance'}).waitFor();
      await page.evaluate(()=>{history.pushState({},'','/survey');window.dispatchEvent(new PopStateEvent('popstate'));});
     }
     await page.getByRole('heading',{name:data.questions[i].ceb,exact:true}).waitFor();
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     if(i===0&&process.argv[3])await page.screenshot({path:path.join(process.argv[3],'survey-mobile.png')});
     if(i===3)await page.getByRole('button',{name:'Laktawi',exact:true}).click();
     else{await page.getByRole('radio').nth(i<12?3:0).check();if(i===13&&process.argv[3])await page.screenshot({path:path.join(process.argv[3],'survey-choice-mobile.png')});await page.getByRole('button',{name:i===13?'Tan-awa':'Sunod',exact:true}).click();}
    }
    await page.getByRole('heading',{name:'Andam na sa pagpaambit?'}).waitFor();
    await page.getByRole('button',{name:'Ipadala akong mga tubag'}).click();
    await page.getByRole('heading',{name:'Salamat sa imong mga tubag!'}).waitFor();
    assert.equal(submissions.length,1);assert.equal(submissions[0].answers[3],null);assert.equal(submissions[0].language,'ceb');assert.equal(submissions[0].answers[13],'nothing');assert.equal(submissions[0].name,undefined);
   }else{
    await page.getByRole('button',{name:'Classroom controls',exact:true}).click();
    await page.getByRole('combobox',{name:'Access',exact:true}).click();
    await page.getByRole('option',{name:'Pause activities',exact:true}).click();
    await page.getByLabel('Message to learners (optional)',{exact:false}).fill('Unsaved access message');
    await page.getByRole('tab',{name:'Survey',exact:true}).click();
    assert.equal(await page.getByRole('tabpanel').count(),1);
    await page.getByRole('tab',{name:'Learning access',exact:true}).click();
    assert.equal(await page.getByLabel('Message to learners (optional)',{exact:false}).inputValue(),'Unsaved access message');
    await page.getByRole('tab',{name:'Learning access',exact:true}).focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('combobox',{name:'Survey access'}).waitFor();
    if(process.argv[3])await page.screenshot({path:path.join(process.argv[3],'classroom-survey-tab.png')});
    await page.getByRole('tab',{name:'Restart progress',exact:true}).click();
    await page.getByRole('checkbox',{name:'Stage 2',exact:true}).check();
    await page.getByRole('tab',{name:'Survey',exact:true}).click();
    await page.getByRole('tab',{name:'Restart progress',exact:true}).click();
    assert.equal(await page.getByRole('checkbox',{name:'Stage 2',exact:true}).isChecked(),true);
    await page.setViewportSize({width:393,height:852});
    await page.getByRole('tab',{name:'Restart progress',exact:true}).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(process.argv[3])await page.screenshot({path:path.join(process.argv[3],'classroom-tabs-mobile.png')});
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('tab',{name:'Survey',exact:true}).click();
    await page.getByRole('combobox',{name:'Survey access'}).click();
    await page.getByRole('option',{name:'Show survey in learner navigation'}).click();
    await page.getByRole('button',{name:'Save survey access'}).click();
    await page.getByText('Survey assignment saved.',{exact:false}).waitFor();assert.equal(assignment.enabled,true);
    await page.getByRole('button',{name:'Student feedback',exact:true}).click();
    const refreshBox=await page.getByRole('button',{name:'Refresh responses',exact:true}).boundingBox();
    const exportBox=await page.getByRole('button',{name:'Export Excel',exact:true}).boundingBox();
    assert.ok(Math.abs(refreshBox.y-exportBox.y)<1&&Math.abs(refreshBox.height-exportBox.height)<1,'Export toolbar buttons must align');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Admin survey must fit the viewport');
    await page.getByRole('button',{name:'View answers for Test Student'}).click();
    await page.getByText('Test Student - Sunflower',{exact:true}).waitFor();
    if(process.argv[3])await page.screenshot({path:path.join(process.argv[3],'survey-admin.png')});
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Survey desktop/mobile, Cebuano, skips, choice questions, submission, admin assignment and response detail passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
