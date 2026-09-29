import test from "node:test";
import assert from "node:assert/strict";
import { explanationSeen, finishIntroduction, hasIntroduction } from "../src/hooks/learningIntroduction.ts";

test("tutorial and explanations are scoped to a learner and activity", () => {
  const records = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
  }});
  assert.equal(hasIntroduction(1), false);
  finishIntroduction(1);
  assert.equal(hasIntroduction(1), true);
  assert.equal(hasIntroduction(2), false);
  assert.equal(explanationSeen(1, "vowel-1", true), false);
  assert.equal(explanationSeen(1, "vowel-1"), true);
  assert.equal(explanationSeen(2, "vowel-1"), false);
  assert.equal(explanationSeen(1, "vowel-2"), false);
  assert.equal(explanationSeen(null, "vowel-1", true), false);
});
test("blocked storage never prevents playing or skipping the tutorial", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  }});
  assert.doesNotThrow(() => finishIntroduction(1));
  assert.equal(hasIntroduction(1), false);
  assert.equal(explanationSeen(1, "bridge-workshop-1", true), false);
});
