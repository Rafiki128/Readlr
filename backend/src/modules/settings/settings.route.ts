/**
 * Settings Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { handleGetMySettings, handleUpdateMySettings } from './settings.controller.js';

const router = Router();

// Authenticated user's own settings
router.get('/me', authMiddleware, handleGetMySettings);
router.put('/me', authMiddleware, handleUpdateMySettings);

export default router;
