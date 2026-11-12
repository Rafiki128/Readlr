import { randomUUID } from 'node:crypto';
import { supabase, unwrap } from '../../database/db.js';
import { recognizeCvcWord } from '../audio/audio.service.js';
import { surveyAssigned } from '../admin/survey.controller.js';
import {
  ALL_STUDY_WORDS, STUDY_BOOKS, categoryTotal, allocateGroups, finalScore, shuffled, studyTranscriptionPrompt, wordCategory,
  type CategoryKey, type StudyGroup, type StudyPhase, type WordCategory,
} from './study.data.js';

export const STUDY_BUCKET = 'study-recordings';

export interface StudySession {
  user_id: number; participant_code: string; study_group: StudyGroup; phase: StudyPhase; learning_minutes: number;
  pretest_order: string[]; posttest_order: string[];
  learning_started_at: string | null; posttest_started_at: string | null; finished_at: string | null;
  created_at: string; updated_at: string;
}
export interface StudyResponse {
  id: string; user_id: number; phase: 'pretest' | 'posttest'; word: string; position: number; skipped: boolean;
  recording_path: string | null; recording_type: string | null;
  app_result: string | null; app_transcript: string | null; teacher_score: string | null; created_at: string;
}
export class StudyError extends Error { constructor(public status: number, message: string) { super(message); } }

export function learningEndsAt(session: Pick<StudySession, 'learning_started_at' | 'learning_minutes'>) {
  return session.learning_started_at ? new Date(Date.parse(session.learning_started_at) + session.learning_minutes * 60_000) : null;
}

/** Loads a learner's session and moves learning to posttest once the learning time has run out. */
export async function getSession(userId: number): Promise<StudySession | null> {
  const session = unwrap(await supabase.from('readlr_study_sessions').select('*').eq('user_id', userId).maybeSingle()) as StudySession | null;
  if (session?.phase === 'learning' && (learningEndsAt(session)?.getTime() ?? Infinity) <= Date.now()) return advance(session, 'learning', 'posttest');
  return session;
}

async function advance(session: StudySession, from: StudyPhase, to: StudyPhase): Promise<StudySession> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { phase: to, updated_at: now };
  if (to === 'learning') patch.learning_started_at = now;
  if (to === 'posttest') patch.posttest_started_at = now;
  if (to === 'done') patch.finished_at = now;
  // Conditional on the current phase so two devices cannot advance twice.
  const rows = unwrap(await supabase.from('readlr_study_sessions').update(patch).eq('user_id', session.user_id).eq('phase', from).select('*')) as StudySession[];
  if (to === 'done' && rows[0]) await assignSurveyOnFinish(session.user_id);
  return rows[0] ?? (unwrap(await supabase.from('readlr_study_sessions').select('*').eq('user_id', session.user_id).single()) as StudySession);
}

/**
 * A learner who finishes the posttest goes straight on to the student survey, so it is assigned to
 * them here. A teacher's explicit per-learner choice is never overwritten. Uses the same revision
 * check as the admin assignment screen so concurrent changes are not lost.
 */
export async function assignSurveyOnFinish(userId: number) {
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = unwrap(await supabase.from('survey_assignment').select('overrides,revision').eq('id', 1).maybeSingle()) as { overrides: Record<string, boolean> | null; revision: number } | null;
      if (!row) return;
      const overrides = row.overrides ?? {};
      if (String(userId) in overrides) return;
      const saved = unwrap(await supabase.from('survey_assignment').update({ overrides: { ...overrides, [String(userId)]: true }, revision: row.revision + 1 })
        .eq('id', 1).eq('revision', row.revision).select('id')) as unknown[];
      if (saved.length) return;
    }
  } catch (error) {
    // Finishing the study must never fail because the survey is not set up.
    console.warn('Survey could not be assigned after the posttest:', error instanceof Error ? error.message : error);
  }
}

