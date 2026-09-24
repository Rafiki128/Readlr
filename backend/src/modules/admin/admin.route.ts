import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { handleGetLearners } from './admin.controller.js';

const router = Router();

router.get('/learners', authMiddleware, requireRole('admin'), handleGetLearners);

export default router;