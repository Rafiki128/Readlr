import test from 'node:test';
import assert from 'node:assert/strict';
import { claimMiloAudio, otherMiloAudioActive } from '../src/hooks/miloInstructionState.ts';

test('a new Milo instruction stops the one already speaking', () => {
  let firstStopped = 0;
  claimMiloAudio(true, () => { firstStopped++; });
  claimMiloAudio(true, () => {});
  assert.equal(firstStopped, 1);
});

test('the same instruction player claiming again does not stop itself', () => {
  let stopped = 0;
  const stop = () => { stopped++; };
  claimMiloAudio(true, stop);
  claimMiloAudio(true, stop);
  assert.equal(stopped, 0);
});

test('other Milo audio still stops the speaking instruction and is counted until released', () => {
  let stopped = 0;
  claimMiloAudio(true, () => { stopped++; });
  const release = claimMiloAudio(false, () => {});
  assert.equal(stopped, 1);
  assert.equal(otherMiloAudioActive(), true);
  release();
  assert.equal(otherMiloAudioActive(), false);
});
