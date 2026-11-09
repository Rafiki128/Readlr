import { useEffect, useRef, useState } from "react";
import { BRIDGE_LINES, type BridgeLine } from "../app/components/stageTwoContent";
import { stopAllGlobalAudio } from "./useAudioManager";
import { narrationLines } from "./bridgeNarrationLines";
import { resolveStageTwoAudioPath } from "../app/components/stageTwoAudio";
import { getLearningSettings, learningVolume } from "./learningSettings";
import { voiceCandidates, withVoiceFallback } from "./miloVoice";
import { resolveStageOneAudioPath } from "../app/components/stageOneAudio";
import { observeAudioActivity, startAudioPlayback } from "./audioPlayback";
import { recordedLine } from "./recordedLines";
import { claimMiloAudio } from "./miloInstructionState";

export function useBridgeAudio(basePath = "/audio/stage2", { instruction = false } = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const mounted = useRef(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelPending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  function stop() {
    generation.current++;
    if (mounted.current) setIsPlaying(false);
    cancelPending.current?.();
    cancelPending.current = null;
    if (timer.current) clearTimeout(timer.current);
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current.removeAttribute("src");
      audio.current.load();
      audio.current = null;
    }
    if (speech.current) {
      speech.current.onend = null;
      speech.current.onerror = null;
      window.speechSynthesis?.cancel();
      speech.current = null;
    }
  }

  function wait(ms: number) {
    return new Promise<void>((resolve, reject) => {
      cancelPending.current = () => reject(new DOMException("Stopped", "AbortError"));
      timer.current = setTimeout(() => { cancelPending.current = null; resolve(); }, ms);
    });
  }

  const claim = () => claimMiloAudio(instruction, stop);

  function play(path: string, onProgress?: (fraction: number) => void) {
    const release = claim();
    const paths = voiceCandidates(path, getLearningSettings().milo_voice)
      .map(candidate => resolveStageTwoAudioPath(resolveStageOneAudioPath(candidate)));
    const player = withVoiceFallback(new Audio(), paths);
    player.volume = learningVolume();
    audio.current = player;
    const unobserve = observeAudioActivity(player, active => {
      if (mounted.current && audio.current === player) setIsPlaying(active);
    });
    const playback = startAudioPlayback(player, onProgress);
    cancelPending.current = playback.cancel;
    return playback.done.finally(() => {
      release();
      unobserve();
      if (cancelPending.current === playback.cancel) cancelPending.current = null;
      if (audio.current === player) { audio.current = null; if (mounted.current) setIsPlaying(false); }
    });
  }

  async function narrateText(entry: { file: string; text: string }, onLine?: (line: string) => void) {
    const release = claim();
    try { await narrateLines(entry, onLine); } finally { release(); }
  }

  async function narrateLines(entry: { file: string; text: string }, onLine?: (line: string) => void) {
    const current = generation.current;
    const lines = narrationLines(entry.text);
    const total = lines.reduce((sum,line)=>sum+line.length,0);
    const showPosition = (position: number) => {
      let end = 0;
      onLine?.(lines.find(line => { end += line.length; return position < end; }) ?? lines[lines.length-1]);
    };
    onLine?.(lines[0]);
    const stopped = (error: unknown) => generation.current !== current || ["AbortError", "NotAllowedError"].includes((error as Error).name);
    // A new-voice recording of the exact words comes first, then the line's own file.
    // Full recordings have no cue sheet yet; distribute captions by text length.
    for (const file of [recordedLine(entry.text), entry.file && (entry.file.startsWith("/") ? entry.file : `${basePath}/${entry.file}`)]) {
      if (!file) continue;
      try { await play(file,fraction=>showPosition(fraction*total)); return; }
      catch (error) { if (stopped(error)) throw error; }
    }
    for (const line of lines) {
    if (generation.current !== current) throw new DOMException("Stopped", "AbortError");
    onLine?.(line);
    const lineRecording = lines.length > 1 ? recordedLine(line) : undefined;
    if (lineRecording) {
      try { await play(lineRecording); continue; }
      catch (error) { if (stopped(error)) throw error; }
    }
    await new Promise<void>((resolve, reject) => {
      if (!window.speechSynthesis) { reject(new Error("Narration unavailable")); return; }
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.rate = .84;
      utterance.volume = learningVolume();
      speech.current = utterance;
      const finish = (error?: unknown) => {
        clearTimeout(watchdog);
        cancelPending.current = null;
        utterance.onend = null;
        utterance.onerror = null;
        utterance.onstart = null;
        utterance.onpause = null;
        utterance.onresume = null;
        if (mounted.current) setIsPlaying(false);
        speech.current = null;
        error ? reject(error) : resolve();
      };
      const watchdog = setTimeout(() => {
        finish(new Error("Narration stopped. Tap to try again."));
        window.speechSynthesis.cancel();
      }, Math.max(15000, line.length * 150));
      cancelPending.current = () => {
        finish(new DOMException("Stopped", "AbortError"));
        window.speechSynthesis.cancel();
      };
      utterance.onend = () => finish();
      utterance.onstart = utterance.onresume = () => { if (mounted.current) setIsPlaying(true); };
      utterance.onpause = () => { if (mounted.current) setIsPlaying(false); };
      utterance.onerror = event => finish(event.error === "not-allowed" ? new DOMException("Tap to enable sound", "NotAllowedError") : new Error("Narration unavailable"));
      window.speechSynthesis.speak(utterance);
    });
    }
  }

  useEffect(() => {
    mounted.current = true;
    if (!instruction) stopAllGlobalAudio();
    return () => { mounted.current = false; stop(); };
  }, []);
  return { play, narrate: (line: BridgeLine) => narrateText(BRIDGE_LINES[line]), narrateText, wait, stop, isPlaying };
}
