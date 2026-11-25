export type ReviewCheck = { counts: boolean; skips: boolean; exceptions: boolean; initials: string; checkedAt?: string };
type Item = { skipped: boolean; teacher_score: string | null };
type Timed = { skipped: boolean; scored_at: string | null };

export function reviewStatus(expected: number, items: Item[], timed: Timed[], endedEarly: boolean, value: unknown) {
  const submitted = items.length + timed.length;
  const pending = items.filter(i=>!i.skipped&&!i.teacher_score).length + timed.filter(i=>!i.skipped&&!i.scored_at).length;
  const incomplete = submitted < expected;
  const ready = submitted > 0 && pending === 0 && (!incomplete || endedEarly);
  const check = value as Partial<ReviewCheck> | null;
  return { submitted, pending, incomplete, ready, checked: ready && !!check?.checkedAt };
}
