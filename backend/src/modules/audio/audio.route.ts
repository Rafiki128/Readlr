import { Router } from 'express';
import { config } from '../../config/env.js';
import multer from 'multer';
// IMPORT UPDATED: Added handleSentenceRecognition
import { handleAudioProcess, handleCvcRecognition, handleSentenceRecognition } from './audio.controller.js';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { recognizeReadingCheckpoint, retryReadingCheckpoint } from '../evidence/reading-checkpoints.js';
import { enforceClassroom } from '../admin/classroom.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/audio/process
 * Process child's recorded audio and compare with target vowel
 */
router.post('/process', authMiddleware, enforceClassroom(()=>1), upload.single('audio'), handleAudioProcess);

const cvcUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:1},
  fileFilter:(_req,file,done)=>done(null,/^(audio\/(webm|ogg|mp4|wav|x-wav)|video\/webm)(;.*)?$/.test(file.mimetype))});

// Review checks use real recognition without creating learner evidence or unlocks.
router.post('/review-recognize',authMiddleware,requireRole(...(config.nodeEnv==='development'?['admin','learner'] as const:['admin'] as const)),(req,res,next)=>{
  cvcUpload.single('audio')(req,res,error=>{
    if(error){res.status(400).json({error:'Please send a recording smaller than 5 MB.'});return;}
    next();
  });
},handleCvcRecognition);

router.post('/reading-check/:sessionId/:item',authMiddleware,requireRole('learner'),enforceClassroom(()=>3),(req,res,next)=>{
  cvcUpload.single('audio')(req,res,error=>{
    if(error){res.status(400).json({error:'Please send a recording smaller than 5 MB.'});return;}
    next();
  });
},recognizeReadingCheckpoint);

router.post('/reading-check/:sessionId/:item/retry',authMiddleware,requireRole('learner'),enforceClassroom(()=>3),(req,res,next)=>{
  cvcUpload.single('audio')(req,res,error=>{
    if(error){res.status(400).json({error:'Please send a recording smaller than 5 MB.'});return;}
    next();
  });
},retryReadingCheckpoint);

router.post('/cvc-recognize',authMiddleware,enforceClassroom(()=>3),(req,res,next)=>{
  cvcUpload.single('audio')(req,res,error=>{
    if(error) {res.status(400).json({error:'Please send a recording smaller than 5 MB.'});return;}
    next();
  });
},handleCvcRecognition);

// NEW: Sentence evaluation route for Book 5+ words
router.post('/evaluate-sentence', authMiddleware, enforceClassroom(()=>3), (req, res, next) => {
  cvcUpload.single('audio')(req, res, error => {
    if(error) {res.status(400).json({error:'Please send a recording smaller than 5 MB.'});return;}
    next();
  });
}, handleSentenceRecognition);

export default router;