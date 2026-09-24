import { POINT_STICKERS, TRAIL_POINTS, TRAIL_STICKERS } from "./trailRewards.ts";

export interface Sticker { id: number; emoji: string; name: string; stage: string; stageId: number; at: number }

const DOJO_FRIENDS = [
  ["\u{1F41C}", "Ant", "A"], ["\u{1F41D}", "Bee", "E"], ["\u{1F41E}", "Ladybug", "I"],
  ["\u{1F419}", "Octopus", "O"], ["\u{1F986}", "Duck", "U"],
];

const BRIDGE_MILESTONES = [
  ["\u{1F309}", "Bridge Builder", 100], ["\u{1F4A7}", "Brook Keeper", 500],
  ["\u{1F30A}", "Waterfall Explorer", 1000], ["☁️", "Sky Connector", 1500],
] as const;

const CVC_MILESTONES = [
  ["✨", "Word Alchemist", 5], ["\u{1F337}", "Garden Magician", 10],
  ["\u{1F4D6}", "Castle Storyteller", 15], ["\u{1F451}", "Crown of Three Lights", 20],
] as const;

// A sticker is earned once its stage's completed-level count reaches `at`; every stage counts 1-20.
export const STICKERS: Sticker[] = [
  ...DOJO_FRIENDS.map(([emoji, name, vowel], index) => ({
    id: index + 1, emoji, name, stage: `Valley of Vowels — ${vowel}`, stageId: 1, at: index + 1,
  })),
  ...TRAIL_STICKERS.map(({ levelId, ...sticker }) => ({ ...sticker, at: levelId })),
  ...POINT_STICKERS.map(({ points, ...sticker }) => ({
    ...sticker, stage: `${points} trail points`, stageId: 1, at: 5 + points / TRAIL_POINTS,
  })),
  ...BRIDGE_MILESTONES.map(([emoji, name, points], index) => ({
    id: 2001 + index, emoji, name, stage: `Blending Bridges - ${points} bridge points`, stageId: 2, at: 5 + points / 100,
  })),
  ...CVC_MILESTONES.map(([emoji, name, at], index) => ({
    id: 3001 + index, emoji, name, stage: "CVC Kingdom - word magic", stageId: 3, at,
  })),
];

export function isStickerEarned(sticker: Sticker, completedByStage: Record<number, number>) {
  return (completedByStage[sticker.stageId] ?? 0) >= sticker.at;
}

// Returns the stickers first earned when a stage's count rises from `before` to `after`, or null if none.
export function newStickerReward(stageId: number, before: number, after: number) {
  const [sticker, ...bonuses] = STICKERS.filter((item) => item.stageId === stageId && item.at > before && item.at <= after);
  return sticker ? { sticker, bonuses } : null;
}

export type StickerReward = NonNullable<ReturnType<typeof newStickerReward>>;
