import type { Request, Response } from 'express';
import { supabase } from '../../database/db.js';
import { createLimiter } from '../../middleware/rateLimit.js';

export type LearnerEventType = 'login' | 'app_open' | 'resume';
type ResumeDetail = { stage: number; completed: number };

/** Stores one event; failures are logged and swallowed so they never break the caller. */
export async function recordLearnerEvent(userId: number, eventType: LearnerEventType, detail: ResumeDetail | null = null) {
  try {
    const { error } = await supabase.from('learner_events').insert({ user_id: userId, event_type: eventType, detail });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.warn(`Learner event ${eventType} not saved:`, error instanceof Error ? error.message : error);
  }
}

// Keyed by user, not IP, because a whole classroom usually shares one address.
export const learnerEventLimit = createLimiter(30, 10 * 60_000, 'Too many events.');

// A resume names the restored journey stage (2 or 3) and how many of its stops are complete.
function resumeDetail(value: unknown): ResumeDetail | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { stage, completed, ...rest } = value as Record<string, unknown>;
  if (Object.keys(rest).length || (stage !== 2 && stage !== 3) || !Number.isInteger(completed) || (completed as number) < 0 || (completed as number) > 20) return null;
  return { stage, completed: completed as number };
}

/** POST /api/learner/me/events: the user id always comes from the JWT. */
export async function handleLearnerEvent(req: Request, res: Response) {
  const userId = (req as Request & { userId: number }).userId;
  const { event_type: eventType, detail } = req.body ?? {};
  const resume = eventType === 'resume' ? resumeDetail(detail) : null;
  const valid = eventType === 'app_open' ? detail === undefined || detail === null : eventType === 'resume' && resume !== null;
  if (!valid) { res.status(400).json({ success: false, message: 'Unknown event.' }); return; }
  if (learnerEventLimit.hit(String(userId))) { res.status(429).json({ success: false, message: 'Too many events.' }); return; }
  await recordLearnerEvent(userId, eventType, resume);
  res.status(204).end();
}
