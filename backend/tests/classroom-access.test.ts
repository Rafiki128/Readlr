import test from 'node:test';
import assert from 'node:assert/strict';

// No live database is contacted: these modules use an isolated test client.
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'classroom-test-key';
process.env.JWT_SECRET = 'classroom-test-jwt-secret';
const { supabase } = await import('../src/database/db.js');
const { requireRole } = await import('../src/middleware/auth.js');
const { enforceClassroom, saveClassroom, heartbeat } = await import('../src/modules/admin/classroom.controller.js');
const { handleSyncMyValley } = await import('../src/modules/progress/progress.controller.js');
const open = { mode: 'open', stage: null, message: '', surveyUrl: '' };

function response() {
  return { statusCode: 200, body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; } };
}
function mockQueries(role: string, policy = open, overrides = {}, unavailable = false) {
  const original = supabase.from;
  supabase.from = (() => {
    const query: any = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: { role }, error: unavailable ? { message: 'Offline' } : null }),
      single: async () => ({ data: { policy, overrides, revision: 1 }, error: unavailable ? { message: 'Offline' } : null }) };
    return query;
  }) as typeof supabase.from;
  return () => { supabase.from = original; };
}

test('admin-only access rechecks the stored role, including a revoked admin token', async () => {
  for (const role of ['learner', 'teacher', 'admin']) {
    const restore = mockQueries(role);
    try {
      const req = { userId: 7, userRole: 'admin' };
      const res = response(); let called = false;
      await requireRole('admin')(req as any, res as any, () => { called = true; });
      assert.equal(called, role === 'admin');
      if (role !== 'admin') assert.equal(res.statusCode, 403);
    } finally { restore(); }
  }
});

test('stage restrictions honor individual overrides and fail closed during database outages', async () => {
  const cases = [
    { policy: { ...open, mode: 'stage', stage: 2 }, stage: 1, allowed: false },
    { policy: { ...open, mode: 'stage', stage: 2 }, stage: 2, allowed: true },
    { policy: { ...open, mode: 'paused' }, stage: 3, allowed: false },
    { policy: { ...open, mode: 'survey' }, stage: 3, allowed: false },
    { policy: { ...open, mode: 'paused' }, overrides: { '7': { ...open, mode: 'stage', stage: 3 } }, stage: 3, allowed: true },
    { policy: open, stage: 1, allowed: false, unavailable: true },
  ];
  for (const value of cases) {
    const restore = mockQueries('learner', value.policy, value.overrides, value.unavailable);
    try {
      const res = response(); let called = false;
      await enforceClassroom(async () => value.stage)({ userId: 7 } as any, res as any, () => { called = true; });
      assert.equal(called, value.allowed);
      if (!value.allowed) assert.equal(res.statusCode, value.unavailable ? 503 : 403);
      if (!value.allowed && !value.unavailable) assert.equal(res.body.code, 'classroom_restricted');
    } finally { restore(); }
  }
});

test('stale revisions are rejected and clearing a student override sends null to the atomic RPC', async () => {
  const restore = mockQueries('admin');
  const originalRpc = supabase.rpc;
  let input: any;
  supabase.rpc = (async (_name: string, args: unknown) => { input = args; return { data: false, error: null }; }) as any;
  try {
    const res = response();
    await saveClassroom({ userId: 7, body: { target: 11, revision: 0, policy: null } } as any, res as any);
    assert.equal(res.statusCode, 409);
    assert.equal(input.p_actor, 7);
    assert.equal(input.p_target, 11);
    assert.equal(input.p_policy, null);
    const invalid = response();
    await saveClassroom({ userId: 7, body: { target: 'class', revision: 1, policy: null } } as any, invalid as any);
    assert.equal(invalid.statusCode, 400);
  } finally { supabase.rpc = originalRpc; restore(); }
});

test('presence rejects invalid levels and screen names without writing data', async () => {
  for (const body of [{ stage: 2, level: 21, screen: 'bridge-challenge' }, { stage: 4, level: 1, screen: 'game' }, { stage: 1, level: 1, screen: '<script>' }]) {
    const res = response();
    await heartbeat({ userId: 7, body } as any, res as any);
    assert.equal(res.statusCode, 400);
  }
});

test('Valley backfill resolves the stage number and saves only the authenticated learner', async () => {
  const original = supabase.from;
  const filters: Array<[string,string,unknown]> = [];
  let progress: any = null;
  supabase.from = ((table: string) => {
    const query: any = {
      select: () => query, order: () => query,
      eq: (key: string, value: unknown) => { filters.push([table,key,value]); return query; },
      maybeSingle: async () => ({ data: table === 'learner_profiles' ? { id: 15, user_id: 7 } : table === 'stages' ? { id: 101, stage_number: 1 } : progress, error: null }),
      insert: (value: unknown) => { progress = { id: 90, completed_levels: 0, ...(value as object) }; return query; },
      single: async () => ({ data: progress, error: null }),
      update: (value: unknown) => { progress = { ...progress, ...(value as object) }; return query; },
      then: (resolve: (value: unknown) => void) => resolve({ data: table === 'frames' ? [] : null, error: null }),
    };
    return query;
  }) as typeof supabase.from;
  try {
    const req = { userId: 7, params: { stage: '1' }, body: { completed_levels: 20, total_levels: 20, learner_id: 999 } };
    const res = response();
    await handleSyncMyValley(req as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.equal(progress.learner_id, 15);
    assert.equal(progress.stage_id, 101);
    assert.equal(res.body.completed_levels, 20);
    assert.ok(filters.some(([table,key,value]) => table === 'stages' && key === 'stage_number' && value === 1));
    const invalid = response();
    await handleSyncMyValley({ ...req, body: { completed_levels: 21, total_levels: 20 } } as any, invalid as any);
    assert.equal(invalid.statusCode, 400);
  } finally { supabase.from = original; }
});
