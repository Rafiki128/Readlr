import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_STUDY_WORDS, BLEND_ITEMS, STUDY_BOOKS, STUDY_WORDS, allocateGroups, blendTranscriptionPrompt, categoryTotal, finalScore, studyTranscriptionPrompt, wordCategory } from '../src/modules/study/study.data.js';
import { READING_BANKS } from '../src/modules/evidence/reading-catalog.js';
process.env.SUPABASE_URL = 'http://127.0.0.1:1'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { summarize, getSession, updateSession, learningEndsAt, recordAnswer } = await import('../src/modules/study/study.service.js');
const { supabase } = await import('../src/database/db.js');
const { enrollStudy, answerStudyWord, deleteStudySession, scoreResponse, studyWorkbook } = await import('../src/modules/study/study.controller.js');
const response = () => ({ statusCode: 200, body: null as any, status(n: number) { this.statusCode = n; return this; }, json(d: any) { this.body = d; return this; }, setHeader() {} });

test('instrument has 15 unique words; every set has two words per vowel except B transfer (one short u)', () => {
  assert.equal(ALL_STUDY_WORDS.length, 15);
  assert.equal(new Set(ALL_STUDY_WORDS).size, 15);
  for (const g of ['A', 'B'] as const) for (const set of ['taught', 'transfer'] as const) {
    const short = g === 'B' && set === 'transfer';
    assert.equal(STUDY_WORDS[g][set].length, short ? 3 : 4);
    const vowels = STUDY_WORDS[g][set].map(w => w[1]);
    for (const v of g === 'A' ? ['i', 'e'] : ['o', 'u']) assert.equal(vowels.filter(x => x === v).length, short && v === 'u' ? 1 : 2, `${g} ${set} ${v} words`);
  }
  assert.ok(!ALL_STUDY_WORDS.includes('gum'));
});

test('score totals follow each group\'s word sets', () => {
  assert.deepEqual((['taught', 'transfer', 'control'] as const).map(k => categoryTotal('A', k)), [4, 4, 7]);
  assert.deepEqual((['taught', 'transfer', 'control'] as const).map(k => categoryTotal('B', k)), [4, 3, 8]);
});

test('taught words come from the group books and transfer words never appear in any book', () => {
  const bookWords = Object.values(READING_BANKS).flat();
  for (const g of ['A', 'B'] as const) {
    const own = STUDY_BOOKS[g].flatMap(book => READING_BANKS[book]);
    for (const word of STUDY_WORDS[g].taught) assert.ok(own.includes(word), `${word} is taught to group ${g}`);
    for (const word of STUDY_WORDS[g].transfer) assert.ok(!bookWords.includes(word), `${word} must not be practiced in the app`);
  }
});

test('the other group\'s words are controls', () => {
  assert.equal(wordCategory('A', 'sit'), 'taught');
  assert.equal(wordCategory('A', 'tip'), 'transfer');
  assert.equal(wordCategory('A', 'pot'), 'control-taught');
  assert.equal(wordCategory('A', 'mug'), 'control-transfer');
  assert.throws(() => wordCategory('A', 'lit'), 'words dropped from the 24-word pilot list are unknown');
  assert.equal(wordCategory('B', 'pot'), 'taught');
  assert.throws(() => wordCategory('A', 'cat'));
});

test('group allocation stays balanced, including later enrolments', () => {
  const groups = allocateGroups(Array.from({ length: 15 }, (_, i) => i + 1), { A: 0, B: 0 });
  const a = [...groups.values()].filter(g => g === 'A').length;
  assert.ok(a === 7 || a === 8);
  const later = allocateGroups([100, 101, 102], { A: 5, B: 2 });
  assert.deepEqual([...later.values()].sort(), ['B', 'B', 'B']);
});

test('the speech prompt never reveals the expected word', () => {
  const prompt = studyTranscriptionPrompt();
  assert.doesNotMatch(prompt, /on screen is/);
  for (const word of ALL_STUDY_WORDS) assert.match(prompt, new RegExp(`\\b${word}\\b`));
});

