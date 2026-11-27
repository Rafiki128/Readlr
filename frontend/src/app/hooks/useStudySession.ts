import { useCallback, useEffect, useRef, useState } from 'react';
import { enableValidationEvents } from './validationEvents';
import { CLASSROOM_API } from './useClassroom';
import { pollDelay } from './learnerPolling';

export type StudyPhase = 'pretest' | 'learning' | 'posttest' | 'done';
export interface StudyState {
  active: boolean; systemUse?:boolean;
  phase?: StudyPhase;
  books?: string[];
  learningEndsAt?: string | null;
  learningMinutes?: number | null;
  /** True once the posttest is finished and the student survey is open to this learner. */
  survey?: boolean;
  /** words is Part 1 (printed words); blends is Part 2 (sound blending); fluency is the Part 3 reading order. Later parts are empty for sessions enrolled before them. */
  test?: { phase: 'pretest' | 'posttest'; words: string[]; blends: string[]; fluency?: string[]; answered: string[]; fluencyDone?: boolean } | null;
}

/** Polls the learner's validation-study session. Errors count as "no session" so the normal app keeps working. */
export function useStudySession(token: string | null, enabled: boolean,userId?:number) {
  const [state, setState] = useState<StudyState | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{enableValidationEvents(enabled&&state?.systemUse?token:null,userId);return ()=>enableValidationEvents(null);},[enabled,token,userId,state?.systemUse]);
  const [tick, setTick] = useState(0);
  const version=useRef(0);
  const setStudy=useCallback((next:StudyState)=>{version.current++;setState(next);},[]);
  const refresh = useCallback(() => setTick(n => n + 1), []);
  useEffect(() => {
    if (!enabled || !token) { setState(null); setLoaded(true); return; }
    let active = true;
    let busy = false;
    let failures = 0;
    let timer: number|undefined;
    let controller: AbortController|undefined;
    const next = (delay:number) => {
      window.clearTimeout(timer);
      if(active&&document.visibilityState==='visible')timer=window.setTimeout(()=>void load(),delay);
    };
    const load = async () => {
      if(!active||busy||document.visibilityState!=='visible')return;
      busy=true;
      controller=new AbortController();
      const requestVersion=++version.current;
      try {
        const response = await fetch(`${CLASSROOM_API}/study/me`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json() as StudyState;
        failures=0;
        if (active && requestVersion===version.current) setState(data);
      } catch {
        failures++;
        if (active && requestVersion===version.current) setState(previous => previous ?? { active: false });
      } finally {
        busy=false;
        if(active)setLoaded(true);
        next(pollDelay(failures?8000:28000,failures));
      }
    };
    next(Math.random()*1200);
    const resume=()=>{if(!busy)next(Math.random()*2000);};
    window.addEventListener('online',resume);
    document.addEventListener('visibilitychange',resume);
    return () => { active=false;controller?.abort();window.clearTimeout(timer);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume); };
  }, [token, enabled, tick]);
  return { study: state, loaded, refresh, setStudy };
}
