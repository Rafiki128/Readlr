import type { MiloVoice } from "./miloVoice";
export interface LearningSettings {
  milo_voice: MiloVoice;
  sound_volume: number; voice_feedback: boolean; daily_reminders: boolean; achievement_alerts: boolean;
}
const defaults: LearningSettings = {milo_voice:"milo",sound_volume:80,voice_feedback:true,daily_reminders:true,achievement_alerts:true};
let current = {...defaults};
export const getLearningSettings = () => current;
export function updateLearningSettings(value: Partial<LearningSettings>) {
  current = {...current,
    milo_voice: value.milo_voice === "milo" || value.milo_voice === "classic" ? value.milo_voice : current.milo_voice,
    sound_volume: typeof value.sound_volume === "number" && Number.isFinite(value.sound_volume) ? Math.max(0,Math.min(100,value.sound_volume)) : current.sound_volume,
    ...Object.fromEntries(["voice_feedback","daily_reminders","achievement_alerts"].filter(key=>typeof value[key as keyof LearningSettings]==="boolean").map(key=>[key,value[key as keyof LearningSettings]])),
  };
}
export function resetLearningSettings() { current={...defaults}; }
export const learningVolume = () => current.sound_volume / 100;
