export interface LearningSettings {
  sound_volume: number; voice_feedback: boolean; daily_reminders: boolean; achievement_alerts: boolean;
}
const defaults: LearningSettings = {sound_volume:80,voice_feedback:true,daily_reminders:true,achievement_alerts:true};
let current = {...defaults};
export const getLearningSettings = () => current;
export function updateLearningSettings(value: Partial<LearningSettings>) {
  current = {...current,
    sound_volume: typeof value.sound_volume === "number" && Number.isFinite(value.sound_volume) ? Math.max(0,Math.min(100,value.sound_volume)) : current.sound_volume,
    ...Object.fromEntries(["voice_feedback","daily_reminders","achievement_alerts"].filter(key=>typeof value[key as keyof LearningSettings]==="boolean").map(key=>[key,value[key as keyof LearningSettings]])),
  };
}
export function resetLearningSettings() { current={...defaults}; }
export const learningVolume = () => current.sound_volume / 100;
