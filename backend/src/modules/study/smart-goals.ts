// SMART goal and success-criteria calculations; pure functions over normalized learner records, no database access.
import type { StudyGroup } from './study.data.js';
import { mean, median, pairedStats, type PairedStats } from './smart-goals.stats.js';

// Test accounts left out of every calculation.
export const EXCLUDED_PARTICIPANT_CODES = ['P02', 'P03'];
// Asia/Manila calendar dates when learners may use the app at home.
export const HOME_DAYS = ['2026-11-24', '2026-11-25'];
export const STUDY_TIME_ZONE = 'Asia/Manila';
export const FOOTER = 'Meeting a target describes short-term performance under the tested conditions; it is not proof of reading mastery, validated pronunciation accuracy, or causal effectiveness.';

export type GoalStatus = 'Met' | 'Not met' | 'Pending' | 'Not measured' | 'Reported';
export interface GoalRow { section: 'A' | 'B'; objective: string; indicator: string; formula: string; target: string; result: string; n: number | null; status: GoalStatus; note: string }
export interface Tally { correct: number; scored: number }
export interface LearnerRecord {
  code: string; group: StudyGroup; complete: boolean; unscored: number;
  words: { pre: Tally; post: Tally };
  blend: { pre: Tally; post: Tally } | null;
  wcpm: { pre: number | null; post: number | null };
  requiredBooks: string[]; booksPassed: string[];
  // Distinct Asia/Manila dates inside the study window.
  attemptDates: string[]; checkpointDates: string[]; loginDates: string[];
  retry: { missed: number; corrected: number };
  agreement: { compared: number; agree: number };
  guidedStops: number; surveyed: boolean; recordings: number; appUnavailable: number;
}
export interface SmartGoalsConfig { excludedCodes: string[]; homeDays: string[] }

export const round1 = (x: number) => Math.round(x * 10) / 10;
/** Percentage to one decimal, or null when the denominator is zero. */
export const percentage = (part: number, whole: number) => whole ? round1(part / whole * 100) : null;
export const statusFor = (value: number | null, target: number): GoalStatus => value === null ? 'Pending' : value >= target ? 'Met' : 'Not met';
const pct = (value: number | null) => value === null ? 'Unavailable' : `${value.toFixed(1)}%`;
const num = (value: number | null) => value === null ? 'n/a' : round1(value).toFixed(1);
const rate = (part: number, whole: number) => whole ? `${pct(percentage(part, whole))} (${part}/${whole})` : 'Unavailable (no learners)';
const total = (rows: Tally[]): Tally => ({ correct: rows.reduce((s, t) => s + t.correct, 0), scored: rows.reduce((s, t) => s + t.scored, 0) });
const accuracy = (t: Tally) => t.scored ? t.correct / t.scored * 100 : null;

/** Relative change; null when the base is zero, with an 'up from 0' label for a positive result. */
function relativeGain(pre: number | null, post: number | null, unit: string) {
  if (pre === null || post === null) return { value: null, text: 'Unavailable (no paired data)' };
  const detail = `${num(pre)}${unit} to ${num(post)}${unit}`;
  if (pre === 0) return { value: null, text: post > 0 ? `Up from 0 (${detail})` : `No gain (${detail})` };
  const value = round1((post - pre) / pre * 100);
  return { value, text: `${value > 0 ? '+' : ''}${value.toFixed(1)}% (${detail})` };
}

/** Per-learner pre/post pairs for the three paired measures, completed learners only. */
export function pairedMeasures(done: LearnerRecord[]) {
  const pairsOf = (get: (l: LearnerRecord) => [number | null, number | null]) =>
    done.map(get).filter(([pre, post]) => pre !== null && post !== null).map(([pre, post]) => ({ pre: pre!, post: post! }));
  return [
    { measure: 'Printed-word accuracy (%)', pairs: pairsOf(l => [accuracy(l.words.pre), accuracy(l.words.post)]) },
    { measure: 'Blending accuracy (%)', pairs: pairsOf(l => l.blend ? [accuracy(l.blend.pre), accuracy(l.blend.post)] : [null, null]) },
    { measure: 'Oral reading fluency (WCPM)', pairs: pairsOf(l => [l.wcpm.pre, l.wcpm.post]) },
  ];
}

