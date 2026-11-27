import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_STUDY_WORDS, BLEND_ITEMS } from '../src/modules/study/study.data.js';
import { EXCLUDED_PARTICIPANT_CODES, FOOTER, HOME_DAYS, percentage, smartGoals, statusFor, type LearnerRecord } from '../src/modules/study/smart-goals.js';
import { normalCdf, pairedStats, pairedT, regularizedBeta, tTwoSidedP, wilcoxon } from '../src/modules/study/smart-goals.stats.js';
process.env.SUPABASE_URL = 'http://127.0.0.1:1'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { manilaDate, normalizeLearners, retryCounts } = await import('../src/modules/study/smart-goals.loader.js');
const { summarize } = await import('../src/modules/study/study.service.js');
const { studyWorkbook } = await import('../src/modules/study/study.controller.js');

const close = (actual: number | null | undefined, expected: number, tolerance = 1e-4) => assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const config = { excludedCodes: [] as string[], homeDays: HOME_DAYS };
const learner = (over: Partial<LearnerRecord> = {}): LearnerRecord => ({
  code: 'P01', group: 'A', complete: true, unscored: 0,
  words: { pre: { correct: 5, scored: 15 }, post: { correct: 12, scored: 15 } },
  blend: { pre: { correct: 5, scored: 10 }, post: { correct: 7, scored: 10 } },
  wcpm: { pre: 10, post: 15 }, requiredBooks: ['gate', 'lanterns', 'market'], booksPassed: ['gate', 'lanterns', 'market'],
  attemptDates: ['2026-11-22', '2026-11-24'], checkpointDates: [], loginDates: [],
  retry: { missed: 4, corrected: 3 }, agreement: { compared: 20, agree: 17 }, guidedStops: 2, surveyed: true, recordings: 50, appUnavailable: 1, ...over,
});
const row = (report: ReturnType<typeof smartGoals>, indicator: string) => [...report.sectionA, ...report.sectionB].find(r => r.indicator.startsWith(indicator))!;

// --- Percentages and status

test('percentages round to one decimal and are null for a zero denominator', () => {
  assert.equal(percentage(0, 0), null);
  assert.equal(percentage(2, 3), 66.7);
  assert.equal(percentage(1, 8), 12.5);
  assert.equal(percentage(12, 15), 80);
  assert.equal(statusFor(null, 80), 'Pending');
});

test('exact target boundaries are met; just below is not', () => {
  assert.equal(statusFor(80, 80), 'Met');
  assert.equal(statusFor(79.9, 80), 'Not met');
  const met = row(smartGoals([learner()], config), 'Post-test printed-word');
  assert.equal(met.result, '80.0% (12/15 scored items)');
  assert.equal(met.status, 'Met');
  const missed = row(smartGoals([learner({ words: { pre: { correct: 5, scored: 15 }, post: { correct: 11, scored: 15 } } })], config), 'Post-test printed-word');
  assert.equal(missed.status, 'Not met');
  // 3 of 4 completed learners passed every book: exactly 75%.
  const books = [learner(), learner(), learner(), learner({ booksPassed: ['gate'] })];
  assert.equal(row(smartGoals(books, config), 'Level completion').status, 'Not measured');
});

test('no completed learners leaves every targeted Section B row pending', () => {
  const report = smartGoals([learner({ complete: false })], config);
  assert.equal(report.completed, 0);
  for (const goal of report.sectionB.filter(g => g.target !== 'No target' && g.indicator !== 'Level completion')) assert.equal(goal.status, 'Pending', goal.indicator);
});

// --- Normalization from saved study rows (teacher score preferred, skips and unclear incorrect)

const session = (user_id: number, code: string, created_at = '2026-11-22T01:00:00Z') => ({ user_id, participant_code: code, study_group: 'A', phase: 'done', learning_minutes: 30,
  pretest_order: ALL_STUDY_WORDS, posttest_order: ALL_STUDY_WORDS, pretest_blend_order: null, posttest_blend_order: null,
  learning_started_at: null, posttest_started_at: null, finished_at: null, created_at, updated_at: '' }) as any;
