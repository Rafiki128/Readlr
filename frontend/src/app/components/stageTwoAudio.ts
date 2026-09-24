// Keep supplied filenames intact while the curriculum uses canonical names.
const RECORDING_ALIASES: Record<string, string> = {
  "PronounceHU.wav": "PronounceHU.wav.wav",
  "PronounceJA.wav": "PronounceJA.wav.wav",
};

export function resolveStageTwoAudioPath(path: string): string {
  const prefix = "/audio/stage2/";
  if (!path.startsWith(prefix)) return path;
  const name = path.slice(prefix.length);
  return `${prefix}${RECORDING_ALIASES[name] ?? name}`;
}
