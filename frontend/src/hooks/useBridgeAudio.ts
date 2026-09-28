import { useEffect, useRef } from "react";
import { BRIDGE_LINES, type BridgeLine } from "../app/components/stageTwoContent";
import { stopAllGlobalAudio } from "./useAudioManager";
import { narrationLines } from "./bridgeNarrationLines";
import { resolveStageTwoAudioPath } from "../app/components/stageTwoAudio";
import { learningVolume } from "./learningSettings";
import { startAudioPlayback } from "./audioPlayback";

export function useBridgeAudio(basePath = "/audio/stage2") {
  const audio = useRef<HTMLAudioElement | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelPending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  function stop() {
    generation.current++;
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

  function play(path: string, onProgress?: (fraction: number) => void) {
    const player = new Audio(resolveStageTwoAudioPath(path));
    player.volume = learningVolume();
    audio.current = player;
    const playback = startAudioPlayback(player, onProgress);
    cancelPending.current = playback.cancel;
    return playback.done.finally(() => {
      if (cancelPending.current === playback.cancel) cancelPending.current = null;
      if (audio.current === player) audio.current = null;
    });
  }

  async function narrateText(entry: { file: string; text: string }, onLine?: (line: string) => void) {
    const current = generation.current;
    const lines = narrationLines(entry.text);
    const total = lines.reduce((sum,line)=>sum+line.length,0);
    const showPosition = (position: number) => {
      let end = 0;
      onLine?.(lines.find(line => { end += line.length; return position < end; }) ?? lines[lines.length-1]);
    };
    onLine?.(lines[0]);
    // Full recordings have no cue sheet yet; distribute captions by text length.
    try { if (!entry.file) throw new Error("Use speech"); await play(`${basePath}/${entry.file}`, fraction=>showPosition(fraction*total)); return; }
    catch (error) {
      if (generation.current !== current || (error as Error).name === "AbortError") throw error;
    }
    for (const line of lines) {
    if (generation.current !== current) throw new DOMException("Stopped", "AbortError");
    onLine?.(line);
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
      utterance.onerror = event => finish(event.error === "not-allowed" ? new DOMException("Tap to enable sound", "NotAllowedError") : new Error("Narration unavailable"));
      window.speechSynthesis.speak(utterance);
    });
    }
  }

  useEffect(() => {
    stopAllGlobalAudio();
    return stop;
  }, []);
  return { play, narrate: (line: BridgeLine) => narrateText(BRIDGE_LINES[line]), narrateText, wait, stop };
}
