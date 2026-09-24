import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Exercise the actual App callbacks without requiring authentication or microphone access.
function runHandler(name: string, level: number, progress = level) {
  let callback = "";
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) {
      callback = node.initializer!.getText(tree);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(callback, name);
  const state: Record<string, unknown> = {};
  const context = {
    selectedStage: 1, selectedLevel: level,
    completedByStage: { 1: progress },
    handleSelectLevel: (value: number) => { state.nextLevel = value; },
    setIsLevelJustCompleted: (value: boolean) => { state.completed = value; },
    setMapEntry: (value: string) => { state.entry = value; },
    setCurrentScreen: (value: string) => { state.screen = value; },
  };
  new Function(...Object.keys(context), `return (${callback})();`)(...Object.values(context));
  return state;
}

for (const handler of ["handleContinueToNextStory", "handleBackFromCelebration", "handleBackToLevelMap"]) {
  test(`${handler} returns every Dojo vowel to the Dojo`, () => {
    for (let level = 1; level <= 5; level++) {
      const state = runHandler(handler, level);
      assert.equal(state.entry, "dojo");
      assert.equal(state.screen, "level-map");
    }
  });
}

test("leaving a road challenge still returns to the valley", () => {
  for (let level = 6; level <= 20; level++) {
    assert.equal(runHandler("handleBackToLevelMap", level).entry, "valley");
  }
});

test("continue training opens the next untrained vowel", () => {
  for (let progress = 1; progress < 5; progress++) {
    assert.equal(runHandler("handleContinueDojoTraining", progress, progress).nextLevel, progress + 1);
  }
  assert.equal(runHandler("handleContinueDojoTraining", 1, 3).nextLevel, 4);
});

test("completed Dojo practice cannot continue into a valley level", () => {
  for (const progress of [5, 12, 20]) {
    assert.deepEqual(runHandler("handleContinueDojoTraining", 1, progress), {});
  }
});
