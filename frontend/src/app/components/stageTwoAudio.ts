// Keep supplied filenames intact while the curriculum uses canonical names.
const RECORDING_ALIASES: Record<string, string> = {
  "PronounceHU.wav": "PronounceHU.wav.wav",
  "PronounceJA.wav": "PronounceJA.wav.wav",
};

export function resolveStageTwoAudioPath(path: string): string {
  const prefix = "/audio/stage2/";
  if (!path.startsWith(prefix)) return path;
  const name = path.slice(prefix.length);
  if (name.startsWith("default-milo/")) return path;
  const filename = name.replace(/^classic-milo\//, "");
  return `${prefix}classic-milo/${RECORDING_ALIASES[filename] ?? filename}`;
}
