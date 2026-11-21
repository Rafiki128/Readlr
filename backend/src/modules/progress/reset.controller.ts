import type { Request, Response } from 'express';
import { supabase, unwrap } from '../../database/db.js';
import { getLearnerByUserId } from '../learner/learner.service.js';
import { resetTargets, STUDY_CLASS_BLOCKED, STUDY_RESET_BLOCKED, STUDY_SKIPPED } from '../study/study-reset-guard.js';

export async function getResetState(req: Request, res: Response) {
  try {
    const learner = await getLearnerByUserId((req as any).userId);
    const stages = unwrap(await supabase.from('learner_stage_state')
      .select('stage_number,epoch,earned_completed').eq('learner_id', learner.id));
    res.json({ stages });
  } catch { res.status(503).json({ error: 'Progress reset setup is unavailable. Check database migrations.' }); }
}

export async function resetProgress(req: Request, res: Response) {
  const { target, confirmation, scope, chapter, stop } = req.body;
  if (scope !== undefined && !['reading-checkpoints', 'learning-progress', 'book', 'challenge'].includes(scope)) { res.status(400).json({message:'Choose a valid restart scope.'}); return; }
  if (['book','challenge'].includes(scope) && (typeof chapter !== 'string' || !chapter)) {
    res.status(400).json({ message: 'Select a book to reset.' }); return;
  }
  if (scope === 'challenge' && (typeof stop !== 'string' || !stop)) {
    res.status(400).json({ message: 'Select a challenge or stop to reset.' }); return;
  }
  if (['book','challenge'].includes(scope)) {
    if (!(target === 'class' || (Number.isInteger(target) && target > 0)) || confirmation !== 'RESET') {
      res.status(400).json({ message: 'Select the learner or class and type RESET.' }); return;
    }
  }
  const stages = scope === 'reading-checkpoints' ? [3] : scope === 'learning-progress' ? [1,2,3] : req.body.stages;
  if (!['book','challenge'].includes(scope) && (!(target === 'class' || (Number.isInteger(target) && target > 0)) ||
      !Array.isArray(stages) || stages.length < 1 || stages.length > 3 ||
      stages.some(s => ![1,2,3].includes(s)) || new Set(stages).size !== stages.length || confirmation !== 'RESET')) {
    res.status(400).json({ message: 'Select the learner or class, select stages, and type RESET.' }); return;
  }
  try {
    const targets = await resetTargets(target);
    if (!targets.length) { res.status(409).json({ message: target === 'class' ? STUDY_CLASS_BLOCKED : STUDY_RESET_BLOCKED }); return; }
    const skipped = target === 'class' && targets[0] !== null ? STUDY_SKIPPED : '';
    // Resets each remaining target in turn; a class without study learners stays one call.
    const run = async (name: string, args: object) => {
      let total = 0;
      for (const t of targets) {
        const n = unwrap(await supabase.rpc(name, { ...args, p_target: t }));
        if (!Number.isInteger(n) || n < 0) throw new Error('Reset returned an invalid learner count');
        total += n;
      }
      return total;
    };
    if (scope === 'book' || scope === 'challenge') {
      const affected = await run('reset_reading_progress_granular', {
        p_actor: (req as any).userId,
        p_scope: scope, p_chapter: chapter, p_stop: scope === 'challenge' ? stop : null,
      });
      if (typeof affected !== 'number' || !Number.isInteger(affected) || affected < 0) throw new Error('Reset returned an invalid learner count');
      if (affected === 0) { res.status(404).json({ message: 'No matching learner profile was found. No progress was reset.' }); return; }
      const chapterName = chapter;
      const message = scope === 'book'
        ? `The ${chapterName} book restarted for ${affected} learner(s). Other books and rewards stay saved.`
        : `${stop} restarted in ${chapterName} for ${affected} learner(s). Other challenges stay saved.`;
      res.json({ affected, message: message + skipped }); return;
    }
    const affected = await run('reset_learning_progress', {
      p_actor: (req as any).userId, p_stages: stages,
    });
    if (typeof affected !== 'number' || !Number.isInteger(affected) || affected < 0) {
      throw new Error('Reset returned an invalid learner count');
    }
    if (affected === 0) {
      res.status(404).json({ message: 'No matching learner profile was found. No progress was reset.' }); return;
    }
    const message = scope === 'reading-checkpoints'
      ? `Book checkpoints restarted for ${affected} learner(s). Guided practice and access overrides stay saved.`
      : scope === 'learning-progress'
        ? `All gameplay levels, completed book stops, and book checkpoints restarted for ${affected} learner(s). Activity details, rewards, and access settings stay saved.`
        : `Reset saved for ${affected} learner(s). Earned rewards are preserved.`;
    res.json({ affected, message: message + skipped });
  } catch (error) {
    console.error('Progress reset failed:', error);
    res.status(503).json({ message: 'Reset was not confirmed. Check the reset migration and refresh progress before retrying.' });
  }
}
