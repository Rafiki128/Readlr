/**
 * Progress Service
 * Business logic for progress tracking
 */

import {
  getLearnerProgress as getLearnerProgressDB,
  getProgressByLearnerAndStage as getProgressByLearnerAndStageDB,
  updateProgress as updateProgressDB,
  createProgress as createProgressDB,
  updateProgressJourney as updateProgressJourneyDB,
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
  totalLevels: number,
  journey?: unknown
): Promise<ProgressResponse> {
  // Check if progress exists, if not create it
  let progress = await getProgressByLearnerAndStageDB(learnerId, stageId);
  if (!progress) {
    progress = await createProgressDB(learnerId, stageId, totalLevels);
  }

  // Neither the stage total nor the completed count ever goes backwards, and the count never exceeds the total.
  const nextTotal = Math.max(totalLevels, progress.total_levels);
  const nextCompleted = Math.max(progress.completed_levels, Math.min(completedLevels, nextTotal));
  await updateProgressDB(learnerId, stageId, nextCompleted, nextTotal);

  // Only a journey at least as far along as the saved count replaces it; failures never block the count.
  const isJourney = typeof journey === 'object' && journey !== null && !Array.isArray(journey) && JSON.stringify(journey).length <= 2000;
  if (isJourney && completedLevels >= nextCompleted) {
    await updateProgressJourneyDB(learnerId, stageId, journey).catch((error) => console.error('Failed to save journey:', error));
  }

  // Return updated progress
  return getStageProgress(learnerId, stageId);
}
