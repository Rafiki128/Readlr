import test from "node:test";
import assert from "node:assert/strict";
import { cueUrl, shapeAt, trackMouth, type MouthCues } from "../src/hooks/miloMouth.ts";

const cues: MouthCues = { d: 1.2, c: [[0, "X"], [0.1, "A"], [0.3, "D"], [0.7, "F"], [1.1, "X"]] };

test("mouth shape follows the cue that has started", () => {
  assert.equal(shapeAt(cues, 0), "X");
  assert.equal(shapeAt(cues, 0.15), "A");
  assert.equal(shapeAt(cues, 0.3), "D");
  assert.equal(shapeAt(cues, 0.69), "D");
  assert.equal(shapeAt(cues, 0.9), "F");
  assert.equal(shapeAt(cues, 5), "X");
});

test("mouth shape rests before the first cue and with no cues", () => {
  assert.equal(shapeAt({ d: 1, c: [[0.2, "B"]] }, 0.1), "X");
  assert.equal(shapeAt({ d: 0, c: [] }, 0.5), "X");
});

test("each recording's cue file sits beside it", () => {
  assert.equal(cueUrl("/audio/milo-voice/a-apple.wav"), "/audio/milo-voice/a-apple.lip.json");
  assert.equal(cueUrl("/audio/stage1/classic-milo/A.WAV"), "/audio/stage1/classic-milo/A.lip.json");
});

test("only recordings have cue files", () => {
  assert.equal(cueUrl("/audio/music/the-mountain-retro-game.mp3"), null);
  assert.equal(cueUrl("blob:http://localhost/1234"), null);
});

test("tracking ignores players that are not audio elements", () => {
  const stop = trackMouth({} as HTMLAudioElement);
  assert.doesNotThrow(stop);
});
