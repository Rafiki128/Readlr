/**
 * Progress Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getReadingJourneys, syncReadingJourney } from './journey.controller.js';
import {
  handleGetProgressSummary,
  handleGetStageProgress,
  handleUpdateProgress,
  handleGetMyProgress,
} from './progress.controller.js';

const router = Router();

// Authenticated user's own progress
router.get('/me', authMiddleware, handleGetMyProgress);
router.get('/me/journeys', authMiddleware, getReadingJourneys);
router.put('/me/journeys/:stage', authMiddleware, syncReadingJourney);

// Routes by learner ID
router.get('/learners/:learnerId', authMiddleware, handleGetProgressSummary);
router.get('/learners/:learnerId/stages/:stageId', authMiddleware, handleGetStageProgress);
router.put('/learners/:learnerId/stages/:stageId', authMiddleware, handleUpdateProgress);

export default router;
