export const LIBRARY_VOWELS = "AEIOU".split("");
export const LIBRARY_CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");
export type SoundGroup = "vowels" | "blends" | "words";
export function soundPath(group: SoundGroup, sound: string) {
  return `/audio/stage${group === "vowels" ? 1 : group === "blends" ? 2 : 3}/${group === "vowels" ? "" : "Pronounce"}${sound.toUpperCase()}.wav`;
}
export function libraryStageOpen(stage: number, completed: Record<number, number>) {
  return stage === 1 || (completed[stage - 1] ?? 0) >= 20 || (completed[stage] ?? 0) > 0;
}
export function recordingKey(learner: number, group: SoundGroup, sound: string) {
  return `learner:${learner}:${group}:${sound.toUpperCase()}`;
}
