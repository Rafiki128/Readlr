import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { CVC_LESSONS, CROWN_WORDS } from "../src/app/components/cvcContent.ts";
import { CVC_AUDIO, cvcLessonAudio, cvcCrownAudio, cvcReadyAudio, cvcModelAudio } from "../src/app/components/stageThreeAudio.ts";

const directory = new URL("../public/audio/stage3/", import.meta.url);
function recording(file: string) {
  const bytes = readFileSync(new URL(file, directory));
  assert.ok(bytes.length > 44, file);
  assert.equal(bytes.toString("ascii",0,4),"RIFF",file);
  assert.equal(bytes.toString("ascii",8,12),"WAVE",file);
}
test("all supplied Stage 3 recordings are covered by the audio map",()=>{
  const files = new Set<string>(Object.values(CVC_AUDIO).flat());
  for (const lesson of CVC_LESSONS) {
    files.add(cvcLessonAudio(lesson.id,"Intro"));
    files.add(cvcLessonAudio(lesson.id,"Success"));
    if(lesson.mode!=="read") files.add(cvcLessonAudio(lesson.id,"Puzzle"));
    files.add(cvcReadyAudio(lesson.word));
    files.add(cvcModelAudio(lesson.word));
  }
  for(const [index,word] of CROWN_WORDS.entries()) {
    files.add(cvcCrownAudio(index,"Intro"));files.add(cvcCrownAudio(index,"Success"));files.add(cvcReadyAudio(word));
    recording(cvcModelAudio(word));
  }
  for(const file of files) recording(file);
  assert.deepEqual([...files].sort(),readdirSync(directory).filter(file=>file.endsWith(".wav")).sort());
});
test("crown vowel and blend reuse the earlier stages without requiring duplicate recordings",()=>{
  assert.equal(cvcModelAudio("A"),"../stage1/A.wav");
  assert.equal(cvcModelAudio("MA"),"../stage2/PronounceMA.wav");
  assert.equal(cvcModelAudio("map"),"PronounceMAP.wav");
});
