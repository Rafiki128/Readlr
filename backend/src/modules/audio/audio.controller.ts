import { Request, Response } from 'express';
import { AudioAssessmentUnavailableError, processAudio, recognizeSentenceAudio } from './audio.service.js';
import { recognizeCvcWord } from './audio.service.js';
import { READING_TARGETS } from './cvcRecognition.js';

export async function handleCvcRecognition(req:Request,res:Response) {
  const target = typeof req.body.target === 'string' ? req.body.target.toLowerCase() : '';
  if (!READING_TARGETS.has(target) || !req.file?.size) return res.status(400).json({error:'A supported word and recording are required.'});
  try { return res.json(await recognizeCvcWord(req.file,target)); }
  catch { return res.status(503).json({error:'Word checking is unavailable. Please try again shortly.'}); }
}

/**
 * POST /api/audio/process
 * Process child's recorded audio and compare with target vowel
 */
export async function handleAudioProcess(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { targetPhoneme, childId, acceptedTranscripts } = req.body;

    if (!targetPhoneme) {
      return res.status(400).json({ error: 'Target phoneme required' });
    }

    // acceptedTranscripts arrives as a JSON string when sent via FormData
    let transcripts: string[] | undefined;
    if (acceptedTranscripts) {
      transcripts =
        typeof acceptedTranscripts === 'string'
          ? JSON.parse(acceptedTranscripts)
          : acceptedTranscripts;
    }

    const result = await processAudio(req.file, targetPhoneme, childId, transcripts);
    res.json(result);
  } catch (error) {
    console.error('Audio processing error:', error);
    if (error instanceof AudioAssessmentUnavailableError) {
      return res.status(503).json({
        status: 'unavailable',
        assessmentSource: 'not_assessed',
        pronunciationAccuracy: null,
        error: 'Speech checking is unavailable. Your recording was not scored.',
      });
    }
    res.status(500).json({ error: 'Failed to process audio' });
  }
}

/**
 * POST /api/audio/evaluate-sentence
 * Process child's recorded audio and compare it word-by-word against a target sentence
 */
export async function handleSentenceRecognition(req: Request, res: Response) {
  try {
    const targetSentence = req.body.sentence;

    if (!targetSentence || !req.file?.size) {
      return res.status(400).json({ error: 'A target sentence and audio recording are required.' });
    }

    // Pass the audio file and target text to your Whisper evaluation service
    const result = await recognizeSentenceAudio(req.file, targetSentence);

    return res.json(result);

  } catch (error) {
    console.error('Sentence processing error:', error);
    return res.status(500).json({ error: 'Failed to process sentence audio' });
  }
}