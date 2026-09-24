/**
 * Settings Module Types
 */

export interface SettingsResponse {
  sound_volume: number;
  voice_feedback: boolean;
  daily_reminders: boolean;
  achievement_alerts: boolean;
  dark_mode: boolean;
  language: string;
}

export interface UpdateSettingsRequest {
  sound_volume?: number;
  voice_feedback?: boolean;
  daily_reminders?: boolean;
  achievement_alerts?: boolean;
  dark_mode?: boolean;
  language?: string;
}