const answer = (user_id: number, phase: 'pretest' | 'posttest', word: string, teacher: string | null, app: string | null = null, skipped = false) =>
  ({ id: `${user_id}-${phase}-${word}`, user_id, phase, word, position: 0, skipped, item_type: BLEND_ITEMS.includes(word) ? 'blend' : 'word', prompt_replayed: false,
    recording_path: skipped ? null : 'x', recording_type: 'audio/webm', app_result: app, app_transcript: null, teacher_score: teacher, created_at: '2026-11-22T02:00:00Z' }) as any;
const empty = { fluency: [], profiles: [{ id: 100, user_id: 1 }], epochs: [], checkpoints: [], attempts: [], events: [], states: [], surveys: [] };

test('pronunciation tallies: skip and unclear count as incorrect, missing stays unscored', () => {
  const [w1, w2, w3, w4, w5] = ALL_STUDY_WORDS;
  const responses = [
    answer(1, 'posttest', w1, 'correct', 'different'),
    answer(1, 'posttest', w2, null, 'matched'),
    answer(1, 'posttest', w3, null, null, true),
    answer(1, 'posttest', w4, 'unclear', 'matched'),
    answer(1, 'posttest', w5, null, 'unavailable'),
  ];
  const [record] = normalizeLearners({ ...empty, sessions: [session(1, 'P01')], responses });
  assert.deepEqual(record.words.post, { correct: 2, scored: 4 });
  assert.equal(record.unscored, 1);
  assert.deepEqual(record.agreement, { compared: 1, agree: 0 }, 'only the row with both a teacher and an app decision is compared, and they disagree');
  assert.equal(record.recordings, 4);
  assert.equal(record.appUnavailable, 1);
});

test('books passed count only the current epoch inside the study window', () => {
  const checkpoint = (chapter_id: string, epoch: number, completed_at: string, passed = true) => ({ learner_id: 100, chapter_id, epoch, passed, created_at: completed_at, completed_at });
  const [record] = normalizeLearners({ ...empty, sessions: [session(1, 'P01')], responses: [], epochs: [{ learner_id: 100, epoch: 1 }], checkpoints: [
    checkpoint('gate', 1, '2026-11-23T03:00:00Z'), checkpoint('gate', 1, '2026-11-23T04:00:00Z'),
    checkpoint('lanterns', 0, '2026-11-23T03:00:00Z'),
    checkpoint('market', 1, '2026-11-20T03:00:00Z'),
    checkpoint('garden', 1, '2026-11-23T03:00:00Z', false),
  ] });
  assert.deepEqual(record.booksPassed, ['gate']);
  assert.deepEqual(record.requiredBooks, []);
  assert.deepEqual(record.checkpointDates, ['2026-11-23'], 'activity counts in any epoch, but not before enrollment');
});

// --- GO2

test('improvement: no gains, all gains, and mixed', () => {
  const flat = learner({ words: { pre: { correct: 8, scored: 15 }, post: { correct: 8, scored: 15 } } });
  assert.equal(row(smartGoals([flat, flat], config), 'Learners showing').result, '0.0% (0/2)');
  assert.equal(row(smartGoals([learner(), learner()], config), 'Learners showing').status, 'Met');
  const mixed = row(smartGoals([learner(), flat, learner(), learner(), learner()], config), 'Learners showing');
  assert.equal(mixed.result, '80.0% (4/5)');
  assert.equal(mixed.status, 'Met');
});

