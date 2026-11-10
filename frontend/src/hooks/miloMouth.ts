import { useSyncExternalStore } from "react";

// Rhubarb Lip Sync mouth shapes: A closed (m, b, p), B slightly open (most consonants, ee),
// C open (eh, ae), D wide open (ah), E rounded (aw, er), F puckered (oo, w), G f/v, H l, X resting.
export type MouthShape = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";
export interface MouthCues { d: number; c: [number, MouthShape][] }

// Each recording X.wav may have a cue file X.lip.json made by scripts/generate-mouth-cues.mjs.
export function cueUrl(src: string): string | null {
  try {
    const url = new URL(src, globalThis.location?.href ?? "http://localhost/");
    if (url.origin !== (globalThis.location?.origin ?? url.origin) || !/\.wav$/i.test(url.pathname)) return null;
    return url.pathname.replace(/\.wav$/i, ".lip.json");
  } catch { return null; }
}

/** The mouth shape at a playback time, or X before the first cue. */
export function shapeAt(cues: MouthCues, time: number): MouthShape {
  let low = 0, high = cues.c.length - 1, found: MouthShape = "X";
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cues.c[mid][0] <= time) { found = cues.c[mid][1]; low = mid + 1; } else high = mid - 1;
  }
  return found;
}

const cache = new Map<string, Promise<MouthCues | null>>();
function loadCues(url: string) {
  let cues = cache.get(url);
  if (!cues) {
    cues = fetch(url).then(res => (res.ok ? res.json() as Promise<MouthCues> : null)).catch(() => null);
    cache.set(url, cues);
  }
  return cues;
}

let current: MouthShape | null = null;
let owner: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();
function setShape(next: MouthShape | null) {
  if (next === current) return;
  current = next;
  listeners.forEach(listener => listener());
}

/** Drives Milo's mouth from this recording while it plays. Returns a cleanup function. */
export function trackMouth(audio: HTMLAudioElement): () => void {
  // Only real audio elements in a browser can drive the mouth.
  if (typeof audio?.addEventListener !== "function" || typeof requestAnimationFrame !== "function") return () => {};
  let frame = 0, cues: MouthCues | null = null, cuesFor = "", alive = true;
  const tick = () => {
    if (!alive || owner !== audio) return;
    if (cues) setShape(shapeAt(cues, audio.currentTime));
    frame = requestAnimationFrame(tick);
  };
  const onPlaying = () => {
    const url = cueUrl(audio.currentSrc || audio.src);
    if (!url) return;
    owner = audio;
    if (url !== cuesFor) {
      cuesFor = url; cues = null;
      void loadCues(url).then(loaded => { if (alive && cuesFor === url) cues = loaded; });
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  };
  const onStop = () => {
    cancelAnimationFrame(frame);
    if (owner === audio) { owner = null; setShape(null); }
  };
  const stopEvents = ["pause", "ended", "error", "emptied"];
  audio.addEventListener("playing", onPlaying);
  stopEvents.forEach(event => audio.addEventListener(event, onStop));
  return () => {
    alive = false;
    onStop();
    audio.removeEventListener("playing", onPlaying);
    stopEvents.forEach(event => audio.removeEventListener(event, onStop));
  };
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
/** The mouth shape of the recording playing now, or null when no cued recording is playing. */
export function useMiloMouth(): MouthShape | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
