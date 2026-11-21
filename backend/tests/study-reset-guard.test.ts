import test from 'node:test';
import assert from 'node:assert/strict';

// No live database is contacted: Supabase table reads and RPCs are stubbed.
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'study-guard-test-key';
process.env.JWT_SECRET = 'study-guard-test-jwt-secret-0123456789';
const { supabase } = await import('../src/database/db.js');
const { resetProgress } = await import('../src/modules/progress/reset.controller.js');
const { resetSurvey } = await import('../src/modules/admin/survey.controller.js');

const response = () => ({ statusCode: 200, body: undefined as any,
  status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } });

// Study learners are users 11 and 12; the class also has learners 13 and 14.
async function withDb(study: number[], learners: number[], run: (calls: any[]) => Promise<void>) {
  const from = supabase.from, rpc = supabase.rpc, calls: any[] = [];
  supabase.from = ((table: string) => {
    const rows = table === 'readlr_study_sessions' ? study.map(user_id => ({ user_id })) : learners.map(id => ({ id }));
    const query: any = { select: () => query, eq: () => query, order: () => query, then: (done: any) => done({ data: rows, error: null }) };
    return query;
  }) as any;
  supabase.rpc = (async (name: string, args: any) => { calls.push({ name, args }); return { data: 1, error: null }; }) as any;
  try { await run(calls); } finally { supabase.from = from; supabase.rpc = rpc; }
}

const bodies = [
  { scope: 'book', chapter: 'gate' },
  { scope: 'challenge', chapter: 'gate', stop: 'check' },
  { scope: 'learning-progress' },
  { stages: [3] },
];

test('progress and survey resets refuse a study learner without calling the database reset', async () => {
  await withDb([11, 12], [11, 12, 13, 14], async calls => {
    for (const body of bodies) {
      const res = response();
      await resetProgress({ userId: 7, body: { ...body, target: 11, confirmation: 'RESET' } } as any, res as any);
      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /in the Readlr study/);
    }
    const res = response();
    await resetSurvey({ userId: 7, body: { target: 12, confirmation: 'RESET' } } as any, res as any);
    assert.equal(res.statusCode, 409);
    assert.equal(calls.length, 0);
  });
});

test('a learner outside the study is reset as before', async () => {
  await withDb([11, 12], [11, 12, 13, 14], async calls => {
    const res = response();
    await resetProgress({ userId: 7, body: { scope: 'book', chapter: 'gate', target: 13, confirmation: 'RESET' } } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls, [{ name: 'reset_reading_progress_granular', args: { p_actor: 7, p_target: 13, p_scope: 'book', p_chapter: 'gate', p_stop: null } }]);
    assert.doesNotMatch(res.body.message, /skipped/);
  });
});

test('class resets skip study learners and reset everyone else one by one', async () => {
  await withDb([11, 12], [11, 12, 13, 14], async calls => {
    const res = response();
    await resetProgress({ userId: 7, body: { scope: 'learning-progress', target: 'class', confirmation: 'RESET' } } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.affected, 2);
    assert.deepEqual(calls.map(c => c.args.p_target), [13, 14]);
    assert.match(res.body.message, /Study learners were skipped\.$/);
    calls.length = 0;
    const survey = response();
    await resetSurvey({ userId: 7, body: { target: 'class', confirmation: 'RESET' } } as any, survey as any);
    assert.equal(survey.statusCode, 200);
    assert.deepEqual(calls.map(c => c.args), [{ p_actor: 7, p_target: 13 }, { p_actor: 7, p_target: 14 }]);
    assert.match(survey.body.message, /^Reset 2 submitted survey responses\. Study learners were skipped\.$/);
  });
});

test('a class made only of study learners is not reset', async () => {
  await withDb([11, 12], [11, 12], async calls => {
    const res = response();
    await resetProgress({ userId: 7, body: { stages: [1], target: 'class', confirmation: 'RESET' } } as any, res as any);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /Every learner in this class is in the Readlr study/);
    const survey = response();
    await resetSurvey({ userId: 7, body: { target: 'class', confirmation: 'RESET' } } as any, survey as any);
    assert.equal(survey.statusCode, 409);
    assert.equal(calls.length, 0);
  });
});

test('a class with no study learners still uses one whole-class reset', async () => {
  await withDb([], [13, 14], async calls => {
    const res = response();
    await resetProgress({ userId: 7, body: { stages: [1], target: 'class', confirmation: 'RESET' } } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls.map(c => c.args.p_target), [null]);
    assert.doesNotMatch(res.body.message, /skipped/);
  });
});

test('if the study list cannot be read, nothing is reset', async () => {
  const from = supabase.from, rpc = supabase.rpc;
  let called = false;
  const failing: any = { select: () => failing, then: (done: any) => done({ data: null, error: { message: 'Offline' } }) };
  supabase.from = (() => failing) as any;
  supabase.rpc = (async () => { called = true; return { data: 1, error: null }; }) as any;
  try {
    const res = response();
    await resetProgress({ userId: 7, body: { stages: [1], target: 13, confirmation: 'RESET' } } as any, res as any);
    assert.equal(res.statusCode, 503);
    const survey = response();
    await resetSurvey({ userId: 7, body: { target: 13, confirmation: 'RESET' } } as any, survey as any);
    assert.equal(survey.statusCode, 503);
    assert.equal(called, false);
  } finally { supabase.from = from; supabase.rpc = rpc; }
});
