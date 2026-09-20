import { supabase, unwrap } from '../../database/db.js';

export interface AdminLearner {
  id: number;
  email: string;
  name: string;
  avatar: string;
  grade: number;
  createdAt: string;
  lastActivity: string | null;
  progress: Array<{
    stageId: number;
    completedLevels: number;
    totalLevels: number;
    completionPercentage: number;
    lastUpdated: string;
  }>;
}

export async function getLearnersForAdmin(): Promise<AdminLearner[]> {
  const users = unwrap(await supabase
    .from('users')
    .select('id, email, created_at')
    .eq('role', 'learner')
    .order('created_at', { ascending: false })) as Array<{ id: number; email: string; created_at: string }>;

  if (users.length === 0) return [];

  const userIds = users.map((user) => user.id);
  const profiles = unwrap(await supabase
    .from('learner_profiles')
    .select('id, user_id, name, avatar, grade')
    .in('user_id', userIds)) as Array<{ id: number; user_id: number; name: string; avatar: string; grade: number }>;
  const profileIds = profiles.map((profile) => profile.id);
  const [progressRows, sessions] = profileIds.length === 0
    ? [[], []]
    : await Promise.all([
      unwrap(await supabase
        .from('progress')
        .select('learner_id, stage_id, completed_levels, total_levels, completion_percentage, last_updated')
        .in('learner_id', profileIds)) as Array<{ learner_id: number; stage_id: number; completed_levels: number; total_levels: number; completion_percentage: number; last_updated: string }>,
      unwrap(await supabase
        .from('sessions')
        .select('learner_id, started_at, completed_at')
        .in('learner_id', profileIds)) as Array<{ learner_id: number; started_at: string; completed_at: string | null }>,
    ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const progressByLearnerId = new Map<number, typeof progressRows>();
  for (const row of progressRows) {
    const rows = progressByLearnerId.get(row.learner_id) ?? [];
    rows.push(row);
    progressByLearnerId.set(row.learner_id, rows);
  }

  const lastActivityByLearnerId = new Map<number, string>();
  for (const session of sessions) {
    const activity = session.completed_at ?? session.started_at;
    const previous = lastActivityByLearnerId.get(session.learner_id);
    if (!previous || activity > previous) lastActivityByLearnerId.set(session.learner_id, activity);
  }

  return users.map((user) => {
    const profile = profileByUserId.get(user.id);
    return {
      id: user.id,
      email: user.email,
      name: profile?.name ?? user.email.split('@')[0],
      avatar: profile?.avatar ?? 'learner',
      grade: profile?.grade ?? 1,
      createdAt: user.created_at,
      lastActivity: profile ? lastActivityByLearnerId.get(profile.id) ?? null : null,
      progress: (profile ? progressByLearnerId.get(profile.id) ?? [] : []).map((row) => ({
        stageId: row.stage_id,
        completedLevels: row.completed_levels,
        totalLevels: row.total_levels,
        completionPercentage: row.completion_percentage,
        lastUpdated: row.last_updated,
      })),
    };
  });
}