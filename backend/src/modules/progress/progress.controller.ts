/**
 * Progress Controller
 * HTTP request handlers for progress tracking
 */

import { Request, Response } from 'express';
import {
  getLearnerProgressSummary,
  getStageProgress,
  updateStageProgress,
} from './progress.service.js';
import { getLearnerByUserId } from '../learner/learner.service.js';
import { unlockFramesForStage } from '../frames/frames.service.js';

async function ensureOwnLearner(req: Request, learnerId: number): Promise<void> {
  const userId = (req as any).userId;
  const learner = await getLearnerByUserId(userId);

  if (learner.id !== learnerId) {
    throw new Error('Access denied');
  }
}

/**
 * GET /api/progress/learners/:learnerId
 * Get learner's progress summary
 */
export async function handleGetProgressSummary(req: Request, res: Response) {
  try {
    const { learnerId } = req.params;
    const parsedLearnerId = parseInt(learnerId);
    await ensureOwnLearner(req, parsedLearnerId);
    const summary = await getLearnerProgressSummary(parsedLearnerId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(error instanceof Error && error.message === 'Access denied' ? 403 : 500).json({ error: 'Failed to fetch progress' });
  }
}

/**
 * GET /api/progress/learners/:learnerId/stages/:stageId
 * Get progress for a specific stage
 */
export async function handleGetStageProgress(req: Request, res: Response) {
  try {
    const { learnerId, stageId } = req.params;
    const parsedLearnerId = parseInt(learnerId);
    await ensureOwnLearner(req, parsedLearnerId);
    const progress = await getStageProgress(parsedLearnerId, parseInt(stageId));
    res.json(progress);
  } catch (error) {
    console.error('Error fetching stage progress:', error);
    res.status(error instanceof Error && error.message === 'Access denied' ? 403 : 404).json({ error: 'Progress not found' });
  }
}

/**
 * PUT /api/progress/learners/:learnerId/stages/:stageId
 * Update progress for a stage
 */
export async function handleUpdateProgress(req: Request, res: Response) {
  try {
    const { learnerId, stageId } = req.params;
    const { completed_levels, total_levels, journey } = req.body;
    const parsedLearnerId = parseInt(learnerId);

    await ensureOwnLearner(req, parsedLearnerId);

    if (completed_levels === undefined || total_levels === undefined) {
      return res.status(400).json({
        error: 'completed_levels and total_levels are required',
      });
    }

    const parsedStageId = parseInt(stageId);

    const progress = await updateStageProgress(
      parsedLearnerId,
      parsedStageId,
      completed_levels,
      total_levels,
      journey
    );

    const isStageComplete = progress.completed_levels >= progress.total_levels;
    const unlockedFrames =
      isStageComplete
        ? await unlockFramesForStage((req as any).userId, parsedStageId)
        : [];

    res.json({ ...progress, unlocked_frames: unlockedFrames });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(error instanceof Error && error.message === 'Access denied' ? 403 : 500).json({ error: 'Failed to update progress' });
  }
}

/**
 * GET /api/progress/me
 * Get the authenticated learner's own progress summary
 */
export async function handleGetMyProgress(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    const learner = await getLearnerByUserId(userId);

    const summary = await getLearnerProgressSummary(learner.id);
    res.json({ success: true, ...summary });
  } catch (error) {
    console.error('Error fetching my progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
}
