import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = (name: string) => readFileSync(new URL(`../src/app/components/${name}.tsx`, import.meta.url), "utf8");
test("lesson onboarding reuses the real chapter, Dojo and challenge interfaces", () => {
  const tour = component("GuidedLessonTour");
  for (const name of ["StoryScene", "VowelAdventureMap", "VowelChallengeView"]) assert.ok(tour.includes(`<${name}`));
  assert.ok(component("StoryScene").includes('data-tour="begin-chapter"'));
  for (const selector of ["vowel-play__dialogue", "vowel-play__replay", "vowel-play__record", "vowel-play__nav"]) {
    assert.ok(tour.includes(selector));
    assert.ok(component("VowelChallengeView").includes(selector));
  }
});
test("guided recording stays local and cannot award lesson progress", () => {
  const tour = component("GuidedLessonTour");
  assert.ok(tour.includes("useCvcRecorder()"));
  assert.ok(tour.includes("URL.revokeObjectURL"));
  assert.ok(tour.includes("sound.play(url.current)"));
  for (const forbidden of ["usePracticeSession", "onComplete", "recognizeCvc", "fetch(", "localStorage"]) assert.equal(tour.includes(forbidden), false);
});
test("skipping home guidance keeps microphone setup and completing it enters the lesson tour", () => {
  const introduction = component("LearningIntroduction");
  assert.ok(introduction.includes("if(skipped)next(3);else setLessonTour(true)"));
  assert.ok(introduction.includes("<GuidedLessonTour"));
  assert.ok(component("GuidedLessonTour").includes("skip&&step<4?onSkip():onDone()"));
});
