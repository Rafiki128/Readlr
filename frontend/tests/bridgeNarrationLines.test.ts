import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { narrationLines } from "../src/hooks/bridgeNarrationLines.ts";

test("narration displays one sentence at a time without losing content",()=>{
  assert.deepEqual(narrationLines("Your turn! Say the two sounds together. Ready? Go!"),["Your turn!","Say the two sounds together.","Ready?","Go!"]);
  assert.deepEqual(narrationLines("Here comes our a vowel power! Listen to its sound."),["Here comes our a vowel power!","Listen to its sound."]);
});
test("recording retries capture instead of restarting the introduction",()=>{
  const source=readFileSync(new URL("../src/app/components/BridgePractice.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('retry === "record" ? record'));
  assert.ok(source.includes('retryStep.current = "record"'));
  assert.ok(source.includes('setTimeout(introduce, 0)'));
  assert.ok(source.includes('Record my voice'));
});
