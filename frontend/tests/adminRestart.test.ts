import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('restart targets every game level and book checkpoint with explicit confirmation and scope',()=>{
  const source=readFileSync(new URL('../src/app/components/AdminProgressReset.tsx',import.meta.url),'utf8');
  assert.match(source,/scope: scope === 'all' \? 'learning-progress' : scope/);
  assert.match(source,/word !== 'RESET'/);
  assert.match(source,/All gameplay levels and ten book checkpoints/);
  assert.match(source,/One book/);
  assert.match(source,/One challenge or stop/);
  assert.match(source,/READING_CHAPTERS.map/);
});
test('a full restart clears guided-stop completion while retaining curriculum activity details',()=>{
  const source=readFileSync(new URL('../src/app/components/progressReset.ts',import.meta.url),'utf8');
  assert.match(source,/readlr_aral_reading_v1_/);
  assert.match(source,/readlr_aral_book_access_v1_/);
  assert.match(source,/readlr_aral_book_unlock_v1_/);
  assert.match(source,/if \(fullRestart\) resetLearnerBookStops\(learner\)/);
});
