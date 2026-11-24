import { randomUUID } from 'node:crypto';
import { supabase, unwrap } from '../../database/db.js';
import { surveyAssigned } from '../admin/survey.controller.js';
import {
  ALL_STUDY_WORDS, BLEND_ITEMS, FLUENCY_MAX_MS, FLUENCY_WORDS, STUDY_BOOKS, blendTranscriptionPrompt, categoryTotal, allocateGroups, finalScore, fluencyScore, shuffled, studyTranscriptionPrompt, wcpm, wordCategory,
  type CategoryKey, type ItemType, type StudyGroup, type StudyPhase, type WordCategory,
} from './study.data.js';

export const STUDY_BUCKET = 'study-recordings';

export interface StudySession {
  pretest_ended_early_at?: string | null;
  pre_check?:unknown; post_check?:unknown;
  withdrawn?:boolean;
  entry_pending?: boolean;
  user_id: number; participant_code: string; study_group: StudyGroup; phase: StudyPhase; learning_minutes: number | null;
  pretest_order: string[]; posttest_order: string[];
  pretest_blend_order: string[] | null; posttest_blend_order: string[] | null;
  // Undefined until the one-minute reading migration is applied; null for sessions without Part 3.
  pretest_fluency_order?: string[] | null; posttest_fluency_order?: string[] | null;
  learning_started_at: string | null; posttest_started_at: string | null; finished_at: string | null;
  created_at: string; updated_at: string;
}
export interface StudyResponse {
  id: string; user_id: number; phase: 'pretest' | 'posttest'; word: string; position: number; skipped: boolean;
  item_type: ItemType; prompt_replayed: boolean;
  recording_path: string | null; recording_type: string | null;
  app_result: string | null; app_transcript: string | null; teacher_score: string | null; created_at: string;
}
export interface StudyFluency {
  id: string; user_id: number; phase: 'pretest' | 'posttest'; word_order: string[]; started_at: string | null; duration_ms: number | null;
  review_status?: string|null; technical_note?:string|null;
  recording_path: string | null; skipped: boolean; words_attempted: number | null; error_positions: number[] | null; words_correct: number | null;
  scored_at: string | null; created_at: string;
}
export class StudyError extends Error { constructor(public status: number, message: string) { super(message); } }

// Untimed sessions (null minutes) have no end time, so only the admin can start the posttest.
export function learningEndsAt(session: Pick<StudySession, 'learning_started_at' | 'learning_minutes'>) {
  return session.learning_started_at && session.learning_minutes !== null ? new Date(Date.parse(session.learning_started_at) + session.learning_minutes * 60_000) : null;
}

/** Loads a learner's session and moves learning to posttest once the learning time has run out. */
export async function getSession(userId: number): Promise<StudySession | null> {
  const session = unwrap(await supabase.from('readlr_study_sessions').select('*').eq('user_id', userId).maybeSingle()) as StudySession | null;
  if (session?.phase === 'pretest' && (!session.pretest_blend_order || session.pretest_fluency_order === null)) return addMissingParts(session);

  return session;
}

// Only sessions still in the pretest get blending or one-minute reading, so every such posttest has a pretest to compare with.
async function addMissingParts(session: StudySession): Promise<StudySession> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (!session.pretest_blend_order) Object.assign(patch, { pretest_blend_order: shuffled(BLEND_ITEMS), posttest_blend_order: shuffled(BLEND_ITEMS) });
  if (session.pretest_fluency_order === null) Object.assign(patch, { pretest_fluency_order: shuffled(FLUENCY_WORDS), posttest_fluency_order: shuffled(FLUENCY_WORDS) });
  let query = supabase.from('readlr_study_sessions').update(patch).eq('user_id', session.user_id).eq('phase', 'pretest');
  for (const column of ['pretest_blend_order', 'pretest_fluency_order']) if (column in patch) query = query.is(column, null);
  const rows = unwrap(await query.select('*')) as StudySession[];
  return rows[0] ?? (unwrap(await supabase.from('readlr_study_sessions').select('*').eq('user_id', session.user_id).single()) as StudySession);
}

