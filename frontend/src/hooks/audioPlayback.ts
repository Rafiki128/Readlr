export function playbackTimeout(duration: number) {
  // MediaRecorder WebM blobs can report Infinity until playback finishes.
  return Number.isFinite(duration) && duration > 0
    ? Math.min(300000, Math.max(15000, duration * 1000 + 10000))
    : 15000;
}

export function observeAudioActivity(player: EventTarget, onChange: (active: boolean) => void) {
  const start = () => onChange(true);
  const stop = () => onChange(false);
  const stopEvents = ["pause", "waiting", "ended", "error", "emptied"];
  player.addEventListener("playing", start);
  stopEvents.forEach(event => player.addEventListener(event, stop));
  return () => {
    player.removeEventListener("playing", start);
    stopEvents.forEach(event => player.removeEventListener(event, stop));
  };
}

export function startAudioPlayback(player: HTMLAudioElement, onProgress?: (fraction: number) => void) {
  let cancel = () => {};
  const done = new Promise<void>((resolve, reject) => {
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout>;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      player.onended = null;
      player.onerror = null;
      player.ontimeupdate = null;
      player.onloadedmetadata = null;
      player.pause();
      error ? reject(error) : resolve();
    };
    const armTimeout = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => finish(new Error("Audio stopped. Tap to try again.")), playbackTimeout(player.duration));
    };
    cancel = () => finish(new DOMException("Stopped", "AbortError"));
    player.onended = () => finish();
    player.onerror = () => finish(new Error("Audio could not play. Tap to try again."));
    player.onloadedmetadata = armTimeout;
    player.ontimeupdate = () => {
      if (Number.isFinite(player.duration) && player.duration > 0) onProgress?.(player.currentTime / player.duration);
    };
    armTimeout();
    try { player.play().catch(finish); } catch (error) { finish(error); }
  });
  return { done, cancel: () => cancel() };
}
