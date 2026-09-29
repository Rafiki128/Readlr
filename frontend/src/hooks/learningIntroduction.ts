export function introductionKey(learnerId: number) { return `readlr_introduction_v1_${learnerId}`; }
export function hasIntroduction(learnerId: number) {
  try { return localStorage.getItem(introductionKey(learnerId)) === "done"; } catch { return false; }
}
export function finishIntroduction(learnerId: number) {
  try { localStorage.setItem(introductionKey(learnerId), "done"); } catch { /* The tour remains optional without storage. */ }
}
export function explanationSeen(learnerId: number | null | undefined, activity: string, save = false) {
  if (!learnerId) return false;
  const key = `readlr_explanation_v1_${learnerId}_${activity}`;
  try {
    const seen = localStorage.getItem(key) === "done";
    if (save) localStorage.setItem(key, "done");
    return seen;
  } catch { return false; }
}
