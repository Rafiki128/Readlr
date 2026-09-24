/**
 * Progress Service
 * Business logic for progress tracking
 */

import {
  getLearnerProgress as getLearnerProgressDB,
  getProgressByLearnerAndStage as getProgressByLearnerAndStageDB,
  updateProgress as updateProgressDB,
  createProgress as createProgressDB,
} from '../../database/models/progress.model.js';
import { ProgressResponse, LearnerProgressSummary } from './progress.types.js';

export async function getLearnerProgressSummary(
  learnerId: number
): Promise<LearnerProgressSummary> {
  const progressList = await getLearnerProgressDB(learnerId);

  const overallPercentage =
    progressList.length > 0
      ? Math.round(
          progressList.reduce((sum, p) => sum + p.completion_percentage, 0) /
            progressList.length
        )
      : 0;

  return {
    learner_id: learnerId,
    stages: progressList as ProgressResponse[],
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
  totalLevels: number
): Promise<ProgressResponse> {
  // Check if progress exists, if not create it
  let progress = await getProgressByLearnerAndStageDB(learnerId, stageId);
  if (!progress) {
    progress = await createProgressDB(learnerId, stageId, totalLevels);
  }

  // Progress never goes backwards and never exceeds the stage total.
  const nextCompleted = Math.min(Math.max(completedLevels, progress.completed_levels), totalLevels);
  await updateProgressDB(learnerId, stageId, nextCompleted, totalLevels);

  // Return updated progress
  return getStageProgress(learnerId, stageId);
}
