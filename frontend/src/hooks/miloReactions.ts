// Lets other parts of the screen (like the navbar) ask the home-screen Milo to react.
export const MILO_NOD_EVENT = "readlr:milo-nod";

/** Milo gives an encouraging nod, used when a learner taps something that is still locked. */
export function miloNod() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MILO_NOD_EVENT));
}
