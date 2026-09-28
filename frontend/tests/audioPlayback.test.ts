import test from "node:test";
import assert from "node:assert/strict";
import { playbackTimeout, startAudioPlayback } from "../src/hooks/audioPlayback.ts";

function audio(duration=4, play=()=>Promise.resolve()) {
  return {duration,currentTime:0,onended:null,onerror:null,onloadedmetadata:null,ontimeupdate:null,play,pause:()=>{}} as unknown as HTMLAudioElement;
}
test("recorded WebM with unknown or infinite duration always has a finite watchdog",()=>{
  for(const value of [Infinity,NaN,0,-1]) assert.equal(playbackTimeout(value),15000);
  assert.equal(playbackTimeout(4),15000);
  assert.equal(playbackTimeout(30),40000);
  assert.equal(playbackTimeout(1e9),300000);
});
test("normal replay finishes only when ended and cleans up handlers",async()=>{
  const player=audio();const playback=startAudioPlayback(player);
  player.onended!(new Event("ended"));await playback.done;
  assert.equal(player.onerror,null);assert.equal(player.onloadedmetadata,null);
});
test("infinite duration does not immediately interrupt playback",async(t)=>{
  t.mock.timers.enable({apis:["setTimeout"]});
  const player=audio(Infinity);const playback=startAudioPlayback(player);
  player.onloadedmetadata!(new Event("loadedmetadata"));
  t.mock.timers.tick(4000);
  assert.notEqual(player.onended,null);
  player.onended!(new Event("ended"));await playback.done;
});
test("stalled playback rejects instead of leaving the challenge waiting forever",async(t)=>{
  t.mock.timers.enable({apis:["setTimeout"]});
  const playback=startAudioPlayback(audio(Infinity));
  const result=assert.rejects(playback.done,/Tap to try again/);
  t.mock.timers.tick(15000);await result;
});
test("decoder errors and blocked autoplay both return control to the challenge",async()=>{
  const player=audio();const playback=startAudioPlayback(player);
  player.onerror!(new Event("error"));await assert.rejects(playback.done,/could not play/);
  const blocked=startAudioPlayback(audio(4,()=>Promise.reject(new DOMException("Blocked","NotAllowedError"))));
  await assert.rejects(blocked.done,{name:"NotAllowedError"});
});
test("leaving a challenge cancels playback without reporting successful completion",async()=>{
  const player=audio();const playback=startAudioPlayback(player);
  playback.cancel();await assert.rejects(playback.done,{name:"AbortError"});
  assert.equal(player.onended,null);
});
