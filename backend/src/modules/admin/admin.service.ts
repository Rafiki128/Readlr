import { supabase, unwrap } from '../../database/db.js';

export interface AdminLearner {
  id: number;
  email: string;
  name: string;
  avatar: string;
  grade: number;
  studyParticipant: boolean;
  createdAt: string;
  lastActivity: string | null;
  presence: {stage:number|null;level:number|null;screen:string;last_seen:string} | null;
  earnedProgress?: Record<number,number>;
  readingChapters?: number | null;
  curriculum?: {campPractices:number;campSkipped:number;guidedStops:number;recordings:number;updatedAt:string}|null;
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
  const [users, stagesResult] = await Promise.all([
    readPages((start, end) => supabase.from('users').select('id,email,created_at')
      .eq('role','learner').order('id').range(start,end)),
    supabase.from('stages').select('id,stage_number'),
  ]);
  const stages = unwrap(stagesResult) ?? [];
  const stageIds = new Map<number,number>(stages.map(stage => [stage.stage_number,stage.id]));
  if ([1,2,3].some(stage => !stageIds.has(stage))) throw new Error('Stage definitions are missing. Run stage setup.');
  const learners: AdminLearner[] = [];
  // Batch IDs so classroom growth does not exceed URL or database row limits.
  for (let start = 0; start < users.length; start += 200) learners.push(...await getLearnerBatch(users.slice(start,start + 200), stageIds));
  return learners;
}

// Set by the research team after signed guardian consent and child assent are collected outside the app.
export async function setStudyParticipant(userId: number, studyParticipant: boolean): Promise<boolean> {
  const rows = unwrap(await supabase.from('learner_profiles').update({ study_participant: studyParticipant }).eq('user_id', userId).select('id')) ?? [];
  return rows.length > 0;
}

async function getLearnerBatch(users: Array<{id:number;email:string;created_at:string}>, stageIds: Map<number,number>): Promise<AdminLearner[]> {

  if (users.length === 0) return [];

  const userIds = users.map((user) => user.id);
  // Each Supabase round trip can take ~1s, so independent queries run in parallel
  // to keep the roster well under the dashboard's request timeout.
  const [profilesResult, presenceResult] = await Promise.all([
    supabase.from('learner_profiles').select('id, user_id, name, avatar, grade, study_participant').in('user_id', userIds),
    supabase.from('learner_presence').select('user_id,stage,level,screen,last_seen').in('user_id',userIds),
  ]);
  const profiles = unwrap(profilesResult) as Array<{ id: number; user_id: number; name: string; avatar: string; grade: number; study_participant: boolean }>;
  const presenceRows = unwrap(presenceResult) as Array<{user_id:number;stage:number|null;level:number|null;screen:string;last_seen:string}>;
  const profileIds = profiles.map((profile) => profile.id);
  const empty = { data: [], error: null };
  const [curriculum, reading, rewardResult, journeyResult, progressResult, sessions] = profileIds.length === 0
    ? [empty, empty, empty, empty, empty, []] as const
    : await Promise.all([
      supabase.from('learner_curriculum_state').select('learner_id,camp_orientation_step,guided_activities,guided_stops,sound_recordings,updated_at').in('learner_id',profileIds),
      supabase.rpc('reading_checkpoint_overview',{p_learners:profileIds}),
      supabase.from('learner_stage_state').select('learner_id,stage_number,earned_completed').in('learner_id',profileIds),
      supabase.from('reading_journeys').select('learner_id,stage_number,completed,updated_at').in('learner_id',profileIds),
      supabase.from('progress').select('learner_id, stage_id, completed_levels, total_levels, completion_percentage, last_updated').in('learner_id', profileIds),
      readPages((start,end) => supabase
        .from('sessions')
        .select('learner_id, started_at, completed_at')
        .in('learner_id', profileIds).order('id').range(start,end)) as Promise<Array<{ learner_id: number; started_at: string; completed_at: string | null }>>,
    ]);
  const readingByLearner = new Map<number,number>(((reading.data ?? []) as Array<{learner_id:number;chapters:number}>).map(row=>[row.learner_id,Number(row.chapters)]));
  const rewardRows = (unwrap(rewardResult) ?? []) as Array<{learner_id:number;stage_number:number;earned_completed:number}>;
  const journeyRows = (unwrap(journeyResult) ?? []) as Array<{learner_id:number;stage_number:number;completed:number;updated_at:string}>;
  const progressRows = (unwrap(progressResult) ?? []) as Array<{ learner_id: number; stage_id: number; completed_levels: number; total_levels: number; completion_percentage: number; last_updated: string }>;

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
      readingChapters:reading.error?null:readingByLearner.get(profile?.id ?? 0) ?? 0,
      curriculum:curriculum.error?null:(()=>{const row=curriculum.data?.find(row=>row.learner_id===profile?.id);const reached=Math.max(0,Math.min(3,Number(row?.camp_orientation_step)||0));const campSkipped=Array.from({length:reached},(_,step)=>step).filter(step=>row?.guided_activities?.[`camp-orientation:skipped:${step}`]===true).length;return {campPractices:reached-campSkipped,campSkipped,guidedStops:Array.isArray(row?.guided_stops)?new Set(row.guided_stops).size:0,recordings:Array.isArray(row?.sound_recordings)?row.sound_recordings.length:0,updatedAt:row?.updated_at??user.created_at};})(),
      earnedProgress: Object.fromEntries(rewardRows.filter(row => row.learner_id === profile?.id).map(row => [row.stage_number,row.earned_completed])),
      email: user.email,
      name: profile?.name ?? user.email.split('@')[0],
      avatar: profile?.avatar ?? 'learner',
      grade: profile?.grade ?? 1,
      studyParticipant: profile?.study_participant ?? false,
      createdAt: user.created_at,
      lastActivity: [
        profile ? lastActivityByLearnerId.get(profile.id) : undefined,
        presenceRows.find(row=>row.user_id===user.id)?.last_seen,
        curriculum.data?.find(row=>row.learner_id===profile?.id)?.updated_at,
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