test('teacher scores override the app, skips are incorrect, unclear is missing', () => {
  assert.equal(finalScore({ skipped: true, teacher_score: null, app_result: null }), 'incorrect');
  assert.equal(finalScore({ skipped: false, teacher_score: 'correct', app_result: 'different' }), 'correct');
  assert.equal(finalScore({ skipped: false, teacher_score: null, app_result: 'matched' }), 'correct');
  assert.equal(finalScore({ skipped: false, teacher_score: 'unclear', app_result: 'matched' }), null);
  assert.equal(finalScore({ skipped: false, teacher_score: null, app_result: 'uncertain' }), null);
});

const session = (user_id: number, code: string, group: 'A' | 'B') => ({ user_id, participant_code: code, study_group: group, phase: 'done', learning_minutes: 30,
  pretest_order: ALL_STUDY_WORDS, posttest_order: ALL_STUDY_WORDS, learning_started_at: null, posttest_started_at: null, finished_at: null, created_at: '', updated_at: '' }) as any;
const answer = (user_id: number, phase: 'pretest' | 'posttest', word: string, teacher: string | null, app: string | null = null, skipped = false) =>
  ({ id: `${user_id}-${phase}-${word}`, user_id, phase, word, position: ALL_STUDY_WORDS.indexOf(word), skipped,
    item_type: BLEND_ITEMS.includes(word) ? 'blend' : 'word', prompt_replayed: false, recording_path: skipped ? null : 'x', recording_type: 'audio/webm', app_result: app, app_transcript: null, teacher_score: teacher, created_at: '2026-11-11T00:00:00Z' }) as any;

test('summary separates own taught, own transfer, and control gains, and measures agreement', () => {
  const responses = [
    ...ALL_STUDY_WORDS.map(w => answer(1, 'pretest', w, 'incorrect', 'different')),
    ...ALL_STUDY_WORDS.map(w => answer(1, 'posttest', w, STUDY_WORDS.A.taught.includes(w) || w === 'tip' ? 'correct' : 'incorrect', w === 'sit' ? 'different' : 'matched')),
  ];
  const { participants, agreement } = summarize([session(1, 'P01', 'A')], responses);
  const p = participants[0];
  assert.equal(p.complete, true);
  assert.deepEqual([p.taught.pre.correct, p.taught.post.correct], [0, 4]);
  assert.deepEqual([p.transfer.pre.correct, p.transfer.post.correct], [0, 1]);
  assert.deepEqual([p.taught.post.total, p.transfer.post.total], [4, 4]);
  assert.deepEqual([p.control.pre.correct, p.control.post.correct, p.control.post.total], [0, 0, 7]);
  assert.equal(agreement.compared, 30);
  assert.equal(agreement.agree, 15 + 4);
});

test('answers from an older word list are ignored in results', () => {
  const sessions = [session(2, 'P02', 'A')];
  const { participants } = summarize(sessions, [answer(2, 'pretest', 'lit', 'correct'), answer(2, 'pretest', 'sit', 'correct')]);
  assert.equal(participants[0].taught.pre.correct, 1);
});

test('export is anonymous and long-format', async () => {
  const responses = [answer(7, 'pretest', 'sit', 'correct'), answer(7, 'pretest', 'pot', null, null, true)];
  const sessions = [session(7, 'P03', 'A')];
  const book = studyWorkbook(sessions, responses, summarize(sessions, responses));
  const sheet = book.getWorksheet('Responses')!;
  assert.deepEqual(sheet.getRow(2).values.slice(1, 8), ['P03', 'A', 'pretest', 1, 'sit', 'taught', 'No']);
  assert.equal(sheet.getRow(3).getCell(11).value, 0);
  const text = JSON.stringify((await book.xlsx.writeBuffer()).byteLength);
  assert.ok(Number(text) > 0);
});