test('retry: no retry, incorrect then correct, incorrect then incorrect, unscored next, joined retries', () => {
  const at = (id: number, result: string, minute: number, activity = 'aral.gate.check', content = 'aral.word.mat') =>
    ({ id, activity_id: activity, content_id: content, result, completed_at: `2026-11-23T03:${String(minute).padStart(2, '0')}:00Z` });
  assert.deepEqual(retryCounts([at(1, 'incorrect', 0)]), { missed: 0, corrected: 0 });
  assert.deepEqual(retryCounts([at(1, 'incorrect', 0), at(2, 'correct', 1, 'aral.gate.check.retry')]), { missed: 1, corrected: 1 });
  assert.deepEqual(retryCounts([at(1, 'incorrect', 0), at(2, 'incorrect', 1)]), { missed: 1, corrected: 0 });
  assert.deepEqual(retryCounts([at(1, 'incorrect', 0), at(2, 'unclear', 1)]), { missed: 0, corrected: 0 });
  assert.deepEqual(retryCounts([at(1, 'no_response', 0), at(2, 'correct', 1)]), { missed: 1, corrected: 1 });
  // Sorted by time, and a different word is a different group.
  assert.deepEqual(retryCounts([at(2, 'correct', 5), at(1, 'incorrect', 0), at(3, 'correct', 1, 'aral.gate.check', 'aral.word.tin')]), { missed: 1, corrected: 1 });
  const report = smartGoals([learner({ retry: { missed: 4, corrected: 3 } })], config);
  assert.equal(row(report, 'Wrong attempts').result, '75.0% (3/4 attempts)');
  assert.equal(row(report, 'Wrong attempts').status, 'Met');
  assert.equal(row(smartGoals([learner({ retry: { missed: 0, corrected: 0 } })], config), 'Wrong attempts').status, 'Pending');
});

test('error reduction: unavailable with no pre-test errors, positive and negative reductions', () => {
  const words = (pre: number, post: number) => learner({ words: { pre: { correct: 15 - pre, scored: 15 }, post: { correct: 15 - post, scored: 15 } } });
  const none = row(smartGoals([words(0, 2)], config), 'Printed-word reading error');
  assert.deepEqual([none.result, none.status], ['Unavailable (no pre-test errors)', 'Pending']);
  const fewer = row(smartGoals([words(10, 7)], config), 'Printed-word reading error');
  assert.deepEqual([fewer.result, fewer.status], ['30.0% (10 to 7 errors)', 'Met']);
  const more = row(smartGoals([words(4, 6)], config), 'Printed-word reading error');
  assert.deepEqual([more.result, more.status], ['-50.0% (4 to 6 errors)', 'Not met']);
});

test('blending: missing data, zero pre accuracy, pooled positive gain', () => {
  assert.equal(row(smartGoals([learner({ blend: null })], config), 'Phonemic').status, 'Pending');
  const zero = row(smartGoals([learner({ blend: { pre: { correct: 0, scored: 10 }, post: { correct: 4, scored: 10 } } })], config), 'Phonemic');
  assert.deepEqual([zero.result, zero.status], ['Up from 0 (0.0% to 40.0%)', 'Pending']);
  const flat = row(smartGoals([learner({ blend: { pre: { correct: 0, scored: 10 }, post: { correct: 0, scored: 10 } } })], config), 'Phonemic');
  assert.match(flat.result, /^No gain/);
  // Pooled: (5+5)/(10+10) = 50% to (7+7)/(10+10) = 70%, a 40% relative gain.
  const gain = row(smartGoals([learner(), learner()], config), 'Phonemic');
  assert.deepEqual([gain.result, gain.status, gain.n], ['+40.0% (50.0% to 70.0%)', 'Met', 2]);
});

test('fluency: null readings excluded, zero pre mean, mean rounding and medians', () => {
  const r = (pre: number | null, post: number | null) => learner({ wcpm: { pre, post } });
  const gain = row(smartGoals([r(10, 13.2), r(11, 13.1), r(null, 20)], config), 'Oral reading');
  // Means 10.5 to 13.15: +25.238% rounds to 25.2.
  assert.equal(gain.result, '+25.2% (10.5 to 13.2); median 10.5 to 13.2');
  assert.deepEqual([gain.status, gain.n], ['Met', 2]);
  assert.equal(row(smartGoals([r(0, 5)], config), 'Oral reading').status, 'Pending');
  assert.equal(row(smartGoals([r(null, null)], config), 'Oral reading').result, 'Unavailable (no paired data); median n/a to n/a');
});

