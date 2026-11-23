import {CHAPTER_IDS} from '../evidence/reading-catalog.js';
import type { Request, Response } from 'express';
import {eventsFor} from './workspace.js';
import {pathway,dayOf} from './pathway.js';
import ExcelJS from 'exceljs';
import { ALL_STUDY_WORDS, BLEND_ITEMS, FLUENCY_WORDS, STUDY_BOOKS, categoryTotal, STUDY_VERSION, STUDY_WORDS, finalScore, wcpm, wordCategory } from './study.data.js';
import {
  StudyError, adminOverview, enroll, fluencyRecording, fluencyScoringBatch, getSession, learnerView, loadResults, recordAnswer, recordFluency, recording, removeSession,
  scoringBatch, setFluencyScore, setScore, updateSession, type StudyFluency, type StudyResponse, type StudySession,
} from './study.service.js';
import { FOOTER, type GoalRow, type SmartGoalsReport } from './smart-goals.js';
import { loadSmartGoals, manilaDate } from './smart-goals.loader.js';

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
  try {
    // Clients without the blending part send no item type, so their answers stay printed words.
    res.json(await recordAnswer(userIdOf(req), req.body?.phase, req.body?.word, skip ? null : { buffer: req.file!.buffer, mimetype: req.file!.mimetype },
      req.body?.item_type ?? 'word', req.body?.prompt_replayed === 'true'));
  }
  catch (error) {
    // Refused answers leave the learner unable to finish a test, so they are always logged.
    if (error instanceof StudyError) console.warn(`Study answer refused for user ${userIdOf(req)} (word ${req.body?.word}, phase ${req.body?.phase}): ${error.message}`);
    fail(res, error, 'Your answer could not be saved. Please try again.');
  }
}

export async function answerStudyFluency(req: Request, res: Response) {
  const skip = req.body?.skip === 'true';
  if (!skip && !req.file?.size) { res.status(400).json({ message: 'A recording is required.' }); return; }
  try {
    res.json(await recordFluency(userIdOf(req), req.body?.phase, skip ? null : { buffer: req.file!.buffer, mimetype: req.file!.mimetype }, req.body?.started_at, req.body?.duration_ms));
  } catch (error) {
    if (error instanceof StudyError) console.warn(`Study reading refused for user ${userIdOf(req)} (phase ${req.body?.phase}): ${error.message}`);
    fail(res, error, 'Your reading could not be saved. Please try again.');
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
      (learningMinutes !== null && (!Number.isInteger(learningMinutes) || learningMinutes < 5 || learningMinutes > 120))) {
    res.status(400).json({ message: 'Choose learners and a learning time between 5 and 120 minutes, or untimed.' }); return;
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

export async function getFluencyScoringBatch(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json(await fluencyScoringBatch()); } catch (error) { fail(res, error, 'Readings could not load.'); }
}

export async function scoreFluency(req: Request, res: Response) {
  if (!uuid.test(String(req.params.id))) { res.status(400).json({ message: 'Invalid recording.' }); return; }
  const marks = req.body?.marks;
  try { await setFluencyScore(String(req.params.id), marks ? { errors: marks.errors, lastReached: marks.lastReached } : null, userIdOf(req),req.body?.status,req.body?.note); res.json({ success: true }); }
  catch (error) { fail(res, error, 'The score could not be saved.'); }
}

export async function getFluencyRecording(req: Request, res: Response) {
  if (!uuid.test(String(req.params.id))) { res.status(400).json({ message: 'Invalid recording.' }); return; }
  try {
    const file = await fluencyRecording(String(req.params.id));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', file.type);
    res.send(file.buffer);
  } catch (error) { fail(res, error, 'The recording could not load.'); }
}

export async function getStudyResults(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json((await loadResults()).summary); } catch (error) { fail(res, error, 'Results could not load.'); }
}

