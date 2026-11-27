import { useEffect, useRef, useState } from 'react';
import {canUseLastPolicy, CLASSROOM_POLICY_GRACE_MS, pollDelay, PRESENCE_INTERVAL_MS} from './learnerPolling';

export interface ClassroomPolicy {
  mode: 'open' | 'stage' | 'stages' | 'paused' | 'survey';
  stages?: number[];
  unlockThrough?: Record<number, number>;
  readingUnlockThrough?: number;
  readingOpenChallenges?: number[];
  readingOpenStops?: string[];
  soundLibrary?: boolean;
  stage: number | null;
  message: string;
  surveyUrl: string;
}
interface Activity { stage: number | null; level: number | null; screen: string }
export const CLASSROOM_API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
let lessonActivity: Activity | null = null;

export function useClassroomActivity(stage: number, level: number, screen: string) {
  useEffect(() => {
    const activity = { stage, level, screen };
    lessonActivity = activity;
    return () => { if (lessonActivity === activity) lessonActivity = null; };
  }, [stage, level, screen]);
}

export function useClassroom(token: string | null, enabled: boolean, activity: Activity) {
  const [state, setState] = useState<{token: string; policy: ClassroomPolicy; surveyAssigned:boolean} | null>(null);
  const [connection, setConnection] = useState<{token:string;status:'retrying'|'blocked'}|null>(null);
  const activityRef = useRef(activity);
  activityRef.current = activity;
  useEffect(() => {
    if (!enabled || !token) return;
    let active = true;
    let busy = false;
    let lastConfirmed: number|null = null;
    let lastPresence = -Infinity;
    let failures = 0;
    let timer: number|undefined;
    let expiry: number|undefined;
    let controller: AbortController | undefined;
    const next = (delay: number) => {
      window.clearTimeout(timer);
      if (active && document.visibilityState === 'visible') timer = window.setTimeout(() => void poll(), delay);
    };
    const poll = async () => {
      if (!active || busy || document.visibilityState !== 'visible') return;
      busy = true;
      const request = controller = new AbortController();
      const timeout = window.setTimeout(() => request.abort(), 10000);
      const headers = { Authorization: `Bearer ${token}` };
      let denied = false;
      try {
        const response = await fetch(`${CLASSROOM_API}/admin/classroom/me`, {headers,signal:request.signal});
        denied = response.status === 401 || response.status === 403;
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (!active) return;
        window.clearTimeout(expiry);
        failures=0;
        lastConfirmed=Date.now();
        setState({ token, policy: data.policy, surveyAssigned:data.surveyAssigned===true });
        setConnection(null);
        if (document.visibilityState === 'visible' && lastConfirmed-lastPresence>=PRESENCE_INTERVAL_MS) {
          lastPresence=lastConfirmed;
          window.clearTimeout(timeout);
          await fetch(`${CLASSROOM_API}/admin/classroom/presence`, {
            headers:{...headers,'Content-Type':'application/json'}, method:'PUT',
            signal:AbortSignal.any([request.signal,AbortSignal.timeout(5000)]),
            body: JSON.stringify(lessonActivity ?? activityRef.current),
          }).catch(() => undefined);
        }
      } catch {
        if (!active) return;
        failures++;
        if(denied){
          lastConfirmed=null;
          setState(null);
        }
        window.clearTimeout(expiry);
        if(canUseLastPolicy(lastConfirmed,Date.now(),denied)){
          setConnection({token,status:'retrying'});
          expiry=window.setTimeout(()=>setConnection({token,status:'blocked'}),Math.max(0,lastConfirmed!+CLASSROOM_POLICY_GRACE_MS-Date.now()));
        }else setConnection({token,status:'blocked'});
      } finally {
        window.clearTimeout(timeout);
        busy=false;
        next(pollDelay(failures?5000:25000,failures));
      }
    };
    next(Math.random()*1500);
    const visible = () => { if (!busy) next(Math.random()*2000); };
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; controller?.abort(); window.clearTimeout(timer);window.clearTimeout(expiry); window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [token, enabled]);
  const status=connection?.token===token?connection?.status:null;
  return { policy: state?.token === token ? state.policy : null, surveyAssigned:state?.token===token && state.surveyAssigned, error:status==='blocked', reconnecting:status==='retrying' };
}
