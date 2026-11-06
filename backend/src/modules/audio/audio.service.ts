import OpenAI from 'openai';
import config from '../../config/env.js';
import { AudioResult } from './audio.types.js';
import { judgeCvcWord, cvcTranscriptionPrompt, type RecognitionSegment } from './cvcRecognition.js';

export async function recognizeCvcWord(file: Express.Multer.File, target: string) {
  if (!openai) throw new Error('Recognition unavailable');
  const extension = file.mimetype.includes('mp4') ? 'mp4' : file.mimetype.includes('ogg') ? 'ogg' : file.mimetype.includes('wav') ? 'wav' : 'webm';
  const response = await openai.audio.transcriptions.create({
    file: new File([file.buffer], `recording.${extension}`, {type:file.mimetype}),
    model:'whisper-large-v3', language:'en', response_format:'verbose_json', temperature:0,
    prompt:cvcTranscriptionPrompt(target),
  }, {timeout:20000, maxRetries:0});
  return judgeCvcWord(target,response.text ?? '',(response as unknown as {segments?:RecognitionSegment[]}).segments);
}

let openai: OpenAI | null = null;

export class AudioAssessmentUnavailableError extends Error {
  constructor() {
    super('Speech checking is unavailable');
    this.name = 'AudioAssessmentUnavailableError';
  }
}

export function normalizeAudioTranscript(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyAudioTranscript(transcript: string, targets: string[], confidence: number) {
  const normalizedTranscript = normalizeAudioTranscript(transcript);
  const normalizedTargets = targets.map(normalizeAudioTranscript).filter(Boolean);
  if (!normalizedTranscript || !Number.isFinite(confidence) || confidence < .35) return 'uncertain' as const;
  return normalizedTargets.includes(normalizedTranscript) ? 'matched' as const : 'different' as const;
}

try {
  if (config.groqApiKey) {
    openai = new OpenAI({
      apiKey: config.groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
} catch (error) {
  console.warn('Groq client initialization failed. Speech checking is unavailable.');
}

export async function processAudio(
  file: Express.Multer.File,
  targetPhoneme: string,
  childId?: string,
  acceptedTranscripts?: string[]
): Promise<AudioResult> {
  const startTime = Date.now();

  if (!openai) {
    throw new AudioAssessmentUnavailableError();
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
  const transcription = normalizeAudioTranscript(response.text ?? '');

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
  const targets = (acceptedTranscripts?.length ? acceptedTranscripts : [targetPhoneme])
    .map(normalizeAudioTranscript).filter(Boolean);
  const status = classifyAudioTranscript(transcription, targets, confidence);
  const matched = status === 'matched';
  const feedback = status === 'matched'
    ? `I heard "${targetPhoneme}". Listen back and compare it with the model.`
    : status === 'uncertain'
      ? 'I could not check that recording clearly. Listen back or try again.'
      : `I heard "${transcription}". Listen to the model, then try "${targetPhoneme}" again.`;

  return {
    matched,
    status,
    assessmentSource: 'transcription_match',
    pronunciationAccuracy: null,
    score: null,
    transcription,
    detectedPhoneme: transcription,
    targetPhoneme,
    feedback,
    confidence,
    durationMs,
  };
}

/**
 * Evaluate a phrase or sentence word-by-word strictly in sequence using Whisper via Groq
 */
export async function recognizeSentenceAudio(file: Express.Multer.File, targetSentence: string) {
  if (!openai) {
    throw new AudioAssessmentUnavailableError();
  }

  const extension = file.mimetype.includes('mp4') ? 'mp4' 
    : file.mimetype.includes('ogg') ? 'ogg' 
    : file.mimetype.includes('wav') ? 'wav' 
    : 'webm';

  // 1. Transcribe the audio using Whisper on Groq
  const response = await openai.audio.transcriptions.create({
    file: new File([file.buffer], `recording.${extension}`, { type: file.mimetype }),
    model: 'whisper-large-v3',
    language: 'en',
    response_format: 'verbose_json',
    temperature: 0,
    prompt: targetSentence, // Provide the target phrase/sentence as context
  }, { timeout: 20000, maxRetries: 0 });

  // 2. Clean punctuation and split into arrays
  const transcription = normalizeAudioTranscript(response.text ?? '');
  const cleanTarget = normalizeAudioTranscript(targetSentence);

  const targetWords = cleanTarget.split(' ').filter(Boolean);
  const spokenWords = transcription.split(' ').filter(Boolean);

  console.log("Target array:", targetWords);
  console.log("Whisper heard array:", spokenWords);

  // 3. Compare word by word strictly in sequence
  const wordScores: Record<number, 'correct' | 'missed'> = {};
  let allCorrect = true;

  targetWords.forEach((targetWord, index) => {
    const spokenWord = spokenWords[index];

    if (spokenWord && spokenWord === targetWord) {
      wordScores[index] = 'correct';
    } else {
      wordScores[index] = 'missed';
      allCorrect = false;
    }
  });

  return {
    status: allCorrect ? 'matched' : 'uncertain',
    wordScores: wordScores,
    transcript: transcription
  };
}