// --- GO1 completion, GO3 engagement

test('free exploration has no assigned-level completion target', () => {
  const report = smartGoals([learner(), learner({ booksPassed: ['gate', 'lanterns'] })], config);
  assert.equal(row(report, 'Level completion').result, 'Not applicable: no books assigned');
  assert.equal(row(report, 'Level completion').status, 'Not measured');
});

test('returning: 0, 1, and 2+ Manila active dates', () => {
  const report = smartGoals([
    learner({ attemptDates: [], checkpointDates: [] }),
    learner({ attemptDates: ['2026-11-22'], checkpointDates: ['2026-11-22'] }),
    learner({ attemptDates: ['2026-11-22'], checkpointDates: ['2026-11-23'] }),
    learner({ attemptDates: ['2026-11-22', '2026-11-23', '2026-11-24'] }),
  ], config);
  assert.equal(row(report, 'Returning').result, '50.0% (2/4)');
  assert.equal(row(report, 'Returning').status, 'Not met');
});

test('Manila dates roll over at 16:00 UTC, and home-day activity uses Manila dates', () => {
  assert.equal(manilaDate('2026-11-23T15:59:59Z'), '2026-11-23');
  assert.equal(manilaDate('2026-11-23T16:00:00Z'), '2026-11-24');
  assert.equal(manilaDate('2026-11-25T16:00:00Z'), '2026-11-26');
  const attempt = (id: number, completed_at: string) => ({ id, learner_id: 100, activity_id: 'aral.gate.check', content_id: 'aral.word.mat', result: 'correct', completed_at });
  const [record] = normalizeLearners({ ...empty, sessions: [session(1, 'P01')], responses: [],
    attempts: [attempt(1, '2026-11-23T16:30:00Z'), attempt(2, '2026-11-25T17:00:00Z'), attempt(3, '2026-11-21T15:00:00Z')] });
  // Late-night UTC on the 23rd is the 24th in Manila; the 26th is after the last home day; the 21st is before enrollment.
  assert.deepEqual(record.attemptDates, ['2026-11-24']);
});

test('voluntary use and consistency count home-day attempts or checkpoints', () => {
  const report = smartGoals([
    learner({ attemptDates: ['2026-11-22'], checkpointDates: [] }),
    learner({ attemptDates: ['2026-11-24'], checkpointDates: [] }),
    learner({ attemptDates: ['2026-11-24'], checkpointDates: ['2026-11-25'] }),
    learner({ attemptDates: [], checkpointDates: [], loginDates: ['2026-11-24'] }),
  ], config);
  const voluntary = row(report, 'Voluntary use (proposal');
  assert.deepEqual([voluntary.result, voluntary.status], ['50.0% (2/4)', 'Not met']);
  const consistency = row(report, 'Voluntary use consistency');
  assert.deepEqual([consistency.result, consistency.status, consistency.target], ['25.0% (1/4)', 'Reported', 'No target']);
  // Login and task activity without a saved-pathway resume do not establish home continuation.
  assert.equal(row(report, 'Enrolled learners active on a home day').result, '0.0% (0/4)');
});

// --- Section A, labels, exclusions

