// Filenames match the supplied recordings; vowel and blend models reuse earlier stages.
export const CVC_AUDIO = {
  story: ["CvcStoryScene.wav", "CvcStoryMilo.wav", "CvcStoryGoal.wav"],
  threeSounds: "CvcThreeSounds.wav",
  slide: "CvcSlideSounds.wav",
  nextSound: "CvcTryNextSound.wav",
  middle: "CvcListenMiddle.wav",
  readReady: "CvcReadReady.wav",
} as const;
export const cvcLessonAudio = (id: number, part: "Intro" | "Puzzle" | "Success") => `Cvc${id}${part}.wav`;
export const cvcCrownAudio = (jewel: number, part: "Intro" | "Success") => `Crown${jewel + 1}${part}.wav`;
export const cvcReadyAudio = (word: string) => `CvcReady-${word.toUpperCase()}.wav`;
export function cvcModelAudio(word: string) {
  if (word.toLowerCase() === "a") return "../stage1/A.wav";
  if (word.toLowerCase() === "ma") return "../stage2/PronounceMA.wav";
  return `Pronounce${word.toUpperCase()}.wav`;
}
