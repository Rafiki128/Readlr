/**
 * Settings Service
 * Business logic for learner settings
 */

import {
  getSettingsByUserId as getSettingsByUserIdDB,
  createSettings as createSettingsDB,
  updateSettings as updateSettingsDB,
  LearnerSettings,
} from '../../database/models/settings.model.js';
import { SettingsResponse, UpdateSettingsRequest } from './settings.types.js';

function toResponse(settings: LearnerSettings): SettingsResponse {
  return {
    sound_volume: settings.sound_volume,
    voice_feedback: settings.voice_feedback,
    daily_reminders: settings.daily_reminders,
    achievement_alerts: settings.achievement_alerts,
    dark_mode: settings.dark_mode,
    language: settings.language,
  };
}

export async function getOrCreateSettings(userId: number): Promise<SettingsResponse> {
  const existing = await getSettingsByUserIdDB(userId);
  if (existing) return toResponse(existing);
  const created = await createSettingsDB(userId);
  return toResponse(created);
}

export async function updateSettings(userId: number, updates: UpdateSettingsRequest): Promise<SettingsResponse> {
  await getOrCreateSettings(userId); // ensure a row exists before updating
  await updateSettingsDB(userId, updates);
  const settings = await getSettingsByUserIdDB(userId);
  return toResponse(settings as LearnerSettings);
}