/** Reading Chronicles access while a study session is running. */
export async function studyReadingAccess(userId: number): Promise<null | { blocked: true } | { books: string[] }> {
  let session: StudySession | null;
  try { session = await getSession(userId); }
  catch (error) {
    // The normal reading journey must keep working before the study migration is applied.
    console.warn('Study session check skipped:', error instanceof Error ? error.message : error);
    return null;
  }
  if (!session || session.phase === 'closed') return null;
  if (session.phase !== 'learning') return { blocked: true };
  return { books: STUDY_BOOKS[session.study_group] };
}

async function answeredWords(userId: number, phase: 'pretest' | 'posttest') {
  const rows = unwrap(await supabase.from('readlr_study_responses').select('word').eq('user_id', userId).eq('phase', phase)) as Array<{ word: string }>;
  return rows.map(row => row.word);
}

export async function learnerView(session: StudySession | null, knownAnswered?: string[]) {
  if (!session || session.phase === 'closed') return { active: false as const };
  const testPhase = session.phase === 'pretest' || session.phase === 'posttest' ? session.phase : null;
  return {
    active: true as const,
    phase: session.phase,
    books: STUDY_BOOKS[session.study_group],
    learningEndsAt: learningEndsAt(session)?.toISOString() ?? null,
    learningMinutes: session.learning_minutes,
    survey: session.phase === 'done' ? await surveyAssigned(session.user_id).catch(() => false) : false,
    test: testPhase ? { phase: testPhase, words: testPhase === 'pretest' ? session.pretest_order : session.posttest_order, answered: knownAnswered ?? await answeredWords(session.user_id, testPhase) } : null,
  };
}

const extensionFor = (type: string) => type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm';

export async function recordAnswer(userId: number, phase: unknown, word: unknown, file: { buffer: Buffer; mimetype: string } | null) {
  if ((phase !== 'pretest' && phase !== 'posttest') || typeof word !== 'string' || !/^[a-z]{1,10}$/.test(word)) throw new StudyError(400, 'Unknown word.');
  const path = file ? `${userId}/${phase}-${word}-${randomUUID()}.${extensionFor(file.mimetype)}` : null;
  // Upload while the session loads: each database round trip is slow on classroom connections.
  const [loaded, upload] = await Promise.all([
    getSession(userId),
    file && path ? supabase.storage.from(STUDY_BUCKET).upload(path, file.buffer, { contentType: file.mimetype, upsert: false }) : Promise.resolve(null),
  ]);
  let session = loaded;
  const discard = async () => { if (path && !upload?.error) await supabase.storage.from(STUDY_BUCKET).remove([path]); };
  if (!session || (session.phase !== 'pretest' && session.phase !== 'posttest')) { await discard(); throw new StudyError(409, 'This word game has finished.'); }
  if (phase !== session.phase) { await discard(); throw new StudyError(409, 'This word game has moved on. Please wait a moment.'); }
  const order = session.phase === 'pretest' ? session.pretest_order : session.posttest_order;
  if (!order.includes(word)) { await discard(); throw new StudyError(400, 'Unknown word.'); }
  if (upload?.error) throw new Error(`Recording upload failed: ${upload.error.message}`);
  const inserted = await supabase.from('readlr_study_responses').insert({
    user_id: userId, phase: session.phase, word, position: order.indexOf(word), skipped: !file,
    recording_path: path, recording_type: file?.mimetype ?? null,
  }).select('id').single();
  if (inserted.error) {
    if (path) await supabase.storage.from(STUDY_BUCKET).remove([path]);
    // A retried upload after a dropped connection: the first answer stands.
    if ((inserted.error as { code?: string }).code !== '23505') throw new Error(inserted.error.message);
  } else if (file) {
    queueAppScoring(inserted.data.id, word, file);
  }
  const answered = await answeredWords(userId, session.phase);
  if (order.every(item => answered.includes(item))) return learnerView(await advance(session, session.phase, session.phase === 'pretest' ? 'learning' : 'done'));
  return learnerView(session, answered);
}

