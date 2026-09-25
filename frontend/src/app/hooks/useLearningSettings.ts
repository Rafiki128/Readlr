import { useEffect } from "react";
import { toast } from "sonner";
import { getLearningSettings, resetLearningSettings, updateLearningSettings } from "../../hooks/learningSettings";
const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export function markPracticeToday(userId?: number | null) {
  if (!userId) return;
  try { localStorage.setItem(`readlr_practice_day_${userId}`,new Date().toLocaleDateString("en-CA")); } catch { /* Practice must work when storage is full. */ }
}
export function useLearningSettings(token:string|null, userId?:number) {
  useEffect(()=> {
    resetLearningSettings();
    if (!token || !userId) return;
    const controller=new AbortController();
    function remind() {
      if (document.hidden || !getLearningSettings().daily_reminders) return;
      try {
        const today=new Date().toLocaleDateString("en-CA"), key=`readlr_reminder_day_${userId}`;
        if (localStorage.getItem(key)===today || localStorage.getItem(`readlr_practice_day_${userId}`)===today) return;
        localStorage.setItem(key,today);
        toast("Ready for a little reading?",{description:"Milo is ready for today's adventure."});
      } catch { /* A reminder must never block the lesson. */ }
    }
    void fetch(`${API}/settings/me`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
      .then(async response=> { if (!response.ok) return; const data=await response.json();if(!controller.signal.aborted){updateLearningSettings(data.settings);remind();} }).catch(()=>{});
    document.addEventListener("visibilitychange",remind);
    return()=>{controller.abort();resetLearningSettings();document.removeEventListener("visibilitychange",remind);};
  },[token,userId]);
}
