/**
 * Frames Module Types
 */

export interface FrameResponse {
  id: number;
  asset_key: string;
  name: string;
  unlock_stage_id: number | null;
  unlock_stage_number: number | null;
  unlock_stage_title: string | null;
  design_notes: string | null;
  unlocked: boolean;
  equipped: boolean;
}
