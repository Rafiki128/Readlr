import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JOURNEY_CHANGED, localJourneys, readValleyCompleted, restoreJourney, type JourneySnapshot } from "../components/journeySync";
import { getLearningSettings } from "../../hooks/learningSettings";
import { markPracticeToday } from "./useLearningSettings";
import { applyResetState, epochKey, preserveRewards } from '../components/progressReset';

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export function useJourneySync(learnerId: number | null, token: string | null, onProgress: (stage:number,count:number)=>void, userId?:number, onFrames?: (stage:number, frames:Array<{id:number;name:string;asset_key:string}>)=>void) {
  const [syncError,setSyncError] = useState(false);
  useEffect(()=> {
    setSyncError(false);
    if (!learnerId || !token) return;
    const controller = new AbortController();
    let busy = false, again = false;
    const headers = { Authorization:`Bearer ${token}`, "Content-Type":"application/json" };
    let verified = false;
    function frames(stage: number, saved: {unlocked_frames?: Array<{id:number;name:string;asset_key:string}>}) {
      window.dispatchEvent(new Event("readlr:frames-changed"));
      if (saved.unlocked_frames?.length && getLearningSettings().achievement_alerts) {
        if (onFrames) onFrames(stage, saved.unlocked_frames);
        else toast.success("New frames unlocked!",{description:saved.unlocked_frames.map(f=>f.name).join(" or ")});
      }
    }
    async function permittedResult(result: Response) {
      if (result.status === 403) {
        const restriction = await result.json().catch(() => null);
        if (restriction?.code === 'classroom_restricted') return false;
      }
      if (!result.ok) throw new Error("Save failed");
      return true;
    }
    async function sync() {
      if (busy) { again=true; return; }
      busy=true;
      try {
        if (!verified) {
          const profile=await fetch(`${API}/learner/me`,{headers,signal:controller.signal});
          if(!profile.ok) throw new Error("Profile unavailable");
          const account=await profile.json();
          if(controller.signal.aborted || account.learner.id !== learnerId) return;
          verified=true;
        }
        const response=await fetch(`${API}/progress/me/journeys`,{headers,signal:controller.signal});
        if (!response.ok) throw new Error("Load failed");
        const data=await response.json();
        if (controller.signal.aborted) return;
        const resetResponse = await fetch(`${API}/progress/me/reset-state`, { headers, signal: controller.signal });
        if (!resetResponse.ok || !userId) throw new Error('Reset state unavailable');
        const resetData = await resetResponse.json();
        if (controller.signal.aborted) return;
        if (!Array.isArray(resetData.stages)) throw new Error('Invalid reset state');
        const { changed: wasReset, epochs } = applyResetState(learnerId!, userId, resetData.stages);
        if (wasReset) { window.location.replace('/home'); return; }
        for (const remote of data.journeys as JourneySnapshot[]) restoreJourney(learnerId!,remote);
        let failed = false;
        try {
          const response = await fetch(`${API}/progress/me`, {headers,signal:controller.signal});
          if (!response.ok) throw new Error('Valley load failed');
          const summary = await response.json();
          const valley = summary.stages?.find((row:{stage_number?:number;stage_id:number})=>(row.stage_number ?? row.stage_id) === 1);
          const completed = Math.max(readValleyCompleted(userId), valley?.completed_levels ?? 0);
          onProgress(1, completed);
          if (completed > 0) {
            const result = await fetch(`${API}/progress/me/stages/1`, {method:'PUT',headers,signal:controller.signal,body:JSON.stringify({completed_levels:completed,total_levels:20,epoch:epochs[1] ?? 0})});
            if (await permittedResult(result)) {
              const saved = await result.json();
              if (controller.signal.aborted) return;
              preserveRewards(learnerId!, {1:saved.completed_levels}); onProgress(1,saved.completed_levels); frames(1,saved);
            }
          }
        } catch { failed = true; }
        for (const local of localJourneys(learnerId!)) {
          // Do not turn a legacy 8/10-level completion into a new curriculum completion.
          if (!local.completed && !data.journeys.some((j:JourneySnapshot)=>j.stage_number===local.stage_number)) continue;
          try {
            const result=await fetch(`${API}/progress/me/journeys/${local.stage_number}`,{method:"PUT",headers,signal:controller.signal,body:JSON.stringify({...local,epoch:epochs[local.stage_number] ?? 0})});
            if (!(await permittedResult(result))) continue;
            const saved=await result.json();
            if (controller.signal.aborted) return;
            restoreJourney(learnerId!,saved.journey);
            preserveRewards(learnerId!, {[local.stage_number]:saved.journey.completed});
            onProgress(local.stage_number,saved.journey.completed);
            frames(local.stage_number,saved);
          } catch { failed = true; }
        }
        if (!controller.signal.aborted) setSyncError(failed);
      } catch { if (!controller.signal.aborted) setSyncError(true); }
      finally { busy=false; if (again && !controller.signal.aborted) { again=false; void sync(); } }
    }
    const changed=(event:Event)=> { if ((event as CustomEvent).detail===learnerId) { markPracticeToday(userId); if(verified) for(const j of localJourneys(learnerId!)) onProgress(j.stage_number,j.completed); void sync(); } };
    const retry=()=>void sync();
    window.addEventListener(JOURNEY_CHANGED,changed);
    window.addEventListener("online",retry);
    const visible = () => { if (!document.hidden) retry(); };
    document.addEventListener('visibilitychange',visible);
    const storage = (event: StorageEvent) => { if (event.key === epochKey(learnerId)) window.location.replace('/home'); };
    window.addEventListener('storage',storage);
    const timer=setInterval(retry,15000);
    void sync();
    return()=> {controller.abort();clearInterval(timer);window.removeEventListener('storage',storage);window.removeEventListener(JOURNEY_CHANGED,changed);window.removeEventListener("online",retry);document.removeEventListener('visibilitychange',visible);};
  },[learnerId,token,onProgress,userId,onFrames]);
  return syncError;
}
