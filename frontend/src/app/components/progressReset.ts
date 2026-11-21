import { bridgeStorageKey } from './stageTwoContent';
import { cvcStorageKey } from './cvcContent';
import { resetLearnerBookStops } from '../../hooks/learnerCurriculumState';

export interface ResetStage { stage_number: number; epoch: number; earned_completed: number }
export const epochKey = (learner: number) => `readlr_reset_epochs_${learner}`;
const rewardKey = (learner: number) => `readlr_earned_progress_${learner}`;
function read(key: string): Record<number, number> {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([stage, count]) =>
      ['1','2','3'].includes(stage) && Number.isInteger(count) && (count as number) >= 0).map(([stage,count])=>[Number(stage),Number(count)]));
  } catch { return {}; }
}
export function readResetEpoch(learner: number, stage: number): number {
  return read(epochKey(learner))[stage] ?? 0;
}
export function earnedProgress(learner?: number | null): Record<number, number> {
  return learner ? read(rewardKey(learner)) : {};
}
export function preserveRewards(learner: number, counts: Record<number, number>) {
  const earned = earnedProgress(learner);
  for (const stage of [1,2,3]) earned[stage] = Math.max(earned[stage] || 0, Math.min(20, counts[stage] || 0));
  localStorage.setItem(rewardKey(learner), JSON.stringify(earned));
  return earned;
}
export function applyResetState(learner: number, user: number, stages: ResetStage[]) {
  const epochs = read(epochKey(learner));
  const key = `readlr_progress_user_${user}`;
  const progress = read(key);
  preserveRewards(learner, Object.fromEntries(stages.map(s => [s.stage_number, s.earned_completed])));
  const fullRestart = [1,2,3].every(stage => stages.some(row => row.stage_number === stage));
  let changed = false;
  for (const row of stages) {
    if (row.epoch > (epochs[row.stage_number] ?? 0)) {
      progress[row.stage_number] = 0;
      if (row.stage_number === 2) localStorage.removeItem(bridgeStorageKey(learner)!);
      if (row.stage_number === 3) {
        localStorage.removeItem(cvcStorageKey(learner)!);
        for (const prefix of ['readlr_aral_reading_v1_', 'readlr_aral_book_access_v1_', 'readlr_aral_book_unlock_v1_']) localStorage.removeItem(`${prefix}${learner}`);
        localStorage.setItem(`readlr_aral_carousel_v1_${learner}`, '0');
      }
      epochs[row.stage_number] = row.epoch;
      changed = true;
    }
  }
  if (changed) {
    if (fullRestart) resetLearnerBookStops(learner);
    // Write epochs last so other tabs reload only after their shared caches are cleared.
    localStorage.setItem(key, JSON.stringify(progress));
    localStorage.setItem(epochKey(learner), JSON.stringify(epochs));
  }
  return { changed, epochs };
}
