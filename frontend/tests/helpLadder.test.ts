import test from 'node:test';
import assert from 'node:assert/strict';
import { READING_CHAPTERS, makeReadingRound, type ReadingTask } from '../src/app/components/aralCurriculum.ts';
import { choiceHintClass, fadedChoice, helpEvidence, helpLadder, hintLine, hintNeedsWord, missLine, mouthTip, showMeOrder } from '../src/app/components/helpLadder.ts';

const task = (partial: Partial<ReadingTask>): ReadingTask => ({ word: 'sat', kind: 'build', options: ['sat'], missing: 0, ...partial });

test('every practice task offers two hints before its last step', () => {
  for (const chapter of READING_CHAPTERS) {
    for (const item of makeReadingRound(chapter, false, () => 0.3)) {
      const ladder = helpLadder(item, { train: chapter.id === 'gate' && item.kind === 'build' });
      assert.equal(ladder.length, 3, `${chapter.id} ${item.kind} ${item.word}`);
      assert.equal(new Set(ladder).size, 3, `${chapter.id} ${item.word} repeats a hint`);
    }
  }
});

test('each task type climbs from gentle hints to showing the answer', () => {
  assert.deepEqual(helpLadder(task({ kind: 'build' })), ['hear_point', 'glow_tile', 'show_me']);
  assert.deepEqual(helpLadder(task({ kind: 'build', word: 'am' }), { train: true }), ['hear_word', 'mouth_tip', 'show_me']);
  assert.deepEqual(helpLadder(task({ kind: 'repair', missing: 1 })), ['mouth_tip', 'fewer_choices', 'show_me']);
  assert.deepEqual(helpLadder(task({ kind: 'change', missing: 0 })), ['mouth_tip', 'fewer_choices', 'show_me']);
  assert.deepEqual(helpLadder(task({ kind: 'listen' })), ['mouth_tip', 'fewer_choices', 'show_me']);
  assert.deepEqual(helpLadder(task({ kind: 'meaning', clue: 'Milo ___ beside the lantern.' })), ['hear_story', 'fewer_choices', 'show_me']);
  assert.deepEqual(helpLadder(task({ kind: 'read' })), ['picture', 'mouth_tip', 'hear_word']);
});

test('mouth tips name the sound the child is looking for', () => {
  assert.equal(mouthTip(task({ word: 'sat', kind: 'listen' })), 'Let air flow like a quiet hiss.');
  assert.equal(mouthTip(task({ word: 'sit', kind: 'repair', missing: 1 })), 'Listen to the short i at the start of insect.');
  assert.equal(mouthTip(task({ word: 'kite', kind: 'repair', missing: 3 })), 'Compare kit and kite. The silent e changes the vowel.');
  assert.equal(mouthTip(task({ word: 'tree', kind: 'repair', missing: 3 })), 'The two e letters work together in tree.');
  assert.equal(mouthTip(task({ word: 'cube', kind: 'listen' })), 'In cup, c has the same first sound as kite.');
});

test('every practice task has a mouth tip where its ladder uses one', () => {
  for (const chapter of READING_CHAPTERS) {
    for (const item of makeReadingRound(chapter, false, () => 0.7)) {
      if (helpLadder(item, { train: chapter.id === 'gate' && item.kind === 'build' }).includes('mouth_tip')) assert.ok(mouthTip(item), `${chapter.id} ${item.word}`);
    }
  }
});

test('fewer choices fades one wrong answer and never the right one', () => {
  assert.equal(fadedChoice(['sit', 'sat', 'set'], 'sat'), 'sit');
  assert.equal(fadedChoice(['sat', 'set'], 'sat'), 'set');
  assert.equal(fadedChoice(['sat'], 'sat'), null);
});

test('show me places each tile once in reading order', () => {
  const tiles = [{ letter: 't', id: 0 }, { letter: 'e', id: 1 }, { letter: 'e', id: 2 }, { letter: 'f', id: 3 }];
  assert.deepEqual(showMeOrder('feet', tiles), [3, 1, 2, 0]);
});

test('used hints are disclosed in evidence without overstating them', () => {
  const build = task({ kind: 'build' });
  assert.deepEqual(helpEvidence(build, 0), { hintCount: 0, modelExposed: false, answerExposed: false, reducedChoices: false });
  assert.deepEqual(helpEvidence(build, 1), { hintCount: 1, modelExposed: true, answerExposed: false, reducedChoices: false });
  assert.deepEqual(helpEvidence(build, 2), { hintCount: 2, modelExposed: true, answerExposed: true, reducedChoices: false });
  const listen = task({ kind: 'listen' });
  assert.deepEqual(helpEvidence(listen, 2), { hintCount: 2, modelExposed: false, answerExposed: false, reducedChoices: true });
  assert.deepEqual(helpEvidence(listen, 3), { hintCount: 3, modelExposed: false, answerExposed: true, reducedChoices: true });
});

test('Milo lines stay short and gentle', () => {
  for (const line of [missLine(), ...(['hear_point', 'glow_tile', 'fewer_choices', 'hear_story', 'picture', 'hear_word', 'show_me'] as const).map(hint => hintLine(hint, task({})))]) {
    assert.ok(line.split(' ').length <= 8, line);
    assert.doesNotMatch(line, /wrong|no!|bad/i);
  }
});

test('hints on tasks that unlock after listening also play the word', () => {
  for (const kind of ['repair', 'change', 'listen'] as const) assert.equal(hintNeedsWord(task({ kind })), true, kind);
  for (const kind of ['build', 'meaning', 'read'] as const) assert.equal(hintNeedsWord(task({ kind })), false, kind);
});

test('hint marks on choices clear once the word is solved', () => {
  const letters = ['f', 'i', 'n'];
  assert.equal(choiceHintClass(['mouth_tip', 'fewer_choices'], letters, 'f', 'i', false), 'is-faded');
  assert.equal(choiceHintClass(['mouth_tip', 'fewer_choices', 'show_me'], letters, 'f', 'f', false), 'is-hint');
  assert.equal(choiceHintClass(['mouth_tip'], letters, 'f', 'i', false), undefined);
  for (const choice of letters) assert.equal(choiceHintClass(['mouth_tip', 'fewer_choices', 'show_me'], letters, 'f', choice, true), undefined);
});

test('fewer choices fades the wrong choice the child already tried, so a real choice remains', () => {
  assert.equal(fadedChoice(['pot', 'top', 'hot'], 'hot', ['top']), 'top');
  assert.equal(fadedChoice(['pot', 'top', 'hot'], 'hot', []), 'pot');
  assert.equal(choiceHintClass(['mouth_tip', 'fewer_choices'], ['pot', 'top', 'hot'], 'hot', 'top', false, ['top']), 'is-faded');
  assert.equal(choiceHintClass(['mouth_tip', 'fewer_choices'], ['pot', 'top', 'hot'], 'hot', 'pot', false, ['top']), undefined);
});