// --- Automatic speech scoring runs in the background so children never wait on it
// and a busy speech service cannot block the test.
const pending: Array<{ id: string; word: string; file?: { buffer: Buffer; mimetype: string } }> = [];
let running = 0;
const MAX_PARALLEL = 2;
export function queueAppScoring(id: string, word: string, file?: { buffer: Buffer; mimetype: string }) {
  pending.push({ id, word, file });
  pump();
}
function pump() {
  while (running < MAX_PARALLEL && pending.length) {
    const job = pending.shift()!;
    running++;
    void scoreJob(job).finally(() => { running--; pump(); });
  }
}
async function scoreJob(job: { id: string; word: string; file?: { buffer: Buffer; mimetype: string } }) {
  try {
    let file = job.file;
    if (!file) {
      const row = unwrap(await supabase.from('readlr_study_responses').select('recording_path,recording_type').eq('id', job.id).single()) as { recording_path: string | null; recording_type: string | null };
      if (!row.recording_path) return;
      const download = await supabase.storage.from(STUDY_BUCKET).download(row.recording_path);
      if (download.error || !download.data) throw new Error('Recording unavailable');
      file = { buffer: Buffer.from(await download.data.arrayBuffer()), mimetype: row.recording_type ?? download.data.type };
    }
    let result;
    try { result = await recognizeCvcWord(file, job.word, studyTranscriptionPrompt()); }
    catch {
      await new Promise(resolve => setTimeout(resolve, 3000));
      result = await recognizeCvcWord(file, job.word, studyTranscriptionPrompt());
    }
    await supabase.from('readlr_study_responses').update({ app_result: result.status, app_transcript: result.transcript }).eq('id', job.id);
  } catch (error) {
    console.warn('Study app scoring failed:', error instanceof Error ? error.message : error);
    await supabase.from('readlr_study_responses').update({ app_result: 'unavailable' }).eq('id', job.id);
  }
}

// --- Admin

async function readAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const batch = unwrap(await supabase.from(table).select(columns).order('created_at').range(start, start + 999)) as T[];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

export async function adminOverview() {
  const [sessions, responses, learners] = await Promise.all([
    readAll<StudySession>('readlr_study_sessions', '*'),
    readAll<Pick<StudyResponse, 'user_id' | 'phase' | 'teacher_score' | 'skipped' | 'app_result'>>('readlr_study_responses', 'user_id,phase,teacher_score,skipped,app_result,created_at'),
    (async () => {
      const users = unwrap(await supabase.from('users').select('id,email').eq('role', 'learner')) as Array<{ id: number; email: string }>;
      const profiles = unwrap(await supabase.from('learner_profiles').select('user_id,name,study_participant')) as Array<{ user_id: number; name: string; study_participant: boolean }>;
      const byUser = new Map(profiles.map(p => [p.user_id, p]));
      return users.map(u => ({ id: u.id, email: u.email, name: byUser.get(u.id)?.name ?? u.email.split('@')[0], studyParticipant: byUser.get(u.id)?.study_participant === true }));
    })(),
  ]);
  const enrolled = new Set(sessions.map(s => s.user_id));
  const learnerById = new Map(learners.map(l => [l.id, l]));
  return {
    sessions: sessions.map(s => {
      const own = responses.filter(r => r.user_id === s.user_id);
      return {
        userId: s.user_id, name: learnerById.get(s.user_id)?.name ?? 'Learner', participantCode: s.participant_code, group: s.study_group,
        phase: s.phase === 'learning' && (learningEndsAt(s)?.getTime() ?? Infinity) <= Date.now() ? 'posttest' : s.phase,
        learningMinutes: s.learning_minutes, learningEndsAt: learningEndsAt(s)?.toISOString() ?? null,
        pretestAnswered: own.filter(r => r.phase === 'pretest').length, posttestAnswered: own.filter(r => r.phase === 'posttest').length,
        finishedAt: s.finished_at,
      };
    }).sort((a, b) => a.participantCode.localeCompare(b.participantCode)),
    eligible: learners.filter(l => l.studyParticipant && !enrolled.has(l.id)).map(({ id, name, email }) => ({ id, name, email })),
    notConsented: learners.filter(l => !l.studyParticipant && !enrolled.has(l.id)).length,
    unscored: responses.filter(r => !r.skipped && r.teacher_score === null).length,
    appPending: responses.filter(r => !r.skipped && r.app_result === null).length,
    groups: { A: sessions.filter(s => s.study_group === 'A').length, B: sessions.filter(s => s.study_group === 'B').length },
    wordCount: ALL_STUDY_WORDS.length,
  };
}

