import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_STUDY_WORDS, BLEND_ITEMS, FLUENCY_WORDS, STUDY_BOOKS, STUDY_WORDS, allocateGroups, blendTranscriptionPrompt, categoryTotal, finalScore, fluencyScore, studyTranscriptionPrompt, wcpm, wordCategory } from '../src/modules/study/study.data.js';
import { READING_BANKS } from '../src/modules/evidence/reading-catalog.js';
process.env.SUPABASE_URL = 'http://127.0.0.1:1'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { summarize, getSession, learnerView, updateSession, learningEndsAt, recordAnswer, recordFluency, setFluencyScore } = await import('../src/modules/study/study.service.js');
const { supabase } = await import('../src/database/db.js');
const { systemUseWorkbook } = await import('../src/modules/study/workspace.js');
const { enrollStudy, answerStudyWord, deleteStudySession, scoreFluency, scoreResponse, studyWorkbook } = await import('../src/modules/study/study.controller.js');
const response = () => ({ statusCode: 200, body: null as any, status(n: number) { this.statusCode = n; return this; }, json(d: any) { this.body = d; return this; }, setHeader() {} });

test('participant activity workbook includes summary and Manila-dated events',async()=>{
  const book=systemUseWorkbook('P07',[{kind:'book-start',book:'gate',stop:'',task:'',occurred_at:'2026-11-24T17:00:00Z'}]);
  assert.equal(book.getWorksheet('Summary')?.getCell('D2').value,'P07');
  assert.equal(book.getWorksheet('Activity log')?.getCell('A2').value,'2026-11-25');
  assert.equal(book.getWorksheet('Activity log')?.getCell('D2').value,'book-start');
  assert.ok((await book.xlsx.writeBuffer()).byteLength>0);
});

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
      maybeSingle: async () => {
        const hit = matches();
        if (hit && patch) Object.assign(row, patch);
        return { data: hit ? { ...row } : null, error: null };
      },
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

test('a legacy timed session waits for an explicit post-test assignment', async () => {
  const row = learningRow(30, '2020-01-01T00:00:00Z');
  const restore = stubSessionRow(row);
  try { assert.equal((await getSession(9))?.phase, 'learning'); } finally { restore(); }
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

test('staff can end an active pre-test and later assign the post-test', async () => {
  const row = { ...readingSession('pretest'), withdrawn: false, entry_pending: true };
  const restore = stubSessionRow(row);
  try {
    await updateSession(row.user_id, 'end-pretest', undefined);
    assert.ok(row.pretest_ended_early_at);
    assert.equal(row.learning_minutes, null);
    assert.deepEqual(await learnerView(row), {active: false, systemUse: true});
    await assert.rejects(updateSession(row.user_id, 'end-pretest', undefined), /Only an active pre-test/);
    await updateSession(row.user_id, 'start-posttest', undefined);
    assert.equal(row.phase, 'posttest');
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

// In-memory stand-in for the session, response and Part 3 queries; answers and readings are the saved tables.
function stubStudyDb(row: any, answers: any[], readings: any[] = []) {
  const original = supabase.from;
  // Recording uploads succeed without touching storage.
  const originalStorage = supabase.storage;
  (supabase as any).storage = { from: () => ({ upload: async () => ({ data: {}, error: null }), remove: async () => ({ data: [], error: null }) }) };
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
        if (table === 'readlr_study_fluency') {
          if (inserted) { readings.push(inserted); return resolve({ data: null, error: null }); }
          return resolve({ data: readings.filter(a => a.phase === filters.phase), error: null });
        }
        if (table === 'readlr_study_responses') return resolve({ data: answers.filter(a => a.phase === filters.phase), error: null });
        const hit = matches();
        if (hit && patch) Object.assign(row, patch);
        return resolve({ data: hit ? [{ ...row }] : [], error: null });
      },
    };
    return query;
  }) as any;
  return () => { supabase.from = original; (supabase as any).storage = originalStorage; };
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
  assert.deepEqual((long.getRow(1).values as unknown[]).slice(13, 15), ['Item type', 'Prompt replayed']);
  assert.deepEqual((long.getRow(2).values as unknown[]).slice(5, 8), ['sit', 'taught', 'No']);
  assert.deepEqual((long.getRow(2).values as unknown[]).slice(13), ['word', 'No']);
  assert.deepEqual((long.getRow(3).values as unknown[]).slice(4, 7), [16, 'gap', 'blend']);
  assert.deepEqual((long.getRow(3).values as unknown[]).slice(13), ['blend', 'Yes']);
  const wide = book.getWorksheet('Summary')!;
  assert.deepEqual((wide.getRow(1).values as unknown[]).slice(18, 21), ['Pre blending /10', 'Post blending /10', 'Gain blending']);
  assert.deepEqual((wide.getRow(2).values as unknown[]).slice(18, 21), [1, 0, '']);
  assert.equal(wide.getRow(1).getCell(14).value, 'Learning minutes', 'existing summary columns keep their positions');
});

