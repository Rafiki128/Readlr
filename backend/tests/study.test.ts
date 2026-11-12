import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_STUDY_WORDS, STUDY_BOOKS, STUDY_WORDS, allocateGroups, categoryTotal, finalScore, studyTranscriptionPrompt, wordCategory } from '../src/modules/study/study.data.js';
import { READING_BANKS } from '../src/modules/evidence/reading-catalog.js';
process.env.SUPABASE_URL = 'http://127.0.0.1:1'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { summarize } = await import('../src/modules/study/study.service.js');
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
  ({ id: `${user_id}-${phase}-${word}`, user_id, phase, word, position: ALL_STUDY_WORDS.indexOf(word), skipped, recording_path: skipped ? null : 'x', recording_type: 'audio/webm', app_result: app, app_transcript: null, teacher_score: teacher, created_at: '2026-11-11T00:00:00Z' }) as any;

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
