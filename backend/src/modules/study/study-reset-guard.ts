// Keeps admin resets away from study learners so study data stays intact until the final export.
import { supabase, unwrap } from '../../database/db.js';

export const STUDY_RESET_BLOCKED = 'This learner is in the Readlr study, so their data cannot be reset until the study export is final.';
export const STUDY_CLASS_BLOCKED = 'Every learner in this class is in the Readlr study, so nothing was reset.';
export const STUDY_SKIPPED = ' Study learners were skipped.';

/** Reset targets with study learners removed: [] when blocked, [null] for a class with no study learners. */
export async function resetTargets(target: 'class' | number): Promise<Array<number | null>> {
  const sessions: Array<{ user_id: number }> = unwrap(await supabase.from('readlr_study_sessions').select('user_id')) ?? [];
  const study = new Set(sessions.map(s => s.user_id));
  if (target !== 'class') return study.has(target) ? [] : [target];
  if (!study.size) return [null];
  const learners: Array<{ id: number }> = unwrap(await supabase.from('users').select('id').eq('role', 'learner').order('id')) ?? [];
  return learners.map(u => u.id).filter(id => !study.has(id));
}
