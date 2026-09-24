/**
 * Progress Module Types
 */

export interface ProgressResponse {
  id: number;
  learner_id: number;
  stage_id: number;
  completed_levels: number;
  total_levels: number;
  completion_percentage: number;
  last_updated: string;
  journey?: unknown;
}

export interface LearnerProgressSummary {
  learner_id: number;
  stages: ProgressResponse[];
  overall_completion_percentage: number;
}
