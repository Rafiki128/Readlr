import { supabase, unwrap } from '../db.js';

export interface Level { id: number; stage_id: number; level_number: number; title: string; description: string; target_phoneme: string; difficulty: number; created_at: string; }
export async function createLevel(stageId: number, levelNumber: number, title: string, description: string, targetPhoneme: string, difficulty = 1): Promise<Level> {
  return unwrap(await supabase.from('levels').insert({ stage_id: stageId, level_number: levelNumber, title, description, target_phoneme: targetPhoneme, difficulty }).select().single()) as Level;
}
export async function getLevelById(id: number): Promise<Level> { return unwrap(await supabase.from('levels').select('*').eq('id', id).maybeSingle()) as Level; }
export async function getLevelsByStage(stageId: number): Promise<Level[]> { return unwrap(await supabase.from('levels').select('*').eq('stage_id', stageId).order('level_number')) as Level[]; }
export async function getAllLevels(): Promise<Level[]> { return unwrap(await supabase.from('levels').select('*').order('stage_id').order('level_number')) as Level[]; }
