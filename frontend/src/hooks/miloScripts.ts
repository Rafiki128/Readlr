import { learningVolume } from "./learningSettings";

// Recording-script ID -> approved Milo recording. Lines without an entry fall back to speech.
export const MILO_SCRIPT_FILES: Readonly<Record<string, string>> = {
  "HOME-001": "/audio/milo-ph/home/home-001.wav",
  "HOME-002": "/audio/milo-ph/home/home-002.wav",
  "HOME-003": "/audio/milo-ph/home/home-003.wav",
  "TOUR-001": "/audio/milo-ph/tour/tour-001.wav",
  "TOUR-002": "/audio/milo-ph/tour/tour-002.wav",
  "TOUR-003": "/audio/milo-ph/tour/tour-003.wav",
  "TOUR-004": "/audio/milo-ph/tour/tour-004.wav",
  "TOUR-005-REV": "/audio/milo-ph/tour/tour-005-rev.wav",
  "ORIENT-001": "/audio/milo-ph/orient/orient-001.wav",
  "ORIENT-002": "/audio/milo-ph/orient/orient-002.wav",
  "ORIENT-003": "/audio/milo-ph/orient/orient-003.wav",
  "ORIENT-004": "/audio/milo-ph/orient/orient-004.wav",
  "ORIENT-005": "/audio/milo-ph/orient/orient-005.wav",
  "ORIENT-006": "/audio/milo-ph/orient/orient-006.wav",
  "ORIENT-007": "/audio/milo-ph/orient/orient-007.wav",
  "ORIENT-MIC": "/audio/milo-ph/onboarding/tap-microphone-check.wav",
  "MIC-005": "/audio/milo-ph/onboarding/mic-heard-sound.wav",
  "MIC-006": "/audio/milo-ph/onboarding/mic-could-not-hear-voice.wav",
  "MIC-007": "/audio/milo-ph/onboarding/mic-access-not-allowed.wav",
  "MIC-008": "/audio/milo-ph/onboarding/mic-could-not-start.wav",
  "MIC-009": "/audio/milo-ph/onboarding/mic-listen-to-recording.wav",
  "MIC-010": "/audio/milo-ph/onboarding/mic-recording-could-not-play.wav",
  "MIC-011": "/audio/milo-ph/onboarding/mic-can-continue.wav",
  "ORIENT-SAY-M": "/audio/milo-ph/onboarding/your-turn-say-m.wav",
  "ORIENT-SAY-MA": "/audio/milo-ph/onboarding/your-turn-say-ma.wav",
  "ORIENT-SAY-AM": "/audio/milo-ph/onboarding/your-turn-say-am.wav",
  "ORIENT-SKIP": "/audio/milo-ph/onboarding/practices-later-first-book-ready.wav",
  "ORIENT-DONE": "/audio/milo-ph/onboarding/first-book-ready-begin-first-gate.wav",
};

export const miloLine = (id: string, text: string) => ({ file: MILO_SCRIPT_FILES[id] ?? "", text });

// One-shot playback for lines that must outlive their screen (e.g. the welcome-to-home transition).
let oneShot: HTMLAudioElement | null = null;
export function stopMiloScript() {
  if (!oneShot) return;
  oneShot.pause();
  oneShot = null;
}
// Resolves once any one-shot line has finished, so automatic narration never talks over it.
export function waitForMiloScript(): Promise<void> {
  const audio = oneShot;
  if (!audio || audio.paused || audio.ended) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { audio.removeEventListener("ended", done); audio.removeEventListener("pause", done); audio.removeEventListener("error", done); resolve(); };
    audio.addEventListener("ended", done);
    audio.addEventListener("pause", done);
    audio.addEventListener("error", done);
  });
}
/** Resolves with the line's length in seconds once it starts, or 0 if it cannot play. */
export function playMiloScript(id: string): Promise<number> {
  stopMiloScript();
  const file = MILO_SCRIPT_FILES[id];
  if (!file || learningVolume() === 0) return Promise.resolve(0);
  const audio = new Audio(file);
  audio.volume = learningVolume();
  oneShot = audio;
  return audio.play()
    .then(() => Number.isFinite(audio.duration) ? audio.duration : 0)
    .catch(() => { if (oneShot === audio) oneShot = null; return 0; });
}
