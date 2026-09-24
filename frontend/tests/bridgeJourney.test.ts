import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { WORKSHOP_LESSONS, CROSSING_LESSONS, CONSONANTS, lessonChoices, randomizedCrossingLessons } from "../src/app/components/bridgeCurriculum.ts";
import { normalizeBridgeJourney, finishBridgeJourney } from "../src/app/components/stageTwoContent.ts";
import { BRIDGE_STOPS, BRIDGE_REGION_ORDER, CROSSING_SPOTS, LANDSCAPE_HEIGHT } from "../src/app/components/bridgeMapLayout.ts";

test("continuous map has fifteen spaced upward crossings between Workshop and summit",()=>{
  assert.equal(CROSSING_SPOTS.length,15);
  CROSSING_SPOTS.forEach((p,i)=>{
    assert.ok(p.x>200&&p.x<800);
    assert.ok(p.y>300&&p.y<LANDSCAPE_HEIGHT-400);
    if(i) assert.ok(CROSSING_SPOTS[i-1].y-p.y>=200);
  });
});

test("bridge journey climbs from the brook at the bottom to the sky at the top",()=>{
  assert.deepEqual(BRIDGE_REGION_ORDER,[2,1,0]);
  for(const stops of BRIDGE_STOPS) {
    assert.equal(stops.length,5);
    stops.forEach(([x,y],i)=>{
      assert.ok(x>=25&&x<=75);
      assert.ok(y>0&&y<100);
      if(i) assert.ok(y<stops[i-1][1]);
    });
  }
});
test("all five vowel models exist and legacy blending navigation is removed",()=>{
  for(const vowel of ["A","E","I","O","U"]) assert.ok(existsSync(new URL(`../public/audio/stage1/${vowel}.wav`,import.meta.url)));
  const workshop=readFileSync(new URL("../src/app/components/BlendingWorkshop.tsx",import.meta.url),"utf8");
  const map=readFileSync(new URL("../src/app/components/LevelMap.tsx",import.meta.url),"utf8");
  assert.ok(!workshop.includes("onLegacy"));
  assert.ok(!map.includes("onLegacy"));
  assert.ok(!workshop.includes("Earlier blending lessons"));
});

test("five training stations and fifteen crossings cover every vowel with a stretch consonant", () => {
  assert.equal(WORKSHOP_LESSONS.length,5);
  assert.equal(CROSSING_LESSONS.length,15);
  const lessons=[...WORKSHOP_LESSONS,...CROSSING_LESSONS];
  assert.equal(new Set(lessons.map(l=>l.id)).size,20);
  assert.equal(new Set(CROSSING_LESSONS.map(l=>l.success)).size,15);
  assert.equal(CONSONANTS.length,21);
  assert.deepEqual(new Set(CROSSING_LESSONS.map(lesson=>lesson.blend[1])),new Set(["A","E","I","O","U"]));
  assert.equal(CROSSING_LESSONS.filter(lesson=>lesson.blend[0]==="V").length,5);
  const shuffled=randomizedCrossingLessons(42);
  assert.notDeepEqual(shuffled.map(lesson=>lesson.blend),CROSSING_LESSONS.map(lesson=>lesson.blend));
  assert.deepEqual(new Set(shuffled.map(lesson=>lesson.blend)),new Set(CROSSING_LESSONS.map(lesson=>lesson.blend)));
  assert.deepEqual(shuffled.map(lesson=>lesson.title),CROSSING_LESSONS.map(lesson=>lesson.title));
  for(const lesson of lessons) {
    const choices=lessonChoices(lesson);
    if(choices) {
      assert.equal(new Set(choices.options).size,2);
      assert.ok(choices.options.includes(choices.target));
    }
  }
});
test("journey enforces sequential training, crossings and idempotent rewards", () => {
  let state=normalizeBridgeJourney(null);
  assert.deepEqual(finishBridgeJourney(state,false,1),state);
  assert.deepEqual(finishBridgeJourney(state,true,3),state);
  for(let n=1;n<=5;n++) state=finishBridgeJourney(state,true,n);
  assert.equal(state.points,0);
  assert.deepEqual(finishBridgeJourney(state,false,2),state);
  for(let n=1;n<=15;n++) state=finishBridgeJourney(state,false,n);
  assert.equal(state.points,1500);
  assert.equal(state.evidence,"guided");
  assert.deepEqual(finishBridgeJourney(state,false,1),state);
  assert.deepEqual(finishBridgeJourney(state,false,16),state);
});
test("old prototype completion is preserved without pretending all training was done", () => {
  const state=normalizeBridgeJourney({version:2,workshop:true,crossing:true,points:100});
  assert.deepEqual(state.training,[1]);
  assert.deepEqual(state.crossings,[1]);
  assert.equal(state.points,100);
  assert.deepEqual(finishBridgeJourney(state,false,1),state);
  assert.deepEqual(finishBridgeJourney(state,false,2),state);
});
test("unknown versions and malformed values cannot create rewards", () => {
  assert.equal(normalizeBridgeJourney({version:99,training:[1,2,3,4,5],crossings:[1]}).points,0);
  const state=normalizeBridgeJourney({version:3,training:[1,1,2,-1,99],crossings:[1,1,0,16],points:9999});
  assert.deepEqual(state.training,[1,2]);
  assert.deepEqual(state.crossings,[1]);
  assert.equal(state.points,100);
});
test("expanded narration scripts match every lesson",()=>{
  const script=readFileSync(new URL("../../STAGE2_AUDIO_SCRIPT.md",import.meta.url),"utf8");
  for(const lesson of [...WORKSHOP_LESSONS,...CROSSING_LESSONS]) {
    assert.ok(script.includes(`| ${lesson.id}-Intro.wav | ${lesson.intro} |`),lesson.id);
    assert.ok(script.includes(`| ${lesson.id}-Success.wav | ${lesson.success} |`),lesson.id);
  }
});

test("visual Workshop narration is documented without missing lines",()=>{
  const script=readFileSync(new URL("../../STAGE2_AUDIO_SCRIPT.md",import.meta.url),"utf8");
  const practice=readFileSync(new URL("../src/app/components/BridgePractice.tsx",import.meta.url),"utf8");
  const entries=[...practice.matchAll(/explain\("(Workshop[^"]+\.wav)", "([^"]+)"\)/g)];
  assert.equal(entries.length,4);
  for(const [,file,line] of entries) assert.ok(script.includes(`| ${file} | ${line} |`),file);
});