/** Printed words (Part 1), blending items (Part 2) and one-minute reading order (Part 3); older sessions lack the later parts. */
function testItems(session: StudySession, phase: 'pretest' | 'posttest') {
  return phase === 'pretest'
    ? { words: session.pretest_order, blends: session.pretest_blend_order ?? [], fluency: session.pretest_fluency_order ?? [] }
    : { words: session.posttest_order, blends: session.posttest_blend_order ?? [], fluency: session.posttest_fluency_order ?? [] };
}

async function advance(session: StudySession, from: StudyPhase, to: StudyPhase): Promise<StudySession> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { phase: to, updated_at: now };
  if (to === 'learning') patch.learning_started_at = now;
  if (to === 'learning' || to === 'done') patch.entry_pending = true;
  if (to === 'posttest') patch.posttest_started_at = now;
  if (to === 'done') patch.finished_at = now;
  // Conditional on the current phase so two devices cannot advance twice.
  const rows = unwrap(await supabase.from('readlr_study_sessions').update(patch).eq('user_id', session.user_id).eq('phase', from).select('*')) as StudySession[];

  return rows[0] ?? (unwrap(await supabase.from('readlr_study_sessions').select('*').eq('user_id', session.user_id).single()) as StudySession);
}

type Progress = { answered: string[]; fluencyDone: boolean };
/** Saved answers for one test; the Part 3 table is read only for sessions that have Part 3. */
async function testProgress(session: StudySession, phase: 'pretest' | 'posttest'): Promise<Progress> {
  const [answers, fluency] = await Promise.all([
    supabase.from('readlr_study_responses').select('word').eq('user_id', session.user_id).eq('phase', phase),
    testItems(session, phase).fluency.length ? supabase.from('readlr_study_fluency').select('id').eq('user_id', session.user_id).eq('phase', phase) : Promise.resolve(null),
  ]);
  return { answered: (unwrap(answers) as Array<{ word: string }>).map(row => row.word), fluencyDone: fluency ? (unwrap(fluency) as unknown[]).length > 0 : false };
}

/** A test is finished when Parts 1 and 2 are all answered and Part 3, if the session has it, is recorded or skipped. */
function testComplete(session: StudySession, phase: 'pretest' | 'posttest', progress: Progress) {
  const { words, blends, fluency } = testItems(session, phase);
  return [...words, ...blends].every(item => progress.answered.includes(item)) && (!fluency.length || progress.fluencyDone);
}

export async function learnerView(session: StudySession | null, known?: Progress) {
  if (!session || session.phase === 'closed') return { active: false as const };
  const testPhase = session.phase === 'pretest' || session.phase === 'posttest' ? session.phase : null;
  const progress=testPhase?(known??await testProgress(session,testPhase)):null;
  if(testPhase&&progress&&testComplete(session,testPhase,progress))return learnerView(await advance(session,testPhase,testPhase==='pretest'?'learning':'done'));
  if (!testPhase && !session.entry_pending) return { active: false as const, systemUse:true };
  return {
    active: true as const,
    phase: session.phase,
    learningEndsAt: learningEndsAt(session)?.toISOString() ?? null,
    learningMinutes: session.learning_minutes,
    survey: session.phase === 'done' ? await surveyAssigned(session.user_id).catch(() => false) : false,
    test: testPhase ? { phase: testPhase, ...testItems(session, testPhase), ...progress! } : null,
  };
}

const extensionFor = (type: string) => type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm';

