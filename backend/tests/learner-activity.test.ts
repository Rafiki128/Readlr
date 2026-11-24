import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { parseLearnerActivity } = await import('../src/modules/learner/learner.activity.js');

const now = Date.parse('2026-11-24T01:00:00Z');
const event = {
  id: 'dd9f46d3-207f-4305-b4e8-4eaff9bbaa34',
  kind: 'stop-start', book: 'gate', stop: 'word-build', occurred_at: '2026-11-24T00:59:00Z',
};

test('general activity keeps opaque attempt IDs, not identity, raw task descriptors or audio', () => {
  assert.deepEqual(parseLearnerActivity({ ...event, user_id: 50, task: 'study-attempt', audio: 'ignored' }, now),
    { ...event, task: '', occurred_at: '2026-11-24T00:59:00.000Z' });
  assert.equal(parseLearnerActivity({...event,task:event.id},now)?.task,event.id);
  assert.ok(parseLearnerActivity({ ...event, kind: 'screen-view', book: '', stop: 'learning-camp' }, now));
});

test('general activity rejects invalid kinds, book identifiers and timestamps', () => {
  for (const patch of [
    { kind: 'recording' }, { book: 'not-a-book' }, { stop: 'free text' },
    { kind: 'screen-view' }, { occurred_at: '2026-01-01' }, { occurred_at: '2026-11-25' },
  ]) assert.equal(parseLearnerActivity({ ...event, ...patch }, now), null);
});
