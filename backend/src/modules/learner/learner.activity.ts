import type { Request, Response } from 'express';
import { supabase } from '../../database/db.js';
import { CHAPTER_IDS } from '../evidence/reading-catalog.js';
import { createLimiter } from '../../middleware/rateLimit.js';
import { pathway } from '../study/pathway.js';

const kinds = new Set(['screen-view','book-start','resume','book-complete','stop-start','stop-complete','task-start','retry','hint','replay','mic-free','skip','incident']);
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const limit = createLimiter(400, 60_000, 'Too many activity events.');
export const ACTIVITY_LIMIT = 500;

export function parseLearnerActivity(body: unknown, now: number) {
  if (!body || typeof body !== 'object') return null;
  const { id, kind, book, stop, task, occurred_at } = body as Record<string, unknown>;
  if (typeof id !== 'string' || !uuid.test(id)
      || typeof kind !== 'string' || !kinds.has(kind) || typeof book !== 'string'
      || typeof stop !== 'string' || !/^[a-z0-9-]{0,50}$/i.test(stop)
      || (kind === 'screen-view' ? book !== '' || !stop : !CHAPTER_IDS.includes(book))
      || typeof occurred_at !== 'string') return null;
  const when = Date.parse(occurred_at);
  if (!Number.isFinite(when) || when > now + 60_000 || when < now - 7 * 86_400_000) return null;
  return { id, kind, book, stop, task: typeof task === 'string' && uuid.test(task) ? task : '', occurred_at: new Date(when).toISOString() };
}

export async function addLearnerActivity(req: Request, res: Response) {
  const event = parseLearnerActivity(req.body, Date.now());
  if (!event) return res.sendStatus(400);
  const userId = (req as Request & { userId: number }).userId;
  if (limit.hit(String(userId))) return res.sendStatus(429);
  const { error } = await supabase.from('readlr_learner_activity')
    .upsert({ ...event, user_id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  return res.sendStatus(error ? 503 : 204);
}

export async function getLearnerActivity(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) return res.sendStatus(400);
  const { data, error } = await supabase.from('readlr_learner_activity')
    .select('id,kind,book,stop,task,occurred_at').eq('user_id', userId)
    .order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(ACTIVITY_LIMIT);
  if (error) return res.sendStatus(503);
  const rows = data ?? [];
  return res.json({ events: rows.map(({task,...event})=>event), path: pathway(rows), limit: ACTIVITY_LIMIT });
}
