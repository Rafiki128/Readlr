import test from 'node:test';
import assert from 'node:assert/strict';
import { incompletePretest } from '../src/modules/study/pretest-end.js';
import type { StudySession } from '../src/modules/study/study.service.js';

const session: StudySession = {
  user_id: 1, participant_code: 'P1', study_group: 'A', phase: 'learning', learning_minutes: null,
  pretest_order: ['sit', 'pin'], posttest_order: ['sit', 'pin'],
  pretest_blend_order: ['gap'], posttest_blend_order: ['gap'],
  pretest_fluency_order: ['mat'], learning_started_at: null, posttest_started_at: null,
  finished_at: null, created_at: '', updated_at: '', pretest_ended_early_at: '2026-11-24T00:00:00Z',
};

test('manual closure marks only unsubmitted pre-test tasks incomplete', () => {
  assert.deepEqual(incompletePretest(session, [
    { user_id: 1, phase: 'pretest', item_type: 'word', word: 'sit' },
    { user_id: 1, phase: 'posttest', item_type: 'word', word: 'pin' },
    { user_id: 2, phase: 'pretest', item_type: 'blend', word: 'gap' },
  ], [{ user_id: 1, phase: 'posttest' }]), [
    { type: 'word', word: 'pin', position: 1 },
    { type: 'blend', word: 'gap', position: 2 },
    { type: 'fluency', word: '', position: 3 },
  ]);
});

test('submitted timed tasks, legacy missing sections, and regular sessions are not labeled incomplete', () => {
  const older = { ...session, pretest_order: [], pretest_blend_order: null };
  assert.deepEqual(incompletePretest(older, [], [{ user_id: 1, phase: 'pretest' }]), []);
  assert.deepEqual(incompletePretest({ ...older, pretest_fluency_order: null }, [], []), []);
  assert.deepEqual(incompletePretest({ ...session, pretest_ended_early_at: null }, [], []), []);
});
