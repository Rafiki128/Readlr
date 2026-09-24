import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = (name: string) => readFileSync(new URL(`../src/app/components/${name}`, import.meta.url), "utf8");

test("all three challenge views use the shared voice control styling", () => {
  for (const file of ["VowelChallengeView.tsx", "BridgePractice.tsx", "CvcChallenge.tsx"]) {
    assert.ok(source(file).includes('import "./challengeControls.css"'));
  }
  const css = source("challengeControls.css");
  for (const state of ["recording", "magic", "reward"]) {
    assert.ok(css.includes(`.cvc-play.cvc-phase-${state}`));
  }
  assert.ok(css.includes("min-height:64px"));
});

test("CVC recording uses a target prompt, phase icon and guarded completion", () => {
  const cvc = source("CvcChallenge.tsx");
  assert.ok(cvc.includes('aria-label="Challenge steps"'));
  assert.ok(cvc.includes('phase==="recording"?`Say ${word}`'));
  assert.ok(cvc.includes('<ActionIcon size={25}/>'));
  assert.ok(cvc.includes('disabled={isBusy} onClick={onNext}'));
  assert.ok(cvc.includes('"Back to castle map"'));
});

test("stage selection destinations consistently say Stages", () => {
  assert.ok(source("VowelAdventureMap.tsx").includes("<span>Stages</span>"));
  assert.ok(source("NavigationHeader.tsx").includes('id: "stage-selection", label: "Stages"'));
  assert.ok(source("BlendingWorkshop.tsx").includes(">Stages</button>"));
  assert.ok(source("CvcKingdom.tsx").includes('?"Stages":"Castle map"'));
});
