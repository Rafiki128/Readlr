import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getTrailPoints, getTrailReward, TRAIL_STICKERS } from "../src/app/components/trailRewards.ts";

test("Dojo training does not award trail rewards", () => {
  for (let level = 0; level <= 5; level++) {
    assert.equal(getTrailPoints(level), 0);
    assert.equal(getTrailReward(level, 0), null);
  }
});

test("each trail has a distinct sticker and first-completion points", () => {
  assert.equal(new Set(TRAIL_STICKERS.map((item) => item.id)).size, 15);
  for (let level = 6; level <= 20; level++) {
    const reward = getTrailReward(level, level - 1)!;
    assert.equal(reward.sticker.levelId, level);
    assert.equal(reward.earnedPoints, 100);
    assert.equal(reward.totalPoints, (level - 5) * 100);
  }
});

test("replays preserve points and do not award bonus stickers again", () => {
  const reward = getTrailReward(10, 20)!;
  assert.equal(reward.earnedPoints, 0);
  assert.equal(reward.totalPoints, 1500);
  assert.deepEqual(reward.bonuses, []);
});

test("bonus stickers unlock at the three point milestones", () => {
  for (const level of [10, 15, 20]) {
    assert.equal(getTrailReward(level, level - 1)!.bonuses.length, 1);
    assert.equal(getTrailReward(level - 1, level - 2)!.bonuses.length, 0);
  }
});

test("saved progress restores rewards and legacy totals are capped", () => {
  assert.equal(getTrailPoints(12), 700);
  assert.equal(getTrailPoints(55), 1500);
  assert.equal(getTrailPoints(NaN), 0);
});
