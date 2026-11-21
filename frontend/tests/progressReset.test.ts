import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculumStateKey, readLearnerCurriculumState, resetLearnerBookStops } from '../src/hooks/learnerCurriculumState.ts';
import { resetLocalReadingBook, resetLocalReadingChallenge, readLocalReadingProgress, readGuidedReadingStops } from '../src/hooks/readingLocalProgress.ts';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('resetting book stops clears legacy and canonical completions but preserves activity details', () => {
  const original = globalThis.localStorage;
  const storage = new MemoryStorage();
  storage.setItem('readlr_aral_guided_v1_7', JSON.stringify(['gate:mango', 'gate:apple', 'gate:top']));
  storage.setItem('readlr_first_reward_v1_7', 'seen');
  storage.setItem('readlr_aral_carousel_v1_7', '5');
  storage.setItem(curriculumStateKey(7), JSON.stringify({
    schemaVersion: 1,
    campOrientationStep: 3,
    guidedStops: ['gate:mango', 'gate:apple', 'gate:top'],
    guidedActivities: { 'camp-orientation:complete': true },
    guidedRounds: { gate: { step: 2, spoken: ['map'] } },
    carouselFocus: 5,
    stickerBookOpened: true,
    soundRecordings: [{ word: 'map', recordedAt: '2026-11-21T00:00:00.000Z' }],
    updatedAt: '2026-11-20T00:00:00.000Z',
  }));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

  try {
    resetLearnerBookStops(7);
    assert.equal(storage.getItem('readlr_aral_guided_v1_7'), null);
    assert.equal(storage.getItem('readlr_first_reward_v1_7'), null);
    assert.deepEqual(readLearnerCurriculumState(7).guidedStops, []);
    assert.deepEqual(readLearnerCurriculumState(7).guidedActivities, { 'camp-orientation:complete': true });
    assert.equal(readLearnerCurriculumState(7).carouselFocus, 0);
    assert.deepEqual(readLearnerCurriculumState(7).guidedRounds, { gate: { step: 2, spoken: ['map'] } });
    assert.deepEqual(readLearnerCurriculumState(7).soundRecordings, [{ word: 'map', recordedAt: '2026-11-21T00:00:00.000Z' }]);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
  }
});

test('granular book and challenge resets remove only the selected scope', () => {
  const original = globalThis.localStorage;
  const storage = new MemoryStorage();
  storage.setItem('readlr_aral_reading_v1_7', JSON.stringify(['gate','lanterns','market']));
  storage.setItem('readlr_aral_guided_v1_7', JSON.stringify(['gate:mango','gate:apple','gate:blend','lanterns:games','lanterns:check']));
  storage.setItem(curriculumStateKey(7), JSON.stringify({
    schemaVersion: 1, campOrientationStep: 3, guidedStops:['gate:mango','gate:apple','gate:blend','lanterns:games','lanterns:check'],
    guidedActivities:{},guidedRounds:{},carouselFocus:2,stickerBookOpened:true,soundRecordings:[],updatedAt:new Date().toISOString(),
  }));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    resetLocalReadingChallenge(7,'lanterns','games');
    assert.deepEqual(readGuidedReadingStops(7),['gate:mango','gate:apple','gate:blend','lanterns:check']);
    assert.deepEqual(readLocalReadingProgress(7),['gate','lanterns','market']);

    resetLocalReadingBook(7,'gate');
    assert.deepEqual(readGuidedReadingStops(7),['lanterns:check']);
    assert.deepEqual(readLocalReadingProgress(7),[]);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
  }
});
