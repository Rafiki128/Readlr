import { test } from "node:test";
import { strict as assert } from "node:assert";
import { classicRecordingPath, voiceCandidates, withVoiceFallback } from "../src/hooks/miloVoice.ts";
import { getLearningSettings, resetLearningSettings, updateLearningSettings } from "../src/hooks/learningSettings.ts";

const original = "/audio/stage1/Stage1MiloIntro.wav";
const preferred = "/audio/stage1/default-milo/Stage1MiloIntro.wav";
const classic = "/audio/stage1/classic-milo/Stage1MiloIntro.wav";

test("new Milo is default, valid choices persist in runtime and reset between learners", () => {
  resetLearningSettings();
  assert.equal(getLearningSettings().milo_voice, "milo");
  updateLearningSettings({ milo_voice: "classic" });
  assert.equal(getLearningSettings().milo_voice, "classic");
  updateLearningSettings({ milo_voice: "invalid" as never });
  assert.equal(getLearningSettings().milo_voice, "classic");
  resetLearningSettings();
  assert.equal(getLearningSettings().milo_voice, "milo");
});

test("missing new recordings immediately use originals, partial packs fall back per line", () => {
  assert.deepEqual(voiceCandidates(original, "milo"), [classic]);
  assert.deepEqual(voiceCandidates(original, "milo", { [original]: preferred }), [preferred, classic]);
  assert.deepEqual(voiceCandidates(original, "classic", { [original]: preferred }), [classic]);
  assert.deepEqual(voiceCandidates("blob:child-recording", "milo", { "blob:child-recording": preferred }), ["blob:child-recording"]);
});

test("stage paths are idempotent and crown reuse resolves the correct stage folder", () => {
  assert.equal(classicRecordingPath(classic), classic);
  assert.equal(classicRecordingPath(preferred), preferred);
  assert.deepEqual(voiceCandidates("/audio/stage3/../stage1/A.wav", "milo"), ["/audio/stage1/classic-milo/A.wav"]);
  assert.deepEqual(voiceCandidates("/audio/stage3/../stage2/PronounceMA.wav", "classic"), ["/audio/stage2/classic-milo/PronounceMA.wav"]);
  assert.equal(classicRecordingPath("blob:child-recording"), "blob:child-recording");
});

class FakeAudio extends EventTarget {
  src = "";
  attempts: string[] = [];
  failures: string[] = [];
  getAttribute() { return this.src; }
  async play() {
    this.attempts.push(this.src);
    const failure = this.failures.shift();
    if (failure) {
      if (failure === "NotSupportedError") this.dispatchEvent(new Event("error"));
      throw new DOMException("Cannot play", failure);
    }
  }
}

test("unplayable new recording tries classic without exposing intermediate errors", async () => {
  const audio = new FakeAudio();
  audio.failures = ["NotSupportedError"];
  withVoiceFallback(audio as unknown as HTMLAudioElement, [preferred, original]);
  let errors = 0;
  audio.addEventListener("error", () => errors++);
  await audio.play();
  assert.deepEqual(audio.attempts, [preferred, original]);
  assert.equal(errors, 0);
});

test("exhausted recordings surface one error for the narration speech fallback", async () => {
  const audio = new FakeAudio();
  audio.failures = ["NotSupportedError", "NotSupportedError"];
  withVoiceFallback(audio as unknown as HTMLAudioElement, [preferred, original]);
  let errors = 0;
  audio.addEventListener("error", () => errors++);
  await assert.rejects(audio.play(), { name: "NotSupportedError" });
  assert.equal(errors, 1);
});

test("stopping or blocked autoplay never restarts another voice", async () => {
  for (const failure of ["AbortError", "NotAllowedError"]) {
    const audio = new FakeAudio();
    audio.failures = [failure];
    withVoiceFallback(audio as unknown as HTMLAudioElement, [preferred, original]);
    await assert.rejects(audio.play(), { name: failure });
    assert.deepEqual(audio.attempts, [preferred]);
  }
});

test("cancellation before playback begins never starts a recording", async () => {
  const audio = new FakeAudio();
  withVoiceFallback(audio as unknown as HTMLAudioElement, [preferred, original]);
  const playing = audio.play();
  audio.src = "";
  await assert.rejects(playing, { name: "AbortError" });
  assert.deepEqual(audio.attempts, []);
});
