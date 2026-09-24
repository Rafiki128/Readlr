import { strict as assert } from "node:assert";
import { test } from "node:test";
import { STICKERS, isStickerEarned } from "../src/app/components/stickers.ts";
import { getTrailReward } from "../src/app/components/trailRewards.ts";

test("every sticker is earnable within its stage's 20 levels", () => {
  for (const sticker of STICKERS) {
    assert.ok([1, 2, 3].includes(sticker.stageId), sticker.name);
    assert.ok(Number.isInteger(sticker.at) && sticker.at >= 1 && sticker.at <= 20, sticker.name);
  }
});

test("sticker ids and art are unique", () => {
  assert.equal(new Set(STICKERS.map((item) => item.id)).size, STICKERS.length);
  assert.equal(new Set(STICKERS.map((item) => item.emoji)).size, STICKERS.length);
});

test("each stage has the expected milestones", () => {
  const levels = (stageId: number) => STICKERS.filter((item) => item.stageId === stageId).map((item) => item.at).sort((a, b) => a - b);
  assert.deepEqual(levels(1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13, 14, 15, 15, 16, 17, 18, 19, 20, 20]);
  assert.deepEqual(levels(2), [6, 10, 15, 20]);
  assert.deepEqual(levels(3), [5, 10, 15, 20]);
});

test("valley bonus stickers match the trail dialog's bonus levels", () => {
  for (const sticker of STICKERS.filter((item) => item.id >= 200 && item.id < 300)) {
    assert.ok(getTrailReward(sticker.at, sticker.at - 1)!.bonuses.some((bonus) => bonus.id === sticker.id), sticker.name);
  }
});

test("stickers are earned from saved stage progress", () => {
  const crown = STICKERS.find((item) => item.id === 3004)!;
  assert.equal(isStickerEarned(crown, { 3: 19 }), false);
  assert.equal(isStickerEarned(crown, { 3: 20 }), true);
  assert.equal(isStickerEarned(crown, {}), false);
});
