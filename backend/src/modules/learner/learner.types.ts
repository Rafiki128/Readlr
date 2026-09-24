/**
 * Learner Module Types
 */

export interface CreateLearnerRequest {
  user_id: number;
  name: string;
  avatar?: string;
}

export interface LearnerResponse {
  id: number;
  user_id: number;
  name: string;
  avatar: string;
  grade: number;
  equipped_frame_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateLearnerRequest {
  name?: string;
  avatar?: string;
  grade?: number;
  equipped_frame_id?: number;
}
