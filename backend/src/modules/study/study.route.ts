import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import {
  answerStudyFluency, answerStudyWord, deleteStudySession, enrollStudy, exportStudy, getFluencyRecording, getFluencyScoringBatch, getMyStudy, getRecording, getScoringBatch,
  getStudyOverview, getStudyResults, rescoreStudy, scoreFluency, scoreResponse, updateStudySession,
} from './study.controller.js';

const audioOnly: multer.Options['fileFilter'] = (_req, file, done) => {
  const accepted = /^(audio\/(webm|ogg|mp4|wav|x-wav)|video\/webm)(;.*)?$/.test(file.mimetype);
  if (!accepted) console.warn(`Study recording rejected: unsupported audio type "${file.mimetype}".`);
  done(null, accepted);
};
const sized = (megabytes: number) => {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: megabytes * 1024 * 1024, files: 1, fields: 5 }, fileFilter: audioOnly });
  return (req: Request, res: Response, next: NextFunction) => upload.single('audio')(req, res, error => {
    if (error) { res.status(400).json({ message: `Please send a recording smaller than ${megabytes} MB.` }); return; }
    next();
  });
};
const answerUpload = sized(5);
// A 60 s browser recording is about 0.5-2 MB (Opus or AAC); 10 MB leaves room for higher-bitrate devices.
const fluencyUpload = sized(10);

const router = Router();
const admin = [authMiddleware, requireRole('admin')];
router.get('/me', authMiddleware, requireRole('learner'), getMyStudy);
router.post('/me/answer', authMiddleware, requireRole('learner'), answerUpload, answerStudyWord);
router.post('/me/fluency', authMiddleware, requireRole('learner'), fluencyUpload, answerStudyFluency);

router.get('/admin/overview', ...admin, getStudyOverview);
router.post('/admin/enroll', ...admin, enrollStudy);
router.put('/admin/sessions/:userId', ...admin, updateStudySession);
router.delete('/admin/sessions/:userId', ...admin, deleteStudySession);
router.get('/admin/scoring', ...admin, getScoringBatch);
router.put('/admin/responses/:id/score', ...admin, scoreResponse);
router.get('/admin/recordings/:id', ...admin, getRecording);
router.post('/admin/rescore', ...admin, rescoreStudy);
router.get('/admin/fluency/scoring', ...admin, getFluencyScoringBatch);
router.put('/admin/fluency/:id/score', ...admin, scoreFluency);
router.get('/admin/fluency/:id/recording', ...admin, getFluencyRecording);
router.get('/admin/results', ...admin, getStudyResults);
router.get('/admin/export', ...admin, exportStudy);
export default router;
