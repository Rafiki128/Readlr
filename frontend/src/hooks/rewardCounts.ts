import { completedBookOneStarterStops, type LearnerCurriculumState } from "./learnerCurriculumState.ts";

// Book ids in reading order; these match READING_CHAPTERS. Kept here so the counts have no UI imports.
export const BOOK_IDS = ["gate", "lanterns", "market", "garden", "bridge", "hall", "keys", "library", "tower", "crown"] as const;
const STARTER_STICKERS = ["gate:mango", "gate:apple", "gate:top"];

/** How many stickers and awards the learner has earned, using the same rules as the Sticker Book and Awards pages. */
export function rewardCounts(state: LearnerCurriculumState, completedBooks: string[]) {
  const stops = new Set(state.guidedStops);
  const done = new Set(completedBooks);
  const stickers = STARTER_STICKERS.filter(id => stops.has(id)).length
    + BOOK_IDS.filter(id => stops.has(`${id}:blend`) || done.has(id)).length
    + BOOK_IDS.filter(id => done.has(id)).length;
  const awards = (state.campOrientationStep >= 3 ? 1 : 0)
    + (completedBookOneStarterStops(state) >= 3 ? 1 : 0)
    + (state.soundRecordings.length >= 5 ? 1 : 0)
    + BOOK_IDS.filter(id => done.has(id)).length;
  return { stickers, awards };
}

export type RewardKind = "stickers" | "awards";
const seenKey = (learnerId: number) => `readlr_rewards_seen_v1_${learnerId}`;

/** The counts the learner had when they last opened the Sticker Book and Awards pages. */
export function readSeenRewards(learnerId: number): { stickers: number; awards: number } | null {
  try {
    const value = JSON.parse(localStorage.getItem(seenKey(learnerId)) ?? "null");
    return value && typeof value.stickers === "number" && typeof value.awards === "number" ? value : null;
  } catch { return null; }
}

export function saveSeenRewards(learnerId: number, seen: { stickers: number; awards: number }) {
  try { localStorage.setItem(seenKey(learnerId), JSON.stringify(seen)); } catch { /* The sparkle simply shows again next time. */ }
}
