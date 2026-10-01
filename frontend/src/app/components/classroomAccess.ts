import type { ClassroomPolicy } from '../hooks/useClassroom';

export interface ClassroomState {
  policy: ClassroomPolicy;
  overrides: Record<string, ClassroomPolicy>;
  revision: number;
  updated_at: string;
}

export function accessLabel(policy: ClassroomPolicy) {
  if (policy.mode === 'open') return 'Normal progression';
  if (policy.mode === 'paused') return 'Activities paused';
  if (policy.mode === 'survey') return 'Survey invitation';
  const stages = policy.mode === 'stage' ? [policy.stage] : policy.stages ?? [];
  return stages.length === 3 ? 'All stages unlocked' : `Stages ${stages.join(', ')} unlocked`;
}
