/**
 * Learner Controller
 * HTTP request handlers for learner operations
 */

import { Request, Response } from 'express';
import {
  createLearner,
  getLearnerById,
  getLearnerByUserId,
  updateLearner,
} from './learner.service.js';

const MAX_NAME_LENGTH = 30;
const AVATAR_OPTIONS = [
  '🦊', '🐻', '🐼', '🐨', '🦁', '🐯',
  '🐸', '🐧', '🦋', '🐝', '🦄', '🐙',
  '🐳', '🦕', '🐢', '🐬',
];

/**
 * POST /api/learner/profile
 * Create or update learner profile for authenticated user
 */
export async function handleSaveProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { name, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Check if learner profile exists
    try {
      const existing = await getLearnerByUserId(userId);
      // Update existing profile
      const learner = await updateLearner(existing.id, { name, avatar });
      return res.json({ success: true, learner });
    } catch {
      // Create new profile
      const learner = await createLearner({ user_id: userId, name, avatar });
      return res.status(201).json({ success: true, learner });
    }
  } catch (error) {
    console.error('Error saving learner profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
}

/**
 * POST /api/learners
 * Create a new learner profile
 */
export async function handleCreateLearner(req: Request, res: Response) {
  try {
    const { user_id, name, avatar } = req.body;

    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required' });
    }

    const learner = await createLearner({ user_id, name, avatar });
    res.status(201).json(learner);
  } catch (error) {
    console.error('Error creating learner:', error);
    res.status(500).json({ error: 'Failed to create learner' });
  }
}

/**
 * GET /api/learners/:id
 * Get learner profile by ID
 */
export async function handleGetLearnerById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const learner = await getLearnerById(parseInt(id));
    res.json(learner);
  } catch (error) {
    console.error('Error fetching learner:', error);
    res.status(404).json({ error: 'Learner not found' });
  }
}

/**
 * GET /api/learners/user/:userId
 * Get learner profile by user ID
 */
export async function handleGetLearnerByUserId(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const learner = await getLearnerByUserId(parseInt(userId));
    res.json(learner);
  } catch (error) {
    console.error('Error fetching learner:', error);
    res.status(404).json({ error: 'Learner profile not found' });
  }
}

/**
 * PUT /api/learners/:id
 * Update learner profile
 */
export async function handleUpdateLearner(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const learner = await updateLearner(parseInt(id), updates);
    res.json(learner);
  } catch (error) {
    console.error('Error updating learner:', error);
    res.status(500).json({ error: 'Failed to update learner' });
  }
}

/**
 * GET /api/learner/me
 * Get the authenticated learner's own profile
 */
export async function handleGetMyProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const learner = await getLearnerByUserId(userId);
    return res.json({ success: true, learner });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(404).json({ error: 'Learner profile not found' });
  }
}

/**
 * PUT /api/learner/me
 * Update the authenticated learner's own profile (name and avatar only)
 */
export async function handleUpdateMyProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { name, avatar } = req.body;

    const updates: { name?: string; avatar?: string } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      const trimmed = name.trim();
      if (trimmed.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `name must be ${MAX_NAME_LENGTH} characters or fewer` });
      }
      updates.name = trimmed;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || !AVATAR_OPTIONS.includes(avatar)) {
        return res.status(400).json({ error: 'avatar must be one of the supported options' });
      }
      updates.avatar = avatar;
    }

    const existing = await getLearnerByUserId(userId);
    const updated = await updateLearner(existing.id, updates);

    return res.json({ success: true, learner: updated });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
