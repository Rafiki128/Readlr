import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("blending controls have one clear practice action and compact audio replay",()=>{
  const source=readFileSync(new URL("../src/app/components/BridgePractice.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('const practiceLabel = `Practice my ${lesson.blend.toLowerCase()} sound`;'));
  assert.ok(source.includes('className="bridge-practice__audio"'));
  assert.ok(!source.includes('>Record my voice<'));
  assert.ok(!source.includes('>Listen to Milo<'));
  assert.ok(source.includes('{ready && <button className="bridge-primary" onClick={record}'));
  assert.ok(!source.includes('disabled={!ready} onClick={record}'));
  assert.ok(source.includes('data-state={phase}'));
  assert.ok(source.includes('Milo is listening...'));
  assert.ok(!source.includes('Workshop practice complete'));
  assert.ok(!source.includes('Another crossing restored'));
});

test("the full Sound Shelf unlocks magical sound pairing after guided training",()=>{
  const shelf=readFileSync(new URL("../src/app/components/BridgeSoundShelf.tsx",import.meta.url),"utf8");
  const workshop=readFileSync(new URL("../src/app/components/BlendingWorkshop.tsx",import.meta.url),"utf8");
  assert.ok(shelf.includes("const pageLetters = CONSONANTS.slice"));
  assert.ok(shelf.includes("function pickConsonant(char: string)"));
  assert.ok(shelf.includes("function pickVowel(char: string)"));
  assert.ok(shelf.includes("async function glueSounds()"));
  assert.ok(shelf.includes("Glue ${blend.toLowerCase()} together"));
  assert.ok(shelf.includes("You can glue them together!"));
  assert.ok(workshop.includes("<BridgeSoundShelf unlocked={trained} />"));
  assert.ok(!workshop.includes("freeBlend"));
  assert.ok(!shelf.includes("onPractice"));
});
