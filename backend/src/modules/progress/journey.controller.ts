import type { Request, Response } from 'express';
import { supabase, unwrap } from '../../database/db.js';
import { getLearnerByUserId } from '../learner/learner.service.js';
import { unlockFramesForStage } from '../frames/frames.service.js';

export async function getReadingJourneys(req: Request, res: Response) {
  try {
    const learner = await getLearnerByUserId((req as any).userId);
    const journeys = unwrap(await supabase.from('reading_journeys').select('stage_number,completed,jewels').eq('learner_id', learner.id));
    res.json({ journeys });
  } catch (error) {
    console.error('Reading journey load failed:', error);
    res.status(500).json({ error: 'Could not load reading journeys' });
  }
}

export async function syncReadingJourney(req: Request, res: Response) {
  const stage = Number(req.params.stage);
  const { completed, jewels = 0 } = req.body;
  if (![2,3].includes(stage) || !Number.isInteger(completed) || completed < 0 || completed > 20 ||
      !Number.isInteger(jewels) || jewels < 0 || jewels > 3 || (stage === 2 && jewels !== 0) ||
      (stage === 3 && ((completed < 19 && jewels !== 0) || (completed === 20 && jewels !== 3) || (completed < 20 && jewels === 3)))) {
    res.status(400).json({ error: 'Invalid reading journey' }); return;
  }
  try {
    const userId = (req as any).userId;
    const learner = await getLearnerByUserId(userId);
    const rows = unwrap(await supabase.rpc('sync_reading_journey', { p_learner: learner.id, p_stage: stage, p_completed: completed, p_jewels: jewels }));
    const journey = rows[0];
    // Reconcile on every completed sync: frame inserts are idempotent, including after a failed request.
    let unlocked_frames: unknown[] = [];
    if (journey.completed === 20) {
      const stageRow = unwrap(await supabase.from('stages').select('id').eq('stage_number', stage).single());
      if (!stageRow) throw new Error('Stage not found');
      unlocked_frames = await unlockFramesForStage(userId, stageRow.id);
    }
    res.json({ journey, unlocked_frames });
  } catch (error) {
    console.error('Reading journey sync failed:', error);
    res.status(500).json({ error: 'Could not sync reading journey' });
  }
}
