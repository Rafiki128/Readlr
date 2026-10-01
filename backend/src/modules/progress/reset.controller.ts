import type { Request, Response } from 'express';
import { supabase, unwrap } from '../../database/db.js';
import { getLearnerByUserId } from '../learner/learner.service.js';

export async function getResetState(req: Request, res: Response) {
  try {
    const learner = await getLearnerByUserId((req as any).userId);
    const stages = unwrap(await supabase.from('learner_stage_state')
      .select('stage_number,epoch,earned_completed').eq('learner_id', learner.id));
    res.json({ stages });
  } catch { res.status(503).json({ error: 'Progress reset setup is unavailable. Check database migrations.' }); }
}

export async function resetProgress(req: Request, res: Response) {
  const { target, stages, confirmation } = req.body;
  if (!(target === 'class' || (Number.isInteger(target) && target > 0)) ||
      !Array.isArray(stages) || stages.length < 1 || stages.length > 3 ||
      stages.some(s => ![1,2,3].includes(s)) || new Set(stages).size !== stages.length || confirmation !== 'RESET') {
    res.status(400).json({ message: 'Select the learner or class, select stages, and type RESET.' }); return;
  }
  try {
    const affected = unwrap(await supabase.rpc('reset_learning_progress', {
      p_actor: (req as any).userId, p_target: target === 'class' ? null : target, p_stages: stages,
    }));
    res.json({ affected, message: `Reset saved for ${affected} learner(s). Earned rewards are preserved.` });
  } catch { res.status(503).json({ message: 'Reset was not confirmed. Check the reset migration and refresh progress before retrying.' }); }
}
