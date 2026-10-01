import { strict as assert } from "node:assert";
import { test } from "node:test";
import { STICKERS, isStickerEarned, newStickerReward, stickerSummary } from "../src/app/components/stickers.ts";
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

test("a reward appears only for stickers first earned by this completion", () => {
  assert.equal(newStickerReward(2, 5, 6)!.sticker.name, "Bridge Builder");
  assert.equal(newStickerReward(2, 6, 7), null);
  assert.equal(newStickerReward(2, 20, 20), null);
  assert.equal(newStickerReward(1, 2, 3), null);
  const jump = newStickerReward(3, 4, 15)!;
  assert.deepEqual([jump.sticker.at, ...jump.bonuses.map((item) => item.at)], [5, 10, 15]);
});

test("Dojo and Workshop training never trigger sticker popups", () => {
  for (const stage of [1, 2]) {
    for (let level = 1; level <= 5; level++) {
      assert.equal(newStickerReward(stage, level - 1, level), null);
      assert.equal(getTrailReward(level, level - 1), null);
    }
    assert.ok(newStickerReward(stage, 5, 6));
    const catchup = newStickerReward(stage, 0, 20)!;
    assert.ok([catchup.sticker, ...catchup.bonuses].every(sticker => sticker.at > 5));
  }
  const octopus = STICKERS.find(sticker => sticker.name === "Octopus")!;
  assert.equal(isStickerEarned(octopus, {1: 4}), true);
  assert.ok(newStickerReward(3, 4, 5));
});

test("admin summary shows count, latest milestones and the next sticker", () => {
  const empty = stickerSummary({});
  assert.deepEqual([empty.earned, empty.total, empty.recent.length, empty.next?.name], [0, STICKERS.length, 0, "Ant"]);
  const midway = stickerSummary({ 1: 20, 2: 10 });
  assert.equal(midway.earned, 23 + 2);
  assert.deepEqual(midway.recent.map((item) => item.name), ["Brook Keeper", "Bridge Builder", "Valley Unicorn"]);
  assert.equal(midway.next?.name, "Waterfall Explorer");
  assert.equal(stickerSummary({ 1: 20, 2: 20, 3: 20 }).next, null);
});
