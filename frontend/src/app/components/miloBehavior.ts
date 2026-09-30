export type CharacterState = "idle" | "speaking" | "listening" | "celebrating" | "encouraging" | "thinking";
export type MiloGesture = "rest" | "point" | "join" | "reveal" | "wave";
export type MiloLook = "viewer" | "right" | "down-right" | "down";

interface LessonCues {
  recording?: boolean;
  playback?: boolean;
  checking?: boolean;
  speaking?: boolean;
  retrying?: boolean;
  success?: boolean;
  joining?: boolean;
  teaching?: boolean;
  lookAt?: MiloLook;
}

export function miloLessonPose(cue: LessonCues): { state: CharacterState; gesture: MiloGesture; lookAt: MiloLook } {
  // The child's turn always takes priority over decorative teaching gestures.
  if (cue.recording || cue.playback) return { state: "listening", gesture: "rest", lookAt: "viewer" };
  if (cue.checking) return { state: "thinking", gesture: "rest", lookAt: "viewer" };
  if (cue.retrying) return { state: cue.speaking ? "speaking" : "encouraging", gesture: "wave", lookAt: "viewer" };
  if (cue.success) return { state: cue.speaking ? "speaking" : "celebrating", gesture: "reveal", lookAt: "right" };
  if (cue.joining) return { state: cue.speaking ? "speaking" : "idle", gesture: "join", lookAt: "down" };
  if (cue.teaching) return { state: cue.speaking ? "speaking" : "idle", gesture: "point", lookAt: cue.lookAt ?? "right" };
  return { state: cue.speaking ? "speaking" : "idle", gesture: "rest", lookAt: "viewer" };
}
