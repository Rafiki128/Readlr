import test from "node:test";
import assert from "node:assert/strict";
import { BOOK_IDS, rewardCounts } from "../src/hooks/rewardCounts.ts";
import { READING_CHAPTERS } from "../src/app/components/aralCurriculum.ts";
import { emptyLearnerCurriculumState } from "../src/hooks/learnerCurriculumState.ts";

test("reward counts use the same books as the reading curriculum", () => {
  assert.deepEqual([...BOOK_IDS], READING_CHAPTERS.map(chapter => chapter.id));
});

test("a new learner has no stickers or awards", () => {
  assert.deepEqual(rewardCounts(emptyLearnerCurriculumState(), []), { stickers: 0, awards: 0 });
});

test("finished stops, practices and books add stickers and awards", () => {
  const state = { ...emptyLearnerCurriculumState(), campOrientationStep: 3, guidedStops: ["gate:mango", "gate:apple", "lanterns:blend"] };
  // Stickers: two starter stops, the lanterns blend stop, and Book 1 (blend + completion). Awards: Camp Ready and Book 1.
  assert.deepEqual(rewardCounts(state, ["gate"]), { stickers: 5, awards: 2 });
});