// --- One-minute word reading (Part 3)

const readingSession = (phase = 'pretest') => ({ ...blendSession(phase), pretest_fluency_order: [...FLUENCY_WORDS], posttest_fluency_order: [...FLUENCY_WORDS].reverse() });
const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/webm' };
const reading = (user_id: number, phase: 'pretest' | 'posttest', marks: Partial<{ words_attempted: number; words_correct: number; duration_ms: number; skipped: boolean; scored_at: string | null }>) =>
  ({ id: `${user_id}-${phase}-reading`, user_id, phase, word_order: [...FLUENCY_WORDS], started_at: '2026-11-21T00:00:00Z', duration_ms: 60000, recording_path: 'x', skipped: false,
    words_attempted: null, error_positions: [], words_correct: null, scored_at: '2026-11-21T01:00:00Z', created_at: '2026-11-21T00:01:00Z', ...marks }) as any;

test('the one-minute list has 40 unique words and none are printed-word or blending items', () => {
  assert.equal(FLUENCY_WORDS.length, 40);
  assert.equal(new Set(FLUENCY_WORDS).size, 40);
  for (const word of FLUENCY_WORDS) assert.ok(!ALL_STUDY_WORDS.includes(word) && !BLEND_ITEMS.includes(word), `${word} overlaps another part`);
});

test('the test does not move on until Part 3 is recorded or skipped', async () => {
  const row = readingSession();
  const answers: any[] = [...ALL_STUDY_WORDS, ...BLEND_ITEMS.slice(0, -1)].map(word => ({ phase: 'pretest', word }));
  const readings: any[] = [];
  const restore = stubStudyDb(row, answers, readings);
  try {
    const view = await recordAnswer(11, 'pretest', 'bud', null, 'blend');
    assert.equal(row.phase, 'pretest', 'Parts 1 and 2 done but Part 3 missing');
    assert.equal(view.active && view.test?.fluencyDone, false);
    assert.deepEqual(view.active && view.test?.fluency, FLUENCY_WORDS);
    await recordFluency(11, 'pretest', null, undefined, undefined);
    assert.equal(row.phase, 'learning');
    assert.deepEqual([readings[0].skipped, readings[0].recording_path, readings[0].duration_ms], [true, null, null]);
    assert.deepEqual(readings[0].word_order, FLUENCY_WORDS);
  } finally { restore(); }
});

test('Part 3 recorded first still waits for the last blending answer', async () => {
  const row = readingSession('posttest');
  const answers: any[] = [...ALL_STUDY_WORDS, ...BLEND_ITEMS.slice(0, -1)].map(word => ({ phase: 'posttest', word }));
  const readings: any[] = [];
  const restore = stubStudyDb(row, answers, readings);
  try {
    await recordFluency(11, 'posttest', audio, '2026-11-21T00:00:00Z', '42000');
    assert.equal(row.phase, 'posttest');
    assert.deepEqual(readings[0].word_order, [...FLUENCY_WORDS].reverse(), 'posttest uses its own order');
    await recordAnswer(11, 'posttest', 'bud', null, 'blend');
    assert.equal(row.phase, 'done');
  } finally { restore(); }
});

