import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import {
  answerStudyWord, deleteStudySession, enrollStudy, exportStudy, getMyStudy, getRecording, getScoringBatch,
  getStudyOverview, getStudyResults, rescoreStudy, scoreResponse, updateStudySession,
} from './study.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
  fileFilter: (_req, file, done) => {
    const accepted = /^(audio\/(webm|ogg|mp4|wav|x-wav)|video\/webm)(;.*)?$/.test(file.mimetype);
    if (!accepted) console.warn(`Study recording rejected: unsupported audio type "${file.mimetype}".`);
    done(null, accepted);
  },
});
const answerUpload = (req: Request, res: Response, next: NextFunction) => upload.single('audio')(req, res, error => {
  if (error) { res.status(400).json({ message: 'Please send a recording smaller than 5 MB.' }); return; }
  next();
});

const router = Router();
const admin = [authMiddleware, requireRole('admin')];
router.get('/me', authMiddleware, requireRole('learner'), getMyStudy);
router.post('/me/answer', authMiddleware, requireRole('learner'), answerUpload, answerStudyWord);

router.get('/admin/overview', ...admin, getStudyOverview);
router.post('/admin/enroll', ...admin, enrollStudy);
router.put('/admin/sessions/:userId', ...admin, updateStudySession);
router.delete('/admin/sessions/:userId', ...admin, deleteStudySession);
router.get('/admin/scoring', ...admin, getScoringBatch);
router.put('/admin/responses/:id/score', ...admin, scoreResponse);
router.get('/admin/recordings/:id', ...admin, getRecording);
router.post('/admin/rescore', ...admin, rescoreStudy);
router.get('/admin/results', ...admin, getStudyResults);
router.get('/admin/export', ...admin, exportStudy);
export default router;
