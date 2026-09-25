import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { LIBRARY_CONSONANTS, LIBRARY_VOWELS, libraryStageOpen, recordingKey, soundPath } from "../src/app/components/soundLibraryContent.ts";
import { resolveStageTwoAudioPath } from "../src/app/components/stageTwoAudio.ts";

test("library uses all vowel and 105 direct blend recordings", () => {
  assert.equal(LIBRARY_CONSONANTS.length * LIBRARY_VOWELS.length, 105);
  for (const vowel of LIBRARY_VOWELS) {
    assert.ok(existsSync(new URL(`../public${soundPath("vowels", vowel)}`, import.meta.url)));
    for (const consonant of LIBRARY_CONSONANTS) assert.ok(existsSync(new URL(`../public${resolveStageTwoAudioPath(soundPath("blends", consonant + vowel))}`, import.meta.url)));
  }
  assert.equal(soundPath("words", "sun"), "/audio/stage3/PronounceSUN.wav");
});
test("library gating follows current 20-level stages", () => {
  assert.equal(libraryStageOpen(1, {}), true);
  assert.equal(libraryStageOpen(2, {1:19}), false);
  assert.equal(libraryStageOpen(2, {1:20}), true);
  assert.equal(libraryStageOpen(3, {2:8}), false);
  assert.equal(libraryStageOpen(3, {3:1}), true);
});
test("saved voices are isolated by learner, collection and sound", () => {
  assert.notEqual(recordingKey(1,"vowels","a"),recordingKey(2,"vowels","a"));
  assert.notEqual(recordingKey(1,"vowels","a"),recordingKey(1,"blends","a"));
  assert.equal(recordingKey(1,"blends","ma"),recordingKey(1,"blends","MA"));
});
test("merged reward alerts respect settings and journey sync has one writer", () => {
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  assert.equal((app.match(/if \(reward && getLearningSettings\(\).achievement_alerts\)/g) || []).length, 2);
  assert.ok(app.includes("if (stageId !== 1) return;"));
});
