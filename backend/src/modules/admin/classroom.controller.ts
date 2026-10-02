import type { Request, Response, NextFunction } from 'express';
import { supabase, unwrap } from '../../database/db.js';
import { classroomState, effectivePolicy } from './classroom.service.js';
import { parsePolicy, stagePermitted } from './classroom.policy.js';
import { surveyAssigned } from './survey.controller.js';

export async function getClassroom(_req:Request,res:Response) {
  try { res.json(await classroomState()); }
  catch { res.status(503).json({message:'Classroom controls are unavailable. Check database setup.'}); }
}
export async function saveClassroom(req:Request,res:Response) {
  try {
    const { target, revision, policy: input } = req.body;
    if (!Number.isInteger(revision) || revision < 0 ||
        !(target === 'class' || (Number.isInteger(target) && target > 0))) {
      res.status(400).json({message:'Invalid target or revision'}); return;
    }
    let policy;
    try { policy = input === null && target !== 'class' ? null : parsePolicy(input); }
    catch (error) { res.status(400).json({message:(error as Error).message}); return; }
    const result = unwrap(await supabase.rpc('set_classroom_control', {
      p_actor:(req as any).userId, p_revision:revision,
      p_target:target === 'class' ? null : target, p_policy:policy,
    }));
    if (!result) { res.status(409).json({message:'Controls changed in another admin session. Refresh before saving.'}); return; }
    res.json(await classroomState());
  } catch { res.status(503).json({message:'Could not save classroom controls. No change was confirmed.'}); }
}
export async function getMyClassroom(req:Request,res:Response) {
  try { const state=await effectivePolicy((req as any).userId); res.json({...state,surveyAssigned:await surveyAssigned((req as any).userId).catch(()=>false)}); }
  catch { res.status(503).json({message:'Classroom controls are unavailable'}); }
}
export async function heartbeat(req:Request,res:Response) {
  const {stage,level,screen} = req.body;
  if (!(stage === null || [1,2,3].includes(stage)) ||
      !(level === null || (Number.isInteger(level) && level >= 1 && level <= 20)) ||
      typeof screen !== 'string' || !/^[a-z-]{1,40}$/.test(screen)) {
    res.status(400).json({message:'Invalid activity'}); return;
  }
  try {
    unwrap(await supabase.from('learner_presence').upsert({user_id:(req as any).userId,stage,level,screen,last_seen:new Date().toISOString()}));
    res.json({success:true});
  } catch { res.status(503).json({message:'Could not report activity'}); }
}
export function enforceClassroom(stageFrom:(req:Request)=>number | Promise<number>) {
  return async (req:Request,res:Response,next:NextFunction) => {
    try {
      const {policy} = await effectivePolicy((req as any).userId);
      if (!stagePermitted(policy,await stageFrom(req))) { res.status(403).json({code:'classroom_restricted',error:'This activity is restricted by your classroom administrator.'}); return; }
      next();
    } catch { res.status(503).json({error:'Classroom controls could not be checked. Please reconnect.'}); }
  };
}
