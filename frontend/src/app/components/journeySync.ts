import { bridgeStorageKey, normalizeBridgeJourney, readBridgeJourney } from "./stageTwoContent";
import { cvcStorageKey, normalizeCvcJourney, readCvcJourney } from "./cvcContent";

import { contiguousCount, mergeSnapshot, type JourneySnapshot } from "./journeySnapshot";
export type { JourneySnapshot } from "./journeySnapshot";
export const JOURNEY_CHANGED = "readlr:journey-changed";
export const JOURNEY_RESTORED = "readlr:journey-restored";
export function notifyJourneyChanged(learnerId?: number | null) {
  if (learnerId) window.dispatchEvent(new CustomEvent(JOURNEY_CHANGED, { detail: learnerId }));
}
export function localJourneys(learnerId: number): JourneySnapshot[] {
  const bridge = readBridgeJourney(learnerId), cvc = readCvcJourney(learnerId);
  const trained=contiguousCount(bridge.training,5);
  return [{ stage_number:2, completed:trained + (trained===5 ? contiguousCount(bridge.crossings,15) : 0), jewels:0 },
    { stage_number:3, completed:cvc.completed, jewels:cvc.jewels }];
}
export function restoreJourney(learnerId: number, remote: JourneySnapshot) {
  const local = localJourneys(learnerId).find(j=>j.stage_number === remote.stage_number);
  if (!local) return;
  const merged = mergeSnapshot(local, remote);
  if (merged.completed === local.completed && merged.jewels === local.jewels) return;
  const range = (n:number) => Array.from({length:n},(_,i)=>i+1);
  if (merged.stage_number === 2) {
    localStorage.setItem(bridgeStorageKey(learnerId)!, JSON.stringify(normalizeBridgeJourney({version:3, training:range(Math.min(5,merged.completed)), crossings:range(Math.max(0,merged.completed-5))})));
  } else localStorage.setItem(cvcStorageKey(learnerId)!, JSON.stringify(normalizeCvcJourney({version:1,completed:merged.completed,jewels:merged.jewels})));
  window.dispatchEvent(new CustomEvent(JOURNEY_RESTORED, {detail:learnerId}));
}
