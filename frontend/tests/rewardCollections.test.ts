import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STICKERS, isStickerEarned } from "../src/app/components/stickers.ts";

test("chapter collections retain all reward milestones and totals", () => {
  const progress = {1:20,2:8,3:0};
  const chapters = [1,2,3].map(stage => STICKERS.filter(sticker => sticker.stageId===stage));
  assert.equal(chapters.flat().length, STICKERS.length);
  assert.deepEqual(chapters.map(items=>items.filter(sticker=>isStickerEarned(sticker,progress)).length),[23,1,0]);
  assert.equal(STICKERS.filter(sticker=>isStickerEarned(sticker,{})).length,0);
  assert.equal(STICKERS.filter(sticker=>isStickerEarned(sticker,{1:20,2:20,3:20})).length,STICKERS.length);
});
test("sticker collection provides keyboard-accessible details and guarded frame actions", () => {
  const source = readFileSync(new URL("../src/app/components/StickerBook.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('onClick={()=>setSelected(sticker)}'));
  assert.ok(source.includes('<DialogTitle>'));
  assert.ok(source.includes('disabled={!frame.unlocked || frame.equipped || wearing!==null || !equipFrame}'));
  assert.ok(source.includes('useReducedMotion()'));
});
test("voice achievement counts recordings within the current learner's key range", () => {
  const source = readFileSync(new URL("../src/app/components/Achievements.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('`learner:${learnerId}:`'));
  assert.ok(source.includes('IDBKeyRange.bound(prefix,'));
  assert.ok(source.includes('if (!learnerId) return Promise.resolve(0)'));
});
