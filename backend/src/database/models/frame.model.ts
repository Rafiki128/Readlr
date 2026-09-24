import { supabase, unwrap } from '../db.js';

export interface Frame {
  id: number;
  asset_key: string;
  name: string;
  unlock_stage_id: number | null;
  design_notes: string | null;
  sort_order: number;
  created_at: string;
}

export async function getAllFrames(): Promise<Frame[]> {
  return unwrap(await supabase.from('frames').select('*').order('sort_order')) as Frame[];
}

export async function getFrameById(id: number): Promise<Frame | undefined> {
  return unwrap(await supabase.from('frames').select('*').eq('id', id).maybeSingle()) as Frame | undefined;
}

export async function getFramesByUnlockStage(stageId: number): Promise<Frame[]> {
  return unwrap(await supabase.from('frames').select('*').eq('unlock_stage_id', stageId).order('sort_order')) as Frame[];
}

export async function getUnlockedFrameIds(userId: number): Promise<number[]> {
  const rows = unwrap(
    await supabase.from('user_unlocked_frames').select('frame_id').eq('user_id', userId)
  ) as { frame_id: number }[];
  return rows.map((r) => r.frame_id);
}

/** Inserts the unlock record if missing. Returns true only when a new row was created. */
export async function unlockFrame(userId: number, frameId: number): Promise<boolean> {
  const rows = unwrap(
    await supabase
      .from('user_unlocked_frames')
      .upsert({ user_id: userId, frame_id: frameId }, { onConflict: 'user_id,frame_id', ignoreDuplicates: true })
      .select()
  ) as unknown[];
  return rows.length > 0;
}
