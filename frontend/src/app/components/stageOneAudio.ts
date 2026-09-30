// Preserve the supplied recording filenames while keeping script names canonical.
const RECORDING_ALIASES: Record<string, string> = {
  "ChallengeELittleLightPath.wav": "ChallengeELittleLightPath.w.wav",
  "ChallengeIMissingMapLine.wav": "ChallengeIMissingMapLine.wa.wav",
};

export function resolveStageOneAudioPath(path: string): string {
  const prefix = "/audio/stage1/";
  if (!path.startsWith(prefix)) return path;
  const name = path.slice(prefix.length);
  if (name.startsWith("default-milo/")) return path;
  const filename = name.replace(/^classic-milo\//, "");
  return `${prefix}classic-milo/${RECORDING_ALIASES[filename] ?? filename}`;
}
