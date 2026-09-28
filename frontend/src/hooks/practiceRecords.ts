export type PracticeOutcome = "recorded" | "voice_detected" | "silence" | "error" | "interrupted";
export type FluencyTier = "Syllabic" | "Halting" | "Fluent";
export interface PracticeAttempt {
  id: string; studentId: number; sessionId: string; wordId: string; stageId: number;
  target: string; timestamp: number; attemptNumber: number; totalDurationMs: number;
  outcome: PracticeOutcome; correctiveFeedbackTriggered: boolean;
  accuracy: number | null; asrConfidence: number | null; tier: FluencyTier | null; selfCorrected: boolean | null;
  assessmentSource: "not_assessed" | "validated_assessment";
  wordRecognition?: "matched" | "different" | "uncertain" | "unavailable";
}
export const PRACTICE_CHANGED = "readlr-practice-changed";
export const practiceKey = (id: number) => `readlr_practice_v1_${id}`;
export const validLearner = (id?: number | null): id is number => Number.isSafeInteger(id) && Number(id) > 0;

// Capture duration and voice presence are not pronunciation or fluency measurements.
export function classifyAssessment(accuracy: number, durationMs: number, expectedDurationMs = 600,
  thresholds = { accuracy: .7, halting: 1.4, syllabic: 2 }): FluencyTier | null {
  if (![accuracy, durationMs, expectedDurationMs, ...Object.values(thresholds)].every(Number.isFinite) || accuracy < 0 || accuracy > 1 || durationMs <= 0 || expectedDurationMs <= 0 || thresholds.accuracy < 0 || thresholds.accuracy > 1 || thresholds.halting <= 0 || thresholds.syllabic < thresholds.halting) return null;
  if (accuracy < thresholds.accuracy || durationMs > expectedDurationMs * thresholds.syllabic) return "Syllabic";
  return durationMs > expectedDurationMs * thresholds.halting ? "Halting" : "Fluent";
}
export function isSelfCorrection(previous: PracticeAttempt | undefined, current: PracticeAttempt, threshold = .7) {
  return Boolean(previous && previous.studentId === current.studentId && previous.stageId === current.stageId && previous.target === current.target && previous.sessionId === current.sessionId && previous.wordId === current.wordId &&
    previous.attemptNumber + 1 === current.attemptNumber && !previous.correctiveFeedbackTriggered &&
    previous.assessmentSource === "validated_assessment" && current.assessmentSource === "validated_assessment" &&
    previous.accuracy !== null && current.accuracy !== null && previous.accuracy < threshold && current.accuracy >= threshold);
}
export function parsePractice(raw: string | null, studentId: number): PracticeAttempt[] {
  try {
    const data: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((r): r is PracticeAttempt => r && r.studentId === studentId && typeof r.id === "string" &&
      typeof r.sessionId === "string" && typeof r.wordId === "string" && typeof r.target === "string" && [1,2,3].includes(r.stageId) &&
      Number.isFinite(r.timestamp) && r.timestamp > 0 && Number.isInteger(r.attemptNumber) && r.attemptNumber > 0 &&
      Number.isFinite(r.totalDurationMs) && r.totalDurationMs >= 0 && ["recorded","voice_detected","silence","error","interrupted"].includes(r.outcome) &&
      typeof r.correctiveFeedbackTriggered === "boolean" &&
      (r.wordRecognition === undefined || ["matched","different","uncertain","unavailable"].includes(r.wordRecognition)) &&
      (r.assessmentSource === "not_assessed" ? r.accuracy === null && r.asrConfidence === null && r.tier === null && r.selfCorrected === null :
        r.assessmentSource === "validated_assessment" && Number.isFinite(r.accuracy) && r.accuracy >= 0 && r.accuracy <= 1 &&
        Number.isFinite(r.asrConfidence) && r.asrConfidence >= 0 && r.asrConfidence <= 1 && r.totalDurationMs > 0 &&
        ["Syllabic","Halting","Fluent"].includes(r.tier) && typeof r.selfCorrected === "boolean"))
      .filter((r, i, all) => all.findIndex(other => other.id === r.id) === i).sort((a,b)=>a.timestamp-b.timestamp);
  } catch { return []; }
}
export function readPractice(studentId?: number | null): PracticeAttempt[] {
  if (!validLearner(studentId)) return [];
  try { return parsePractice(localStorage.getItem(practiceKey(studentId)), studentId); } catch { return []; }
}
export function weekStart(now: number, offset = 0) {
  const date = new Date(now); date.setHours(0,0,0,0);
  date.setDate(date.getDate() - (date.getDay()+6)%7 + offset*7); return date.getTime();
}
export function summarizePractice(records: PracticeAttempt[]) {
  const assessed = records.filter(r=>r.assessmentSource === "validated_assessment");
  return { attempts: records.length, sessions: new Set(records.map(r=>r.sessionId)).size,
    durationMs: records.reduce((sum,r)=>sum+r.totalDurationMs,0), assessed: assessed.length,
    accuracy: assessed.length ? assessed.reduce((sum,r)=>sum+r.accuracy!,0)/assessed.length : null,
    stars: assessed.length ? assessed.filter(r=>r.selfCorrected).length : null,
    tiers: (["Syllabic","Halting","Fluent"] as const).map(tier=>({tier,count:assessed.filter(r=>r.tier===tier).length})) };
}

export function createPracticeTracker(studentId: number | null | undefined, stageId: number, wordId: string, target: string,
  save: (record: PracticeAttempt) => void, now = Date.now, uuid = () => crypto.randomUUID()) {
  const sessionId = uuid();
  let pending: PracticeAttempt | null = null;
  let attemptNumber = 0;
  let last: PracticeAttempt | null = null;
  return {
    begin() {
      if (pending || !validLearner(studentId)) return;
      pending = { id: uuid(), studentId, sessionId, stageId, wordId, target, timestamp: now(), attemptNumber: ++attemptNumber,
        totalDurationMs: 0, outcome: "interrupted", correctiveFeedbackTriggered: false,
        accuracy: null, asrConfidence: null, tier: null, selfCorrected: null, assessmentSource: "not_assessed" };
      save({...pending});
    },
    finish(outcome: PracticeOutcome) {
      if (!pending) return;
      last = {...pending, outcome, totalDurationMs: Math.max(0,now()-pending.timestamp)};
      save(last);
      pending = null;
    },
    recognize(wordRecognition: NonNullable<PracticeAttempt['wordRecognition']>) {
      if(!last) return;
      last={...last,wordRecognition,correctiveFeedbackTriggered:wordRecognition==='different'};
      save(last);
    },
  };
}
