import test from "node:test";
import assert from "node:assert/strict";
import { miloLessonPose } from "../src/app/components/miloBehavior.ts";
import { observeAudioActivity } from "../src/hooks/audioPlayback.ts";

test("Milo listens to the child instead of talking or celebrating over them", () => {
  for (const cue of [{ recording: true }, { playback: true }]) {
    assert.deepEqual(miloLessonPose({ ...cue, speaking: true, success: true, joining: true }), {
      state: "listening", gesture: "rest", lookAt: "viewer",
    });
  }
});
test("word checking is thoughtful, not premature success", () => {
  assert.equal(miloLessonPose({ checking: true, success: true }).state, "thinking");
});
test("retries receive encouragement and the learner's attention", () => {
  assert.deepEqual(miloLessonPose({ retrying: true, teaching: true }), { state: "encouraging", gesture: "wave", lookAt: "viewer" });
  assert.equal(miloLessonPose({ retrying: true, speaking: true }).state, "speaking");
});
test("letter and blending cues have distinct teaching gestures", () => {
  assert.deepEqual(miloLessonPose({ joining: true, teaching: true }), { state: "idle", gesture: "join", lookAt: "down" });
  assert.deepEqual(miloLessonPose({ teaching: true, lookAt: "down-right", speaking: true }), { state: "speaking", gesture: "point", lookAt: "down-right" });
});
test("the mouth rests when narration ends while the teaching pose remains", () => {
  assert.equal(miloLessonPose({ teaching: true, speaking: true }).state, "speaking");
  assert.equal(miloLessonPose({ teaching: true }).state, "idle");
  assert.equal(miloLessonPose({ success: true, speaking: true }).state, "speaking");
  assert.equal(miloLessonPose({ success: true }).state, "celebrating");
});
test("audio animation follows playing, waiting, resuming and ending", () => {
  const player = new EventTarget(), states: boolean[] = [];
  const dispose = observeAudioActivity(player, active => states.push(active));
  for (const event of ["playing", "waiting", "playing", "pause", "playing", "ended"]) player.dispatchEvent(new Event(event));
  assert.deepEqual(states, [true, false, true, false, true, false]);
  dispose();
  player.dispatchEvent(new Event("playing"));
  assert.equal(states.length, 6);
});
test("audio errors and source removal stop animation", () => {
  const player = new EventTarget(), states: boolean[] = [];
  const dispose = observeAudioActivity(player, active => states.push(active));
  for (const event of ["playing", "error", "playing", "emptied"]) player.dispatchEvent(new Event(event));
  assert.deepEqual(states, [true, false, true, false]);
  dispose();
});
