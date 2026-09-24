import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveStageTwoAudioPath } from "../src/app/components/stageTwoAudio.ts";
import { CONSONANTS, CROSSING_LESSONS, WORKSHOP_LESSONS } from "../src/app/components/bridgeCurriculum.ts";
import { BRIDGE_LINES } from "../src/app/components/stageTwoContent.ts";

const directory = new URL("../public/audio/stage2/", import.meta.url);
function checkRecording(filename: string) {
  const mapped = resolveStageTwoAudioPath(`/audio/stage2/${filename}`).split("/").at(-1)!;
  const recording = readFileSync(new URL(mapped, directory));
  assert.ok(recording.length > 44, filename);
  assert.equal(recording.toString("ascii", 0, 4), "RIFF", filename);
  assert.equal(recording.toString("ascii", 8, 12), "WAVE", filename);
}

test("Stage 2 introductions, workshop and randomized crossing recordings exist", () => {
  for (const entry of Object.values(BRIDGE_LINES)) checkRecording(entry.file);
  for (const filename of ["BridgeStoryScene", "BridgeStoryMilo", "BridgeStoryGoal", "WorkshopMFirst", "WorkshopAVowel", "WorkshopMASlide", "WorkshopLinkPraise", "BridgeFirstPiece", "BridgeVowelPiece", "BridgePickPiece", "BridgeJoinPieces", "BridgeChoiceRetry"]) checkRecording(`${filename}.wav`);
  for (const lesson of [...WORKSHOP_LESSONS, ...CROSSING_LESSONS]) {
    checkRecording(`${lesson.id}-Intro.wav`);
    checkRecording(`${lesson.id}-Success.wav`);
    checkRecording(`Pronounce${lesson.blend}.wav`);
  }
});

test("Sound Shelf has all consonants and every consonant-vowel blend recording", () => {
  for (const consonant of CONSONANTS) {
    checkRecording(`SoundShelf-${consonant}.wav`);
    for (const vowel of "AEIOU") {
      const filename = `Pronounce${consonant}${vowel}.wav`;
      checkRecording(filename);
    }
  }
});

test("Stage 2 aliases are scoped and idempotent", () => {
  for (const blend of ["HU", "JA"]) {
    const mapped = `/audio/stage2/Pronounce${blend}.wav.wav`;
    assert.equal(resolveStageTwoAudioPath(`/audio/stage2/Pronounce${blend}.wav`), mapped);
    assert.equal(resolveStageTwoAudioPath(mapped), mapped);
  }
  for (const path of ["/audio/stage2/PronounceMA.wav", "/audio/stage3/PronounceMAP.wav", "blob:recording"]) assert.equal(resolveStageTwoAudioPath(path), path);
});
