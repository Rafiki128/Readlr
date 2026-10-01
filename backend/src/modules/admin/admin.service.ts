import { supabase, unwrap } from '../../database/db.js';

export interface AdminLearner {
  id: number;
  email: string;
  name: string;
  avatar: string;
  grade: number;
  createdAt: string;
  lastActivity: string | null;
  presence: {stage:number|null;level:number|null;screen:string;last_seen:string} | null;
  earnedProgress?: Record<number,number>;
  progress: Array<{
    stageId: number;
    completedLevels: number;
    totalLevels: number;
    completionPercentage: number;
    lastUpdated: string;
  }>;
}

async function readPages<T>(page: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const batch = unwrap(await page(start, start + 499)) ?? [];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}

export async function getLearnersForAdmin(): Promise<AdminLearner[]> {
  const users = await readPages((start, end) => supabase.from('users').select('id,email,created_at')
    .eq('role','learner').order('id').range(start,end));
  const stages = unwrap(await supabase.from('stages').select('id,stage_number')) ?? [];
  const stageIds = new Map<number,number>(stages.map(stage => [stage.stage_number,stage.id]));
  if ([1,2,3].some(stage => !stageIds.has(stage))) throw new Error('Stage definitions are missing. Run stage setup.');
  const learners: AdminLearner[] = [];
  // Batch IDs so classroom growth does not exceed URL or database row limits.
  for (let start = 0; start < users.length; start += 200) learners.push(...await getLearnerBatch(users.slice(start,start + 200), stageIds));
  return learners;
}

async function getLearnerBatch(users: Array<{id:number;email:string;created_at:string}>, stageIds: Map<number,number>): Promise<AdminLearner[]> {

  if (users.length === 0) return [];

  const userIds = users.map((user) => user.id);
  const profiles = unwrap(await supabase
    .from('learner_profiles')
    .select('id, user_id, name, avatar, grade')
    .in('user_id', userIds)) as Array<{ id: number; user_id: number; name: string; avatar: string; grade: number }>;
  const profileIds = profiles.map((profile) => profile.id);
  const rewardRows = profileIds.length ? unwrap(await supabase.from('learner_stage_state').select('learner_id,stage_number,earned_completed').in('learner_id',profileIds)) as Array<{learner_id:number;stage_number:number;earned_completed:number}> : [];
  const presenceRows = unwrap(await supabase.from('learner_presence').select('user_id,stage,level,screen,last_seen').in('user_id',userIds)) as Array<{user_id:number;stage:number|null;level:number|null;screen:string;last_seen:string}>;
  const journeyRows = profileIds.length ? unwrap(await supabase.from('reading_journeys').select('learner_id,stage_number,completed,updated_at').in('learner_id',profileIds)) as Array<{learner_id:number;stage_number:number;completed:number;updated_at:string}> : [];
  const [progressRows, sessions] = profileIds.length === 0
    ? [[], []]
    : await Promise.all([
      unwrap(await supabase
        .from('progress')
        .select('learner_id, stage_id, completed_levels, total_levels, completion_percentage, last_updated')
        .in('learner_id', profileIds)) as Array<{ learner_id: number; stage_id: number; completed_levels: number; total_levels: number; completion_percentage: number; last_updated: string }>,
      readPages((start,end) => supabase
        .from('sessions')
        .select('learner_id, started_at, completed_at')
        .in('learner_id', profileIds).order('id').range(start,end)) as Promise<Array<{ learner_id: number; started_at: string; completed_at: string | null }>>,
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
      earnedProgress: Object.fromEntries(rewardRows.filter(row => row.learner_id === profile?.id).map(row => [row.stage_number,row.earned_completed])),
      email: user.email,
      name: profile?.name ?? user.email.split('@')[0],
      avatar: profile?.avatar ?? 'learner',
      grade: profile?.grade ?? 1,
      createdAt: user.created_at,
      lastActivity: [
        profile ? lastActivityByLearnerId.get(profile.id) : undefined,
        presenceRows.find(row=>row.user_id===user.id)?.last_seen,
        ...(profile ? progressByLearnerId.get(profile.id)?.map(row=>row.last_updated) ?? [] : []),
        ...(profile ? journeyRows.filter(row=>row.learner_id===profile.id).map(row=>row.updated_at) : []),
      ].filter((value): value is string => Boolean(value)).sort().at(-1) ?? null,
      presence: presenceRows.find(row=>row.user_id===user.id) ?? null,
      progress: [1,2,3].map(stage => {
        const row = profile ? progressByLearnerId.get(profile.id)?.find(p=>p.stage_id===stageIds.get(stage)) : undefined;
        const journey = profile ? journeyRows.find(j=>j.learner_id===profile.id && j.stage_number===stage) : undefined;
        const completed = Math.min(20,journey?.completed ?? (stage === 1 || row?.total_levels === 20 ? row?.completed_levels ?? 0 : 0));
        return {stageId:stage,completedLevels:completed,totalLevels:20,completionPercentage:completed*5,
          lastUpdated:[row?.last_updated,journey?.updated_at].filter(Boolean).sort().at(-1) ?? user.created_at};
      }),
    };
  });
}
