import { Router } from 'express';
import multer from 'multer';
import { handleAudioProcess, handleCvcRecognition } from './audio.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
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
router.post('/cvc-recognize',authMiddleware,enforceClassroom(()=>3),(req,res,next)=>{
  cvcUpload.single('audio')(req,res,error=>{
    if(error) {res.status(400).json({error:'Please send a recording smaller than 5 MB.'});return;}
    next();
  });
},handleCvcRecognition);

export default router;
