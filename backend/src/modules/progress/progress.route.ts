/**
 * Progress Routes
 */

import { Router } from 'express';
import { getResetState } from './reset.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { enforceClassroom } from '../admin/classroom.controller.js';
import { supabase, unwrap } from '../../database/db.js';
import { getReadingJourneys, syncReadingJourney } from './journey.controller.js';
import {
  handleGetProgressSummary,
  handleGetStageProgress,
  handleUpdateProgress,
  handleGetMyProgress,
  handleSyncMyValley,
} from './progress.controller.js';

const router = Router();

// Authenticated user's own progress
router.get('/me', authMiddleware, handleGetMyProgress);
router.get('/me/reset-state', authMiddleware, getResetState);
router.put('/me/stages/:stage', authMiddleware, enforceClassroom(req=>Number(req.params.stage)), handleSyncMyValley);
router.get('/me/journeys', authMiddleware, getReadingJourneys);
router.put('/me/journeys/:stage', authMiddleware, enforceClassroom(req=>Number(req.params.stage)), syncReadingJourney);

// Routes by learner ID
router.get('/learners/:learnerId', authMiddleware, handleGetProgressSummary);
router.get('/learners/:learnerId/stages/:stageId', authMiddleware, handleGetStageProgress);
router.put('/learners/:learnerId/stages/:stageId', authMiddleware, enforceClassroom(async req => {
  const stage = unwrap(await supabase.from('stages').select('stage_number').eq('id',Number(req.params.stageId)).single());
  if (!stage) throw new Error('Stage not found');
  return stage.stage_number;
}), handleUpdateProgress);

export default router;
