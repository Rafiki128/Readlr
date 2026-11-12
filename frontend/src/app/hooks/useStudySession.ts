import { useCallback, useEffect, useState } from 'react';
import { CLASSROOM_API } from './useClassroom';

export type StudyPhase = 'pretest' | 'learning' | 'posttest' | 'done';
export interface StudyState {
  active: boolean;
  phase?: StudyPhase;
  books?: string[];
  learningEndsAt?: string | null;
  learningMinutes?: number;
  /** True once the posttest is finished and the student survey is open to this learner. */
  survey?: boolean;
  test?: { phase: 'pretest' | 'posttest'; words: string[]; answered: string[] } | null;
}

/** Polls the learner's validation-study session. Errors count as "no session" so the normal app keeps working. */
export function useStudySession(token: string | null, enabled: boolean) {
  const [state, setState] = useState<StudyState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(n => n + 1), []);
  useEffect(() => {
    if (!enabled || !token) { setState(null); setLoaded(true); return; }
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${CLASSROOM_API}/study/me`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json() as StudyState;
        if (active) setState(data);
      } catch { if (active) setState(previous => previous ?? { active: false }); }
      finally { if (active) setLoaded(true); }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, enabled, tick]);
  return { study: state, loaded, refresh, setStudy: setState };
}
