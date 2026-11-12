import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { ALL_STUDY_WORDS, STUDY_BOOKS, categoryTotal, STUDY_VERSION, STUDY_WORDS, finalScore, wordCategory } from './study.data.js';
import {
  StudyError, adminOverview, enroll, getSession, learnerView, loadResults, recordAnswer, recording, removeSession,
  rescoreMissing, scoringBatch, setScore, updateSession, type StudyResponse, type StudySession,
} from './study.service.js';

const userIdOf = (req: Request) => (req as Request & { userId: number }).userId;
function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof StudyError) { res.status(error.status).json({ message: error.message }); return; }
  console.error(fallback, error);
  res.status(503).json({ message: `${fallback} Check that the study migration has been applied.` });
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validUserId = (value: unknown) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null; };

// --- Learner

export async function getMyStudy(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json(await learnerView(await getSession(userIdOf(req)))); }
  catch (error) { fail(res, error, 'Study session could not load.'); }
}

export async function answerStudyWord(req: Request, res: Response) {
  const skip = req.body?.skip === 'true';
  if (!skip && !req.file?.size) {
    console.warn(`Study answer refused for user ${userIdOf(req)}: no recording (word ${req.body?.word}, file ${req.file?.mimetype ?? 'missing'}).`);
    res.status(400).json({ message: 'A recording is required.' }); return;
  }
  try { res.json(await recordAnswer(userIdOf(req), req.body?.phase, req.body?.word, skip ? null : { buffer: req.file!.buffer, mimetype: req.file!.mimetype })); }
  catch (error) {
    // Refused answers leave the learner unable to finish a test, so they are always logged.
    if (error instanceof StudyError) console.warn(`Study answer refused for user ${userIdOf(req)} (word ${req.body?.word}, phase ${req.body?.phase}): ${error.message}`);
    fail(res, error, 'Your answer could not be saved. Please try again.');
  }
}

// --- Admin

export async function getStudyOverview(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json(await adminOverview()); } catch (error) { fail(res, error, 'Study sessions could not load.'); }
}

export async function enrollStudy(req: Request, res: Response) {
  const { userIds, learningMinutes } = req.body ?? {};
  if (!Array.isArray(userIds) || !userIds.length || userIds.length > 200 || userIds.some(id => validUserId(id) === null) || new Set(userIds).size !== userIds.length ||
      !Number.isInteger(learningMinutes) || learningMinutes < 5 || learningMinutes > 120) {
    res.status(400).json({ message: 'Choose learners and a learning time between 5 and 120 minutes.' }); return;
  }
  try { res.json({ enrolled: await enroll(userIds, learningMinutes) }); } catch (error) { fail(res, error, 'Learners could not be enrolled.'); }
}

export async function updateStudySession(req: Request, res: Response) {
  const userId = validUserId(req.params.userId);
  if (!userId) { res.status(400).json({ message: 'Choose a valid learner.' }); return; }
  try { await updateSession(userId, req.body?.action, req.body?.group); res.json({ success: true }); }
  catch (error) { fail(res, error, 'The session could not be updated.'); }
}

export async function deleteStudySession(req: Request, res: Response) {
  const userId = validUserId(req.params.userId);
  if (!userId || req.body?.confirmation !== 'DELETE') { res.status(400).json({ message: 'Type DELETE to remove this session and its recordings.' }); return; }
  try { await removeSession(userId); res.json({ success: true }); } catch (error) { fail(res, error, 'The session could not be removed.'); }
}

export async function getScoringBatch(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json(await scoringBatch()); } catch (error) { fail(res, error, 'Recordings could not load.'); }
}

export async function scoreResponse(req: Request, res: Response) {
  if (!uuid.test(String(req.params.id))) { res.status(400).json({ message: 'Invalid recording.' }); return; }
  try { await setScore(String(req.params.id), req.body?.score ?? null, userIdOf(req)); res.json({ success: true }); }
  catch (error) { fail(res, error, 'The score could not be saved.'); }
}

export async function getRecording(req: Request, res: Response) {
  if (!uuid.test(String(req.params.id))) { res.status(400).json({ message: 'Invalid recording.' }); return; }
  try {
    const file = await recording(String(req.params.id));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', file.type);
    res.send(file.buffer);
  } catch (error) { fail(res, error, 'The recording could not load.'); }
}

export async function rescoreStudy(_req: Request, res: Response) {
  try { res.json({ queued: await rescoreMissing() }); } catch (error) { fail(res, error, 'App scoring could not start.'); }
}

export async function getStudyResults(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json((await loadResults()).summary); } catch (error) { fail(res, error, 'Results could not load.'); }
}

