import { learningVolume } from "./learningSettings.ts";

const MUSIC_FILE = "/audio/music/the-mountain-retro-game.mp3";
const OFF_KEY = "readlr_music_off";
// The track plays well below Milo's voice so small sound differences stay audible.
const MUSIC_LEVEL = 0.1;

export const musicVolume = (settingsVolume: number) => Math.max(0, Math.min(1, settingsVolume * MUSIC_LEVEL));

export function shouldPlayMusic(state: { loggedIn: boolean; enabled: boolean; started: boolean; hidden: boolean; micActive: boolean; volume: number }) {
  return state.loggedIn && state.enabled && state.started && !state.hidden && !state.micActive && state.volume > 0;
}

let player: HTMLAudioElement | null = null;
let started = false;
let loggedIn = false;
let enabled = true;
const micTracks = new Set<MediaStreamTrack>();

function sync() {
  if (!player) return;
  micTracks.forEach(track => { if (track.readyState === "ended") micTracks.delete(track); });
  const volume = musicVolume(learningVolume());
  player.volume = volume;
  const play = shouldPlayMusic({ loggedIn, enabled, started, hidden: document.hidden, micActive: micTracks.size > 0, volume });
  if (play && player.paused) void player.play().catch(() => {});
  if (!play && !player.paused) player.pause();
}

export const backgroundMusicEnabled = () => enabled;

// Each login starts the track from the beginning.
export function setBackgroundMusicLoggedIn(value: boolean) {
  if (loggedIn === value) return;
  loggedIn = value;
  sync();
  if (!value && player) player.currentTime = 0;
}

export function setBackgroundMusicEnabled(value: boolean) {
  enabled = value;
  try { value ? localStorage.removeItem(OFF_KEY) : localStorage.setItem(OFF_KEY, "1"); } catch { /* the choice lasts for this visit */ }
  sync();
}

export function startBackgroundMusic() {
  if (player) return;
  try { enabled = localStorage.getItem(OFF_KEY) !== "1"; } catch { enabled = true; }
  player = new Audio(MUSIC_FILE);
  player.loop = true;
  player.preload = "auto";
  // Browsers block sound until the first tap or key press.
  const begin = () => { started = true; sync(); };
  window.addEventListener("pointerdown", begin, { capture: true, once: true });
  window.addEventListener("keydown", begin, { capture: true, once: true });
  document.addEventListener("visibilitychange", sync);
  // Music would reach the microphone and could pass as the child's voice, so it waits while one is open.
  const media = navigator.mediaDevices;
  if (media?.getUserMedia) {
    const open = media.getUserMedia.bind(media);
    media.getUserMedia = async constraints => {
      const stream = await open(constraints);
      stream.getAudioTracks().forEach(track => micTracks.add(track));
      sync();
      return stream;
    };
  }
  // Also picks up Settings volume changes and microphones that have closed.
  setInterval(sync, 250);
}
