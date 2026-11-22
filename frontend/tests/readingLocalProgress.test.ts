import test from 'node:test';
import assert from 'node:assert/strict';
import { availableLocalReadingChapters, clearGuidedBlendStep, clearGuidedRoundStep, completeLocalReadingChapter, consumeReadingBookUnlock, queueReadingBookUnlock, readGuidedBlendStep, readGuidedReadingStops, readGuidedRoundStep, readLocalReadingProgress, readReadingAccessSnapshot, readReadingCarouselFocus, saveGuidedBlendStep, saveGuidedReadingStop, saveGuidedRoundStep, saveReadingAccessSnapshot, saveReadingCarouselFocus } from '../src/hooks/readingLocalProgress.ts';

test('device fallback advances only the next chapter and ignores malformed saved IDs',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);}}});
  assert.deepEqual(availableLocalReadingChapters([]),['gate']);
  const first=completeLocalReadingChapter(101,'gate');
  assert.deepEqual(availableLocalReadingChapters(first),['gate','lanterns']);
  assert.deepEqual(readLocalReadingProgress(102),[]);
  saved.set('readlr_aral_reading_v1_101',JSON.stringify(['gate','unknown']));
  assert.deepEqual(readLocalReadingProgress(101),['gate']);
});

test('device completion of a teacher-opened book survives out-of-order reads',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);}}});
  completeLocalReadingChapter(101,'lanterns');
  assert.deepEqual(readLocalReadingProgress(101),['lanterns']);
  assert.deepEqual(availableLocalReadingChapters(readLocalReadingProgress(101)),['gate','lanterns','market']);
  completeLocalReadingChapter(101,'gate');
  assert.deepEqual(readLocalReadingProgress(101),['gate','lanterns']);
});

test('Lantern Lane resumes its current challenge and lit words after reload',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);},removeItem:(key:string)=>{saved.delete(key);}}});
  saveGuidedRoundStep(101,'lanterns',{step:5,spoken:['sat','sit','sat']});
  assert.deepEqual(readGuidedRoundStep(101,'lanterns'),{step:5,spoken:['sat','sit']});
  assert.equal(readGuidedRoundStep(102,'lanterns'),null);
  clearGuidedRoundStep(101,'lanterns');
  assert.equal(readGuidedRoundStep(101,'lanterns'),null);
});

test('guided book stops survive reload and remain scoped to one learner',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);},removeItem:(key:string)=>{saved.delete(key);}}});
  assert.deepEqual(saveGuidedReadingStop(101,'mango'),['mango']);
  assert.deepEqual(saveGuidedReadingStop(101,'blend'),['mango','blend']);
  assert.deepEqual(saveGuidedReadingStop(101,'blend'),['mango','blend']);
  assert.deepEqual(readGuidedReadingStops(101),['mango','blend']);
  assert.deepEqual(readGuidedReadingStops(102),[]);
  saved.set('readlr_aral_guided_v1_103','not-json');
  assert.deepEqual(readGuidedReadingStops(103),[]);
  saveGuidedBlendStep(101,0,2);
  assert.equal(readGuidedBlendStep(101,0),2);
  assert.equal(readGuidedBlendStep(102,0),0);
  clearGuidedBlendStep(101,0);
  assert.equal(readGuidedBlendStep(101,0),0);
});

test('book access appearance survives reload and rejects unknown curriculum values',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);}}});
  saveReadingAccessSnapshot(101,{completed:['gate'],available:['gate','lanterns'],openChallenges:[1,2]});
  assert.deepEqual(readReadingAccessSnapshot(101),{completed:['gate'],available:['gate','lanterns'],openChallenges:[1,2]});
  assert.equal(readReadingAccessSnapshot(102),null);
  saved.set('readlr_aral_book_access_v1_103',JSON.stringify({completed:['unknown'],available:['gate','invented'],openChallenges:[0,1,99]}));
  assert.deepEqual(readReadingAccessSnapshot(103),{completed:[],available:['gate'],openChallenges:[1]});
});

test('book carousel focus survives reload and remains learner scoped',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);}}});
  assert.equal(readReadingCarouselFocus(101),null);
  saveReadingCarouselFocus(101,2);
  assert.equal(readReadingCarouselFocus(101),2);
  assert.equal(readReadingCarouselFocus(102),null);
  saveReadingCarouselFocus(null,4);
  assert.equal(saved.has('readlr_aral_carousel_v1_null'),false);
  saved.set('readlr_aral_carousel_v1_103','99');
  assert.equal(readReadingCarouselFocus(103),null);
});

test('a completed book hands the carousel one valid next-book unlock exactly once',()=>{
  const saved=new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);},removeItem:(key:string)=>{saved.delete(key);}}});
  queueReadingBookUnlock(101,0,1);
  assert.deepEqual(consumeReadingBookUnlock(101),{from:0,to:1});
  assert.equal(consumeReadingBookUnlock(101),null);
  queueReadingBookUnlock(101,1,4);
  assert.equal(consumeReadingBookUnlock(101),null);
  queueReadingBookUnlock(null,0,1);
  assert.equal(saved.has('readlr_aral_book_unlock_v1_null'),false);
});
