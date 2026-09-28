export const CVC_TARGETS = new Set(['sun','map','hen','cup','rug','pot','net','bug','hat','log','bed','pen','pig','tin','bag','gem','fan','lid','top']);
// Same vocabulary for every challenge, never the current expected answer alone.
export const CVC_TRANSCRIPTION_CONTEXT = `English reading practice with short words: ${[...CVC_TARGETS].join(', ')}. Write spoken words, not numerals.`;
export interface RecognitionSegment { avg_logprob?:number; no_speech_prob?:number; compression_ratio?:number }
export function judgeCvcWord(target:string, text:string, segments:RecognitionSegment[] = []) {
  const words = text.toLowerCase().trim().replace(/[.,!?;:"()]/g,' ').split(/\s+/).filter(Boolean);
  const reliable = segments.length > 0 && segments.every(s =>
    typeof s.avg_logprob === 'number' && Number.isFinite(s.avg_logprob) && s.avg_logprob >= -1 && s.avg_logprob <= 0 &&
    typeof s.no_speech_prob === 'number' && Number.isFinite(s.no_speech_prob) && s.no_speech_prob >= 0 && s.no_speech_prob < .6 &&
    typeof s.compression_ratio === 'number' && Number.isFinite(s.compression_ratio) && s.compression_ratio >= 0 && s.compression_ratio <= 2.4);
  // Quality gates are transcription heuristics, not a pronunciation score.
  const status = !reliable || !words.length ? 'uncertain' :
    words.length <= 4 && words.every(word=>word===target) ? 'matched' : 'different';
  return {status, target, transcript:text.slice(0,200), source:'groq-whisper', pronunciationAccuracy:null} as const;
}