export async function enroll(userIds: number[], learningMinutes: number) {
  const profiles = unwrap(await supabase.from('learner_profiles').select('user_id,study_participant').in('user_id', userIds)) as Array<{ user_id: number; study_participant: boolean }>;
  const consented = new Set(profiles.filter(p => p.study_participant).map(p => p.user_id));
  if (userIds.some(id => !consented.has(id))) throw new StudyError(400, 'Only learners marked as study participants (with signed consent) can be enrolled.');
  const existing = await readAll<Pick<StudySession, 'user_id' | 'participant_code' | 'study_group'>>('readlr_study_sessions', 'user_id,participant_code,study_group,created_at');
  if (userIds.some(id => existing.some(s => s.user_id === id))) throw new StudyError(409, 'Some learners already have a study session. Refresh and try again.');
  const groups = allocateGroups(userIds, { A: existing.filter(s => s.study_group === 'A').length, B: existing.filter(s => s.study_group === 'B').length });
  let next = existing.reduce((max, s) => Math.max(max, Number(s.participant_code.slice(1))), 0);
  const rows = [...groups].map(([userId, group]) => ({
    user_id: userId, study_group: group, learning_minutes: learningMinutes,
    participant_code: `P${String(++next).padStart(2, '0')}`,
    pretest_order: shuffled(ALL_STUDY_WORDS), posttest_order: shuffled(ALL_STUDY_WORDS),
  }));
  unwrap(await supabase.from('readlr_study_sessions').insert(rows));
  return rows.length;
}

export async function updateSession(userId: number, action: unknown, group: unknown) {
  const session = await getSession(userId);
  if (!session) throw new StudyError(404, 'No study session for this learner.');
  const now = new Date().toISOString();
  if (action === 'set-group') {
    if (group !== 'A' && group !== 'B') throw new StudyError(400, 'Choose group A or B.');
    if (session.phase !== 'pretest') throw new StudyError(409, 'Groups can only change before the learning phase starts.');
    unwrap(await supabase.from('readlr_study_sessions').update({ study_group: group, updated_at: now }).eq('user_id', userId).eq('phase', 'pretest'));
  } else if (action === 'start-posttest') {
    if (session.phase !== 'learning') throw new StudyError(409, 'The learner is not in the learning phase.');
    await advance(session, 'learning', 'posttest');
  } else if (action === 'close') {
    if (session.phase !== 'done') throw new StudyError(409, 'Only finished sessions can return to the normal app.');
    await advance(session, 'done', 'closed');
  } else throw new StudyError(400, 'Unknown action.');
}

export async function removeSession(userId: number) {
  const paths = (unwrap(await supabase.from('readlr_study_responses').select('recording_path').eq('user_id', userId)) as Array<{ recording_path: string | null }>)
    .map(row => row.recording_path).filter((path): path is string => !!path);
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from(STUDY_BUCKET).remove(paths.slice(i, i + 100));
  unwrap(await supabase.from('readlr_study_sessions').delete().eq('user_id', userId));
}

/** Blind scoring queue: only the word and recording, in random order, never the learner, group or test phase. */
export async function scoringBatch(limit = 20) {
  const rows = unwrap(await supabase.from('readlr_study_responses').select('id,word').is('teacher_score', null).eq('skipped', false).limit(1000)) as Array<{ id: string; word: string }>;
  return { remaining: rows.length, items: shuffled(rows).slice(0, limit) };
}

