import OpenAI from 'openai';
import config from '../../config/env.js';
import { AudioResult } from './audio.types.js';
import { judgeCvcWord, CVC_TRANSCRIPTION_CONTEXT, type RecognitionSegment } from './cvcRecognition.js';

export async function recognizeCvcWord(file: Express.Multer.File, target: string) {
  if (!openai) throw new Error('Recognition unavailable');
  const extension = file.mimetype.includes('mp4') ? 'mp4' : file.mimetype.includes('ogg') ? 'ogg' : file.mimetype.includes('wav') ? 'wav' : 'webm';
  const response = await openai.audio.transcriptions.create({
    file: new File([file.buffer], `recording.${extension}`, {type:file.mimetype}),
    model:'whisper-large-v3', language:'en', response_format:'verbose_json', temperature:0,
    prompt:CVC_TRANSCRIPTION_CONTEXT,
  }, {timeout:20000, maxRetries:0});
  return judgeCvcWord(target,response.text ?? '',(response as unknown as {segments?:RecognitionSegment[]}).segments);
}

let openai: OpenAI | null = null;

try {
  if (config.groqApiKey) {
    openai = new OpenAI({
      apiKey: config.groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
} catch (error) {
  console.warn('Groq client initialization failed. Audio transcription will use mock responses.');
}

export async function processAudio(
  file: Express.Multer.File,
  targetPhoneme: string,
  childId?: string,
  acceptedTranscripts?: string[]
): Promise<AudioResult> {
  const startTime = Date.now();

  // Mock response if OpenAI is not available
  if (!openai) {
    console.log('Mock audio processing (OpenAI not configured)');
    const durationMs = Date.now() - startTime;
    return {
      matched: true,
      score: 95,
      transcription: targetPhoneme.toLowerCase(),
      detectedPhoneme: targetPhoneme.toLowerCase(),
      targetPhoneme,
      feedback: `Mock response: "${targetPhoneme}" recognized!`,
      confidence: 0.95,
      durationMs,
      //childId: childId || undefined,
    };
  }

  const response = await openai.audio.transcriptions.create({
    file: new File([file.buffer], file.originalname || 'audio.webm', {
      type: file.mimetype || 'audio/webm',
    }),
    model: 'whisper-large-v3',
    language: 'en',
    response_format: 'verbose_json',
    temperature: 0,
    // hint to Whisper — improves accuracy for short phoneme/word targets
    prompt: targetPhoneme,
  });

  const durationMs = Date.now() - startTime;
  const transcription = (response.text ?? '').toLowerCase().trim();

  // Derive confidence from segment log-probabilities (verbose_json only)
  const segments = (response as any).segments as Array<{ avg_logprob: number }> | undefined;
  let confidence = 0.5;
  if (segments && segments.length > 0) {
    const avgLogprob =
      segments.reduce((sum, s) => sum + s.avg_logprob, 0) / segments.length;
    // logprob is ≤ 0; exp(0) = 1.0 (perfect), exp(-∞) → 0
    confidence = Math.max(0, Math.min(1, Math.exp(avgLogprob)));
  }

  // Match transcription against the challenge's accepted word list
  const targets = acceptedTranscripts?.length
    ? acceptedTranscripts.map(t => t.toLowerCase())
    : [targetPhoneme.toLowerCase()];

  const spokenWords = transcription.split(/\s+/);
  const matched = targets.some(
    t => spokenWords.includes(t) || transcription.includes(t)
  );

  // Score: full confidence on match, partial on near-miss
  const score = matched
    ? Math.round(confidence * 100)
    : Math.round(confidence * 40);

  const feedback = matched
    ? `Great job! You said "${targetPhoneme}" correctly!`
    : `Good try! You said "${transcription || '...'}", but try saying "${targetPhoneme}". Keep practicing!`;

  return {
    matched,
    score,
    transcription,
    detectedPhoneme: transcription,
    targetPhoneme,
    feedback,
    confidence,
    durationMs,
  };
}
