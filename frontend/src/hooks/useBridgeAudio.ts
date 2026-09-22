import { useEffect, useRef } from "react";
import { BRIDGE_LINES, type BridgeLine } from "../app/components/stageTwoContent";
import { stopAllGlobalAudio } from "./useAudioManager";
import { narrationLines } from "./bridgeNarrationLines";

export function useBridgeAudio() {
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
    return new Promise<void>((resolve, reject) => {
      const player = new Audio(path);
      audio.current = player;
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        cancelPending.current = null;
        player.onended = null;
        player.onerror = null;
        player.ontimeupdate = null;
        player.pause();
        if (audio.current === player) audio.current = null;
        error ? reject(error) : resolve();
      };
      cancelPending.current = () => finish(new DOMException("Stopped", "AbortError"));
      player.onended = () => finish();
      player.onerror = () => finish(new Error("Audio unavailable"));
      player.ontimeupdate = () => { if (Number.isFinite(player.duration) && player.duration > 0) onProgress?.(player.currentTime / player.duration); };
      player.play().catch(finish);
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
    try { await play(`/audio/stage2/${entry.file}`, fraction=>showPosition(fraction*total)); return; }
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
      speech.current = utterance;
      const finish = (error?: unknown) => {
        cancelPending.current = null;
        utterance.onend = null;
        utterance.onerror = null;
        speech.current = null;
        error ? reject(error) : resolve();
      };
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