test('admin and learner endpoints reject invalid input before touching the database', async () => {
  let res = response(); await enrollStudy({ body: { userIds: [1, 1], learningMinutes: 30 } } as any, res as any); assert.equal(res.statusCode, 400);
  res = response(); await enrollStudy({ body: { userIds: [1], learningMinutes: 2 } } as any, res as any); assert.equal(res.statusCode, 400);
  res = response(); await answerStudyWord({ userId: 1, body: { phase: 'pretest', word: 'sit' } } as any, res as any); assert.equal(res.statusCode, 400);
  res = response(); await deleteStudySession({ params: { userId: '3' }, body: {} } as any, res as any); assert.equal(res.statusCode, 400);
  res = response(); await scoreResponse({ params: { id: 'nope' }, body: { score: 'correct' } } as any, res as any); assert.equal(res.statusCode, 400);
});

// Minimal in-memory stand-in for the readlr_study_sessions queries used by getSession and advance.
function stubSessionRow(row: any) {
  const original = supabase.from;
  supabase.from = (() => {
    let patch: Record<string, unknown> | null = null;
    const filters: Record<string, unknown> = {};
    const matches = () => Object.entries(filters).every(([k, v]) => row[k] === v);
    const query: any = {
      select: () => query, eq: (k: string, v: unknown) => { filters[k] = v; return query; }, update: (p: Record<string, unknown>) => { patch = p; return query; },
      maybeSingle: async () => ({ data: matches() ? { ...row } : null, error: null }),
      single: async () => ({ data: { ...row }, error: null }),
      then: (resolve: (v: unknown) => unknown) => { const hit = matches(); if (hit && patch) Object.assign(row, patch); return resolve({ data: hit ? [{ ...row }] : [], error: null }); },
    };
    return query;
  }) as any;
  return () => { supabase.from = original; };
}
const learningRow = (minutes: number | null, startedAt: string) => ({ ...session(9, 'P09', 'A'), phase: 'learning', learning_minutes: minutes, learning_started_at: startedAt });

test('an untimed session has no end time and stays in learning after any elapsed time', async () => {
  const row = learningRow(null, '2020-01-01T00:00:00Z');
  assert.equal(learningEndsAt(row), null);
  const restore = stubSessionRow(row);
  try {
    const loaded = await getSession(9);
    assert.equal(loaded?.phase, 'learning');
    assert.equal(row.phase, 'learning');
    assert.equal(row.posttest_started_at, null);
  } finally { restore(); }
});

test('a timed session still moves to posttest once its time is up', async () => {
  const row = learningRow(30, '2020-01-01T00:00:00Z');
  const restore = stubSessionRow(row);
  try { assert.equal((await getSession(9))?.phase, 'posttest'); } finally { restore(); }
});

test('start-posttest advances an untimed session', async () => {
  const row = learningRow(null, '2020-01-01T00:00:00Z');
  const restore = stubSessionRow(row);
  try {
    await updateSession(9, 'start-posttest', undefined);
    assert.equal(row.phase, 'posttest');
    assert.ok(row.posttest_started_at);
  } finally { restore(); }
});

test('enrolment accepts an untimed learning phase', async () => {
  const original = supabase.from;
  // Past validation the stub fails, so a 503 shows the null was accepted.
  supabase.from = (() => { throw new Error('stubbed'); }) as any;
  try {
    const res = response(); await enrollStudy({ body: { userIds: [1], learningMinutes: null } } as any, res as any);
    assert.equal(res.statusCode, 503);
    const bad = response(); await enrollStudy({ body: { userIds: [1], learningMinutes: 'untimed' } } as any, bad as any);
    assert.equal(bad.statusCode, 400);
  } finally { supabase.from = original; }
});

test('export shows Untimed for a session without a learning time', () => {
  const sessions = [{ ...session(8, 'P08', 'A'), learning_minutes: null }, session(10, 'P10', 'B')];
  const sheet = studyWorkbook(sessions, [], summarize(sessions, [])).getWorksheet('Summary')!;
  assert.equal(sheet.getRow(2).getCell(14).value, 'Untimed');
  assert.equal(sheet.getRow(3).getCell(14).value, 30);
});

// --- Sound blending (Part 2)

