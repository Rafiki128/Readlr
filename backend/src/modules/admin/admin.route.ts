import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { handleGetLearners } from './admin.controller.js';
import { getClassroom,saveClassroom,getMyClassroom,heartbeat } from './classroom.controller.js';
import { resetProgress } from '../progress/reset.controller.js';
import { listRecovery, approveRecovery } from '../auth/recovery.controller.js';
import { getSurvey,submitSurvey,getSurveyAssignments,assignSurvey,listSurveyResponses,exportSurvey } from './survey.controller.js';

const router = Router();
router.get('/survey/me',authMiddleware,requireRole('learner'),getSurvey);
router.post('/survey/me',authMiddleware,requireRole('learner'),submitSurvey);
router.get('/survey/assignments',authMiddleware,requireRole('admin'),getSurveyAssignments);
router.put('/survey/assignments',authMiddleware,requireRole('admin'),assignSurvey);
router.get('/survey/responses',authMiddleware,requireRole('admin'),listSurveyResponses);
router.get('/survey/export',authMiddleware,requireRole('admin'),exportSurvey);

router.get('/learners', authMiddleware, requireRole('admin'), handleGetLearners);
router.get('/password-requests', authMiddleware, requireRole('admin'), listRecovery);
router.post('/password-requests/:id', authMiddleware, requireRole('admin'), approveRecovery);
router.get('/classroom', authMiddleware, requireRole('admin'), getClassroom);
router.put('/classroom', authMiddleware, requireRole('admin'), saveClassroom);
router.post('/classroom/reset', authMiddleware, requireRole('admin'), resetProgress);
router.get('/classroom/me', authMiddleware, requireRole('learner'), getMyClassroom);
router.put('/classroom/presence', authMiddleware, requireRole('learner'), heartbeat);

export default router;
