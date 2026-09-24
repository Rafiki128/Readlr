import test from "node:test";
import assert from "node:assert/strict";
import { CASTLE_STOPS, CASTLE_MARKER_CENTER, castleRoute } from "../src/app/components/cvcCastleMap.ts";
import { readFileSync } from "node:fs";

test("castle route ends beneath the requested task marker",()=>{
  assert.equal(castleRoute(0),"");
  assert.equal(castleRoute(1),"M500 350 L500 560 ");
  for(let completed=2;completed<=20;completed++) {
    const stop=CASTLE_STOPS[completed-1];
    assert.ok(castleRoute(completed).endsWith(`${stop.x*10} ${stop.y+CASTLE_MARKER_CENTER}`));
    assert.equal((castleRoute(completed).match(/C/g)||[]).length,completed-1);
  }
  assert.equal(castleRoute(99),castleRoute(20));
  assert.equal(castleRoute(-1),"");
});

test("golden route reaches the next unlocked task without lighting later tasks",()=>{
  const source=readFileSync(new URL("../src/app/components/CvcCastleInterior.tsx",import.meta.url),"utf8");
  assert.ok(source.includes("castleRoute(completed + 1)"));
  for(let completed=0;completed<=20;completed++) {
    const next=Math.min(20,completed+1);
    assert.ok(castleRoute(completed+1).trim().endsWith(`${CASTLE_STOPS[next-1].x*10} ${CASTLE_STOPS[next-1].y+CASTLE_MARKER_CENTER}`));
    assert.equal((castleRoute(completed+1).match(/C/g)||[]).length,next-1);
  }
});

test("storybook unlocks completed words and reuses the word recording filenames",()=>{
  const source=readFileSync(new URL("../src/app/components/CvcRoyalBook.tsx",import.meta.url),"utf8");
  assert.ok(source.includes("CVC_LESSONS.slice(0,completed)"));
  assert.ok(source.includes("disabled={!!turning||page===0}"));
  assert.ok(source.includes("disabled={!!turning||page>=lessons.length-1}"));
  assert.ok(source.includes("Pronounce${lesson.word.toUpperCase()}.wav"));
  assert.ok(source.includes("audio.stop()"));
});

test("storybook turns a two-sided leaf without animating the whole spread",()=>{
  const source=readFileSync(new URL("../src/app/components/CvcRoyalBook.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/components/cvcFinalRealm.css",import.meta.url),"utf8");
  assert.ok(source.includes("cvc-leaf-front"));
  assert.ok(source.includes("cvc-leaf-back"));
  assert.ok(source.includes("turningRef.current || next<0 || next>=lessons.length"));
  assert.ok(source.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("rotateY(-180deg)"));
  assert.ok(css.includes("rotateY(180deg)"));
  assert.ok(!css.includes("animation:royal-page"));
});