export function studyWorkbook(sessions: StudySession[], responses: StudyResponse[], summary: Awaited<ReturnType<typeof loadResults>>['summary'], fluency: StudyFluency[] = [], smart?: SmartGoalsReport) {
  const book = new ExcelJS.Workbook();
  book.creator = 'Readlr';
  const codeOf = new Map(sessions.map(s => [s.user_id, s]));
  const long = book.addWorksheet('Responses');
  // New columns are appended so existing column positions stay the same for earlier analysis files.
  long.addRow(['Participant', 'Group', 'Test', 'Position', 'Word', 'Category', 'Skipped', 'App result', 'App transcript', 'Teacher score', 'Final score (1/0)', 'Answered (UTC)', 'Item type', 'Prompt replayed',
    'Words attempted', 'Words correct', 'Duration (s)', 'WCPM','Timed review status','Technical note','Word order shown']);
  for (const r of [...responses].sort((a, b) => (codeOf.get(a.user_id)?.participant_code ?? '').localeCompare(codeOf.get(b.user_id)?.participant_code ?? '') || a.phase.localeCompare(b.phase) * -1 || a.position - b.position)) {
    const session = codeOf.get(r.user_id);
    if (!session || (!ALL_STUDY_WORDS.includes(r.word) && !BLEND_ITEMS.includes(r.word))) continue;
    const score = finalScore(r);
    long.addRow([session.participant_code, session.study_group, r.phase, r.position + 1, r.word, wordCategory(session.study_group, r.word), (r.skipped||r.teacher_score==='skip') ? 'Yes' : 'No',
      r.app_result ?? '', r.app_transcript ?? '', r.teacher_score ?? '', score === null ? '' : score === 'correct' ? 1 : 0, new Date(r.created_at),
      r.item_type, r.prompt_replayed ? 'Yes' : 'No']);
  }
  // Part 3 adds one row per test after that participant's items; unscored or skipped readings stay blank.
  for (const f of [...fluency].sort((a, b) => (codeOf.get(a.user_id)?.participant_code ?? '').localeCompare(codeOf.get(b.user_id)?.participant_code ?? '') || a.phase.localeCompare(b.phase) * -1)) {
    const session = codeOf.get(f.user_id);
    if (!session) continue;
    const scored = !f.skipped && f.scored_at !== null && f.words_correct !== null && f.duration_ms !== null;
    long.addRow([session.participant_code, session.study_group, f.phase, '', '', 'fluency', f.skipped ? 'Yes' : 'No', '', '', '', '', new Date(f.created_at), 'fluency', '',
      f.words_attempted??'', f.words_correct??'', f.duration_ms!=null?Math.round(f.duration_ms / 100) / 10:'', scored?wcpm(f.words_correct!, f.duration_ms!)??'':'',
      f.skipped?'skip':f.review_status??(scored?'complete':''), f.technical_note??'', f.word_order.join(' ')]);
  }
  long.getColumn(12).numFmt = 'yyyy-mm-dd hh:mm:ss';
  const wide = book.addWorksheet('Summary');
  // Totals differ by group (B has 3 transfer words), so headers name both.
  const outOf = (key: 'taught' | 'transfer' | 'control') => categoryTotal('A', key) === categoryTotal('B', key) ? `/${categoryTotal('A', key)}` : `(A /${categoryTotal('A', key)}, B /${categoryTotal('B', key)})`;
  wide.addRow(['Participant', 'Group', 'Complete', `Pre taught ${outOf('taught')}`, `Post taught ${outOf('taught')}`, 'Gain taught', `Pre transfer ${outOf('transfer')}`, `Post transfer ${outOf('transfer')}`, 'Gain transfer', `Pre control ${outOf('control')}`, `Post control ${outOf('control')}`, 'Gain control', 'Unscored items', 'Learning minutes', 'Learning started (UTC)', 'Posttest started (UTC)', 'Finished (UTC)',
    `Pre blending /${BLEND_ITEMS.length}`, `Post blending /${BLEND_ITEMS.length}`, 'Gain blending',
    'Pre words attempted', 'Post words attempted', 'Pre words correct', 'Post words correct', 'Pre duration (s)', 'Post duration (s)', 'Pre WCPM', 'Post WCPM', 'Gain WCPM']);
  for (const p of summary.participants) {
    const s = sessions.find(x => x.participant_code === p.participantCode)!;
    const date = (v: string | null) => v ? new Date(v) : '';
    const values=(x:typeof p.taught)=>[x.pre.scored?x.pre.correct:'',x.post.scored?x.post.correct:'',x.pre.scored===x.pre.total&&x.post.scored===x.post.total&&x.pre.total?x.post.correct-x.pre.correct:''];
    wide.addRow([p.participantCode, p.group, p.complete ? 'Yes' : 'No', ...values(p.taught), ...values(p.transfer), ...values(p.control), p.unscored, s.learning_minutes ?? 'Untimed',
      date(s.learning_started_at), date(s.posttest_started_at), date(s.finished_at),
      // Sessions enrolled before blending stay blank rather than showing 0.
      ...(p.blend.pre.total ? values(p.blend) : ['', '', '']),
      // Skipped, missing or unscored readings stay blank rather than showing 0.
      p.fluency.pre?.wordsAttempted ?? '', p.fluency.post?.wordsAttempted ?? '', p.fluency.pre?.wordsCorrect ?? '', p.fluency.post?.wordsCorrect ?? '',
      p.fluency.pre?.durationSeconds ?? '', p.fluency.post?.durationSeconds ?? '', p.fluency.pre?.wcpm ?? '', p.fluency.post?.wcpm ?? '',
      p.fluency.pre?.wcpm != null && p.fluency.post?.wcpm != null ? Math.round((p.fluency.post.wcpm - p.fluency.pre.wcpm) * 10) / 10 : '']);
  }
  for (const col of [15, 16, 17]) wide.getColumn(col).numFmt = 'yyyy-mm-dd hh:mm:ss';
  const notes = book.addWorksheet('Notes');
  notes.addRow(['Item', 'Detail']);
  notes.addRow(['Instrument version', STUDY_VERSION]);
  notes.addRow(['Book use','Free exploration with normal progression. No books are assigned. Word-set labels are instrument metadata, not exposure evidence.']);
  for (const g of ['A', 'B'] as const) {
    notes.addRow([`Group ${g} taught words`, STUDY_WORDS[g].taught.join(', ')]);
    notes.addRow([`Group ${g} transfer words`, STUDY_WORDS[g].transfer.join(', ')]);
  }
  notes.addRow(['Blending items', `${BLEND_ITEMS.join(', ')} (Part 2: Milo says each sound, the learner says the whole word; practice item mat is not recorded)`]);
  notes.addRow(['One-minute reading', `${FLUENCY_WORDS.join(', ')} (Part 3: the same 40 words in a new random order each test, read aloud in one recording of up to 60 s). Teacher-scored only. Words attempted = position of the last word reached; words correct = attempted minus words marked wrong; WCPM = words correct / (duration s / 60), 1 decimal.`]);
  notes.addRow(['Categories', 'Historical word-set labels, not evidence of exposure. Use recorded book and stop events to describe actual activity.']);
  notes.addRow(['Final score', 'Teacher score when available, otherwise the app result (matched = 1, different = 0). Skipped = 0. Unclear or unscored items are blank.']);
  notes.addRow(['Teacher scoring', 'Manual review: staff may score in participant view or the blind scoring queue.']);
  notes.addRow(['App/teacher agreement', summary.agreement.percent === null ? 'Not yet available' : `${summary.agreement.percent}% of ${summary.agreement.compared} recordings`]);
  notes.addRow(['Privacy', 'Participants are identified by code only. Keep the code-to-name list separately and within the authorized research team.']);
  for (const tab of [long, wide, notes]) {
    tab.views = [{ state: 'frozen', ySplit: 1 }];
    tab.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tab.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087F73' } };
    tab.columns.forEach(col => { col.width = tab === notes ? 60 : 16; });
  }
  if (smart) smartGoalsSheet(book, smart);
  return book;
}

