import { useEffect, useRef, useState } from 'react';

export interface ClassroomPolicy {
  mode: 'open' | 'stage' | 'stages' | 'paused' | 'survey';
  stages?: number[];
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
  const [state, setState] = useState<{token: string; policy: ClassroomPolicy} | null>(null);
  const [error, setError] = useState(false);
  const activityRef = useRef(activity);
  activityRef.current = activity;
  useEffect(() => {
    if (!enabled || !token) return;
    let active = true;
    let busy = false;
    let controller: AbortController | undefined;
    const poll = async () => {
      if (busy) return;
      busy = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      const options = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: controller.signal };
      try {
        const response = await fetch(`${CLASSROOM_API}/admin/classroom/me`, options);
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (active) { setState({ token, policy: data.policy }); setError(false); }
        if (document.visibilityState === 'visible') {
          await fetch(`${CLASSROOM_API}/admin/classroom/presence`, {
            ...options, method: 'PUT', body: JSON.stringify(lessonActivity ?? activityRef.current),
          }).catch(() => undefined);
        }
      } catch { if (active) setError(true); }
      finally { clearTimeout(timeout); busy = false; }
    };
    void poll();
    const timer = window.setInterval(poll, 15000);
    const visible = () => { if (document.visibilityState === 'visible') void poll(); };
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; controller?.abort(); clearInterval(timer); window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [token, enabled]);
  return { policy: state?.token === token ? state.policy : null, error };
}
