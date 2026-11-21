import { strict as assert } from "node:assert";
import { test } from "node:test";
import { manilaDate, sendAppOpenOnce, sendLearnerEvent } from "../src/app/hooks/learnerEvents.ts";

const memoryStorage = () => { const items = new Map<string, string>(); return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v); } }; };
const recorder = () => { const calls: Array<{ url: string; body: unknown }> = []; return { calls, send: async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); } }; };

// 15:59 UTC is 23:59 in Manila (UTC+8); 16:01 UTC is 00:01 the next Manila day.
const lateOn24th = new Date("2026-11-24T15:59:00Z"), earlyOn25th = new Date("2026-11-24T16:01:00Z");

test("Manila dates roll over at midnight Manila time, not UTC", () => {
  assert.equal(manilaDate(lateOn24th), "2026-11-24");
  assert.equal(manilaDate(earlyOn25th), "2026-11-25");
  assert.equal(manilaDate(new Date("2026-11-25T00:30:00Z")), "2026-11-25");
});

test("a tab left open overnight sends app_open again on the next Manila day, once", () => {
  const storage = memoryStorage(), { calls, send } = recorder();
  assert.equal(sendAppOpenOnce("t", 7, storage, send, lateOn24th), true);
  assert.equal(sendAppOpenOnce("t", 7, storage, send, new Date("2026-11-24T15:59:50Z")), false);
  assert.equal(sendAppOpenOnce("t", 7, storage, send, earlyOn25th), true);
  for (let i = 0; i < 5; i++) assert.equal(sendAppOpenOnce("t", 7, storage, send, new Date("2026-11-25T03:00:00Z")), false);
  assert.equal(calls.length, 2);
  assert.equal(storage.getItem("readlr_app_open_7"), "2026-11-25");
});

test("a session marked by the older once-per-session version sends one app_open for today", () => {
  const storage = memoryStorage(), { calls, send } = recorder();
  storage.setItem("readlr_app_open_7", "1");
  assert.equal(sendAppOpenOnce("t", 7, storage, send, earlyOn25th), true);
  assert.equal(sendAppOpenOnce("t", 7, storage, send, earlyOn25th), false);
  assert.equal(calls.length, 1);
});

test("blocked session storage still sends at most once per Manila day", () => {
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  const { calls, send } = recorder();
  assert.equal(sendAppOpenOnce("t", 9, blocked, send, lateOn24th), true);
  assert.equal(sendAppOpenOnce("t", 9, blocked, send, lateOn24th), false);
  assert.equal(sendAppOpenOnce("t", 9, blocked, send, earlyOn25th), true);
  assert.equal(calls.length, 2);
});

test("app_open is sent once per browser session per day, however often the app re-renders, polls or regains focus", () => {
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
