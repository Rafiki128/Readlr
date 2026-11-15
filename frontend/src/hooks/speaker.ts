// Milo has one voice: automatic lines wait their turn, sounds the child taps cut in.
type Turn = { owner: object; stop: () => void };
type Waiting = Turn & { start: (release: () => void) => void; drop: () => void };

export const SPEAKER_GAP_MS = 300;
const TAP_EVENTS = new Set(["click", "pointerdown", "pointerup", "touchend", "keydown", "keyup"]);
let current: Turn | null = null;
let queue: Waiting[] = [];
let gap: ReturnType<typeof setTimeout> | null = null;

const aborted = () => new DOMException("Stopped", "AbortError");

/** True while a tap or key press is being handled, so the sound it starts answers the child at once. */
export function fromTap() {
  const event = (globalThis as { event?: Event }).event;
  return Boolean(event && TAP_EVENTS.has(event.type));
}

function grant(turn: Turn) {
  current = turn;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (current !== turn) return;
    current = null;
    next();
  };
}

function next() {
  if (current || gap || !queue.length) return;
  gap = setTimeout(() => {
    gap = null;
    const waiting = queue.shift();
    if (waiting) waiting.start(grant(waiting));
  }, SPEAKER_GAP_MS);
}

/** Stops the current sound, drops every waiting line and returns the function that ends this new turn. */
export function interruptNow(owner: object, stop: () => void) {
  const previous = current;
  current = null;
  previous?.stop();
  const dropped = queue;
  queue = [];
  if (gap) { clearTimeout(gap); gap = null; }
  dropped.forEach(waiting => waiting.drop());
  return grant({ owner, stop });
}

/** Resolves with the function that ends this turn once every earlier sound has finished. */
export function waitTurn(owner: object, stop: () => void): Promise<() => void> {
  if (!current && !gap && !queue.length) return Promise.resolve(grant({ owner, stop }));
  return new Promise((resolve, reject) => {
    queue.push({ owner, stop, start: resolve, drop: () => reject(aborted()) });
  });
}

/** Cuts in when called from a tap, otherwise waits in line. */
export function takeTurn(owner: object, stop: () => void) {
  return fromTap() ? Promise.resolve(interruptNow(owner, stop)) : waitTurn(owner, stop);
}

/** Drops an owner's waiting lines and frees its turn; the owner silences its own audio. */
export function leave(owner: object) {
  const mine = queue.filter(waiting => waiting.owner === owner);
  queue = queue.filter(waiting => waiting.owner !== owner);
  mine.forEach(waiting => waiting.drop());
  if (current?.owner === owner) { current = null; next(); }
}

/** Silences whatever is playing and clears the line. */
export function stopSpeaker() {
  interruptNow({}, () => {})();
}

/** Plays an audio element as a tapped sound and frees the turn when it ends or pauses. */
export function playOnSpeaker(audio: HTMLAudioElement) {
  if (!audio.paused) return Promise.resolve();
  const release = interruptNow(audio, () => audio.pause());
  const done = () => {
    audio.removeEventListener("pause", done);
    audio.removeEventListener("ended", done);
    release();
  };
  audio.addEventListener("pause", done);
  audio.addEventListener("ended", done);
  return audio.play().catch(error => { done(); throw error; });
}

/** Plays a sound file as a tapped sound; rejects with AbortError when another sound cuts in. */
export function playClip(url: string) {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio unavailable"));
    audio.onpause = () => { if (!audio.ended) reject(aborted()); };
    playOnSpeaker(audio).catch(reject);
  });
}
