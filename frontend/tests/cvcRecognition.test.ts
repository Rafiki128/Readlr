import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeCvcWord, CVC_TARGETS, CVC_TRANSCRIPTION_CONTEXT } from '../../backend/src/modules/audio/cvcRecognition.ts';
import { CVC_LESSONS } from '../src/app/components/cvcContent.ts';
import { createPracticeTracker, type PracticeAttempt } from '../src/hooks/practiceRecords.ts';
const quality=[{avg_logprob:-.2,no_speech_prob:.01,compression_ratio:1}];
test('word checking covers every CVC lesson and excludes isolated sounds',()=>{
  assert.deepEqual([...CVC_TARGETS].sort(),CVC_LESSONS.map(l=>l.word).sort());
  assert.equal(CVC_TARGETS.has('ma'),false);
});
test('tin context includes the entire curriculum without accepting ten or numerals as tin',()=>{
  for(const word of CVC_TARGETS) assert.ok(CVC_TRANSCRIPTION_CONTEXT.includes(word));
  assert.equal(judgeCvcWord('tin',' Tin.',quality).status,'matched');
  assert.equal(judgeCvcWord('tin',' 10.',quality).status,'different');
  assert.equal(judgeCvcWord('tin','ten',quality).status,'different');
});
test('exact recognized words and repetitions pass, substrings and extra words do not',()=>{
  for(const text of ['Map.','map map!','MAP']) assert.equal(judgeCvcWord('map',text,quality).status,'matched');
  for(const text of ['maple','cap','a map','m a p','map cap']) assert.equal(judgeCvcWord('map',text,quality).status,'different');
});
test('silence, missing metadata and uncertain recognition never award a match',()=>{
  assert.equal(judgeCvcWord('map','',quality).status,'uncertain');
  assert.equal(judgeCvcWord('map','map').status,'uncertain');
  for(const bad of [{avg_logprob:-2},{no_speech_prob:.9},{compression_ratio:3},{avg_logprob:NaN}])
    assert.equal(judgeCvcWord('map','map',[{...quality[0],...bad}]).status,'uncertain');
  assert.equal(judgeCvcWord('map','map',quality).pronunciationAccuracy,null);
});
test('recognition annotates the captured attempt without inventing pronunciation or fluency',()=>{
  const saved:PracticeAttempt[]=[];
  const tracker=createPracticeTracker(1,3,'lesson-2','map',r=>saved.push(r));
  tracker.begin();tracker.finish('voice_detected');tracker.recognize('different');
  const last=saved.at(-1)!;
  assert.equal(last.id,saved[0].id);assert.equal(last.wordRecognition,'different');
  assert.equal(last.correctiveFeedbackTriggered,true);assert.equal(last.accuracy,null);
  assert.equal(last.tier,null);assert.equal(last.selfCorrected,null);
});
