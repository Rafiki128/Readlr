import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK1_GUIDE_SKIPPED, BOOK1_GUIDE_STEPS, guideKey, guideProgress, nextGuideStep, type GuideStepId } from '../src/app/components/book1GuideSteps.ts';

const step = (id: GuideStepId) => BOOK1_GUIDE_STEPS.find(item => item.id === id)!;
const onScreen = (...ids: GuideStepId[]) => (selector: string) => ids.some(id => step(id).target === selector);
const ALL: GuideStepId[] = ['turn-page', 'first-stop', 'hear', 'find-letter', 'mic', 'drag-letter', 'sort-picture', 'help'];

test('steps run in the agreed order', () => {
  assert.deepEqual(BOOK1_GUIDE_STEPS.map(item => item.id), ALL);
});

test('each line is one short sentence', () => {
  for (const item of BOOK1_GUIDE_STEPS) {
    assert.ok(item.line.split(' ').length <= 8, item.line);
    assert.ok(item.line.endsWith('.'), item.line);
  }
});

test('only the help step is look-only and the drag step drags into a box', () => {
  assert.deepEqual(BOOK1_GUIDE_STEPS.filter(item => !item.interactive).map(item => item.id), ['help']);
  assert.equal(step('drag-letter').gesture, 'drag');
  assert.equal(step('drag-letter').dragTo, '[data-blend-slot]:not(.has-letter)');
  assert.equal(step('drag-letter').doneWhen, '[data-blend-slot].has-letter');
});

test('the orchard step drags mango to the m basket and ends when any picture is sorted', () => {
  const sort = step('sort-picture');
  assert.equal(sort.line, 'Drag the picture to its letter.');
  assert.equal(sort.gesture, 'drag');
  assert.equal(sort.target, '.gate-orchard .gate-piece[aria-label="mango"]');
  assert.equal(sort.dragTo, '.gate-orchard [data-gate-drop="m"]');
  assert.equal(sort.doneWhen, '.gate-orchard .gate-basket.is-filled');
  assert.equal(sort.interactive, true);
});

test('the help step only targets the word round Help button, not the sound lesson Mouth tip', () => {
  assert.equal(step('help').target, '.reading-round-footer .reading-help-button:has(.lucide-lightbulb)');
});

test('saved flags become progress', () => {
  const progress = guideProgress({ 'book1-guide:hear': true, [BOOK1_GUIDE_SKIPPED]: true, other: true });
  assert.deepEqual([...progress.done], ['hear']);
  assert.equal(progress.skipped, true);
  assert.equal(guideKey('mic'), 'book1-guide:mic');
  assert.equal(BOOK1_GUIDE_SKIPPED, 'book1-guide:skipped');
});

test('the next step is the first unfinished one on screen', () => {
  assert.equal(nextGuideStep(new Set(['turn-page']), false, onScreen('mic', 'find-letter'))?.id, 'find-letter');
});

test('steps do not wait for earlier ones', () => {
  assert.equal(nextGuideStep(new Set(), false, onScreen('drag-letter'))?.id, 'drag-letter');
});

test('skipped, finished or nothing on screen means no step', () => {
  assert.equal(nextGuideStep(new Set(), true, onScreen(...ALL)), null);
  assert.equal(nextGuideStep(new Set(ALL), false, onScreen(...ALL)), null);
  assert.equal(nextGuideStep(new Set(), false, () => false), null);
});
