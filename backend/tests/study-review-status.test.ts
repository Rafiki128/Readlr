import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewStatus } from '../src/modules/study/review-status.js';

test('review confirmation requires the submitted work to be checked',()=>{
  const done={skipped:false,teacher_score:'correct'};
  const skipped={skipped:true,teacher_score:null};
  const check={checkedAt:'2026-11-25T03:00:00Z'};
  assert.equal(reviewStatus(3,[done,skipped],[{skipped:false,scored_at:null}],false,check).checked,false);
  assert.equal(reviewStatus(3,[done,skipped],[{skipped:false,scored_at:check.checkedAt}],false,check).checked,true);
  assert.equal(reviewStatus(2,[done,skipped],[],false,{initials:'SM'}).checked,false);
});

test('staff-ended pre-tests retain an incomplete label and empty tests cannot be checked',()=>{
  const item={skipped:false,teacher_score:'unclear'};
  const checked={checkedAt:'2026-11-25T03:00:00Z'};
  assert.equal(reviewStatus(2,[item],[],false,checked).ready,false);
  assert.deepEqual(reviewStatus(2,[item],[],true,checked),{submitted:1,pending:0,incomplete:true,ready:true,checked:true});
  assert.equal(reviewStatus(2,[],[],true,checked).checked,false);
});
