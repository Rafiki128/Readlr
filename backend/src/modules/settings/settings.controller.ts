/**
 * Settings Controller
 * HTTP request handlers for learner settings
 */

import { Request, Response } from 'express';
import { getOrCreateSettings, updateSettings } from './settings.service.js';
import { UpdateSettingsRequest } from './settings.types.js';

const ALLOWED_LANGUAGES = ['Filipino', 'English', 'Cebuano', 'Ilocano'];

/**
 * GET /api/settings/me
 * Get the authenticated learner's settings (created with defaults if missing)
 */
export async function handleGetMySettings(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const settings = await getOrCreateSettings(userId);
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * PUT /api/settings/me
 * Update the authenticated learner's settings
 */
export async function handleUpdateMySettings(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const body = req.body as UpdateSettingsRequest;
    const updates: UpdateSettingsRequest = {};

    if (body.sound_volume !== undefined) {
      const volume = Number(body.sound_volume);
      if (!Number.isInteger(volume) || volume < 0 || volume > 100) {
        return res.status(400).json({ error: 'sound_volume must be an integer between 0 and 100' });
      }
      updates.sound_volume = volume;
    }

    for (const key of ['voice_feedback', 'daily_reminders', 'achievement_alerts', 'dark_mode'] as const) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'boolean') {
          return res.status(400).json({ error: `${key} must be a boolean` });
        }
        updates[key] = body[key];
      }
    }

    if (body.language !== undefined) {
      if (!ALLOWED_LANGUAGES.includes(body.language)) {
        return res.status(400).json({ error: `language must be one of: ${ALLOWED_LANGUAGES.join(', ')}` });
      }
      updates.language = body.language;
    }

    const settings = await updateSettings(userId, updates);
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}
