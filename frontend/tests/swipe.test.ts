import test from "node:test";
import assert from "node:assert/strict";
import { swipeStep } from "../src/hooks/swipe.ts";

test("a left swipe goes to the next book or page and a right swipe goes back", () => {
  assert.equal(swipeStep(-80, 5), 1);
  assert.equal(swipeStep(80, -5), -1);
});

test("short or mostly vertical drags do not turn", () => {
  assert.equal(swipeStep(-49, 0), 0);
  assert.equal(swipeStep(0, 0), 0);
  assert.equal(swipeStep(-80, 60), 0);
  assert.equal(swipeStep(90, -200), 0);
});

test("the 50 px threshold and 1.5x horizontal ratio are inclusive", () => {
  assert.equal(swipeStep(-50, 0), 1);
  assert.equal(swipeStep(60, 40), -1);
});
