import type { StudyFluency, StudyResponse, StudySession } from './study.service.js';

export function incompletePretest(
  session: StudySession,
  responses: Pick<StudyResponse, 'user_id' | 'phase' | 'item_type' | 'word'>[],
  readings: Pick<StudyFluency, 'user_id' | 'phase'>[],
) {
  if (!session.pretest_ended_early_at) return [];
  const answered = new Set(responses.filter(r => r.user_id === session.user_id && r.phase === 'pretest')
    .map(r => r.item_type + ':' + r.word));
  const expected = [
    ...session.pretest_order.map((word, position) => ({ type: 'word' as const, word, position })),
    ...(session.pretest_blend_order ?? []).map((word, i) =>
      ({ type: 'blend' as const, word, position: session.pretest_order.length + i })),
  ];
  const missing: {type: 'word' | 'blend' | 'fluency'; word: string; position: number}[] =
    expected.filter(r => !answered.has(r.type + ':' + r.word));
  if (session.pretest_fluency_order?.length && !readings.some(r => r.user_id === session.user_id && r.phase === 'pretest')) {
    missing.push({type: 'fluency', word: '', position: expected.length});
  }
  return missing;
}
