// Pretest/posttest instrument for the classroom validation study.
// Each group's transfer words use only letters that group is taught and never
// appear in the app, so gains on them show decoding rather than memorized words.
export const STUDY_VERSION = 'readlr-study-v3-15';
export type StudyGroup = 'A' | 'B';
export type StudyPhase = 'pretest' | 'learning' | 'posttest' | 'done' | 'closed';
export type WordSet = 'taught' | 'transfer';

export const STUDY_WORDS: Record<StudyGroup, Record<WordSet, string[]>> = {
  // 15 words. Two words per vowel in every set (A = short i, short e; B = short o, short u),
  // except B transfer, which has one short-u word ('gum' was removed to make the test 15 words).
  A: { taught: ['sit', 'pin', 'set', 'pen'], transfer: ['tip', 'sip', 'pet', 'men'] },
  B: { taught: ['pot', 'hot', 'sun', 'bug'], transfer: ['dot', 'hog', 'mug'] },
};
export type CategoryKey = 'taught' | 'transfer' | 'control';
/** Number of test words in each score for a learner in this group (sets are not all the same size). */
export function categoryTotal(group: StudyGroup, key: CategoryKey): number {
  const other: StudyGroup = group === 'A' ? 'B' : 'A';
  return key === 'control' ? STUDY_WORDS[other].taught.length + STUDY_WORDS[other].transfer.length : STUDY_WORDS[group][key].length;
}
export const ALL_STUDY_WORDS = (['A', 'B'] as const).flatMap(group => [...STUDY_WORDS[group].taught, ...STUDY_WORDS[group].transfer]);

// Reading Chronicles chapters each group may open during the learning phase.
export const STUDY_BOOKS: Record<StudyGroup, string[]> = { A: ['gate', 'lanterns', 'market'], B: ['gate', 'garden', 'bridge'] };

export type WordCategory = 'taught' | 'transfer' | 'control-taught' | 'control-transfer';
/** Category of a test word relative to the learner's own group. */
export function wordCategory(group: StudyGroup, word: string): WordCategory {
  const other: StudyGroup = group === 'A' ? 'B' : 'A';
  if (STUDY_WORDS[group].taught.includes(word)) return 'taught';
  if (STUDY_WORDS[group].transfer.includes(word)) return 'transfer';
  if (STUDY_WORDS[other].taught.includes(word)) return 'control-taught';
  if (STUDY_WORDS[other].transfer.includes(word)) return 'control-transfer';
  throw new Error(`Unknown study word: ${word}`);
}

export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Random balanced allocation: alternate A/B down a shuffled list, continuing from existing counts. */
export function allocateGroups(userIds: number[], existing: { A: number; B: number }, random = Math.random): Map<number, StudyGroup> {
  const counts = { ...existing };
  const result = new Map<number, StudyGroup>();
  for (const id of shuffled(userIds, random)) {
    const group: StudyGroup = counts.A === counts.B ? (random() < 0.5 ? 'A' : 'B') : counts.A < counts.B ? 'A' : 'B';
    counts[group]++;
    result.set(id, group);
  }
  return result;
}

/** Same vocabulary for every item and never the expected word, so no word gets a recognition advantage. */
export function studyTranscriptionPrompt() {
  return `A child is reading one short printed English word aloud. Transcribe only what the child actually says. Possible words include: ${shuffled(ALL_STUDY_WORDS).join(', ')}. Write spoken words, not numerals.`;
}

export type Score = 'correct' | 'incorrect' | null;
/** Teacher scores are primary; the app result is used only when no teacher score exists. Skips are incorrect. */
export function finalScore(row: { skipped: boolean; teacher_score: string | null; app_result: string | null }): Score {
  if (row.skipped) return 'incorrect';
  if (row.teacher_score === 'correct' || row.teacher_score === 'incorrect') return row.teacher_score;
  if (row.teacher_score === 'unclear') return null;
  if (row.app_result === 'matched') return 'correct';
  if (row.app_result === 'different') return 'incorrect';
  return null;
}
