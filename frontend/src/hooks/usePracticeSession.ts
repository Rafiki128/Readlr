import { useEffect, useMemo } from "react";
import { PRACTICE_CHANGED, practiceKey, readPractice, createPracticeTracker, type PracticeAttempt } from "./practiceRecords";

export function usePracticeSession(studentId: number | null | undefined, stageId: number, wordId: string, target: string) {
  const tracker = useMemo(() => {
    const save = (record: PracticeAttempt) => {
      try {
        const records = readPractice(studentId).filter(item=>item.id!==record.id);
        localStorage.setItem(practiceKey(record.studentId), JSON.stringify([...records,record]));
        window.dispatchEvent(new Event(PRACTICE_CHANGED));
      } catch { /* Storage failure must not interrupt the child's activity. */ }
    };
    return createPracticeTracker(studentId, stageId, wordId, target, save);
  }, [studentId,stageId,wordId,target]);
  useEffect(()=>()=>tracker.finish("interrupted"),[tracker]);
  return tracker;
}
