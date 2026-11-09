import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLine, recordedLine } from '../src/hooks/recordedLines.ts';

const lines={'let us listen back you can try the word again':'/audio/milo-voice/retry.wav','fan':'/audio/milo-voice/fan.wav'};
test('screen text finds its recording despite punctuation, curly quotes and contractions',()=>{
  assert.equal(normalizeLine('Let’s listen back. You can try the word again.'),'let us listen back you can try the word again');
  assert.equal(recordedLine('Let’s listen back. You can try the word again.',lines),'/audio/milo-voice/retry.wav');
});
test('single words keep their own word recordings',()=>{
  assert.equal(recordedLine('fan',lines),undefined);
  assert.equal(recordedLine('Something nobody recorded.',lines),undefined);
});
