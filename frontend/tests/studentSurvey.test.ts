import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('survey waits for the spoken question before enabling hover choice audio',()=>{
  const source=readFileSync(new URL('../src/app/components/StudentSurvey.tsx',import.meta.url),'utf8');
  assert.match(source,/choicesReady/);
  assert.match(source,/choicesReady&&guidedChoice<0/);
  assert.match(source,/if\(step===0\)/);
  assert.match(source,/setGuidedChoice\(i\)/);
  assert.match(source,/await say\(`\$\{lang\}\/face-\$\{i\+1\}`\)/);
  assert.match(source,/say\(prompt\)/);
  assert.match(source,/Start this statement synchronously/);
  assert.match(source,/void say\(`\$\{language\}\/q01`\)/);
  assert.match(source,/aria-busy=\{!choicesReady\} disabled=\{!choicesReady\}/);
});

test('survey faces and choice artwork have hover whimsy and a guided highlight',()=>{
  const source=readFileSync(new URL('../src/app/components/studentSurvey.css',import.meta.url),'utf8');
  assert.match(source,/survey-face-very-sad/);
  assert.match(source,/survey-face-a-little/);
  assert.match(source,/survey-face-okay/);
  assert.match(source,/survey-face-like/);
  assert.match(source,/survey-face-really-like/);
  assert.match(source,/survey-choice-bounce/);
  assert.match(source,/label\.is-guided/);
});
