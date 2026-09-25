import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { mergeSnapshot, contiguousCount } from "../src/app/components/journeySnapshot.ts";
import { getLearningSettings, updateLearningSettings, resetLearningSettings, learningVolume } from "../src/hooks/learningSettings.ts";

test("journey merges preserve newer local progress and unfinished crown jewels",()=> {
  const local={stage_number:3,completed:19,jewels:2};
  assert.deepEqual(mergeSnapshot(local,{stage_number:3,completed:15,jewels:0}),local);
  assert.deepEqual(mergeSnapshot(local,{stage_number:3,completed:20,jewels:3}),{stage_number:3,completed:20,jewels:3});
  assert.deepEqual(mergeSnapshot({stage_number:2,completed:8,jewels:0},{stage_number:2,completed:12,jewels:0}),{stage_number:2,completed:12,jewels:0});
});
test("malformed snapshots cannot grant completion or cross stage boundaries",()=> {
  const local={stage_number:3,completed:2,jewels:0};
  for(const remote of [{stage_number:2,completed:20,jewels:0},{stage_number:3,completed:20,jewels:0},{stage_number:3,completed:18,jewels:2},{stage_number:3,completed:NaN,jewels:0}]) assert.deepEqual(mergeSnapshot(local,remote),local);
  assert.equal(contiguousCount([1,3,4],5),1);
  assert.equal(contiguousCount([1,2,2,3],5),3);
});
test("volume and optional feedback settings are clamped and reset between users",()=> {
  resetLearningSettings();
  updateLearningSettings({sound_volume:0,voice_feedback:false,achievement_alerts:false,daily_reminders:false});
  assert.equal(learningVolume(),0);
  assert.equal(getLearningSettings().voice_feedback,false);
  updateLearningSettings({sound_volume:200});assert.equal(learningVolume(),1);
  updateLearningSettings({sound_volume:NaN});assert.equal(learningVolume(),1);
  resetLearningSettings();assert.equal(learningVolume(),.8);assert.equal(getLearningSettings().voice_feedback,true);
});
test("all three stages honor optional praise without disabling the teaching audio",()=> {
  for(const file of ["GameLevel.tsx","BridgePractice.tsx","CvcChallenge.tsx"]) {
    const source=readFileSync(new URL(`../src/app/components/${file}`,import.meta.url),"utf8");
    assert.ok(source.includes("getLearningSettings().voice_feedback"));
  }
  for(const file of ["useAudioManager.ts","useBridgeAudio.ts"]) {
    const source=readFileSync(new URL(`../src/hooks/${file}`,import.meta.url),"utf8");
    assert.ok(source.includes(".volume = learningVolume()"));
  }
});
test("journey SQL merges atomically and restricts RPC execution to the backend",()=> {
  const sql=readFileSync(new URL("../../backend/supabase/migrations/202609250106_reading_journeys.sql",import.meta.url),"utf8");
  assert.ok(sql.includes("greatest(reading_journeys.completed, excluded.completed)"));
  assert.ok(sql.includes("from public, anon, authenticated"));
  assert.ok(sql.includes("to service_role"));
  assert.ok(sql.includes("enable row level security"));
});