const STATUS_FILL: Partial<Record<GoalRow['status'], string>> = { 'Met': 'FFC6EFCE', 'Not met': 'FFFFC7CE', 'Pending': 'FFFFEB9C', 'Not measured': 'FFD9D9D9' };

/** SMART Goals sheet: summary block, Section A and B goal tables, paired statistics, and the interpretation footer. */
function smartGoalsSheet(book: ExcelJS.Workbook, smart: SmartGoalsReport) {
  const sheet = book.addWorksheet('SMART Goals');
  const round = (x: number | null | undefined, places: number) => x === null || x === undefined ? '' : Math.round(x * 10 ** places) / 10 ** places;
  const header = (values: string[]) => {
    const row = sheet.addRow(values);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087F73' } }; });
  };
  const title = (text: string) => { sheet.addRow([text]).font = { bold: true }; };
  sheet.addRow(['Export date', manilaDate(new Date().toISOString())]);
  sheet.addRow(['Instrument version', STUDY_VERSION]);
  sheet.addRow(['Completed learners', smart.completed]);
  sheet.addRow(['Unscored items', smart.unscored]);
  sheet.addRow(['Excluded codes', smart.excludedCodes.join(', ') || 'None']);
  sheet.addRow(['Targets', 'Targets fixed before data collection.']);
  for (const [label, rows] of [['Section A: Doc 05 success criteria', smart.sectionA], ['Section B: Proposal SMART objectives (GO1-GO3)', smart.sectionB]] as const) {
    sheet.addRow([]);
    title(label);
    header(['Objective', 'Indicator', 'Formula', 'Target', 'Result', 'N', 'Status', 'Note']);
    for (const goal of rows) {
      const row = sheet.addRow([goal.objective, goal.indicator, goal.formula, goal.target, goal.result, goal.n ?? '', goal.status, goal.note]);
      const fill = STATUS_FILL[goal.status];
      if (fill) row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    }
  }
  sheet.addRow([]);
  title('Paired statistics (completed learners with both values; Wilcoxon normal approximation without continuity correction, r = z / sqrt(non-zero pairs))');
  header(['Measure', 'N', 'Pre mean', 'Pre median', 'Post mean', 'Post median', 'Mean difference', 'Median difference', 'Min difference', 'Max difference',
    'Positive', 'Zero', 'Negative', 'Wilcoxon W+', 'Wilcoxon z', 'Wilcoxon p (two-sided)', 'Effect size r', 't', 'df', 't-test p (two-sided)', 'Cohen\'s dz', 'Note']);
  for (const p of smart.paired) {
    sheet.addRow([p.measure, p.n, round(p.pre.mean, 1), round(p.pre.median, 1), round(p.post.mean, 1), round(p.post.median, 1),
      round(p.difference.mean, 1), round(p.difference.median, 1), round(p.difference.min, 1), round(p.difference.max, 1), p.positive, p.zero, p.negative,
      round(p.wilcoxon?.w, 1), round(p.wilcoxon?.z, 3), round(p.wilcoxon?.p, 4), round(p.wilcoxon?.r, 3),
      round(p.tTest?.t, 3), p.tTest?.df ?? '', round(p.tTest?.p, 4), round(p.tTest?.dz, 3), p.note]);
  }
  sheet.addRow([]);
  sheet.addRow([FOOTER]).font = { italic: true };
  [28, 40, 40, 18, 44, 8, 14, 50].forEach((width, i) => { sheet.getColumn(i + 1).width = width; });
  sheet.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; });
}

