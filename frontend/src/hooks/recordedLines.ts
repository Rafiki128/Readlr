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