test('Section A criteria use enrolled learners', () => {
  const learners = [...Array.from({ length: 24 }, (_, i) => learner({ code: `P${i + 10}` })), ...Array.from({ length: 6 }, () => learner({ complete: false, booksPassed: [] }))];
  const report = smartGoals(learners, config);
  assert.deepEqual([row(report, 'Learners who completed Form A').result, row(report, 'Learners who completed Form A').status], ['24 of 30', 'Met']);
  assert.deepEqual([row(report, 'Enrolled learners completing').result, row(report, 'Enrolled learners completing').status], ['80.0% (24/30)', 'Met']);
  assert.equal(row(report, 'Enrolled learners who passed Book 1').status, 'Met');
  assert.match(row(report, 'Enrolled learners who passed Book 1').note, /'gate'/);
  const change = row(report, 'Form B median higher');
  assert.equal(change.status, 'Met');
  assert.match(change.result, /^3 of 3 higher\. Printed-word accuracy \(%\): 33\.3 to 80\.0/);
  // Two measures fell and one has no data: 2 of 3 cannot be reached.
  const down = { words: { pre: { correct: 9, scored: 15 }, post: { correct: 6, scored: 15 } }, blend: { pre: { correct: 6, scored: 10 }, post: { correct: 4, scored: 10 } }, wcpm: { pre: null, post: null } };
  assert.equal(row(smartGoals([learner(down)], config), 'Form B median higher').status, 'Not met');
  // One measure fell and two have no data: 2 of 3 is still possible.
  assert.equal(row(smartGoals([learner({ ...down, blend: null })], config), 'Form B median higher').status, 'Pending');
});

test('label wording, notes, and statuses for reported rows', () => {
  const report = smartGoals([learner()], config);
  assert.deepEqual(report.sectionB.map(r => `${r.objective} ${r.indicator} | ${r.target}`), [
    'GO1 Post-test printed-word reading accuracy (proposal: pronunciation accuracy on CVC assessments) | At least 80%',
    'GO1 Level completion | At least 75%',
    'GO1 ASR-teacher agreement (proposal: ASR recognition) | At least 85%',
    'GO2 Learners showing measurable improvement | At least 80%',
    'GO2 Wrong attempts corrected on the next try | At least 75%',
    'GO2 Printed-word reading error reduction (proposal: mispronunciation errors) | At least 30%',
    'GO2 Phonemic awareness / sound blending relative gain | At least 25%',
    'GO2 Oral reading fluency mean WCPM gain | At least 25%',
    'GO3 Returning to the app (proposal: weekly retention) | At least 75%',
    'GO3 Reward milestones (proposal: daily reward milestones) | At least 70%',
    'GO3 Voluntary use (proposal: voluntary-use consistency) | At least 60%',
    'GO3 Voluntary use consistency | No target',
  ]);
  assert.equal(row(report, 'ASR-teacher').note, 'Adapted: the app recognizes whole words, so this is agreement between app and teacher decisions on the same recordings.');
  assert.equal(row(report, 'Returning').note, 'Adapted for the 4-day study: active on >=2 distinct Manila learning dates.');
  assert.equal(row(report, 'Reward milestones').note, 'Adapted: passed at least one book. An admin progress reset after enrollment removes passes and can lower this count.');
  assert.match(row(report, 'Voluntary use (proposal').note, /Home access is unequal \(devices, internet, adult time\); interpret descriptively\./);
  assert.match(row(report,'Recorded technical incidents').note,/missing telemetry/);
  assert.deepEqual(report.sectionA.map(r => r.objective), ['Data completeness', 'Short-term change', 'Assessment completion', 'Book 1 guided completion', 'Home continuation', 'Book/stop use', 'Questionnaire', 'Technical feasibility']);
  for (const goal of report.sectionA.slice(4)) assert.equal(goal.status, 'Reported');
});

test('rows that admin resets can lower carry a reset note', () => {
  const report = smartGoals([learner()], config);
  const noted = [...report.sectionA, ...report.sectionB].filter(r => /admin (progress|survey) reset/.test(r.note)).map(r => r.indicator);
  assert.deepEqual(noted, ['Enrolled learners who passed Book 1', 'Guided stops opened and books passed', 'Enrolled learners who submitted the questionnaire',
    'Reward milestones (proposal: daily reward milestones)']);
});

test('excluded participant codes are left out of every count', () => {
  assert.deepEqual(EXCLUDED_PARTICIPANT_CODES, ['P02', 'P03']);
  const report = smartGoals([learner({ code: 'P01' }), learner({ code: 'P02', words: { pre: { correct: 0, scored: 15 }, post: { correct: 0, scored: 15 } } }), learner({ code: 'P03', complete: false })]);
  assert.deepEqual([report.enrolled, report.completed, report.excludedCodes], [1, 1, ['P02', 'P03']]);
  assert.equal(row(report, 'Post-test printed-word').result, '80.0% (12/15 scored items)');
});