export async function exportStudy(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { sessions, responses, fluency, summary } = await loadResults();
    const workbook = studyWorkbook(sessions, responses, summary, fluency, await loadSmartGoals(sessions, responses, fluency));
    const metrics=workbook.addWorksheet('Pathway indicators'), days=workbook.addWorksheet('Usage timeline'), checks=workbook.addWorksheet('Review checks'), cohort=workbook.addWorksheet('Cohort pathway');
    metrics.addRow(['Participant','Indicator','Numerator','Denominator','Result']); days.addRow(['Participant','Manila date','UTC','Event','Book','Stop','Task']); checks.addRow(['Participant','Phase','Task counts checked','Skips noted','Exceptions logged','Initials']);
    const counts=new Map<string,{assigned:number;started:number;finished:number}>(); let resumed=0;
    for(const s of sessions){
      const events=await eventsFor(s.user_id), report=pathway(events);
      for(const [key,r] of Object.entries(report.rates))metrics.addRow([s.participant_code,key,r.n,r.d,r.value??'N/A']);
      if(report.resumed)resumed++;
      for(const b of CHAPTER_IDS){const c=counts.get(b)??{assigned:0,started:0,finished:0};c.assigned++;if(report.starts.includes(b)){c.started++;if(report.ends.includes(b))c.finished++;}counts.set(b,c);}
      for(const e of events)days.addRow([s.participant_code,dayOf(e.occurred_at),e.occurred_at,e.kind,e.book,e.stop,e.task]);
      for(const [phase,value] of [['pretest',s.pre_check],['posttest',s.post_check]] as const){const c=value as {counts:boolean;skips:boolean;exceptions:boolean;initials:string}|null;checks.addRow([s.participant_code,phase,c?.counts,c?.skips,c?.exceptions,c?.initials]);}
    }
    cohort.addRow(['Book','Enrolled','Started','Completed among starters','Start %','Completion % among starters']);
    for(const [id,c] of counts)cohort.addRow([id,c.assigned,c.started,c.finished,100*c.started/c.assigned,c.started?100*c.finished/c.started:'N/A']);
    cohort.addRow(['Home continuation',resumed,'of',sessions.length,sessions.length?100*resumed/sessions.length:'N/A']);
    const buffer=await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="readlr-study-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) { fail(res, error, 'The export could not be created.'); }
}
