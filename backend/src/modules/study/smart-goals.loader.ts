// Read-only loader for the SMART goal report: fetches app activity for study learners and normalizes it per learner.
import { supabase, unwrap } from '../../database/db.js';
import { READING_VERSION } from '../evidence/reading-catalog.js';
import { ALL_STUDY_WORDS, STUDY_BOOKS } from './study.data.js';
import { summarize, type StudyFluency, type StudyResponse, type StudySession } from './study.service.js';
import { HOME_DAYS, STUDY_TIME_ZONE, smartGoals, type LearnerRecord } from './smart-goals.js';

export interface Attempt { id: number; learner_id: number; activity_id: string; content_id: string; result: string; completed_at: string }
export interface Checkpoint { learner_id: number; chapter_id: string; epoch: number; passed: boolean; created_at: string; completed_at: string | null }
export interface RawSmartData {
  sessions: StudySession[]; responses: StudyResponse[]; fluency: StudyFluency[];
  profiles: Array<{ id: number; user_id: number }>; epochs: Array<{ learner_id: number; epoch: number }>;
  checkpoints: Checkpoint[]; attempts: Attempt[];
  events: Array<{ user_id: number; event_type: string; occurred_at: string }>;
  states: Array<{ learner_id: number; guided_stops: string[] | null }>; surveys: Array<{ user_id: number }>;
}

