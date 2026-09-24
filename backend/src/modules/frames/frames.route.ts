/**
 * Frames Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { handleGetMyFrames, handleEquipFrame } from './frames.controller.js';

const router = Router();

router.get('/me', authMiddleware, handleGetMyFrames);
router.put('/me/equip', authMiddleware, handleEquipFrame);

export default router;
