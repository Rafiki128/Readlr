import test from 'node:test';
import assert from 'node:assert/strict';
import {pathway,type PathEvent} from '../src/modules/study/pathway.js';
const event=(kind:string,book='crown',stop='check',task='x'):PathEvent=>({kind,book,stop,task,occurred_at:'2026-11-23T16:05:00Z'});
test('free exploration counts every book, deduplicates repeat visits, and uses starters for completion',()=>{
  const p=pathway([event('screen-view','','stickers'),event('book-start'),event('book-start'),event('book-complete'),event('book-start','tower'),event('stop-start'),event('stop-start'),event('stop-complete')]);
  assert.deepEqual(p.rates['Books explored (of 10)'],{n:2,d:10,value:20});
  assert.deepEqual(p.rates['Opened books completed'],{n:1,d:2,value:50});
  assert.deepEqual(p.rates['Opened stops completed'],{n:1,d:1,value:100});
  assert.equal(p.resumed,false);
});
test('support counts unique attempted tasks, retries are a count ratio, and zero denominators are unavailable',()=>{
  const p=pathway([event('resume'),event('task-start'),event('retry'),event('retry'),event('hint'),event('incident'),event('skip')]);
  assert.equal(p.resumed,true);assert.equal(p.rates['Tasks using support'].value,100);assert.equal(p.rates['Retries per task'].value,2);
  assert.equal(pathway([]).rates['Tasks skipped'].value,null);
});