test('Part 3 duration is capped at one minute and invalid timing is refused', async () => {
  const row = readingSession();
  const readings: any[] = [];
  const restore = stubStudyDb(row, [], readings);
  try {
    for (const duration of ['70000', '-1', 'abc', '1.5']) await assert.rejects(recordFluency(11, 'pretest', audio, '2026-11-21T00:00:00Z', duration), { status: 400 });
    await assert.rejects(recordFluency(11, 'pretest', audio, 'not a date', '30000'), { status: 400 });
    await assert.rejects(recordFluency(11, 'posttest', audio, '2026-11-21T00:00:00Z', '30000'), { status: 409 });
    assert.equal(readings.length, 0);
    await recordFluency(11, 'pretest', audio, '2026-11-21T00:00:00Z', '64000');
    assert.equal(readings[0].duration_ms, 60000);
    assert.equal(readings[0].started_at, '2026-11-21T00:00:00.000Z');
    assert.match(readings[0].recording_path, /^11\/pretest-fluency-[0-9a-f-]+\.webm$/);
  } finally { restore(); }
});

test('Part 3 is refused for sessions without it', async () => {
  const restore = stubStudyDb(blendSession(), [], []);
  try { await assert.rejects(recordFluency(11, 'pretest', null, undefined, undefined), { status: 400 }); } finally { restore(); }
});

test('Part 3 orders are added lazily only to sessions still in the pretest', async () => {
  const pre = { ...blendSession('pretest'), pretest_fluency_order: null, posttest_fluency_order: null };
  let restore = stubStudyDb(pre, []);
  try {
    const loaded = await getSession(11);
    assert.deepEqual([...loaded!.pretest_fluency_order!].sort(), [...FLUENCY_WORDS].sort());
    assert.deepEqual([...loaded!.posttest_fluency_order!].sort(), [...FLUENCY_WORDS].sort());
    assert.deepEqual(loaded!.pretest_blend_order, BLEND_ITEMS, 'existing blending order is kept');
  } finally { restore(); }
  for (const phase of ['learning', 'posttest', 'done']) {
    const later = { ...blendSession(phase), learning_minutes: null, pretest_fluency_order: null, posttest_fluency_order: null };
    restore = stubStudyDb(later, []);
    try { assert.equal((await getSession(11))!.posttest_fluency_order, null, `no Part 3 added in ${phase}`); } finally { restore(); }
  }
});

test('WCPM is words correct per minute of reading, rounded to one decimal', () => {
  assert.equal(wcpm(30, 60000), 30);
  assert.equal(wcpm(20, 45000), 26.7);
  assert.equal(wcpm(0, 60000), 0);
  assert.equal(wcpm(5, 0), null);
});

test('Part 3 scoring: last word reached must be at or after every error', () => {
  assert.deepEqual(fluencyScore(40, [7, 3], 25), { words_attempted: 25, error_positions: [3, 7], words_correct: 23 });
  assert.deepEqual(fluencyScore(40, [25], 25), { words_attempted: 25, error_positions: [25], words_correct: 24 });
  assert.deepEqual(fluencyScore(40, [], 0), { words_attempted: 0, error_positions: [], words_correct: 0 });
  for (const [errors, last] of [[[30], 25], [[3, 3], 10], [[0], 10], [[1.5], 10], ['3', 10], [[], 41], [[], -1], [[], undefined]] as const) {
    assert.throws(() => fluencyScore(40, errors, last), RangeError, `errors ${JSON.stringify(errors)}, last ${last}`);
  }
});

test('teacher scoring validates marks before saving and stores server-computed totals', async () => {
  const res = response(); await scoreFluency({ params: { id: 'nope' }, body: {} } as any, res as any); assert.equal(res.statusCode, 400);
  const original = supabase.from;
  const patches: any[] = [];
  supabase.from = (() => {
    const query: any = { select: () => query, eq: () => query, update: (p: any) => { patches.push(p); return query; },
      maybeSingle: async () => ({ data: { word_order: [...FLUENCY_WORDS] }, error: null }), then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) };
    return query;
  }) as any;
  try {
    await assert.rejects(setFluencyScore('id', { errors: [30], lastReached: 25 }, 1), { status: 400 });
    assert.equal(patches.length, 0);
    await setFluencyScore('id', { errors: [2, 9], lastReached: 31 }, 5);
    assert.deepEqual([patches[0].words_attempted, patches[0].words_correct, patches[0].error_positions, patches[0].scored_by], [31, 29, [2, 9], 5]);
    await setFluencyScore('id', null, 5);
    assert.deepEqual([patches[1].words_attempted, patches[1].scored_at], [null, null], 'undo clears the marks');
  } finally { supabase.from = original; }
});

