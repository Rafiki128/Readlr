import { strict as assert } from "node:assert";
import { test } from "node:test";
import { sendAppOpenOnce, sendLearnerEvent } from "../src/app/hooks/learnerEvents.ts";

const memoryStorage = () => { const items = new Map<string, string>(); return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v); } }; };
const recorder = () => { const calls: Array<{ url: string; body: unknown }> = []; return { calls, send: async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); } }; };

test("app_open is sent once per browser session, however often the app re-renders or polls", () => {
  const storage = memoryStorage(), { calls, send } = recorder();
  assert.equal(sendAppOpenOnce("t", 7, storage, send), true);
  for (let i = 0; i < 5; i++) assert.equal(sendAppOpenOnce("t", 7, storage, send), false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/learner\/me\/events$/);
  assert.deepEqual(calls[0].body, { event_type: "app_open" });
});

test("a new session or a different learner sends app_open again", () => {
  const { calls, send } = recorder();
  const storage = memoryStorage();
  sendAppOpenOnce("t", 7, storage, send);
  sendAppOpenOnce("t", 8, storage, send);
  sendAppOpenOnce("t", 7, memoryStorage(), send);
  assert.equal(calls.length, 3);
});

test("offline or blocked storage never throws", async () => {
  const offline = async () => { throw new TypeError("Failed to fetch"); };
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.doesNotThrow(() => sendAppOpenOnce("t", 7, blocked, offline));
  assert.doesNotThrow(() => sendLearnerEvent("t", "resume", { stage: 3, completed: 4 }, () => { throw new Error("sync failure"); }));
  await new Promise(resolve => setImmediate(resolve));
});

test("resume sends the restored stage and stop count", () => {
  const { calls, send } = recorder();
  sendLearnerEvent("t", "resume", { stage: 2, completed: 7 }, send);
  assert.deepEqual(calls[0].body, { event_type: "resume", detail: { stage: 2, completed: 7 } });
});