export async function recordAnswer(userId: number, phase: unknown, word: unknown, file: { buffer: Buffer; mimetype: string } | null, itemType: unknown = 'word', replayed = false) {
  if ((phase !== 'pretest' && phase !== 'posttest') || typeof word !== 'string' || !/^[a-z]{1,10}$/.test(word)) throw new StudyError(400, 'Unknown word.');
  if (itemType !== 'word' && itemType !== 'blend') throw new StudyError(400, 'Unknown item type.');
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
  const { words, blends } = testItems(session, session.phase);
  // A word counts only in its own part, and blend items only come from BLEND_ITEMS.
  const valid = itemType === 'blend' ? blends.includes(word) && BLEND_ITEMS.includes(word) : words.includes(word);
  if (!valid) { await discard(); throw new StudyError(400, 'Unknown word.'); }
  if (upload?.error) throw new Error(`Recording upload failed: ${upload.error.message}`);
  const inserted = await supabase.from('readlr_study_responses').insert({
    user_id: userId, phase: session.phase, word, item_type: itemType, prompt_replayed: itemType === 'blend' && replayed,
    position: itemType === 'blend' ? words.length + blends.indexOf(word) : words.indexOf(word), skipped: !file,
    recording_path: path, recording_type: file?.mimetype ?? null,
  }).select('id').single();
  if (inserted.error) {
    if (path) await supabase.storage.from(STUDY_BUCKET).remove([path]);
    // A retried upload after a dropped connection: the first answer stands.
    if ((inserted.error as { code?: string }).code !== '23505') throw new Error(inserted.error.message);
  }
  return finishIfComplete(session, session.phase);
}

async function finishIfComplete(session: StudySession, phase: 'pretest' | 'posttest') {
  const progress = await testProgress(session, phase);
  if (testComplete(session, phase, progress)) return learnerView(await advance(session, phase, phase === 'pretest' ? 'learning' : 'done'));
  return learnerView(session, progress);
}

