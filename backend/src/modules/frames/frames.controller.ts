/**
 * Frames Controller
 * HTTP request handlers for avatar frames
 */

import { Request, Response } from 'express';
import { getFramesForUser, equipFrame } from './frames.service.js';
import { getLearnerByUserId } from '../learner/learner.service.js';

/**
 * GET /api/frames/me
 * List all frames with locked/unlocked/equipped state for the authenticated user
 */
export async function handleGetMyFrames(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const learner = await getLearnerByUserId(userId);
    const frames = await getFramesForUser(userId, learner.equipped_frame_id);
    res.json({ success: true, frames });
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Failed to fetch frames' });
  }
}

/**
 * PUT /api/frames/me/equip
 * Equip an unlocked frame for the authenticated user
 */
export async function handleEquipFrame(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { frame_id } = req.body;

    if (typeof frame_id !== 'number') {
      return res.status(400).json({ error: 'frame_id must be a number' });
    }

    const learner = await getLearnerByUserId(userId);
    await equipFrame(learner.id, userId, frame_id);
    const frames = await getFramesForUser(userId, frame_id);
    res.json({ success: true, frames });
  } catch (error) {
    const isLocked = error instanceof Error && error.message === 'Frame is not unlocked';
    if (!isLocked) console.error('Error equipping frame:', error);
    res.status(isLocked ? 403 : 500).json({ error: isLocked ? 'Frame is not unlocked' : 'Failed to equip frame' });
  }
}