export interface SmartGoalsReport {
  enrolled: number; completed: number; unscored: number; excludedCodes: string[]; homeDays: string[];
  sectionA: GoalRow[]; sectionB: GoalRow[]; paired: PairedStats[];
}

export function smartGoals(all: LearnerRecord[], config: SmartGoalsConfig = { excludedCodes: EXCLUDED_PARTICIPANT_CODES, homeDays: HOME_DAYS }): SmartGoalsReport {
  const learners = all.filter(l => !config.excludedCodes.includes(l.code));
  const done = learners.filter(l => l.complete);
  const enrolled = learners.length, completed = done.length;
  const count = (rows: LearnerRecord[], test: (l: LearnerRecord) => boolean) => rows.filter(test).length;
  const onHomeDay = (dates: string[]) => dates.some(d => config.homeDays.includes(d));
  const homeList = config.homeDays.join(', ');
  const measures = pairedMeasures(done);
  const paired = measures.map(m => pairedStats(m.measure, m.pairs));

  // Section A: Doc 05 success criteria, denominators are enrolled learners.
  const a = (objective: string, indicator: string, formula: string, target: string, result: string, n: number | null, status: GoalStatus, note = ''): GoalRow =>
    ({ section: 'A', objective, indicator, formula, target, result, n, status, note });
  const higher = paired.filter(p => p.n && p.post.median! > p.pre.median!).length;
  const measured = paired.filter(p => p.n).length;
  const book1 = count(learners, l => l.booksPassed.includes('gate'));
  const home = count(learners, l => onHomeDay([...l.loginDates, ...l.attemptDates]));
  const withStops = count(learners, l => l.guidedStops > 0);
  const recordings = learners.reduce((s, l) => s + l.recordings, 0), noApp = learners.reduce((s, l) => s + l.appUnavailable, 0);
  // Admin resets delete passes and survey rows, so these rows can undercount after a reset.
  const resetNote = 'An admin progress reset after enrollment removes passes and can lower this count.';
  const sectionA = [
    a('Data completeness', 'Learners who completed Form A and Form B', 'Count of enrolled learners with both forms complete', 'At least 24 learners',
      `${completed} of ${enrolled}`, enrolled, enrolled ? (completed >= 24 ? 'Met' : 'Not met') : 'Pending'),
    a('Short-term change', 'Form B median higher than Form A median', 'Measures where median(post) > median(pre) of per-learner values', 'At least 2 of 3 measures',
      `${higher} of 3 higher. ${paired.map(p => `${p.measure}: ${num(p.pre.median)} to ${num(p.post.median)} (n=${p.n})`).join('; ')}`, completed,
      higher >= 2 ? 'Met' : higher + (3 - measured) < 2 ? 'Not met' : 'Pending', 'Medians use completed learners with both values for that measure.'),
    a('Assessment completion', 'Enrolled learners completing both forms', 'Completed learners / enrolled learners x 100', 'At least 80%',
      rate(completed, enrolled), enrolled, statusFor(percentage(completed, enrolled), 80)),
    a('Book 1 guided completion', 'Enrolled learners who passed Book 1', 'Learners who passed the gate checkpoint / enrolled learners x 100', 'At least 80%',
      rate(book1, enrolled), enrolled, statusFor(percentage(book1, enrolled), 80),
      `Passed means the Book 1 ('gate') reading checkpoint was passed in the current reading epoch between enrollment and the last home day. ${resetNote}`),
    a('Home continuation', 'Enrolled learners active on a home day', 'Learners with a login/app_open event or a curriculum attempt on a home day / enrolled learners x 100', 'No target',
      rate(home, enrolled), enrolled, 'Reported', `Home days: ${homeList} (Asia/Manila).`),
    a('Book/stop use', 'Guided stops opened and books passed', 'Counts of enrolled learners', 'No target',
      `${withStops} of ${enrolled} opened a guided stop; ${count(learners, l => l.booksPassed.length > 0)} of ${enrolled} passed at least one book`, enrolled, 'Reported',
      `Guided stops come from saved learner state and are not limited to the study window. ${resetNote}`),
    a('Questionnaire', 'Enrolled learners who submitted the questionnaire', 'Count of enrolled learners with a survey response', 'No target',
      `${count(learners, l => l.surveyed)} of ${enrolled}`, enrolled, 'Reported', 'An admin survey reset deletes responses and can lower this count.'),
    a('Technical feasibility', 'Recordings without an app result', 'Recordings with no or unavailable app result / recordings saved', 'No target',
      `${noApp} of ${recordings} recordings`, recordings, 'Reported', 'Classroom incidents are recorded in team session notes; not stored in the system.'),
  ];

  // Section B: proposal objectives GO1-GO3, denominators are completed learners.
  const b = (objective: string, indicator: string, formula: string, target: number | null, value: number | null, result: string, n: number | null, note = '', status?: GoalStatus): GoalRow =>
    ({ section: 'B', objective, indicator, formula, target: target === null ? 'No target' : `At least ${target}%`, result, n, status: status ?? statusFor(value, target!), note });
  const post = total(done.map(l => l.words.post)), pre = total(done.map(l => l.words.pre));
  const postAccuracy = percentage(post.correct, post.scored);
  const levelDone = count(done, l => l.requiredBooks.every(book => l.booksPassed.includes(book)));
  const agreement = { agree: done.reduce((s, l) => s + l.agreement.agree, 0), compared: done.reduce((s, l) => s + l.agreement.compared, 0) };
  const improved = count(done, l => l.words.post.correct > l.words.pre.correct);
  const retry = { corrected: done.reduce((s, l) => s + l.retry.corrected, 0), missed: done.reduce((s, l) => s + l.retry.missed, 0) };
  const preErrors = pre.scored - pre.correct, postErrors = post.scored - post.correct;
  const errorReduction = percentage(preErrors - postErrors, preErrors);
  const blenders = done.filter(l => l.blend && l.blend.pre.scored && l.blend.post.scored);
  const blendGain = relativeGain(accuracy(total(blenders.map(l => l.blend!.pre))), accuracy(total(blenders.map(l => l.blend!.post))), '%');
  const readers = done.filter(l => l.wcpm.pre !== null && l.wcpm.post !== null);
  const preWcpm = readers.map(l => l.wcpm.pre!), postWcpm = readers.map(l => l.wcpm.post!);
  const fluencyGain = relativeGain(mean(preWcpm), mean(postWcpm), '');
  const returning = count(done, l => new Set([...l.attemptDates, ...l.checkpointDates]).size >= 2);
  const milestones = count(done, l => l.booksPassed.length > 0);
  const voluntary = count(done, l => onHomeDay([...l.attemptDates, ...l.checkpointDates]));
  const consistent = count(done, l => config.homeDays.every(d => l.attemptDates.includes(d) || l.checkpointDates.includes(d)));
  const homeNote = 'Home access is unequal (devices, internet, adult time); interpret descriptively.';
  const sectionB = [
    b('GO1', 'Post-test printed-word reading accuracy (proposal: pronunciation accuracy on CVC assessments)', 'Post-test correct / post-test scored items x 100', 80,
      postAccuracy, post.scored ? `${pct(postAccuracy)} (${post.correct}/${post.scored} scored items)` : 'Unavailable (no scored items)', completed,
      'Teacher score preferred, app result otherwise; skipped = incorrect; unclear/missing items excluded.'),
    b('GO1', 'Level completion', 'Learners who passed every required book / completed learners x 100', 75, percentage(levelDone, completed),
      `${rate(levelDone, completed)}; average books passed ${num(mean(done.map(l => l.booksPassed.length)))}`, completed, `Required books are the learner's study group books. ${resetNote}`),
    b('GO1', 'ASR-teacher agreement (proposal: ASR recognition)', 'Recordings where app and teacher agree / recordings compared x 100', 85,
      percentage(agreement.agree, agreement.compared), agreement.compared ? `${pct(percentage(agreement.agree, agreement.compared))} (${agreement.agree}/${agreement.compared} recordings)` : 'Unavailable (no recordings compared)',
      agreement.compared, 'Adapted: the app recognizes whole words, so this is agreement between app and teacher decisions on the same recordings.'),
    b('GO2', 'Learners showing measurable improvement', 'Learners with post-test correct > pre-test correct / completed learners x 100', 80,
      percentage(improved, completed), rate(improved, completed), completed),
    b('GO2', 'Wrong attempts corrected on the next try', 'Wrong attempts followed by a correct next attempt / wrong attempts with a scored next attempt x 100', 75,
      percentage(retry.corrected, retry.missed), retry.missed ? `${pct(percentage(retry.corrected, retry.missed))} (${retry.corrected}/${retry.missed} attempts)` : 'Unavailable (no wrong attempts with a next try)',
      retry.missed, 'Attempts grouped by learner, activity (retries joined to their check) and content; no response = incorrect; unclear next attempts excluded.'),
    b('GO2', 'Printed-word reading error reduction (proposal: mispronunciation errors)', '(Pre-test errors - post-test errors) / pre-test errors x 100', 30,
      errorReduction, preErrors ? `${pct(errorReduction)} (${preErrors} to ${postErrors} errors)` : 'Unavailable (no pre-test errors)', completed,
      'Errors = scored items - correct items.'),
    b('GO2', 'Phonemic awareness / sound blending relative gain', '(Pooled post accuracy - pooled pre accuracy) / pooled pre accuracy x 100', 25,
      blendGain.value, blendGain.text, blenders.length, 'Learners with both blending results; relative gain is undefined when pre accuracy is 0.'),
    b('GO2', 'Oral reading fluency mean WCPM gain', '(Mean post WCPM - mean pre WCPM) / mean pre WCPM x 100', 25, fluencyGain.value,
      `${fluencyGain.text}; median ${num(median(preWcpm))} to ${num(median(postWcpm))}`, readers.length, 'Learners with both readings scored; gain is undefined when the pre mean is 0.'),
    b('GO3', 'Returning to the app (proposal: weekly retention)', 'Learners active on at least 2 distinct dates / completed learners x 100', 75,
      percentage(returning, completed), rate(returning, completed), completed, 'Adapted for the 4-day study: active on >=2 distinct Manila learning dates.'),
    b('GO3', 'Reward milestones (proposal: daily reward milestones)', 'Learners who passed at least one book / completed learners x 100', 70,
      percentage(milestones, completed), rate(milestones, completed), completed, `Adapted: passed at least one book. ${resetNote}`),
    b('GO3', 'Voluntary use (proposal: voluntary-use consistency)', 'Learners with a curriculum attempt or reading checkpoint on a home day / completed learners x 100', 60,
      percentage(voluntary, completed), rate(voluntary, completed), completed, `Home days: ${homeList} (Asia/Manila). ${homeNote}`),
    b('GO3', 'Voluntary use consistency', 'Learners active on every home day / completed learners x 100', null, null, rate(consistent, completed), completed, homeNote, 'Reported'),
  ];

  return { enrolled, completed, unscored: done.reduce((s, l) => s + l.unscored, 0), excludedCodes: config.excludedCodes, homeDays: config.homeDays, sectionA, sectionB, paired };
}