/** Saves the Part 3 one-minute reading (or its skip); the stored length is capped at one minute. */
export async function recordFluency(userId: number, phase: unknown, file: { buffer: Buffer; mimetype: string } | null, startedAt: unknown, durationMs: unknown) {
  if (phase !== 'pretest' && phase !== 'posttest') throw new StudyError(400, 'Unknown test.');
  let timing: { started_at: string | null; duration_ms: number | null } = { started_at: null, duration_ms: null };
  if (file) {
    const duration = Number(durationMs);
    // A little slack over 60 s covers the recorder stopping late.
    if (!Number.isInteger(duration) || duration < 0 || duration > 65_000) throw new StudyError(400, 'The reading time is not valid.');
    if (typeof startedAt !== 'string' || Number.isNaN(Date.parse(startedAt))) throw new StudyError(400, 'The start time is not valid.');
    timing = { started_at: new Date(startedAt).toISOString(), duration_ms: Math.min(duration, FLUENCY_MAX_MS) };
  }
  const path = file ? `${userId}/${phase}-fluency-${randomUUID()}.${extensionFor(file.mimetype)}` : null;
  const [session, upload] = await Promise.all([
    getSession(userId),
    file && path ? supabase.storage.from(STUDY_BUCKET).upload(path, file.buffer, { contentType: file.mimetype, upsert: false }) : Promise.resolve(null),
  ]);
  const discard = async () => { if (path && !upload?.error) await supabase.storage.from(STUDY_BUCKET).remove([path]); };
  if (!session || (session.phase !== 'pretest' && session.phase !== 'posttest')) { await discard(); throw new StudyError(409, 'This word game has finished.'); }
  if (phase !== session.phase) { await discard(); throw new StudyError(409, 'This word game has moved on. Please wait a moment.'); }
  const order = testItems(session, session.phase).fluency;
  if (!order.length) { await discard(); throw new StudyError(400, 'This test has no reading part.'); }
  if (upload?.error) throw new Error(`Recording upload failed: ${upload.error.message}`);
  const inserted = await supabase.from('readlr_study_fluency').insert({ user_id: userId, phase: session.phase, word_order: order, ...timing, recording_path: path, skipped: !file });
  if (inserted.error) {
    if (path) await supabase.storage.from(STUDY_BUCKET).remove([path]);
    // A retried upload after a dropped connection: the first reading stands.
    if ((inserted.error as { code?: string }).code !== '23505') throw new Error(inserted.error.message);
  }
  return finishIfComplete(session, session.phase);
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
  const [sessions, responses, fluency, learners] = await Promise.all([
    readAll<StudySession>('readlr_study_sessions', '*'),
    readAll<Pick<StudyResponse, 'user_id' | 'phase' | 'teacher_score' | 'skipped' | 'app_result'>>('readlr_study_responses', 'user_id,phase,teacher_score,skipped,app_result,created_at'),
    readAll<Pick<StudyFluency, 'user_id' | 'phase' | 'skipped' | 'scored_at'>>('readlr_study_fluency', 'user_id,phase,skipped,scored_at,created_at'),
    (async () => {
      const users = unwrap(await supabase.from('users').select('id,email').eq('role', 'learner')) as Array<{ id: number; email: string }>;
      const profiles = unwrap(await supabase.from('learner_profiles').select('user_id,name,study_participant')) as Array<{ user_id: number; name: string; study_participant: boolean }>;
      const byUser = new Map(profiles.map(p => [p.user_id, p]));
      return users.map(u => ({ id: u.id, email: u.email, name: byUser.get(u.id)?.name ?? u.email.split('@')[0], studyParticipant: byUser.get(u.id)?.study_participant === true }));
    })(),
  ]);
  const enrolled = new Set(sessions.filter(s=>!s.withdrawn).map(s => s.user_id));
  const learnerById = new Map(learners.map(l => [l.id, l]));
  return {
    sessions: sessions.filter(s => !s.withdrawn && learnerById.get(s.user_id)?.studyParticipant).map(s => {
      const own = [...responses, ...fluency].filter(r => r.user_id === s.user_id);
      return {
        userId: s.user_id, name: learnerById.get(s.user_id)?.name ?? 'Learner', participantCode: s.participant_code, group: s.study_group,
        phase: s.phase, entryPending:s.entry_pending===true, pretestEndedEarly:!!s.pretest_ended_early_at,
        reviewed:responses.filter(r=>r.user_id===s.user_id&&(r.teacher_score!==null||r.skipped)).length+fluency.filter(r=>r.user_id===s.user_id&&(r.scored_at!==null||r.skipped)).length,
        learningMinutes: s.learning_minutes, learningEndsAt: learningEndsAt(s)?.toISOString() ?? null,
        pretestAnswered: own.filter(r => r.phase === 'pretest').length, posttestAnswered: own.filter(r => r.phase === 'posttest').length,
        // Part 3 is one recording, so it counts as one item.
        itemCount: s.pretest_order.length + (s.pretest_blend_order?.length ?? 0) + (s.pretest_fluency_order?.length ? 1 : 0),
        finishedAt: s.finished_at,
      };
    }).sort((a, b) => a.participantCode.localeCompare(b.participantCode)),
    eligible: learners.filter(l => l.studyParticipant && !enrolled.has(l.id)).map(({ id, name, email }) => ({ id, name, email })),
    notConsented: learners.filter(l => !l.studyParticipant && !enrolled.has(l.id)).length,
    unscored: responses.filter(r => !r.skipped && r.teacher_score === null).length + fluency.filter(r => !r.skipped && r.scored_at === null).length,
    appPending: responses.filter(r => !r.skipped && r.app_result === null).length,
    groups: { A: sessions.filter(s => s.study_group === 'A').length, B: sessions.filter(s => s.study_group === 'B').length },
  };
}

