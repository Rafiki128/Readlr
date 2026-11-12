import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { supabase } from '../../database/db.js';
import { getLearnerByUserId } from '../learner/learner.service.js';
import { effectivePolicy } from '../admin/classroom.service.js';
import { stagePermitted } from '../admin/classroom.policy.js';
import { getLearningCampAccess } from './camp-access.js';
import { READING_VERSION, READING_MEDIA, CHAPTER_IDS, checkpointWords, chapterAvailable } from './reading-catalog.js';
import { recognizeCvcWord } from '../audio/audio.service.js';
import { studyReadingAccess } from '../study/study.service.js';

interface Session {
  id: string; learner_id: number; epoch: number; chapter_id: string; words: string[];
  results: Record<string, string>; passed: boolean; expires_at: string;
}
function unwrap<T>(result:{data:T|null;error:{message:string}|null}):T {
  if(result.error)throw new Error(result.error.message);
  return result.data as T;
}
class ReadingError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(res: Response, error: unknown) {
  res.status(error instanceof ReadingError ? error.status : 503).json({error: error instanceof ReadingError ? error.message : 'Your checkpoint could not be saved. Please reconnect and retry.'});
}
async function context(req: Request) {
  const userId = (req as AuthenticatedRequest).userId!;
  const access = await getLearningCampAccess(userId);
  if (!access.enabled || access.curriculumVersion !== READING_VERSION || access.mediaManifestVersion !== READING_MEDIA)
    throw new ReadingError(403, 'This reading journey is not released for your account.');
  // A running validation study limits the journey to the learner's assigned books.
  const [{ policy }, study] = await Promise.all([effectivePolicy(userId), studyReadingAccess(userId)]);
  if (study && 'blocked' in study) throw new ReadingError(403, 'Finish your word game first.');
  // During study learning time the child plays independently, even while the teacher
  // pauses the rest of the class to check pretest recordings.
  if (!study && !stagePermitted(policy, 3)) throw new ReadingError(403, 'Your teacher has paused access to the kingdom.');
  const learner = await getLearnerByUserId(userId);
  unwrap(await supabase.from('learner_stage_state').upsert({learner_id:learner.id,stage_number:3}, {onConflict:'learner_id,stage_number',ignoreDuplicates:true}));
  const state = unwrap<{epoch:number}>(await supabase.from('learner_stage_state').select('epoch').eq('learner_id',learner.id).eq('stage_number',3).single());
  if (study) return {learnerId:learner.id,epoch:state.epoch,unlockThrough:0,openStops:[] as string[],allowed:study.books,
    openChallenges:study.books.map(id=>CHAPTER_IDS.indexOf(id)+1).filter(book=>book>1)};
  return {learnerId:learner.id,epoch:state.epoch,unlockThrough:policy.readingUnlockThrough ?? 0,openStops:policy.readingOpenStops ?? [],openChallenges:policy.readingOpenChallenges ?? [],allowed:null as string[]|null};
}
type ReadingContext = Awaited<ReturnType<typeof context>>;
function bookOpen(c:ReadingContext,chapter:string,done:string[]) {
  if (c.allowed && !c.allowed.includes(chapter)) return false;
  return chapterAvailable(chapter,done,c.unlockThrough,c.openChallenges) || c.openStops.includes(`${chapter}:check`);
}
async function completed(learnerId: number, epoch: number) {
  const ids=new Set<string>();
  // Paginate repeat checkpoints so the database row cap cannot hide later chapters.
  for(let start=0;;start+=500){
    const rows = unwrap<Array<{chapter_id:string}>>(await supabase.from('reading_checkpoints').select('chapter_id')
      .eq('learner_id',learnerId).eq('epoch',epoch).eq('curriculum_version',READING_VERSION).eq('passed',true).order('id').range(start,start+499));
    rows.forEach(row=>ids.add(row.chapter_id));
    if(rows.length<500||ids.size===CHAPTER_IDS.length)return [...ids];
  }
}
export async function readingProgress(req: Request, res: Response) {
  try {
    const c = await context(req), done = await completed(c.learnerId,c.epoch);
    res.json({completed:done,available:CHAPTER_IDS.filter(id=>(!c.allowed||c.allowed.includes(id))&&(chapterAvailable(id,done,c.unlockThrough,c.openChallenges)||c.openStops.some(stop=>stop.startsWith(`${id}:`)))),openStops:c.openStops,openChallenges:c.openChallenges,epoch:c.epoch});
  } catch (error) { fail(res,error); }
}
export async function startReadingCheckpoint(req: Request, res: Response) {
  try {
    const c = await context(req), chapter = req.body.chapter;
    if (typeof chapter !== 'string' || !CHAPTER_IDS.includes(chapter)) throw new ReadingError(400,'Choose a valid chapter.');
    const done = await completed(c.learnerId,c.epoch);
    if (!bookOpen(c,chapter,done)) throw new ReadingError(403,'Complete the previous checkpoint first.');
    // Stage-row lock makes refreshes and simultaneous devices reuse one active round.
    const row = unwrap<Session>(await supabase.rpc('start_reading_checkpoint',{p_learner:c.learnerId,p_epoch:c.epoch,
      p_chapter:chapter,p_words:checkpointWords(chapter),p_version:READING_VERSION,p_media:READING_MEDIA}));
    res.json(row);
  } catch (error) { fail(res,error); }
}
async function itemContext(req: Request) {
  const c = await context(req), id = req.params.sessionId, item = Number(req.params.item);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(item) || item<0 || item>7) throw new ReadingError(400,'Invalid checkpoint item.');
  const row = unwrap<Session|null>(await supabase.from('reading_checkpoints').select('*').eq('id',id).eq('learner_id',c.learnerId).maybeSingle());
  if (!row || row.epoch!==c.epoch || item>=row.words.length) throw new ReadingError(409,'This checkpoint is no longer active. Return to the kingdom.');
  if (Date.parse(row.expires_at)<Date.now()) throw new ReadingError(409,'This checkpoint has expired. Return to the kingdom for a new round.');
  const done=await completed(c.learnerId,c.epoch);
  if (!bookOpen(c,row.chapter_id,done)) throw new ReadingError(403,'This chapter is no longer available.');
  return {c,row,item};
}
async function store(learnerId:number,id:string,item:number,result:string) {
  return unwrap<Session>(await supabase.rpc('record_reading_checkpoint',{p_learner:learnerId,p_session:id,p_item:item,p_result:result}));
}
export async function recognizeReadingCheckpoint(req: Request,res: Response) {
  try {
    const {c,row,item}=await itemContext(req);
    if (['matched','different','skipped'].includes(row.results[item])) {res.json(row);return;}
    if (!req.file?.size) throw new ReadingError(400,'A recording is required.');
    let result:Awaited<ReturnType<typeof recognizeCvcWord>>;
    try {result=await recognizeCvcWord(req.file,row.words[item]);}
    catch {
      await store(c.learnerId,row.id,item,'unavailable');
      throw new ReadingError(503,'Word checking is unavailable. Your recording was not scored. Please retry.');
    }
    res.json(await store(c.learnerId,row.id,item,result.status));
  } catch(error) {fail(res,error);}
}
export async function retryReadingCheckpoint(req: Request,res: Response) {
  try {
    const {c,row,item}=await itemContext(req);
    if (!req.file?.size) throw new ReadingError(400,'A recording is required.');
    if(!['different','uncertain','unavailable'].includes(row.results[item])){res.json(row);return;}
    let result:Awaited<ReturnType<typeof recognizeCvcWord>>;
    try { result=await recognizeCvcWord(req.file,row.words[item]); }
    catch { throw new ReadingError(503,'Word checking is unavailable. Please retry.'); }
    res.json(unwrap<Session>(await supabase.rpc('retry_reading_checkpoint',{p_learner:c.learnerId,p_session:row.id,p_item:item,p_result:result.status})));
  } catch(error) { fail(res,error); }
}
export async function skipReadingCheckpoint(req:Request,res:Response) {
  try {const {c,row,item}=await itemContext(req);res.json(await store(c.learnerId,row.id,item,'skipped'));}
  catch(error) {fail(res,error);}
}

export async function recordReadingMeaning(req:Request,res:Response) {
  try {
    const c=await context(req),id=req.params.sessionId,response=req.body.response;
    if(!/^[0-9a-f-]{36}$/i.test(id)||!['mat','top','mango','skipped'].includes(response))throw new ReadingError(400,'Choose one picture.');
    const row=unwrap<Session|null>(await supabase.from('reading_checkpoints').select('*').eq('id',id).eq('learner_id',c.learnerId).maybeSingle());
    if(!row||row.epoch!==c.epoch||row.chapter_id!=='gate')throw new ReadingError(409,'This checkpoint is no longer active. Return to the kingdom.');
    const done=await completed(c.learnerId,c.epoch);
    if(!bookOpen(c,row.chapter_id,done))throw new ReadingError(403,'This chapter is no longer available.');
    if(Date.parse(row.expires_at)<Date.now())throw new ReadingError(409,'This checkpoint has expired. Return to the kingdom for a new round.');
    if(['matched','different','skipped'].includes(row.results.meaning)){res.json(row);return;}
    res.json(unwrap<Session>(await supabase.rpc('record_reading_checkpoint_meaning',{p_learner:c.learnerId,p_session:id,p_response:response})));
  } catch(error){fail(res,error);}
}
