import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { supabase, unwrap } from '../../database/db.js';

export const recoveryHash = (value: string) => createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validRequest = (body: any) => uuid.test(body?.id ?? '') && typeof body?.secret === 'string' && /^[0-9a-f]{64}$/.test(body.secret);
const attempts = new Map<string,{count:number;until:number}>();
export function recoveryLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [key,value] of attempts) if (value.until < now) attempts.delete(key);
  const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const item = attempts.get(key) ?? {count:0,until:now+60000};
  if (++item.count > 60 || attempts.size > 10000) { res.status(429).json({message:'Please wait a minute before trying again.'}); return; }
  attempts.set(key,item); next();
}
export async function requestRecovery(req: Request,res: Response) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) { res.status(400).json({message:'Enter a valid email address.'}); return; }
  const id=randomUUID(),secret=randomBytes(32).toString('hex');
  try {
    unwrap(await supabase.rpc('request_password_recovery',{p_email:email,p_id:id,p_hash:recoveryHash(secret)}));
    res.json({id,secret,message:'If this is a learner account, the administrator can review your request. Keep this window available and speak to your administrator.'});
  } catch { res.status(503).json({message:'Recovery is unavailable. Please ask your administrator to check setup.'}); }
}
export async function recoveryStatus(req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  if (!validRequest(req.body)) { res.status(400).json({message:'Invalid recovery request.'}); return; }
  try {
    const row=unwrap(await supabase.from('password_recovery').select('status,expires_at,attempts').eq('id',req.body.id).eq('request_hash',recoveryHash(req.body.secret)).maybeSingle());
    res.json({status:row ? Date.parse(row.expires_at)<=Date.now() || row.attempts>=5 ? 'expired' : row.status : 'pending'});
  } catch { res.status(503).json({message:'Could not check your request. Try again shortly.'}); }
}
export async function completeRecovery(req:Request,res:Response) {
  const {password,confirmPassword,code}=req.body ?? {};
  if (!validRequest(req.body) || typeof code!=='string' || !/^[0-9a-f]{12}$/i.test(code.trim()) || typeof password!=='string' || password.length<8 || Buffer.byteLength(password)>72 || password!==confirmPassword) {
    res.status(400).json({message:'Enter your 12-character code and matching passwords of at least 8 characters (maximum 72 bytes).'}); return;
  }
  try {
    const success=unwrap(await supabase.rpc('complete_password_recovery',{p_id:req.body.id,p_request:recoveryHash(req.body.secret),p_code:recoveryHash(code.trim().toUpperCase()),p_password:await bcrypt.hash(password,12)}));
    if (!success) { res.status(400).json({message:'The code is incorrect, expired, or already used. Ask your administrator for help.'}); return; }
    res.json({message:'Password updated. Sign in with your new password.'});
  } catch { res.status(503).json({message:'Password change could not be confirmed. Try signing in before retrying.'}); }
}
export async function listRecovery(_req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  try {
    const requests=unwrap(await supabase.from('password_recovery').select('id,user_id,status,created_at,expires_at,users!password_recovery_user_id_fkey(email)').in('status',['pending','approved']).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(200));
    res.json({requests});
  } catch { res.status(503).json({message:'Password requests could not load. Check the recovery migration.'}); }
}
export async function approveRecovery(req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  if (!uuid.test(String(req.params.id)) || !['approve','reject'].includes(req.body?.action) || (req.body.action==='approve' && req.body.verified!==true)) { res.status(400).json({message:'Verify the learner in person before issuing a code.'}); return; }
  const code=randomBytes(6).toString('hex').toUpperCase();
  try {
    const ok=unwrap(await supabase.rpc('approve_password_recovery',{p_actor:(req as any).userId,p_id:req.params.id,p_code:recoveryHash(code),p_reject:req.body.action==='reject'}));
    if (!ok) { res.status(409).json({message:'This request changed or expired. Refresh the list.'}); return; }
    res.json(req.body.action==='approve' ? {code,message:'Give this code only to the verified learner. It expires in 15 minutes and is shown only once.'} : {message:'Request declined.'});
  } catch { res.status(503).json({message:'Request update could not be confirmed. Refresh before retrying.'}); }
}
