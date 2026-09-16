import { supabase, unwrap } from '../db.js';

export interface Stage { id: number; stage_number: number; title: string; description: string; difficulty: number; created_at: string; }

export async function createStage(stageNumber: number, title: string, description: string, difficulty = 1): Promise<Stage> {
  return unwrap(await supabase.from('stages').insert({ stage_number: stageNumber, title, description, difficulty }).select().single()) as Stage;
}
export async function getStageById(id: number): Promise<Stage> { return unwrap(await supabase.from('stages').select('*').eq('id', id).maybeSingle()) as Stage; }
export async function getStageByNumber(stageNumber: number): Promise<Stage> { return unwrap(await supabase.from('stages').select('*').eq('stage_number', stageNumber).maybeSingle()) as Stage; }
export async function getAllStages(): Promise<Stage[]> { return unwrap(await supabase.from('stages').select('*').order('stage_number')) as Stage[]; }
