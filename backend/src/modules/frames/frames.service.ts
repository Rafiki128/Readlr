/**
 * Frames Service
 * Business logic for avatar frame unlocking and equipping
 */

import {
  getAllFrames,
  getUnlockedFrameIds,
  getFramesByUnlockStage,
  unlockFrame as unlockFrameDB,
  Frame,
} from '../../database/models/frame.model.js';
import { getAllStages } from '../../database/models/stage.model.js';
import { updateLearner } from '../../database/models/learner.model.js';
import { FrameResponse } from './frames.types.js';

export async function getFramesForUser(
  userId: number,
  equippedFrameId: number | null
): Promise<FrameResponse[]> {
  const [frames, unlockedIds, stages] = await Promise.all([
    getAllFrames(),
    getUnlockedFrameIds(userId),
    getAllStages(),
  ]);
  const unlockedSet = new Set(unlockedIds);

  // Default frames (no unlock_stage_id) are free for everyone; grant them lazily
  // for users who registered after the frame was seeded.
  const missingDefaults = frames.filter((f) => f.unlock_stage_id === null && !unlockedSet.has(f.id));
  if (missingDefaults.length > 0) {
    await Promise.all(missingDefaults.map((f) => unlockFrameDB(userId, f.id)));
    missingDefaults.forEach((f) => unlockedSet.add(f.id));
  }

  const stageById = new Map(stages.map((s) => [s.id, s]));
  return frames.map((frame) => {
    const stage = frame.unlock_stage_id ? stageById.get(frame.unlock_stage_id) : undefined;
    return {
      id: frame.id,
      asset_key: frame.asset_key,
      name: frame.name,
      unlock_stage_id: frame.unlock_stage_id,
      unlock_stage_number: stage?.stage_number ?? null,
      unlock_stage_title: stage?.title ?? null,
      design_notes: frame.design_notes,
      unlocked: unlockedSet.has(frame.id),
      equipped: frame.id === equippedFrameId,
    };
  });
}

export async function equipFrame(learnerId: number, userId: number, frameId: number): Promise<void> {
  const unlockedIds = await getUnlockedFrameIds(userId);
  if (!unlockedIds.includes(frameId)) {
    throw new Error('Frame is not unlocked');
  }
  await updateLearner(learnerId, { equipped_frame_id: frameId });
}

/** Unlocks every frame tied to a stage for a user. Returns only the frames that were newly unlocked. */
export async function unlockFramesForStage(userId: number, stageId: number): Promise<Frame[]> {
  const frames = await getFramesByUnlockStage(stageId);
  const isNew = await Promise.all(frames.map((frame) => unlockFrameDB(userId, frame.id)));
  return frames.filter((_, i) => isNew[i]);
}