// --- Statistics

test('distribution functions match known values', () => {
  close(normalCdf(1.96), 0.9750021);
  close(normalCdf(0), 0.5);
  close(normalCdf(-1), 0.1586553);
  close(regularizedBeta(0.5, 2, 2), 0.5, 1e-10);
  close(tTwoSidedP(1, 1), 0.5, 1e-9);
  close(tTwoSidedP(2, 2), 1 - 2 / Math.sqrt(6), 1e-9);
  close(tTwoSidedP(2.228, 10), 0.05, 2e-4);
  assert.equal(tTwoSidedP(0, 5), 1);
});

test('Wilcoxon signed-rank matches hand-computed normal approximations', () => {
  // R: wilcox.test(c(1,2,3,4,5,-6), exact=FALSE, correct=FALSE) gives V = 15, p = 0.3454.
  const a = wilcoxon([1, 2, 3, 4, 5, -6]);
  assert.equal(a.w, 15); assert.equal(a.n, 6);
  close(a.z, 0.94346); close(a.p, 0.34545); close(a.r!, 0.94346 / Math.sqrt(6));
  // Zero dropped, tied |2| ranks averaged to 2.5: W+ = 9, variance 7.5 - 6/48.
  const b = wilcoxon([2, 2, -1, 3, 0]);
  assert.deepEqual([b.w, b.n], [9, 4]);
  close(b.z, 4 / Math.sqrt(7.375)); close(b.p, 0.14077);
  assert.deepEqual(wilcoxon([0, 0, 0]), { w: 0, n: 0, z: 0, p: 1, r: null });
});

test('paired statistics: no learners, one learner, zero differences, equal differences, p < 0.05', () => {
  const none = pairedStats('x', []);
  assert.deepEqual([none.n, none.pre.mean, none.wilcoxon, none.tTest], [0, null, null, null]);
  const one = pairedStats('x', [{ pre: 1, post: 3 }]);
  assert.deepEqual([one.difference.mean, one.wilcoxon, one.tTest, one.note], [2, null, null, 'Fewer than 2 learners; tests not run.']);
  const zero = pairedStats('x', [{ pre: 2, post: 2 }, { pre: 5, post: 5 }]);
  assert.deepEqual([zero.tTest!.p, zero.tTest!.dz, zero.wilcoxon!.p, zero.zero], [1, null, 1, 2]);
  const equal = pairedStats('x', [{ pre: 1, post: 3 }, { pre: 4, post: 6 }, { pre: 0, post: 2 }]);
  assert.deepEqual([equal.difference.mean, equal.tTest!.t, equal.tTest!.p, equal.tTest!.dz], [2, null, null, null]);
  assert.ok(equal.wilcoxon!.p < 1);
  // R: t.test(c(1,2,3,4)) gives t = 3.873, df = 3, p = 0.03047.
  const t = pairedT([1, 2, 3, 4]);
  close(t.t!, 3.87298); close(t.p!, 0.030466); close(t.dz!, 2.5 / Math.sqrt(5 / 3));
  assert.deepEqual([t.df, t.significant], [3, true]);
  const mixed = pairedStats('x', [{ pre: 1, post: 2 }, { pre: 2, post: 1 }, { pre: 3, post: 3 }]);
  assert.deepEqual([mixed.positive, mixed.zero, mixed.negative, mixed.difference.min, mixed.difference.max], [1, 1, 1, -1, 1]);
});

// --- Export

