export const BRIDGE_LINES = {
  welcome: { file: "WorkshopWelcome.wav", text: "Welcome to my Bridge Workshop! Our next adventure needs two sounds working together. Let us build a little practice bridge." },
  workshop: { file: "WorkshopJoinMA.wav", text: "Here is our humming sound beside a vowel. Watch the two pieces slide together. Listen to the blend, then lend Milo your voice." },
  crossing: { file: "BrookMissingPlank.wav", text: "A plank has floated away! Listen to our blend. Find its first sound to help Milo repair the bridge." },
  choose: { file: "BrookChooseM.wav", text: "Which piece starts our blend? Choose a piece for the empty space." },
  choiceAgain: { file: "BrookChoiceAgain.wav", text: "That is a vowel piece. We need the humming piece at the start. Listen once more." },
  ready: { file: "BridgeReadyGo.wav", text: "Your turn! Say the two sounds together. Ready? Go!" },
  playback: { file: "BridgeListenBack.wav", text: "Now listen to your voice. Did your two sounds join together?" },
  workshopDone: { file: "WorkshopPracticeDone.wav", text: "Thank you for practising with me! Our pieces are joined. Let us take this blend to the brook." },
  crossingDone: { file: "BrookGuidedDone.wav", text: "Thank you for lending your voice! We built this bridge together. Milo can cross the sparkling brook." },
} as const;

export type BridgeLine = keyof typeof BRIDGE_LINES;
export const BRIDGE_MODEL = "/audio/stage2/PronounceMA.wav";
export type BridgeProgress = { version: 2; workshop: boolean; crossing: boolean; evidence: "guided"; points: number };
export const EMPTY_BRIDGE_PROGRESS: BridgeProgress = { version: 2, workshop: false, crossing: false, evidence: "guided", points: 0 };

export function bridgeStorageKey(learnerId?: number | null) {
  return learnerId ? `readlr_bridge_v2_learner_${learnerId}` : null;
}

export function normalizeBridgeProgress(value: unknown): BridgeProgress {
  const data = value as Partial<BridgeProgress> | null;
  if (!data || data.version !== 2) return { ...EMPTY_BRIDGE_PROGRESS };
  const workshop = data.workshop === true;
  const crossing = workshop && data.crossing === true;
  return { version: 2, workshop, crossing, evidence: "guided", points: crossing ? 100 : 0 };
}

export function readBridgeProgress(learnerId?: number | null): BridgeProgress {
  const key = bridgeStorageKey(learnerId);
  try { return key ? normalizeBridgeProgress(JSON.parse(localStorage.getItem(key) || "null")) : { ...EMPTY_BRIDGE_PROGRESS }; }
  catch { return { ...EMPTY_BRIDGE_PROGRESS }; }
}

export function completeBridgeActivity(progress: BridgeProgress, activity: "workshop" | "crossing"): BridgeProgress {
  return normalizeBridgeProgress({ ...progress, [activity]: true });
}

export function hasVoiceSignal(peak: number, voicedFrames: number, bytes: number) {
  // Energy gating rejects empty/silent captures; it does not assess pronunciation.
  return peak >= .018 && voicedFrames >= 5 && bytes > 128;
}

export type BridgeJourney = { version: 3; training: number[]; crossings: number[]; evidence: "guided"; points: number };
export function normalizeBridgeJourney(value: unknown): BridgeJourney {
  const data = value as Partial<BridgeJourney> | null;
  const valid = (values: unknown, max: number) => Array.isArray(values)
    ? [...new Set(values.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= max))].sort((a, b) => a - b) : [];
  const legacy = value as Partial<BridgeProgress> | null;
  const training = legacy?.version === 2 ? (legacy.workshop ? [1] : []) : data?.version === 3 ? valid(data.training, 5) : [];
  const crossings = legacy?.version === 2 ? (legacy.workshop && legacy.crossing ? [1] : []) : data?.version === 3 ? valid(data.crossings, 15) : [];
  return { version: 3, training, crossings, evidence: "guided", points: crossings.length * 100 };
}
export function readBridgeJourney(learnerId?: number | null): BridgeJourney {
  const key = bridgeStorageKey(learnerId);
  try { return normalizeBridgeJourney(key ? JSON.parse(localStorage.getItem(key) || "null") : null); }
  catch { return normalizeBridgeJourney(null); }
}
// Keeps the device journey unless the server copy has more finished steps.
export function furtherBridgeJourney(local: BridgeJourney, remote: unknown): BridgeJourney {
  const other = normalizeBridgeJourney(remote);
  const count = (journey: BridgeJourney) => journey.training.length + journey.crossings.length;
  return count(other) > count(local) ? other : local;
}
export function finishBridgeJourney(progress: BridgeJourney, training: boolean, index: number): BridgeJourney {
  const field = training ? "training" : "crossings";
  if (!Number.isInteger(index) || index < 1 || index > (training ? 5 : 15)) return progress;
  if (!training && progress.training.length < 5 && !progress.crossings.includes(index)) return progress;
  if (index > 1 && !progress[field].includes(index - 1) && !progress[field].includes(index)) return progress;
  return normalizeBridgeJourney({ ...progress, [field]: [...progress[field], index] });
}
