import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveStageOneAudioPath } from "../src/app/components/stageOneAudio.ts";

const audioDirectory = new URL("../public/audio/stage1/", import.meta.url);
const script = readFileSync(new URL("STAGE1_AUDIO_SCRIPT.md", audioDirectory), "utf8");
const filenames = [...script.matchAll(/^\| `([^`]+\.wav)` \|/gm)].map((match) => match[1]);

test("every scripted Stage 1 recording maps to a nonempty WAV file", () => {
  assert.ok(filenames.length >= 70);
  for (const filename of filenames) {
    const path = resolveStageOneAudioPath(`/audio/stage1/${filename}`);
    const recording = readFileSync(new URL(path.split("/").at(-1)!, audioDirectory));
    assert.ok(recording.length > 44, filename);
    assert.equal(recording.toString("ascii", 0, 4), "RIFF", filename);
    assert.equal(recording.toString("ascii", 8, 12), "WAVE", filename);
  }
});

test("supplied double extensions resolve without changing other stage paths", () => {
  assert.equal(resolveStageOneAudioPath("/audio/stage1/ChallengeELittleLightPath.wav"), "/audio/stage1/ChallengeELittleLightPath.w.wav");
  assert.equal(resolveStageOneAudioPath("/audio/stage1/ChallengeIMissingMapLine.wav"), "/audio/stage1/ChallengeIMissingMapLine.wa.wav");
  assert.equal(resolveStageOneAudioPath("/audio/stage1/TrainA.wav"), "/audio/stage1/TrainA.wav");
  assert.equal(resolveStageOneAudioPath("/audio/stage2/MA.wav"), "/audio/stage2/MA.wav");
});