test('summary and export add Part 3 columns at the end; skipped or unscored readings stay blank', () => {
  const scored = readingSession('done');
  const blank = { ...readingSession('done'), user_id: 14, participant_code: 'P14' };
  const full = (user: number) => (['pretest', 'posttest'] as const).flatMap(phase => [...ALL_STUDY_WORDS, ...BLEND_ITEMS].map(w => answer(user, phase, w, 'correct')));
  const responses = [...full(11), ...full(14)];
  const readings = [
    reading(11, 'pretest', { words_attempted: 30, words_correct: 27 }), reading(11, 'posttest', { words_attempted: 40, words_correct: 39, duration_ms: 50000 }),
    reading(14, 'pretest', { skipped: true, recording_path: null, duration_ms: null, scored_at: null }), reading(14, 'posttest', { scored_at: null }),
  ];
  const summary = summarize([scored, blank], responses, readings);
  assert.deepEqual(summary.participants[0].fluency.post, { wordsAttempted: 40, wordsCorrect: 39, durationSeconds: 50, wcpm: 46.8 });
  assert.deepEqual(summary.participants[1].fluency, { pre: null, post: null });
  assert.equal(summary.participants[0].complete, true);
  assert.equal(summarize([scored], responses, readings.slice(0, 1)).participants[0].complete, false, 'posttest reading missing');

  const book = studyWorkbook([scored, blank], responses, summary, readings);
  const wide = book.getWorksheet('Summary')!;
  assert.equal(wide.getRow(1).getCell(20).value, 'Gain blending', 'existing summary columns keep their positions');
  assert.deepEqual((wide.getRow(1).values as unknown[]).slice(21), ['Pre words attempted', 'Post words attempted', 'Pre words correct', 'Post words correct', 'Pre duration (s)', 'Post duration (s)', 'Pre WCPM', 'Post WCPM', 'Gain WCPM']);
  assert.deepEqual((wide.getRow(2).values as unknown[]).slice(21), [30, 40, 27, 39, 60, 50, 27, 46.8, 19.8]);
  for (let col = 21; col <= 29; col++) assert.ok(!wide.getRow(3).getCell(col).value, `P14 column ${col} is blank, not 0`);

  const long = book.getWorksheet('Responses')!;
  assert.deepEqual((long.getRow(1).values as unknown[]).slice(15), ['Words attempted', 'Words correct', 'Duration (s)', 'WCPM','Timed review status','Technical note','Word order shown','Completion status']);
  const fluencyRows = long.getRows(2, long.rowCount - 1)!.filter(r => r.getCell(13).value === 'fluency');
  assert.equal(fluencyRows.length, 4);
  const p11post = fluencyRows.find(r => r.getCell(1).value === 'P11' && r.getCell(3).value === 'posttest')!;
  assert.deepEqual((p11post.values as unknown[]).slice(15,19), [40, 39, 50, 46.8]);
  const p14pre = fluencyRows.find(r => r.getCell(1).value === 'P14' && r.getCell(3).value === 'pretest')!;
  assert.equal(p14pre.getCell(7).value, 'Yes');
  for (let col = 15; col <= 18; col++) assert.ok(!p14pre.getCell(col).value, 'skipped reading is blank');
});

test('staff-ended pre-test exports incomplete tasks with no skip or score', () => {
  const s = { ...readingSession('learning'), pretest_ended_early_at: '2026-11-24T00:00:00Z' };
  const answers = [answer(s.user_id, 'pretest', 'sit', 'correct'), answer(s.user_id, 'pretest', 'pin', null, null, true)];
  const summary = summarize([s], answers);
  const book = studyWorkbook([s], answers, summary);
  const sheet = book.getWorksheet('Responses')!;
  assert.equal(sheet.getRow(2).getCell(11).value, 1);
  assert.equal(sheet.getRow(3).getCell(7).value, 'Yes');
  const incomplete = sheet.getRows(2, 26)!.filter(r => r.getCell(22).value === 'Incomplete');
  assert.equal(incomplete.length, 24);
  assert.ok(incomplete.some(r => r.getCell(13).value === 'fluency'));
  assert.ok(incomplete.every(r => r.getCell(7).value === '' && r.getCell(11).value === ''));
  assert.equal(summary.participants[0].complete, false);
});