const manilaFormat = new Intl.DateTimeFormat('en-CA', { timeZone: STUDY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
/** Asia/Manila calendar date (YYYY-MM-DD) of a timestamp. */
export const manilaDate = (iso: string) => manilaFormat.format(new Date(iso));

const scoredResult = (result: string) => result === 'correct' ? 'correct' : result === 'incorrect' || result === 'no_response' ? 'incorrect' : null;

/** Wrong attempts with a scored next attempt on the same activity and content, and how many of those were corrected. */
export function retryCounts(attempts: Array<Omit<Attempt, 'learner_id'>>) {
  const groups = new Map<string, typeof attempts>();
  for (const a of [...attempts].sort((x, y) => Date.parse(x.completed_at) - Date.parse(y.completed_at) || x.id - y.id)) {
    const key = `${a.activity_id.replace(/\.retry$/, '')}|${a.content_id}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  let missed = 0, corrected = 0;
  for (const list of groups.values()) for (let i = 0; i + 1 < list.length; i++) {
    const next = scoredResult(list[i + 1].result);
    if (scoredResult(list[i].result) !== 'incorrect' || next === null) continue;
    missed++;
    if (next === 'correct') corrected++;
  }
  return { missed, corrected };
}

/** One record per study session; app activity counts from the enrollment date through the last home day (Asia/Manila). */
export function normalizeLearners(raw: RawSmartData, lastDay = HOME_DAYS[HOME_DAYS.length - 1]): LearnerRecord[] {
  const { participants } = summarize(raw.sessions, raw.responses, raw.fluency);
  const profileOf = new Map(raw.profiles.map(p => [p.user_id, p.id]));
  const epochOf = new Map(raw.epochs.map(e => [e.learner_id, e.epoch]));
  return raw.sessions.map((s, i) => {
    const p = participants[i], profileId = profileOf.get(s.user_id), from = manilaDate(s.created_at);
    const inWindow = (iso: string) => { const d = manilaDate(iso); return d >= from && d <= lastDay; };
    const dates = (isos: string[]) => [...new Set(isos.filter(inWindow).map(manilaDate))].sort();
    const checkpoints = raw.checkpoints.filter(c => c.learner_id === profileId);
    const attempts = raw.attempts.filter(a => a.learner_id === profileId && inWindow(a.completed_at));
    const own = raw.responses.filter(r => r.user_id === s.user_id);
    const compared = own.filter(r => ALL_STUDY_WORDS.includes(r.word) && !r.skipped && (r.teacher_score === 'correct' || r.teacher_score === 'incorrect') && (r.app_result === 'matched' || r.app_result === 'different'));
    const words = (k: 'pre' | 'post') => ({ correct: p.taught[k].correct + p.transfer[k].correct + p.control[k].correct, scored: p.taught[k].scored + p.transfer[k].scored + p.control[k].scored });
    const blend = (k: 'pre' | 'post') => ({ correct: p.blend[k].correct, scored: p.blend[k].scored });
    return {
      code: s.participant_code, group: s.study_group, complete: p.complete, unscored: p.unscored,
      words: { pre: words('pre'), post: words('post') },
      blend: p.blend.pre.total ? { pre: blend('pre'), post: blend('post') } : null,
      wcpm: { pre: p.fluency.pre?.wcpm ?? null, post: p.fluency.post?.wcpm ?? null },
      requiredBooks: STUDY_BOOKS[s.study_group],
      // Same rule as the app's progress and rewards: passes in the current reading epoch only.
      booksPassed: [...new Set(checkpoints.filter(c => c.passed && c.epoch === (epochOf.get(profileId!) ?? 0) && c.completed_at && inWindow(c.completed_at)).map(c => c.chapter_id))],
      attemptDates: dates(attempts.map(a => a.completed_at)),
      checkpointDates: dates(checkpoints.map(c => c.created_at)),
      loginDates: dates(raw.events.filter(e => e.user_id === s.user_id && (e.event_type === 'login' || e.event_type === 'app_open')).map(e => e.occurred_at)),
      retry: retryCounts(attempts),
      agreement: { compared: compared.length, agree: compared.filter(r => (r.teacher_score === 'correct') === (r.app_result === 'matched')).length },
      guidedStops: new Set(raw.states.find(x => x.learner_id === profileId)?.guided_stops ?? []).size,
      surveyed: raw.surveys.some(x => x.user_id === s.user_id),
      recordings: own.filter(r => !r.skipped).length,
      appUnavailable: own.filter(r => !r.skipped && (r.app_result === null || r.app_result === 'unavailable')).length,
    };
  });
}

async function pages<T>(page: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const batch = unwrap(await page(start, start + 999)) ?? [];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

/** Reads (never writes) the app tables for the given study sessions and builds the SMART goal report. */
export async function loadSmartGoals(sessions: StudySession[], responses: StudyResponse[], fluency: StudyFluency[]) {
  const raw: RawSmartData = { sessions, responses, fluency, profiles: [], epochs: [], checkpoints: [], attempts: [], events: [], states: [], surveys: [] };
  const userIds = sessions.map(s => s.user_id);
  if (userIds.length) {
    raw.profiles = unwrap(await supabase.from('learner_profiles').select('id,user_id').in('user_id', userIds)) ?? [];
    const ids = raw.profiles.map(p => p.id);
    const start = new Date(`${sessions.map(s => manilaDate(s.created_at)).sort()[0]}T00:00:00+08:00`).toISOString();
    const end = new Date(Date.parse(`${HOME_DAYS[HOME_DAYS.length - 1]}T00:00:00+08:00`) + 86_400_000).toISOString();
    [raw.epochs, raw.checkpoints, raw.attempts, raw.events, raw.states, raw.surveys] = await Promise.all([
      pages<RawSmartData['epochs'][number]>((a, b) => supabase.from('learner_stage_state').select('learner_id,epoch').in('learner_id', ids).eq('stage_number', 3).order('learner_id').range(a, b)),
      pages<Checkpoint>((a, b) => supabase.from('reading_checkpoints').select('learner_id,chapter_id,epoch,passed,created_at,completed_at').in('learner_id', ids)
        .eq('curriculum_version', READING_VERSION).gte('created_at', start).lt('created_at', end).order('created_at').order('id').range(a, b)),
      pages<Attempt>((a, b) => supabase.from('curriculum_attempts').select('id,learner_id,activity_id,content_id,result,completed_at').in('learner_id', ids)
        .gte('completed_at', start).lt('completed_at', end).order('id').range(a, b)),
      pages<RawSmartData['events'][number]>((a, b) => supabase.from('learner_events').select('user_id,event_type,occurred_at').in('user_id', userIds)
        .in('event_type', ['login', 'app_open']).gte('occurred_at', start).lt('occurred_at', end).order('id').range(a, b)),
      pages<RawSmartData['states'][number]>((a, b) => supabase.from('learner_curriculum_state').select('learner_id,guided_stops').in('learner_id', ids).order('learner_id').range(a, b)),
      pages<RawSmartData['surveys'][number]>((a, b) => supabase.from('survey_responses').select('user_id').in('user_id', userIds).order('user_id').range(a, b)),
    ]);
  }
  return smartGoals(normalizeLearners(raw));
}
