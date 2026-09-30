export type MiloVoice = "milo" | "classic";

// Canonical existing path -> new recording. Add entries only when files arrive.
// Keep original files: they remain the per-line fallback for both voice packs.
export const MILO_RECORDINGS: Readonly<Record<string, string>> = {};

export function classicRecordingPath(path: string): string {
  if (!path.startsWith("/audio/")) return path;
  const normalized = new URL(path, "https://readlr.invalid").pathname;
  return normalized.replace(/^(\/audio\/stage[123]\/)(?!classic-milo\/|default-milo\/)(.+)$/, "$1classic-milo/$2");
}

export function voiceCandidates(path: string, voice: MiloVoice, recordings = MILO_RECORDINGS): string[] {
  if (!/^\/audio\/(stage[123]|onboarding|common)\//.test(path)) return [path];
  const canonical = new URL(path, "https://readlr.invalid").pathname;
  const classic = classicRecordingPath(canonical);
  const preferred = voice === "milo" ? recordings[canonical] : undefined;
  return preferred && preferred !== classic ? [preferred, classic] : [classic];
}

// Preserve the HTMLAudioElement contract used by Stage 1's end/error handlers.
// A missing preferred recording is invisible to those handlers until fallback fails.
export function withVoiceFallback(audio: HTMLAudioElement, paths: string[]) {
  let index = 0;
  let pending: Promise<void> | null = null;
  const nativePlay = audio.play.bind(audio);
  const canRetry = () => index + 1 < paths.length && Boolean(audio.getAttribute("src"));
  audio.src = paths[0];
  audio.addEventListener("error", event => {
    if (!canRetry()) return;
    event.stopImmediatePropagation();
    if (!pending) {
      audio.src = paths[++index];
      void audio.play().catch(() => {});
    }
  }, true);
  audio.play = () => {
    if (pending) return pending;
    const attempt = async (): Promise<void> => {
      if (!audio.getAttribute("src")) throw new DOMException("Stopped", "AbortError");
      try { await nativePlay(); }
      catch (error) {
        const name = (error as Error).name;
        if (name === "AbortError" || name === "NotAllowedError" || !canRetry()) throw error;
        audio.src = paths[++index];
        await attempt();
      }
    };
    pending = Promise.resolve().then(attempt).finally(() => { pending = null; });
    return pending;
  };
  return audio;
}
