/**
 * Settings Module Types
 */

export interface SettingsResponse {
  milo_voice: 'milo' | 'classic';
  sound_volume: number;
  voice_feedback: boolean;
  daily_reminders: boolean;
  achievement_alerts: boolean;
  dark_mode: boolean;
  language: string;
}

export interface UpdateSettingsRequest {
  milo_voice?: 'milo' | 'classic';
  sound_volume?: number;
  voice_feedback?: boolean;
  daily_reminders?: boolean;
  achievement_alerts?: boolean;
  dark_mode?: boolean;
  language?: string;
}
