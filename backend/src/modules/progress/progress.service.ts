import { supabase, unwrap } from '../../database/db.js';
/**
 * Progress Service
 * Business logic for progress tracking
 */

import {
  getLearnerProgress as getLearnerProgressDB,
  getProgressByLearnerAndStage as getProgressByLearnerAndStageDB,
} from '../../database/models/progress.model.js';
import { ProgressResponse, LearnerProgressSummary } from './progress.types.js';
import { getAllStages } from '../../database/models/stage.model.js';

export async function getLearnerProgressSummary(
  learnerId: number
): Promise<LearnerProgressSummary> {
  const [progressList, definitions] = await Promise.all([getLearnerProgressDB(learnerId), getAllStages()]);
  const stageNumbers = new Map(definitions.map(stage => [stage.id, stage.stage_number]));

  const overallPercentage =
    progressList.length > 0
      ? Math.round(
          progressList.reduce((sum, p) => sum + p.completion_percentage, 0) /
            progressList.length
        )
      : 0;

  return {
    learner_id: learnerId,
    stages: progressList.map(progress => ({ ...progress, stage_number: stageNumbers.get(progress.stage_id) })),
    overall_completion_percentage: overallPercentage,
  };
}

export async function getStageProgress(
  learnerId: number,
  stageId: number
): Promise<ProgressResponse> {
  const progress = await getProgressByLearnerAndStageDB(learnerId, stageId);
  if (!progress) {
    throw new Error('Progress not found');
  }
  return progress as ProgressResponse;
}

export async function updateStageProgress(
  learnerId: number,
  stageId: number,
  completedLevels: number,
  totalLevels: number,
  journey?: unknown,
  epoch = 0
): Promise<ProgressResponse> {
  const stage = unwrap(await supabase.from('stages').select('stage_number').eq('id', stageId).single());
  if (!stage) throw new Error('Stage not found');
  const result = unwrap(await supabase.rpc('sync_stage_guarded', {
    p_learner: learnerId, p_stage: stage.stage_number, p_completed: completedLevels,
    p_jewels: stage.stage_number === 3 && completedLevels === 20 ? 3 : 0,
    p_epoch: epoch, p_total: totalLevels, p_journey: journey ?? null,
  }));
  return result.progress as ProgressResponse;
}