export async function enroll(userIds: number[], learningMinutes: number | null) {
  const profiles = unwrap(await supabase.from('learner_profiles').select('user_id,study_participant').in('user_id', userIds)) as Array<{ user_id: number; study_participant: boolean }>;
  const consented = new Set(profiles.filter(p => p.study_participant).map(p => p.user_id));
  if (userIds.some(id => !consented.has(id))) throw new StudyError(400, 'Only learners marked as study participants (with signed consent) can be enrolled.');
  const existing = await readAll<Pick<StudySession, 'user_id' | 'participant_code' | 'study_group' | 'withdrawn' | 'finished_at' | 'learning_started_at' | 'posttest_started_at'>>('readlr_study_sessions', 'user_id,participant_code,study_group,withdrawn,finished_at,learning_started_at,posttest_started_at,created_at');
  if (userIds.some(id => existing.some(s => !s.withdrawn && s.user_id === id))) throw new StudyError(409, 'Some learners already have a study session. Refresh and try again.');
  const restores=existing.filter(s=>s.withdrawn&&userIds.includes(s.user_id));
  for(const r of restores){
    const phase=r.finished_at?'done':r.posttest_started_at?'posttest':r.learning_started_at?'learning':'pretest';
    unwrap(await supabase.from('readlr_study_sessions').update({withdrawn:false,phase,entry_pending:false}).eq('user_id',r.user_id).eq('withdrawn',true));
  }
  const groups = allocateGroups(userIds.filter(id=>!restores.some(s=>s.user_id===id)), { A: existing.filter(s => s.study_group === 'A').length, B: existing.filter(s => s.study_group === 'B').length });
  let next = existing.reduce((max, s) => Math.max(max, Number(s.participant_code.slice(1))), 0);
  const rows = [...groups].map(([userId, group]) => ({
    user_id: userId, study_group: group, learning_minutes: learningMinutes,
    participant_code: `P${String(++next).padStart(2, '0')}`,
    pretest_order: shuffled(ALL_STUDY_WORDS), posttest_order: shuffled(ALL_STUDY_WORDS),
    pretest_blend_order: shuffled(BLEND_ITEMS), posttest_blend_order: shuffled(BLEND_ITEMS),
    pretest_fluency_order: shuffled(FLUENCY_WORDS), posttest_fluency_order: shuffled(FLUENCY_WORDS),
  }));
  if(rows.length)unwrap(await supabase.from('readlr_study_sessions').insert(rows));
  return rows.length+restores.length;
}

export async function updateSession(userId: number, action: unknown, group: unknown) {
  const session = await getSession(userId);
  if (!session) throw new StudyError(404, 'No study session for this learner.');
  const now = new Date().toISOString();
  if (action === 'set-group') {
    if (group !== 'A' && group !== 'B') throw new StudyError(400, 'Choose group A or B.');
    if (session.phase !== 'pretest') throw new StudyError(409, 'Groups can only change before the learning phase starts.');
    unwrap(await supabase.from('readlr_study_sessions').update({ study_group: group, updated_at: now }).eq('user_id', userId).eq('phase', 'pretest'));
  } else if (action === 'end-pretest') {
    if (session.phase !== 'pretest' || session.withdrawn) throw new StudyError(409, 'Only an active pre-test can be ended.');
    const ended = unwrap(await supabase.from('readlr_study_sessions').update({
      phase: 'learning', entry_pending: false, learning_minutes: null, learning_started_at: now,
      pretest_ended_early_at: now, updated_at: now,
    }).eq('user_id', userId).eq('phase', 'pretest').eq('withdrawn', false).select('user_id').maybeSingle());
    if (!ended) throw new StudyError(409, 'The learner’s assignment changed. Refresh the participant list.');
  } else if (action === 'start-posttest') {
    if (session.phase !== 'learning' || session.entry_pending) throw new StudyError(409, 'The learner is not in the learning phase.');
    await advance(session, 'learning', 'posttest');
  } else if (action === 'close') {
    if (session.phase !== 'done') throw new StudyError(409, 'Only finished sessions can return to the normal app.');
    await advance(session, 'done', 'closed');
  } else throw new StudyError(400, 'Unknown action.');
}

