import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyAssessment, createPracticeTracker, isSelfCorrection, parsePractice, summarizePractice, weekStart, type PracticeAttempt } from "../src/hooks/practiceRecords.ts";
const record = (overrides: Partial<PracticeAttempt> = {}): PracticeAttempt => ({id:"one",studentId:1,sessionId:"visit",wordId:"ma",stageId:2,target:"ma",timestamp:1000,attemptNumber:1,totalDurationMs:4000,outcome:"voice_detected",correctiveFeedbackTriggered:false,accuracy:null,asrConfidence:null,tier:null,selfCorrected:null,assessmentSource:"not_assessed",...overrides});
test("guided attempts never manufacture accuracy, fluency or stars",()=>{
  const stats=summarizePractice([record(),record({id:"two",outcome:"silence"})]);
  assert.equal(stats.attempts,2);assert.equal(stats.accuracy,null);assert.equal(stats.stars,null);assert.equal(stats.assessed,0);assert.equal(stats.sessions,1);
});
test("storage rejects malformed, cross-learner and falsely assessed data",()=>{
  assert.deepEqual(parsePractice("broken",1),[]);
  assert.deepEqual(parsePractice(JSON.stringify([record({studentId:2}),record({accuracy:.9}),record({totalDurationMs:-1})]),1),[]);
  assert.equal(parsePractice(JSON.stringify([record(),record()]),1).length,1);
});
test("SRS fluency boundaries use 1.4 and 2 times expected duration",()=>{
  assert.equal(classifyAssessment(.69,500),"Syllabic");
  assert.equal(classifyAssessment(.7,840),"Fluent");
  assert.equal(classifyAssessment(.9,841),"Halting");
  assert.equal(classifyAssessment(.9,1200),"Halting");
  assert.equal(classifyAssessment(.9,1201),"Syllabic");
  assert.equal(classifyAssessment(NaN,500),null);assert.equal(classifyAssessment(.8,0),null);
});
test("self correction requires consecutive assessed attempts without corrective feedback",()=>{
  const first=record({assessmentSource:"validated_assessment",accuracy:.5,tier:"Syllabic",selfCorrected:false});
  const next=record({assessmentSource:"validated_assessment",accuracy:.9,tier:"Fluent",selfCorrected:false,attemptNumber:2});
  assert.equal(isSelfCorrection(first,next),true);
  assert.equal(isSelfCorrection({...first,correctiveFeedbackTriggered:true},next),false);
  assert.equal(isSelfCorrection(record(),next),false);
  assert.equal(isSelfCorrection(first,{...next,sessionId:"other"}),false);
  assert.equal(isSelfCorrection(first,{...next,studentId:2}),false);
});
test("summary counts every assessed attempt and excludes unassessed from denominator",()=>{
  const stats=summarizePractice([record(),record({id:"two",assessmentSource:"validated_assessment",accuracy:.6,tier:"Syllabic",selfCorrected:false}),record({id:"three",assessmentSource:"validated_assessment",accuracy:.8,tier:"Fluent",selfCorrected:true})]);
  assert.equal(stats.accuracy,.7);assert.equal(stats.stars,1);assert.equal(stats.assessed,2);assert.equal(stats.tiers[2].count,1);
});
test("weekly summaries start on local Monday including across year boundaries",()=>{
  const monday=new Date(2025,11,29).getTime();
  assert.equal(weekStart(new Date(2026,0,4,23,59).getTime()),monday);
  assert.equal(weekStart(new Date(2026,0,5).getTime(),-1),monday);
});
test("all stages preserve ordered retries, interrupted attempts and capture-only duration",()=>{
  for(const stage of [1,2,3]) {
    const writes:PracticeAttempt[]=[];
    let clock=1000;
    const tracker=createPracticeTracker(11,stage,"lesson-1","a",r=>writes.push(r),()=>clock);
    tracker.finish("error");assert.equal(writes.length,0);
    tracker.begin();tracker.begin();assert.equal(writes.length,1);
    assert.equal(writes[0].outcome,"interrupted");
    clock+=3000;tracker.finish("silence");tracker.finish("error");
    assert.equal(writes.length,2);assert.equal(writes[1].totalDurationMs,3000);
    clock+=5000;tracker.begin();clock+=4000;tracker.finish("voice_detected");
    assert.equal(writes[3].attemptNumber,2);assert.equal(writes[3].totalDurationMs,4000);
    assert.equal(writes[3].studentId,11);assert.equal(writes[3].stageId,stage);assert.equal(writes[3].accuracy,null);
    assert.equal(writes[3].sessionId,writes[0].sessionId);
  }
});
test("guest recordings never create persistent attempt records",()=>{
  const writes:PracticeAttempt[]=[];
  const tracker=createPracticeTracker(null,1,"lesson-1","a",r=>writes.push(r));tracker.begin();tracker.finish("recorded");assert.equal(writes.length,0);
});

test("only valid assessment evidence survives storage parsing",()=>{
  const assessed=record({assessmentSource:"validated_assessment",accuracy:.8,asrConfidence:.8,tier:"Fluent",selfCorrected:false,totalDurationMs:500});
  assert.deepEqual(parsePractice(JSON.stringify([assessed]),1),[assessed]);
  assert.deepEqual(parsePractice(JSON.stringify([{...assessed,asrConfidence:null},{...assessed,asrConfidence:2},{...assessed,totalDurationMs:0},record({asrConfidence:.8})]),1),[]);
  assert.equal(classifyAssessment(.8,500,600,{accuracy:.7,halting:2,syllabic:1}),null);
});

test("stage and sound changes cannot earn a self-correction star",()=>{
  const first=record({assessmentSource:"validated_assessment",accuracy:.5,tier:"Syllabic",selfCorrected:false});
  const next={...first,attemptNumber:2,accuracy:.9};
  assert.equal(isSelfCorrection(first,{...next,stageId:3}),false);
  assert.equal(isSelfCorrection(first,{...next,target:"mi"}),false);
});

test("all journey recording screens receive the learner and start capture tracking",()=>{
  const source=(path:string)=>readFileSync(new URL(`../src/${path}`,import.meta.url),"utf8");
  for(const file of ["GameLevel","BridgePractice","CvcChallenge"]) {
    assert.match(source(`app/components/${file}.tsx`),/usePracticeSession\(learnerId,/);
  }
  assert.match(source("app/components/BlendingWorkshop.tsx"),/<BridgePractice[^>]*learnerId=\{learnerId\}/);
  assert.match(source("app/components/CvcKingdom.tsx"),/<CvcChallenge[^>]*learnerId=\{learnerId\}/);
  assert.match(source("app/App.tsx"),/<GameLevel\s+learnerId=\{learnerId\}/);
  assert.match(source("app/App.tsx"),/<UnifiedDashboard\s+learnerId=\{learnerId\}/);
});
