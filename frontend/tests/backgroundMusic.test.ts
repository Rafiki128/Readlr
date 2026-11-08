import test from 'node:test';
import assert from 'node:assert/strict';
import { musicVolume, shouldPlayMusic } from '../src/hooks/backgroundMusic.ts';

const playing={loggedIn:true,enabled:true,started:true,hidden:false,micActive:false,volume:.2};
test('music plays only after login and a tap, and while nothing needs it quiet',()=>{
  assert.equal(shouldPlayMusic(playing),true);
  assert.equal(shouldPlayMusic({...playing,loggedIn:false}),false);
  assert.equal(shouldPlayMusic({...playing,started:false}),false);
  assert.equal(shouldPlayMusic({...playing,enabled:false}),false);
  assert.equal(shouldPlayMusic({...playing,hidden:true}),false);
  assert.equal(shouldPlayMusic({...playing,micActive:true}),false);
  assert.equal(shouldPlayMusic({...playing,volume:0}),false);
});
test('music stays below the voice and follows the Readlr volume',()=>{
  assert.ok(musicVolume(1)<1);
  assert.equal(musicVolume(0),0);
  assert.ok(musicVolume(.5)<musicVolume(1));
});
