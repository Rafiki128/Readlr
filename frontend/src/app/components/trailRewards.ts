export const TRAIL_POINTS = 100;

const TRAIL_FRIENDS = [
  ["\u{1F430}", "Meadow Rabbit"], ["\u{1F98A}", "Trail Fox"], ["\u{1F994}", "Hedgehog"],
  ["\u{1F43F}", "Squirrel"], ["\u{1F426}", "Songbird"], ["\u{1F98B}", "Rainbow Butterfly"],
  ["\u{1F438}", "Stream Frog"], ["\u{1F422}", "River Turtle"], ["\u{1F41F}", "Silver Fish"],
  ["\u{1F989}", "Moon Owl"], ["\u{1F987}", "Night Bat"], ["\u{1F98C}", "Starlight Deer"],
  ["\u{1F43B}", "Mountain Bear"], ["\u{1F985}", "Sky Eagle"], ["\u{1F984}", "Valley Unicorn"],
];

export const TRAIL_STICKERS = TRAIL_FRIENDS.map(([emoji, name], index) => ({
  id: 100 + index, emoji, name, stage: `Valley Trail ${index + 1}`,
  stageId: 1, levelId: index + 6,
}));

export const POINT_STICKERS = [
  { id: 200, emoji: "\u{1F331}", name: "Valley Sprout", points: 500 },
  { id: 201, emoji: "\u{1F308}", name: "Rainbow Keeper", points: 1000 },
  { id: 202, emoji: "\u{1F451}", name: "Valley Guardian", points: 1500 },
];

// Derive rewards from persisted progress so retries and reloads cannot duplicate them.
export function getTrailPoints(completed: number): number {
  if (!Number.isFinite(completed)) return 0;
  return Math.max(0, Math.min(TRAIL_STICKERS.length, Math.floor(completed) - 5)) * TRAIL_POINTS;
}

export function getTrailReward(levelId: number, previouslyCompleted: number) {
  const sticker = TRAIL_STICKERS.find((item) => item.levelId === levelId);
  if (!sticker) return null;
  const earnedPoints = levelId > previouslyCompleted ? TRAIL_POINTS : 0;
  const totalPoints = getTrailPoints(Math.max(levelId, previouslyCompleted));
  const bonuses = POINT_STICKERS.filter((item) =>
    item.points > getTrailPoints(previouslyCompleted) && item.points <= totalPoints);
  return { sticker, earnedPoints, totalPoints, bonuses };
}

export type TrailReward = NonNullable<ReturnType<typeof getTrailReward>>;