export function studyWorkbook(sessions: StudySession[], responses: StudyResponse[], summary: Awaited<ReturnType<typeof loadResults>>['summary']) {
  const book = new ExcelJS.Workbook();
  book.creator = 'Readlr';
  const codeOf = new Map(sessions.map(s => [s.user_id, s]));
  const long = book.addWorksheet('Responses');
  long.addRow(['Participant', 'Group', 'Test', 'Position', 'Word', 'Category', 'Skipped', 'App result', 'App transcript', 'Teacher score', 'Final score (1/0)', 'Answered (UTC)']);
  for (const r of [...responses].sort((a, b) => (codeOf.get(a.user_id)?.participant_code ?? '').localeCompare(codeOf.get(b.user_id)?.participant_code ?? '') || a.phase.localeCompare(b.phase) * -1 || a.position - b.position)) {
    const session = codeOf.get(r.user_id);
    if (!session || !ALL_STUDY_WORDS.includes(r.word)) continue;
    const score = finalScore(r);
    long.addRow([session.participant_code, session.study_group, r.phase, r.position + 1, r.word, wordCategory(session.study_group, r.word), r.skipped ? 'Yes' : 'No',
      r.app_result ?? '', r.app_transcript ?? '', r.teacher_score ?? '', score === null ? '' : score === 'correct' ? 1 : 0, new Date(r.created_at)]);
  }
  long.getColumn(12).numFmt = 'yyyy-mm-dd hh:mm:ss';
  const wide = book.addWorksheet('Summary');
  // Totals differ by group (B has 3 transfer words), so headers name both.
  const outOf = (key: 'taught' | 'transfer' | 'control') => categoryTotal('A', key) === categoryTotal('B', key) ? `/${categoryTotal('A', key)}` : `(A /${categoryTotal('A', key)}, B /${categoryTotal('B', key)})`;
  wide.addRow(['Participant', 'Group', 'Complete', `Pre taught ${outOf('taught')}`, `Post taught ${outOf('taught')}`, 'Gain taught', `Pre transfer ${outOf('transfer')}`, `Post transfer ${outOf('transfer')}`, 'Gain transfer', `Pre control ${outOf('control')}`, `Post control ${outOf('control')}`, 'Gain control', 'Unscored items', 'Learning minutes', 'Learning started (UTC)', 'Posttest started (UTC)', 'Finished (UTC)']);
  for (const p of summary.participants) {
    const s = sessions.find(x => x.participant_code === p.participantCode)!;
    const date = (v: string | null) => v ? new Date(v) : '';
    wide.addRow([p.participantCode, p.group, p.complete ? 'Yes' : 'No', p.taught.pre.correct, p.taught.post.correct, p.taught.post.correct - p.taught.pre.correct,
      p.transfer.pre.correct, p.transfer.post.correct, p.transfer.post.correct - p.transfer.pre.correct,
      p.control.pre.correct, p.control.post.correct, p.control.post.correct - p.control.pre.correct, p.unscored, s.learning_minutes,
      date(s.learning_started_at), date(s.posttest_started_at), date(s.finished_at)]);
  }
  for (const col of [15, 16, 17]) wide.getColumn(col).numFmt = 'yyyy-mm-dd hh:mm:ss';
  const notes = book.addWorksheet('Notes');
  notes.addRow(['Item', 'Detail']);
  notes.addRow(['Instrument version', STUDY_VERSION]);
  notes.addRow(['Group A books', STUDY_BOOKS.A.join(', ')]);
  notes.addRow(['Group B books', STUDY_BOOKS.B.join(', ')]);
  for (const g of ['A', 'B'] as const) {
    notes.addRow([`Group ${g} taught words`, STUDY_WORDS[g].taught.join(', ')]);
    notes.addRow([`Group ${g} transfer words`, STUDY_WORDS[g].transfer.join(', ')]);
  }
  notes.addRow(['Categories', 'taught/transfer are the learner\'s own group words; control-taught/control-transfer are the other group\'s words (not studied by this learner).']);
  notes.addRow(['Final score', 'Teacher score when available, otherwise the app result (matched = 1, different = 0). Skipped = 0. Unclear or unscored items are blank.']);
  notes.addRow(['Teacher scoring', 'Blind: the scorer heard each recording without the learner, group, or test phase.']);
  notes.addRow(['App/teacher agreement', summary.agreement.percent === null ? 'Not yet available' : `${summary.agreement.percent}% of ${summary.agreement.compared} recordings`]);
  notes.addRow(['Privacy', 'Participants are identified by code only. Keep the code-to-name list separately and within the authorized research team.']);
  for (const tab of [long, wide, notes]) {
    tab.views = [{ state: 'frozen', ySplit: 1 }];
    tab.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tab.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087F73' } };
    tab.columns.forEach(col => { col.width = tab === notes ? 60 : 16; });
  }
  return book;
}

export async function exportStudy(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { sessions, responses, summary } = await loadResults();
    const buffer = await studyWorkbook(sessions, responses, summary).xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="readlr-study-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) { fail(res, error, 'The export could not be created.'); }
}
