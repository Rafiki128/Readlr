import { supabase, unwrap } from '../db.js';

export interface LearnerSettings {
  id: number;
  user_id: number;
  sound_volume: number;
  voice_feedback: boolean;
  daily_reminders: boolean;
  achievement_alerts: boolean;
  dark_mode: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<LearnerSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  sound_volume: 80,
  voice_feedback: true,
  daily_reminders: true,
  achievement_alerts: true,
  dark_mode: false,
  language: 'Filipino',
};

export async function getSettingsByUserId(userId: number): Promise<LearnerSettings | undefined> {
  return unwrap(await supabase.from('learner_settings').select('*').eq('user_id', userId).maybeSingle()) as LearnerSettings | undefined;
}

export async function createSettings(userId: number): Promise<LearnerSettings> {
  return unwrap(await supabase.from('learner_settings').insert({ user_id: userId, ...DEFAULT_SETTINGS }).select().single()) as LearnerSettings;
}

export async function updateSettings(userId: number, updates: Partial<LearnerSettings>): Promise<void> {
  const { id: _id, user_id: _userId, created_at: _createdAt, ...safeUpdates } = updates;
  if (Object.keys(safeUpdates).length) unwrap(await supabase.from('learner_settings').update(safeUpdates).eq('user_id', userId));
}
