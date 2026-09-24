import { test } from "node:test";
import assert from "node:assert/strict";
import { cvcLetterTray, cvcWordChoices, placeCvcLetter, cvcPuzzleLine } from "../src/app/components/cvcContent.ts";
import { CVC_LESSONS, CROWN_WORDS, cvcChoices, cvcHasVoice, cvcStorageKey, emptyCvcJourney, finishCvcLesson, normalizeCvcJourney, restoreCrownJewel } from "../src/app/components/cvcContent.ts";

test("nineteen ordered CVC words and a three-stage finale",()=> {
  assert.equal(CVC_LESSONS.length,19);
  CVC_LESSONS.forEach((lesson,i)=>{assert.equal(lesson.id,i+1);assert.match(lesson.word,/^[b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z]$/);});
  assert.deepEqual(CROWN_WORDS,["a","ma","map"]);
  assert.equal(new Set(CVC_LESSONS.map(l=>l.word[1])).size,5);
  assert.equal(new Set(CVC_LESSONS.map(l=>l.mode)).size,7);
});
test("letter trays support ordered building and reject out-of-order taps",()=> {
  for(const lesson of CVC_LESSONS.filter(l=>l.mode==="build")) {
    const tray=cvcLetterTray(lesson);
    assert.equal(tray.length,4);
    assert.equal(new Set(tray).size,4);
    let placed="";
    assert.equal(placeCvcLetter(lesson.word,placed,lesson.word[2]),"");
    for(const letter of lesson.word) { assert.ok(tray.includes(letter)); placed=placeCvcLetter(lesson.word,placed,letter); }
    assert.equal(placed,lesson.word);
    assert.equal(placeCvcLetter(lesson.word,placed,lesson.word[0]),placed);
  }
});
test("word-choice puzzles contrast the vowel and include one correct answer",()=> {
  for(const lesson of CVC_LESSONS.filter(l=>l.mode==="match")) {
    const choices=cvcWordChoices(lesson);
    assert.equal(new Set(choices).size,3);
    assert.equal(choices.filter(word=>word===lesson.word).length,1);
    assert.ok(choices.every(word=>word[0]===lesson.word[0]&&word[2]===lesson.word[2]));
  }
});
test("each interactive mode has a child-facing puzzle prompt",()=> {
  for(const lesson of CVC_LESSONS.filter(l=>l.mode!=="read")) assert.ok(cvcPuzzleLine(lesson).length>10);
  assert.equal(CVC_LESSONS[15].mode,"read");
});
test("all missing-letter choices include the answer without duplicates",()=> {
  for(const lesson of CVC_LESSONS.filter(l=>["middle","ending","change"].includes(l.mode))) {
    const choices=cvcChoices(lesson);
    assert.equal(choices.length,3);
    assert.equal(new Set(choices).size,3);
    assert.ok(choices.includes(lesson.word[lesson.mode==="ending"?2:1]));
    if(lesson.from) assert.equal(lesson.from[0]+lesson.from[2],lesson.word[0]+lesson.word[2]);
  }
});
test("cannot skip lessons or award duplicate progress on replay",()=> {
  const initial=emptyCvcJourney();
  assert.deepEqual(finishCvcLesson(initial,2),initial);
  const completed=finishCvcLesson(initial,1);
  assert.equal(completed.completed,1);
  assert.deepEqual(finishCvcLesson(completed,1),completed);
});
test("crown remains locked until all word spells are complete",()=> {
  assert.deepEqual(restoreCrownJewel(emptyCvcJourney(),0),emptyCvcJourney());
  let journey=emptyCvcJourney();
  for(let id=1;id<=19;id++) journey=finishCvcLesson(journey,id);
  assert.equal(journey.completed,19);
  assert.equal(finishCvcLesson(journey,20).completed,19);
  assert.deepEqual(restoreCrownJewel(journey,1),journey);
});
test("each jewel resumes independently, final completion only after all three",()=> {
  let journey=normalizeCvcJourney({version:1,completed:19,jewels:0});
  for(let index=0;index<3;index++) {
    journey=restoreCrownJewel(journey,index);
    assert.equal(journey.jewels,index+1);
    assert.equal(journey.completed,index===2?20:19);
    assert.deepEqual(normalizeCvcJourney(JSON.parse(JSON.stringify(journey))),journey);
    assert.deepEqual(restoreCrownJewel(journey,index),journey);
  }
});
test("legacy and malformed data never grant the new crown",()=> {
  for(const invalid of [null,12,{},[],{version:2,completed:20,jewels:3}]) assert.deepEqual(normalizeCvcJourney(invalid),emptyCvcJourney());
  assert.equal(normalizeCvcJourney({version:1,completed:20,jewels:0}).completed,19);
  assert.equal(normalizeCvcJourney({version:1,completed:3,jewels:3}).jewels,0);
  assert.equal(normalizeCvcJourney({version:1,completed:NaN,jewels:Infinity}).completed,0);
});
test("learner-scoped keys and no persistent guest data",()=> {
  assert.equal(cvcStorageKey(null),null);
  assert.notEqual(cvcStorageKey(1),cvcStorageKey(2));
});
test("quiet, short, or empty capture never wins",()=> {
  assert.equal(cvcHasVoice(0,0,20000),false);
  assert.equal(cvcHasVoice(.03,2,20000),false);
  assert.equal(cvcHasVoice(.03,8,0),false);
  assert.equal(cvcHasVoice(.03,8,20000),true);
});
