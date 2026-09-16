import { supabase, unwrap } from '../db.js';
export interface Session { id: number; learner_id: number; level_id: number; stage_id: number; started_at: string; completed_at: string | null; status: 'in_progress' | 'completed' | 'abandoned'; }
export async function createSession(learnerId: number, levelId: number, stageId: number): Promise<Session> { return unwrap(await supabase.from('sessions').insert({ learner_id: learnerId, level_id: levelId, stage_id: stageId }).select().single()) as Session; }
export async function getSessionById(id: number): Promise<Session> { return unwrap(await supabase.from('sessions').select('*').eq('id', id).maybeSingle()) as Session; }
export async function getLearnerSessions(learnerId: number): Promise<Session[]> { return unwrap(await supabase.from('sessions').select('*').eq('learner_id', learnerId).order('started_at', { ascending: false })) as Session[]; }
async function setSessionStatus(id: number, status: Session['status']): Promise<void> { unwrap(await supabase.from('sessions').update({ status, completed_at: new Date().toISOString() }).eq('id', id)); }
export const completeSession = (id: number) => setSessionStatus(id, 'completed');
export const abandonSession = (id: number) => setSessionStatus(id, 'abandoned');
