import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('submitted surveys expose learner and class reset controls',()=>{
  const source=readFileSync(new URL('../src/app/components/AdminSurvey.tsx',import.meta.url),'utf8');
  assert.match(source,/Reset all submissions/);
  assert.match(source,/Reset submitted survey/);
  assert.match(source,/target:resetTarget/);
  assert.match(source,/confirmation:resetWord/);
});
