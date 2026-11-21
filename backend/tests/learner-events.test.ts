import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'node:net';

// No live database is contacted: every query below is answered by a stub.
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
process.env.JWT_SECRET = 'learner-events-test-secret-0123456789';
const { supabase } = await import('../src/database/db.js');
const { default: learnerRoutes } = await import('../src/modules/learner/learner.route.js');
const { AuthController } = await import('../src/modules/auth/auth.controller.js');
const { learnerEventLimit } = await import('../src/modules/learner/learner.events.js');

const roles: Record<number, string> = { 7: 'learner', 9: 'admin' };
const events: any[] = [];
let failInsert = false;
const original = supabase.from;
supabase.from = ((table: string) => {
  const filters: Record<string, number> = {};
  const query: any = {
    select: () => query,
    eq: (key: string, value: number) => { filters[key] = value; return query; },
    insert: async (row: unknown) => {
      if (failInsert) return { data: null, error: { message: 'insert failed' } };
      events.push({ table, ...(row as object) });
      return { data: null, error: null };
    },
    maybeSingle: async () => ({ error: null, data: table === 'users' ? { auth_version: 0, role: roles[filters.id] } : null }),
  };
  return query;
}) as any;

const app = express();
app.use(express.json());
app.use('/api/learner', learnerRoutes);
const server = app.listen(0);
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/learner/me/events`;
const auth = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ id, role: roles[id], authVersion: 0 }, process.env.JWT_SECRET!)}`, 'Content-Type': 'application/json' });
const post = (body: unknown, headers: Record<string, string> = auth(7)) => fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
test.after(() => { server.close(); supabase.from = original; });
test.beforeEach(() => { events.length = 0; failInsert = false; learnerEventLimit.clear('7'); });

const response = () => ({ statusCode: 200, body: null as any, status(n: number) { this.statusCode = n; return this; }, json(d: any) { this.body = d; return this; } });
const controller = (role: string) => new AuthController({
  login: async () => ({ id: 7, email: 'kid@example.com', role, name: 'Kid', authVersion: 0 }),
  generateToken: () => 'token',
} as any);

test('a learner login writes exactly one login row with only the user id', async () => {
  const res = response();
  await controller('learner').login({ body: { email: 'kid@example.com', password: 'secret' } } as any, res as any);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(events, [{ table: 'learner_events', user_id: 7, event_type: 'login', detail: null }]);
  assert.doesNotMatch(JSON.stringify(events), /kid@example\.com|secret/);
});

test('staff logins are not stored', async () => {
  await controller('admin').login({ body: { email: 'a@example.com', password: 'secret' } } as any, response() as any);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(events.length, 0);
});

test('a failed event insert does not fail login', async () => {
  failInsert = true;
  const res = response();
  await controller('learner').login({ body: { email: 'kid@example.com', password: 'secret' } } as any, res as any);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, 'token');
});

test('the endpoint stores app_open and resume for the JWT user only', async () => {
  assert.equal((await post({ event_type: 'app_open', user_id: 99 })).status, 204);
  assert.equal((await post({ event_type: 'resume', detail: { stage: 3, completed: 4 } })).status, 204);
  assert.deepEqual(events.map(e => [e.user_id, e.event_type, e.detail]), [[7, 'app_open', null], [7, 'resume', { stage: 3, completed: 4 }]]);
});

test('the endpoint rejects other event types and bad details', async () => {
  for (const body of [{ event_type: 'login' }, { event_type: 'click' }, {}, { event_type: 'app_open', detail: { stage: 2 } },
    { event_type: 'resume' }, { event_type: 'resume', detail: { stage: 1, completed: 2 } }, { event_type: 'resume', detail: { stage: 2, completed: 21 } },
    { event_type: 'resume', detail: { stage: 2, completed: 3, name: 'Kid' } }]) {
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
  }
  assert.equal(events.length, 0);
});

test('the endpoint rejects unauthenticated and non-learner calls', async () => {
  assert.equal((await post({ event_type: 'app_open' }, { 'Content-Type': 'application/json' })).status, 401);
  assert.equal((await post({ event_type: 'app_open' }, auth(9))).status, 403);
  assert.equal(events.length, 0);
});

test('the endpoint is rate-limited per learner', async () => {
  for (let i = 0; i < 30; i++) assert.equal((await post({ event_type: 'app_open' })).status, 204);
  assert.equal((await post({ event_type: 'app_open' })).status, 429);
  assert.equal(events.length, 30);
});

test('a failed insert on the endpoint still answers without an error', async () => {
  failInsert = true;
  assert.equal((await post({ event_type: 'app_open' })).status, 204);
});
