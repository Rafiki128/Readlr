import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JOURNEY_CHANGED, localJourneys, restoreJourney, type JourneySnapshot } from "../components/journeySync";
import { getLearningSettings } from "../../hooks/learningSettings";
import { markPracticeToday } from "./useLearningSettings";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export function useJourneySync(learnerId: number | null, token: string | null, onProgress: (stage:number,count:number)=>void, userId?:number) {
  const [syncError,setSyncError] = useState(false);
  useEffect(()=> {
    setSyncError(false);
    if (!learnerId || !token) return;
    const controller = new AbortController();
    let busy = false, again = false;
    const headers = { Authorization:`Bearer ${token}`, "Content-Type":"application/json" };
    let verified = false;
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
        for (const remote of data.journeys as JourneySnapshot[]) restoreJourney(learnerId!,remote);
        for (const local of localJourneys(learnerId!)) {
          // Do not turn a legacy 8/10-level completion into a new curriculum completion.
          if (!local.completed && !data.journeys.some((j:JourneySnapshot)=>j.stage_number===local.stage_number)) continue;
          const result=await fetch(`${API}/progress/me/journeys/${local.stage_number}`,{method:"PUT",headers,signal:controller.signal,body:JSON.stringify(local)});
          if (!result.ok) throw new Error("Save failed");
          const saved=await result.json();
          if (controller.signal.aborted) return;
          restoreJourney(learnerId!,saved.journey);
          onProgress(local.stage_number,saved.journey.completed);
          window.dispatchEvent(new Event("readlr:frames-changed"));
          if (saved.unlocked_frames?.length && getLearningSettings().achievement_alerts) toast.success("New frames unlocked!",{description:saved.unlocked_frames.map((f:{name:string})=>f.name).join(" or ")});
        }
        setSyncError(false);
      } catch { if (!controller.signal.aborted) setSyncError(true); }
      finally { busy=false; if (again && !controller.signal.aborted) { again=false; void sync(); } }
    }
    const changed=(event:Event)=> { if ((event as CustomEvent).detail===learnerId) { markPracticeToday(userId); if(verified) for(const j of localJourneys(learnerId!)) onProgress(j.stage_number,j.completed); void sync(); } };
    const retry=()=>void sync();
    window.addEventListener(JOURNEY_CHANGED,changed);
    window.addEventListener("online",retry);
    const timer=setInterval(retry,60000);
    void sync();
    return()=> {controller.abort();clearInterval(timer);window.removeEventListener(JOURNEY_CHANGED,changed);window.removeEventListener("online",retry);};
  },[learnerId,token,onProgress,userId]);
  return syncError;
}
