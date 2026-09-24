import { Router } from 'express';
import multer from 'multer';
import { handleAudioProcess } from './audio.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/audio/process
 * Process child's recorded audio and compare with target vowel
 */
router.post('/process', authMiddleware, upload.single('audio'), handleAudioProcess);

export default router;
