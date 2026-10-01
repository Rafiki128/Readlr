import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { handleGetLearners } from './admin.controller.js';
import { getClassroom,saveClassroom,getMyClassroom,heartbeat } from './classroom.controller.js';

const router = Router();

router.get('/learners', authMiddleware, requireRole('admin'), handleGetLearners);
router.get('/classroom', authMiddleware, requireRole('admin'), getClassroom);
router.put('/classroom', authMiddleware, requireRole('admin'), saveClassroom);
router.get('/classroom/me', authMiddleware, requireRole('learner'), getMyClassroom);
router.put('/classroom/presence', authMiddleware, requireRole('learner'), heartbeat);

export default router;
