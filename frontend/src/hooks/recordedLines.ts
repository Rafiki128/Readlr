import { RECORDED_LINES } from "./recordedLineData.ts";

// Matches the normalization used when the recordings were installed.
export function normalizeLine(text: string) {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\blet's\b/g, "let us").replace(/'/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** The new-voice recording of a spoken line, if one exists. Single words keep their own Pronounce files. */
export function recordedLine(text: string, lines: Readonly<Record<string, string>> = RECORDED_LINES) {
  const key = normalizeLine(text);
  return key.includes(" ") ? lines[key] : undefined;
}

/**
 * Groups a message's sentences into the longest runs that have a recording, so a recorded pair such as
 * "Take your time. There is no timer to beat." still plays after a sentence that has none. Sentences outside
 * any recorded run come back on their own, without a file, for the computer voice.
 */
export function recordingChunks(sentences: string[], lines: Readonly<Record<string, string>> = RECORDED_LINES) {
  const chunks: { text: string; file?: string }[] = [];
  for (let start = 0; start < sentences.length;) {
    let end = sentences.length, file: string | undefined;
    for (; end > start; end--) { file = lines[normalizeLine(sentences.slice(start, end).join(" "))]; if (file) break; }
    if (file) { chunks.push({ text: sentences.slice(start, end).join(" "), file }); start = end; }
    else { chunks.push({ text: sentences[start] }); start++; }
  }
  return chunks;
}
