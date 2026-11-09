// Milo's spoken instructions use one player. Any other Milo audio stops it, and instructions wait for that audio to finish.
let instructionStop: (() => void) | null = null;
let otherAudio = 0;

export const otherMiloAudioActive = () => otherAudio > 0;
export const stopMiloInstruction = () => instructionStop?.();

/** Marks the start of Milo audio; returns the function that marks its end. */
export function claimMiloAudio(instruction: boolean, stop: () => void) {
  if (instruction) { instructionStop = stop; return () => {}; }
  instructionStop?.();
  otherAudio++;
  let released = false;
  return () => { if (!released) { released = true; otherAudio--; } };
}
