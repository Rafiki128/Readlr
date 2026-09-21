import { supabase, unwrap } from '../db.js';
export interface Learner { id: number; user_id: number; name: string; avatar: string; grade: number; created_at: string; updated_at: string; }
export async function createLearner(userId: number, name: string, avatar = '🦊'): Promise<Learner> { return unwrap(await supabase.from('learner_profiles').insert({ user_id: userId, name, avatar }).select().single()) as Learner; }
export async function getLearnerById(id: number): Promise<Learner> { return unwrap(await supabase.from('learner_profiles').select('*').eq('id', id).maybeSingle()) as Learner; }
export async function getLearnerByUserId(userId: number): Promise<Learner> { return unwrap(await supabase.from('learner_profiles').select('*').eq('user_id', userId).maybeSingle()) as Learner; }
export async function updateLearner(id: number, updates: Partial<Learner>): Promise<void> { const { id: _id, created_at: _created, user_id: _user, ...safeUpdates } = updates; if (Object.keys(safeUpdates).length) unwrap(await supabase.from('learner_profiles').update(safeUpdates).eq('id', id)); }
export async function getAllLearners(): Promise<Learner[]> { return unwrap(await supabase.from('learner_profiles').select('*')) as Learner[]; }