const blendSession = (phase = 'pretest') => ({ ...session(11, 'P11', 'A'), phase, pretest_blend_order: [...BLEND_ITEMS], posttest_blend_order: [...BLEND_ITEMS] });

// In-memory stand-in for the session and response queries used by recordAnswer; answers is the saved responses table.
function stubStudyDb(row: any, answers: any[]) {
  const original = supabase.from;
  supabase.from = ((table: string) => {
    let patch: Record<string, unknown> | null = null;
    let inserted: any = null;
    const filters: Record<string, unknown> = {};
    const matches = () => Object.entries(filters).every(([k, v]) => row[k] === v);
    const query: any = {
      select: () => query, update: (p: Record<string, unknown>) => { patch = p; return query; }, insert: (r: any) => { inserted = r; return query; },
      eq: (k: string, v: unknown) => { filters[k] = v; return query; }, is: (k: string, v: unknown) => { filters[k] = v; return query; },
      maybeSingle: async () => ({ data: { ...row }, error: null }),
      single: async () => {
        if (!inserted) return { data: { ...row }, error: null };
        answers.push(inserted);
        return { data: { id: `id-${answers.length}` }, error: null };
      },
      then: (resolve: (v: unknown) => unknown) => {
        if (table === 'readlr_study_responses') return resolve({ data: answers.filter(a => a.phase === filters.phase), error: null });
        const hit = matches();
        if (hit && patch) Object.assign(row, patch);
        return resolve({ data: hit ? [{ ...row }] : [], error: null });
      },
    };
    return query;
  }) as any;
  return () => { supabase.from = original; };
}

test('blending items are separate from the printed words and are blend category', () => {
  assert.deepEqual(BLEND_ITEMS, ['gap', 'nap', 'wed', 'vet', 'rib', 'fig', 'jot', 'rod', 'hum', 'bud']);
  assert.ok(BLEND_ITEMS.every(w => !ALL_STUDY_WORDS.includes(w)));
  assert.equal(wordCategory('A', 'gap'), 'blend');
  assert.equal(wordCategory('B', 'bud'), 'blend');
});

test('the blending prompt lists only blending items and the printed-word prompt is unchanged', () => {
  const blend = blendTranscriptionPrompt();
  for (const word of BLEND_ITEMS) assert.match(blend, new RegExp(`\\b${word}\\b`));
  for (const word of ALL_STUDY_WORDS) assert.doesNotMatch(blend, new RegExp(`\\b${word}\\b`));
  for (const word of BLEND_ITEMS) assert.doesNotMatch(studyTranscriptionPrompt(), new RegExp(`\\b${word}\\b`));
});

test('blend answers are accepted only for blending items in the blend part', async () => {
  const row = blendSession();
  const answers: any[] = [];
  const restore = stubStudyDb(row, answers);
  try {
    await assert.rejects(recordAnswer(11, 'pretest', 'sit', null, 'blend'), { status: 400 });
    await assert.rejects(recordAnswer(11, 'pretest', 'gap', null, 'word'), { status: 400 });
    await assert.rejects(recordAnswer(11, 'pretest', 'gap', null, 'sound'), { status: 400 });
    await recordAnswer(11, 'pretest', 'nap', null, 'blend', true);
    await recordAnswer(11, 'pretest', 'sit', null, 'word', true);
    assert.deepEqual(answers.map(a => [a.word, a.item_type, a.prompt_replayed, a.position]), [['nap', 'blend', true, 16], ['sit', 'word', false, 0]]);
  } finally { restore(); }
});

test('the test moves on only when both the printed words and the blending part are done', async () => {
  const row = blendSession();
  const answers: any[] = ALL_STUDY_WORDS.map(word => ({ phase: 'pretest', word }));
  const restore = stubStudyDb(row, answers);
  try {
    for (const word of BLEND_ITEMS.slice(0, -1)) await recordAnswer(11, 'pretest', word, null, 'blend');
    assert.equal(row.phase, 'pretest', 'words done but one blending item left');
    const view = await recordAnswer(11, 'pretest', 'bud', null, 'blend');
    assert.equal(row.phase, 'learning');
    assert.equal(view.active && view.phase, 'learning');
  } finally { restore(); }
});

