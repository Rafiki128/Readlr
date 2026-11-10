import test from "node:test";
import assert from "node:assert/strict";
import { recordingChunks } from "../src/hooks/recordedLines.ts";

const lines = {
  "take your time there is no timer to beat": "/audio/milo-voice/take-your-time.wav",
  "build the word train": "/audio/milo-voice/build-the-word-train.wav",
  "correct": "/audio/milo-voice/correct.wav",
};

test("a recorded pair of sentences plays as one recording after another sentence", () => {
  assert.deepEqual(recordingChunks(["Build the word train.", "Take your time.", "There is no timer to beat."], lines), [
    { text: "Build the word train.", file: "/audio/milo-voice/build-the-word-train.wav" },
    { text: "Take your time. There is no timer to beat.", file: "/audio/milo-voice/take-your-time.wav" },
  ]);
});

test("sentences without a recording come back on their own", () => {
  assert.deepEqual(recordingChunks(["Correct!", "You found pen."], lines), [
    { text: "Correct!", file: "/audio/milo-voice/correct.wav" },
    { text: "You found pen." },
  ]);
});
