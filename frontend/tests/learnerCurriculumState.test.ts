import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculumUnlocks, emptyLearnerCurriculumState, hasBookOneOverride, mergeLearnerCurriculumState, normalizeGuidedStops, readLearnerCurriculumState } from '../src/hooks/learnerCurriculumState.ts';

test('account state merges learning monotonically across devices',()=>{
  const old={...emptyLearnerCurriculumState(),campOrientationStep:3,guidedStops:['gate:mango'],guidedActivities:{'gate:mango':true},guidedRounds:{gate:{step:3,spoken:['am']}},carouselFocus:4,updatedAt:'2026-10-18T01:00:00.000Z'};
  const stale={...emptyLearnerCurriculumState(),campOrientationStep:1,guidedStops:['gate:apple'],guidedActivities:{'gate:apple':true},guidedRounds:{gate:{step:1,spoken:['mat']}},carouselFocus:1,updatedAt:'2026-10-18T00:00:00.000Z'};
  const merged=mergeLearnerCurriculumState(old,stale);
  assert.equal(merged.campOrientationStep,3);
  assert.deepEqual(new Set(merged.guidedStops),new Set(['gate:mango','gate:apple']));
  assert.deepEqual(merged.guidedActivities,{'gate:mango':true,'gate:apple':true});
  assert.equal(merged.guidedRounds.gate.step,3);
  assert.deepEqual(new Set(merged.guidedRounds.gate.spoken),new Set(['am','mat']));
  assert.equal(merged.carouselFocus,4);
});

test('features unlock at the requested curriculum milestones',()=>{
  const initial=emptyLearnerCurriculumState();
  assert.deepEqual(curriculumUnlocks(initial,[]),{camp:false,bookOne:false,stickers:false,sounds:false,progress:false,achievements:false});
  const oriented={...initial,campOrientationStep:3};
  assert.equal(curriculumUnlocks(oriented,[]).bookOne,true);
  const firstThree={...oriented,guidedStops:['gate:mango','gate:apple','gate:top']};
  assert.equal(curriculumUnlocks(firstThree,[]).stickers,true);
  assert.equal(curriculumUnlocks(firstThree,[]).sounds,true);
  assert.equal(curriculumUnlocks(firstThree,['gate']).progress,true);
  assert.equal(curriculumUnlocks(firstThree,['gate']).achievements,true);
});

test('explicit Book 1 grants open Progress and Awards without recording a completion',()=>{
  const initial=emptyLearnerCurriculumState();
  const completed:string[]=[];
  for(const policy of [{readingUnlockThrough:1},{readingOpenChallenges:[1]}]){
    assert.deepEqual(curriculumUnlocks(initial,completed,hasBookOneOverride(policy)),
      {camp:false,bookOne:true,stickers:false,sounds:false,progress:true,achievements:true});
    assert.deepEqual(completed,[]);
  }
  const laterBookOnly=hasBookOneOverride({readingOpenChallenges:[2]});
  assert.equal(curriculumUnlocks(initial,completed,laterBookOnly).progress,false);
  assert.equal(curriculumUnlocks(initial,completed,laterBookOnly).achievements,false);
});

test('legacy Book 1 stop names and the issued reward marker recover current unlocks',()=>{
  assert.deepEqual(normalizeGuidedStops(['gate:m','short:a','gate:t']),['gate:mango','gate:apple','gate:top']);
  const values=new Map<string,string>([['readlr_first_reward_v1_17','seen']]);
  const previous=globalThis.localStorage;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
  try {
    const recovered=readLearnerCurriculumState(17);
    assert.equal(curriculumUnlocks(recovered,[]).stickers,true);
    assert.equal(curriculumUnlocks(recovered,[]).sounds,true);
  } finally {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});
  }
});