export async function removeSession(userId: number) {
  const [responses, fluency] = await Promise.all(['readlr_study_responses', 'readlr_study_fluency'].map(async table => unwrap(await supabase.from(table).select('recording_path').eq('user_id', userId)) as Array<{ recording_path: string | null }>));
  const paths = [...responses, ...fluency].map(row => row.recording_path).filter((path): path is string => !!path);
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from(STUDY_BUCKET).remove(paths.slice(i, i + 100));
  unwrap(await supabase.from('readlr_study_sessions').delete().eq('user_id', userId));
}

/** Blind scoring queue: only the word, item type and recording, in random order, never the learner, group or test phase. */
export async function scoringBatch(limit = 20) {
  const rows = unwrap(await supabase.from('readlr_study_responses').select('id,word,item_type').is('teacher_score', null).eq('skipped', false).limit(1000)) as Array<{ id: string; word: string; item_type: ItemType }>;
  return { remaining: rows.length, items: shuffled(rows).slice(0, limit) };
}

export async function setScore(id: string, score: unknown, adminId: number) {
  if (!['correct', 'incorrect', 'skip', 'unclear', null].includes(score as string | null)) throw new StudyError(400, 'Choose correct, incorrect, or unclear.');
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

/** Blind Part 3 queue: only the words in the order shown and the recording length, never the learner, group or test phase. */
export async function fluencyScoringBatch() {
  const rows = unwrap(await supabase.from('readlr_study_fluency').select('id,word_order,duration_ms').is('scored_at', null).eq('skipped', false).limit(1000)) as Array<Pick<StudyFluency, 'id' | 'word_order' | 'duration_ms'>>;
  return { remaining: rows.length, items: shuffled(rows).slice(0, 5) };
}

/** Saves the teacher's marks for one reading, or clears them when marks is null. */
export async function setFluencyScore(id: string, marks: { errors: unknown; lastReached: unknown } | null, adminId: number, status:unknown=marks?'complete':null, note?:unknown) {
  if(![null,'complete','unclear','skip'].includes(status as string|null)|| (note!==undefined && (typeof note!=='string'||note.length>1000)) || (status==='complete')!==!!marks) throw new StudyError(400,'Invalid timed reading review.');
  const row = unwrap(await supabase.from('readlr_study_fluency').select('word_order').eq('id', id).eq('skipped', false).maybeSingle()) as Pick<StudyFluency, 'word_order'> | null;
  if (!row) throw new StudyError(404, 'Recording not found.');
  let patch: Record<string, unknown> = { words_attempted: null, error_positions: null, words_correct: null, scored_by: null, scored_at: null };
  if (marks) {
    try { patch = { ...fluencyScore(row.word_order.length, marks.errors, marks.lastReached), scored_by: adminId, scored_at: new Date().toISOString() }; }
    catch (error) { throw new StudyError(400, (error as Error).message); }
  }
  unwrap(await supabase.from('readlr_study_fluency').update({...patch,review_status:status,...(note!==undefined?{technical_note:note}:{}),...(status?{scored_by:adminId,scored_at:new Date().toISOString()}:{})}).eq('id', id));
}

export async function fluencyRecording(id: string) {
  const row = unwrap(await supabase.from('readlr_study_fluency').select('recording_path').eq('id', id).maybeSingle()) as { recording_path: string | null } | null;
  if (!row?.recording_path) throw new StudyError(404, 'Recording not found.');
  const download = await supabase.storage.from(STUDY_BUCKET).download(row.recording_path);
  if (download.error || !download.data) throw new Error('Recording unavailable');
  return { type: download.data.type || 'audio/webm', buffer: Buffer.from(await download.data.arrayBuffer()) };
}

// --- Results

const bucketOf = (category: WordCategory): CategoryKey => category === 'taught' ? 'taught' : category === 'transfer' ? 'transfer' : 'control';

/** Part 3 result for one test; skipped, missing or unscored readings are null so they export as blanks. */
function fluencyResult(row: StudyFluency | undefined) {
  if (!row || row.skipped || row.scored_at === null || row.words_correct === null || row.words_attempted === null || row.duration_ms === null) return null;
  return { wordsAttempted: row.words_attempted, wordsCorrect: row.words_correct, durationSeconds: Math.round(row.duration_ms / 100) / 10, wcpm: wcpm(row.words_correct, row.duration_ms) };
}

export function summarize(sessions: StudySession[], responses: StudyResponse[], fluency: StudyFluency[] = []) {
  const participants = sessions.map(session => {
    // Answers from an older word list (e.g. a pilot) are ignored rather than miscounted.
    const own = responses.filter(r => r.user_id === session.user_id && ALL_STUDY_WORDS.includes(r.word));
    const score = (phase: 'pretest' | 'posttest', key: CategoryKey) => {
      const rows = own.filter(r => r.phase === phase && bucketOf(wordCategory(session.study_group, r.word)) === key);
      const scores = rows.map(finalScore);
      return { correct: scores.filter(s => s === 'correct').length, scored: scores.filter(s => s !== null).length, total: categoryTotal(session.study_group, key) };
    };
    const result = Object.fromEntries((['taught', 'transfer', 'control'] as const).map(key => [key, { pre: score('pretest', key), post: score('posttest', key) }])) as Record<CategoryKey, { pre: ReturnType<typeof score>; post: ReturnType<typeof score> }>;
    // Blending is reported on its own; sessions enrolled before it have a total of 0.
    const blends = responses.filter(r => r.user_id === session.user_id && BLEND_ITEMS.includes(r.word));
    const blendTotal = session.pretest_blend_order?.length ?? 0;
    const blendScore = (phase: 'pretest' | 'posttest') => {
      const scores = blends.filter(r => r.phase === phase).map(finalScore);
      return { correct: scores.filter(s => s === 'correct').length, scored: scores.filter(s => s !== null).length, total: blendTotal };
    };
    const reading = (phase: 'pretest' | 'posttest') => fluency.find(r => r.user_id === session.user_id && r.phase === phase);
    const partDone = (phase: 'pretest' | 'posttest') => own.filter(r => r.phase === phase).length === ALL_STUDY_WORDS.length && blends.filter(r => r.phase === phase).length === blendTotal
      && (!session.pretest_fluency_order?.length || !!reading(phase));
    const complete = partDone('pretest') && partDone('posttest');
    return { participantCode: session.participant_code, group: session.study_group, phase: session.phase, complete, ...result,
      blend: { pre: blendScore('pretest'), post: blendScore('posttest') },
      fluency: { pre: fluencyResult(reading('pretest')), post: fluencyResult(reading('posttest')) },
      unscored: [...own, ...blends].filter(r => finalScore(r) === null).length };
  });
  const comparable = responses.filter(r => ALL_STUDY_WORDS.includes(r.word) && !r.skipped && (r.teacher_score === 'correct' || r.teacher_score === 'incorrect') && (r.app_result === 'matched' || r.app_result === 'different'));
  const agree = comparable.filter(r => (r.teacher_score === 'correct') === (r.app_result === 'matched')).length;
  return { participants, agreement: { compared: comparable.length, agree, percent: comparable.length ? Math.round(agree / comparable.length * 1000) / 10 : null } };
}

export async function loadResults() {
  const [sessions, responses, fluency] = await Promise.all([readAll<StudySession>('readlr_study_sessions', '*'), readAll<StudyResponse>('readlr_study_responses', '*'), readAll<StudyFluency>('readlr_study_fluency', '*')]);
  const active=sessions.filter(s=>!s.withdrawn).sort((a,b)=>a.participant_code.localeCompare(b.participant_code)), ids=new Set(active.map(s=>s.user_id));
  const items=responses.filter(r=>ids.has(r.user_id)),readings=fluency.filter(r=>ids.has(r.user_id));
  return {sessions:active,responses:items,fluency:readings,summary:summarize(active,items,readings)};
}
