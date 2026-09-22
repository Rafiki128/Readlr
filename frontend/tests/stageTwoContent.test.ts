import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { BRIDGE_LINES, BRIDGE_MODEL, EMPTY_BRIDGE_PROGRESS, bridgeStorageKey, completeBridgeActivity, hasVoiceSignal, normalizeBridgeProgress } from "../src/app/components/stageTwoContent.ts";

test("Workshop must be completed before crossing credit", () => {
  assert.deepEqual(completeBridgeActivity(EMPTY_BRIDGE_PROGRESS, "crossing"), EMPTY_BRIDGE_PROGRESS);
  const workshop = completeBridgeActivity(EMPTY_BRIDGE_PROGRESS, "workshop");
  assert.equal(workshop.points, 0);
  assert.equal(workshop.workshop, true);
  const crossing = completeBridgeActivity(workshop, "crossing");
  assert.equal(crossing.points, 100);
  assert.equal(crossing.evidence, "guided");
  assert.deepEqual(completeBridgeActivity(crossing, "crossing"), crossing);
  assert.deepEqual(completeBridgeActivity(crossing, "workshop"), crossing);
});

test("legacy progress is not mistaken for v2 curriculum progress", () => {
  for (const data of [8, { 2: 8 }, null, { version: 1, workshop: true }]) {
    assert.deepEqual(normalizeBridgeProgress(data), EMPTY_BRIDGE_PROGRESS);
  }
  assert.deepEqual(normalizeBridgeProgress({ version: 2, workshop: true, crossing: true, points: 9999, evidence: "mastered" }), {
    version: 2, workshop: true, crossing: true, points: 100, evidence: "guided",
  });
});

test("progress is isolated by learner and guests have no shared persistent key", () => {
  assert.notEqual(bridgeStorageKey(1), bridgeStorageKey(2));
  assert.equal(bridgeStorageKey(null), null);
  assert.equal(bridgeStorageKey(undefined), null);
});

test("silence and very short noise do not pass the energy gate", () => {
  assert.equal(hasVoiceSignal(0, 0, 10000), false);
  assert.equal(hasVoiceSignal(.1, 1, 10000), false);
  assert.equal(hasVoiceSignal(.1, 10, 0), false);
  assert.equal(hasVoiceSignal(.02, 6, 10000), true);
});

test("every runtime narration line is documented verbatim", () => {
  const script = readFileSync(new URL("../../STAGE2_AUDIO_SCRIPT.md", import.meta.url), "utf8");
  for (const { file, text } of Object.values(BRIDGE_LINES)) {
    assert.ok(script.includes(`| ${file} | ${text} |`), file);
  }
  assert.ok(existsSync(new URL(`../public${BRIDGE_MODEL}`, import.meta.url)));
});