test('blend orders are added lazily only to sessions still in the pretest', async () => {
  const pre = { ...session(12, 'P12', 'A'), phase: 'pretest', pretest_blend_order: null, posttest_blend_order: null };
  let restore = stubStudyDb(pre, []);
  try {
    const loaded = await getSession(12);
    assert.deepEqual([...loaded!.pretest_blend_order!].sort(), [...BLEND_ITEMS].sort());
    assert.deepEqual([...loaded!.posttest_blend_order!].sort(), [...BLEND_ITEMS].sort());
  } finally { restore(); }
  const later = { ...session(13, 'P13', 'A'), phase: 'posttest', pretest_blend_order: null, posttest_blend_order: null };
  restore = stubStudyDb(later, []);
  try {
    assert.equal((await getSession(13))!.posttest_blend_order, null, 'no posttest-only blending part');
  } finally { restore(); }
});

test('summary reports blending separately from the printed-word categories', () => {
  const s = blendSession('done');
  const responses = [
    ...ALL_STUDY_WORDS.map(w => answer(11, 'pretest', w, 'incorrect')),
    ...ALL_STUDY_WORDS.map(w => answer(11, 'posttest', w, 'incorrect')),
    answer(11, 'pretest', 'gap', 'correct'), answer(11, 'pretest', 'nap', null, 'matched'), answer(11, 'pretest', 'wed', null, null, true), answer(11, 'pretest', 'vet', 'unclear', 'matched'),
    ...BLEND_ITEMS.slice(4).map(w => answer(11, 'pretest', w, 'incorrect')),
    ...BLEND_ITEMS.map(w => answer(11, 'posttest', w, 'correct')),
  ];
  const p = summarize([s], responses).participants[0];
  assert.deepEqual(p.blend.pre, { correct: 2, scored: 9, total: 10 });
  assert.deepEqual(p.blend.post, { correct: 10, scored: 10, total: 10 });
  assert.deepEqual([p.taught.pre.correct, p.transfer.post.correct, p.control.post.total], [0, 0, 7]);
  assert.equal(p.complete, true);
  assert.equal(p.unscored, 1);
  assert.equal(summarize([s], responses.filter(r => r.word !== 'bud' || r.phase !== 'posttest')).participants[0].complete, false);
  assert.equal(summarize([session(12, 'P12', 'A')], []).participants[0].blend.pre.total, 0);
});

test('export has item type, prompt replayed, and blending totals', () => {
  const s = blendSession('done');
  const responses = [answer(11, 'pretest', 'sit', 'correct'), { ...answer(11, 'pretest', 'gap', 'correct'), position: 15, prompt_replayed: true }, answer(11, 'posttest', 'gap', 'incorrect')];
  const book = studyWorkbook([s], responses, summarize([s], responses));
  const long = book.getWorksheet('Responses')!;
  assert.deepEqual((long.getRow(1).values as unknown[]).slice(13), ['Item type', 'Prompt replayed']);
  assert.deepEqual((long.getRow(2).values as unknown[]).slice(5, 8), ['sit', 'taught', 'No']);
  assert.deepEqual((long.getRow(2).values as unknown[]).slice(13), ['word', 'No']);
  assert.deepEqual((long.getRow(3).values as unknown[]).slice(4, 7), [16, 'gap', 'blend']);
  assert.deepEqual((long.getRow(3).values as unknown[]).slice(13), ['blend', 'Yes']);
  const wide = book.getWorksheet('Summary')!;
  assert.deepEqual((wide.getRow(1).values as unknown[]).slice(18), ['Pre blending /10', 'Post blending /10', 'Gain blending']);
  assert.deepEqual((wide.getRow(2).values as unknown[]).slice(18), [1, 0, -1]);
  assert.equal(wide.getRow(1).getCell(14).value, 'Learning minutes', 'existing summary columns keep their positions');
});