export async function setScore(id: string, score: unknown, adminId: number) {
  if (!['correct', 'incorrect', 'unclear', null].includes(score as string | null)) throw new StudyError(400, 'Choose correct, incorrect, or unclear.');
  const rows = unwrap(await supabase.from('readlr_study_responses').update({ teacher_score: score, scored_by: score ? adminId : null, scored_at: score ? new Date().toISOString() : null }).eq('id', id).eq('skipped', false).select('id')) as unknown[];
  if (!rows.length) throw new StudyError(404, 'Recording not found.');
}

export async function recording(id: string) {
  const row = unwrap(await supabase.from('readlr_study_responses').select('recording_path,recording_type').eq('id', id).maybeSingle()) as { recording_path: string | null; recording_type: string | null } | null;
  if (!row?.recording_path) throw new StudyError(404, 'Recording not found.');
  const download = await supabase.storage.from(STUDY_BUCKET).download(row.recording_path);
  if (download.error || !download.data) throw new Error('Recording unavailable');
  return { type: row.recording_type ?? download.data.type ?? 'audio/webm', buffer: Buffer.from(await download.data.arrayBuffer()) };
}

export async function rescoreMissing() {
  const rows = unwrap(await supabase.from('readlr_study_responses').select('id,word').eq('skipped', false).or('app_result.is.null,app_result.eq.unavailable').limit(1000)) as Array<{ id: string; word: string }>;
  rows.forEach(row => queueAppScoring(row.id, row.word));
  return rows.length;
}

// --- Results

const bucketOf = (category: WordCategory): CategoryKey => category === 'taught' ? 'taught' : category === 'transfer' ? 'transfer' : 'control';

export function summarize(sessions: StudySession[], responses: StudyResponse[]) {
  const participants = sessions.map(session => {
    // Answers from an older word list (e.g. a pilot) are ignored rather than miscounted.
    const own = responses.filter(r => r.user_id === session.user_id && ALL_STUDY_WORDS.includes(r.word));
    const score = (phase: 'pretest' | 'posttest', key: CategoryKey) => {
      const rows = own.filter(r => r.phase === phase && bucketOf(wordCategory(session.study_group, r.word)) === key);
      const scores = rows.map(finalScore);
      return { correct: scores.filter(s => s === 'correct').length, scored: scores.filter(s => s !== null).length, total: categoryTotal(session.study_group, key) };
    };
    const result = Object.fromEntries((['taught', 'transfer', 'control'] as const).map(key => [key, { pre: score('pretest', key), post: score('posttest', key) }])) as Record<CategoryKey, { pre: ReturnType<typeof score>; post: ReturnType<typeof score> }>;
    const complete = own.filter(r => r.phase === 'posttest').length === ALL_STUDY_WORDS.length && own.filter(r => r.phase === 'pretest').length === ALL_STUDY_WORDS.length;
    return { participantCode: session.participant_code, group: session.study_group, phase: session.phase, complete, ...result,
      unscored: own.filter(r => finalScore(r) === null).length };
  });
  const comparable = responses.filter(r => ALL_STUDY_WORDS.includes(r.word) && !r.skipped && (r.teacher_score === 'correct' || r.teacher_score === 'incorrect') && (r.app_result === 'matched' || r.app_result === 'different'));
  const agree = comparable.filter(r => (r.teacher_score === 'correct') === (r.app_result === 'matched')).length;
  return { participants, agreement: { compared: comparable.length, agree, percent: comparable.length ? Math.round(agree / comparable.length * 1000) / 10 : null } };
}

export async function loadResults() {
  const [sessions, responses] = await Promise.all([readAll<StudySession>('readlr_study_sessions', '*'), readAll<StudyResponse>('readlr_study_responses', '*')]);
  return { sessions, responses, summary: summarize(sessions.sort((a, b) => a.participant_code.localeCompare(b.participant_code)), responses) };
}
