/**
 * Global Type Definitions
 */

export type Screen =
  | "role-select"
  | "learner-profile"
  | "welcome"
  | "stage-selection"
  | "story-scene"
  | "level-map"
  | "game"
  | "sticker-book"
  | "progress"
  | "phoneme-bank"
  | "teacher-dashboard"
  | "settings"
  | "achievements"
  | "help"
  | "diagrams";

export type UserRole = "learner" | "teacher" | "admin" | null;

export interface LearnerState {
  name: string;
  avatar: string;
  currentStage: number;
  currentLevel: number;
  completedByStage: Record<number, number>;
  levelScore: number;
}

export interface AppState {
  currentScreen: Screen;
  userRole: UserRole;
  learner: LearnerState;
}