test('export adds a SMART Goals sheet after the existing sheets', () => {
  const sessions = [session(1, 'P01')];
  const responses = [answer(1, 'pretest', 'sit', 'correct')];
  const summary = summarize(sessions, responses);
  const plain = studyWorkbook(sessions, responses, summary);
  const book = studyWorkbook(sessions, responses, summary, [], smartGoals([learner(), learner({ code: 'P02' })]));
  assert.deepEqual(book.worksheets.map(s => s.name), ['Responses', 'Summary', 'Notes', 'SMART Goals']);
  for (const name of ['Responses', 'Summary', 'Notes']) assert.deepEqual(book.getWorksheet(name)!.getRow(1).values, plain.getWorksheet(name)!.getRow(1).values, `${name} header unchanged`);
  assert.deepEqual(plain.worksheets.map(s => s.name), ['Responses', 'Summary', 'Notes']);
  const sheet = book.getWorksheet('SMART Goals')!;
  const cells = (r: number) => (sheet.getRow(r).values as unknown[]).slice(1);
  assert.equal(cells(1)[0], 'Export date');
  assert.match(String(cells(1)[1]), /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(cells(2)[0], 'Instrument version');
  assert.deepEqual(cells(3), ['Completed learners', 1]);
  assert.deepEqual(cells(4), ['Unscored items', 0]);
  assert.deepEqual(cells(5), ['Excluded codes', 'P02, P03']);
  assert.deepEqual(cells(6), ['Targets', 'Targets fixed before data collection.']);
  assert.deepEqual(cells(8), ['Section A: Doc 05 success criteria']);
  const header = ['Objective', 'Indicator', 'Formula', 'Target', 'Result', 'N', 'Status', 'Note'];
  assert.deepEqual(cells(9), header);
  assert.equal(cells(10)[0], 'Data completeness');
  const sectionB = 10 + 8 + 1;
  assert.deepEqual(cells(sectionB), ['Section B: Proposal SMART objectives (GO1-GO3)']);
  assert.deepEqual(cells(sectionB + 1), header);
  const go1 = sheet.getRow(sectionB + 2);
  assert.deepEqual([go1.getCell(1).value, go1.getCell(7).value], ['GO1', 'Met']);
  assert.equal((go1.getCell(7).fill as any).fgColor.argb, 'FFC6EFCE');
  const fills = new Map<string, string | undefined>();
  sheet.eachRow(r => { const status = r.getCell(7).value; if (typeof status === 'string') fills.set(status, (r.getCell(7).fill as any)?.fgColor?.argb); });
  assert.equal(fills.get('Pending') ?? 'FFFFEB9C', 'FFFFEB9C');
  assert.equal(fills.get('Reported'), undefined);
  const stats = sectionB + 2 + 12 + 1;
  assert.match(String(cells(stats)[0]), /^Paired statistics/);
  assert.equal(cells(stats + 1)[0], 'Measure');
  assert.deepEqual([cells(stats + 2)[0], cells(stats + 3)[0], cells(stats + 4)[0]], ['Printed-word accuracy (%)', 'Blending accuracy (%)', 'Oral reading fluency (WCPM)']);
  assert.deepEqual(cells(sheet.rowCount), [FOOTER]);
});

test('status fills: Not met red, Pending amber, Not measured grey, Reported none', async () => {
  const report = smartGoals([learner({ words: { pre: { correct: 0, scored: 15 }, post: { correct: 0, scored: 15 } }, retry: { missed: 0, corrected: 0 } })], config);
  report.sectionB.push({ ...report.sectionB[0], status: 'Not measured' });
  const sheet = studyWorkbook([], [], summarize([], []), [], report).getWorksheet('SMART Goals')!;
  const fills: Record<string, string | undefined> = {};
  const statuses = ['Met', 'Not met', 'Pending', 'Not measured', 'Reported'];
  sheet.eachRow(r => { const status = r.getCell(7).value; if (typeof status === 'string' && statuses.includes(status)) fills[status] = (r.getCell(7).fill as any)?.fgColor?.argb; });
  assert.deepEqual(fills, { 'Met': 'FFC6EFCE', 'Not met': 'FFFFC7CE', 'Pending': 'FFFFEB9C', 'Not measured': 'FFD9D9D9', 'Reported': undefined });
  assert.ok((await studyWorkbook([], [], summarize([], []), [], report).xlsx.writeBuffer()).byteLength > 0);
});
