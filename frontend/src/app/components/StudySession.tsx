import { useEffect, useState } from 'react';
import { BookOpen, Clock, LogOut, Sparkles, Star, Tent } from 'lucide-react';
import type { StudyState } from '../hooks/useStudySession';
import { StudyWordTest } from './StudyWordTest';
import { ReadingJourney } from './ReadingJourney';
import { CampOrientation } from './CampOrientation';
import { StudentSurvey } from './StudentSurvey';
import { READING_CHAPTERS } from './aralCurriculum';
import { readLearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import './study.css';

interface Props {
  token: string; userId: number; learnerId: number; study: StudyState; surveyAssigned: boolean;
  onUpdate: (state: StudyState) => void; onRefresh: () => void; onLogout: () => void;
}

function useCountdown(endsAt: string | null | undefined, onEnd: () => void) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const left = endsAt ? Math.max(0, Date.parse(endsAt) - now) : null;
  useEffect(() => { if (left === 0) onEnd(); }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** Full-screen study flow that replaces the normal learner app while a validation session is running. */
export function StudySession({ token, userId, learnerId, study, surveyAssigned, onUpdate, onRefresh, onLogout }: Props) {
  const header = <header className="study-header"><span><Star size={18} /> Readlr</span><button onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button></header>;
  if (study.phase === 'learning') return <StudyLearning learnerId={learnerId} study={study} onRefresh={onRefresh} header={header} />;
  if (study.phase === 'done') return <StudyDone token={token} userId={userId} surveyAssigned={surveyAssigned || study.survey === true} header={header} />;
  if (!study.test) return <main className="study-shell">{header}<section className="study-card"><p>Getting ready...</p></section></main>;
  return <main className="study-shell">{header}<StudyWordTest key={study.test.phase} token={token} test={study.test} onUpdate={onUpdate} onRefresh={onRefresh} /></main>;
}

function StudyLearning({ learnerId, study, onRefresh, header }: { learnerId: number; study: StudyState; onRefresh: () => void; header: React.ReactNode }) {
  const [open, setOpen] = useState<'camp' | number | null>(null);
  const left = useCountdown(study.learningEndsAt, onRefresh);
  const books = (study.books ?? []).map(id => READING_CHAPTERS.findIndex(chapter => chapter.id === id)).filter(index => index >= 0);
  const campDone = readLearnerCurriculumState(learnerId).campOrientationStep >= 3;
  const timer = left !== null && <p className={`study-timer ${left < 120000 ? 'is-ending' : ''}`} role="timer" aria-live="off"><Clock size={18} />{left < 120000 ? 'Almost time for the last word game! ' : 'Learning time '}{clock(left)}</p>;
  if (open !== null) {
    // The reading screens are designed for the full window, so the timer floats instead of taking space.
    return <div className="study-learning-open">
      <div className="study-floating">{timer}<button onClick={() => setOpen(null)}>My books</button></div>
      <div className="study-learning-body">
        {open === 'camp'
          ? <CampOrientation learnerId={learnerId} onReady={() => setOpen(null)} />
          : <ReadingJourney key={open} learnerId={learnerId} initialTab="kingdom" initialChapter={open} onBack={() => setOpen(null)} />}
      </div>
    </div>;
  }
  return <main className="study-shell">{header}
    <section className="study-card study-books" aria-labelledby="study-books-heading">
      <h1 id="study-books-heading">Learning time</h1>
      {timer}
      <p>Start at the top and go in order. Take your time!</p>
      <ol className="study-book-list">
        <li><button onClick={() => setOpen('camp')}><Tent size={28} /><span><strong>Learning Camp</strong><small>Meet your first sounds</small></span>{campDone && <em>Done</em>}</button></li>
        {books.map(index => <li key={index}><button onClick={() => setOpen(index)}><BookOpen size={28} /><span><strong>Book {index + 1}: {READING_CHAPTERS[index].title}</strong><small>{READING_CHAPTERS[index].skill}</small></span></button></li>)}
      </ol>
    </section>
  </main>;
}

function StudyDone({ token, userId, surveyAssigned, header }: { token: string; userId: number; surveyAssigned: boolean; header: React.ReactNode }) {
  const [survey, setSurvey] = useState(false);
  if (survey) return <StudentSurvey token={token} userId={userId} onBack={() => setSurvey(false)} />;
  return <main className="study-shell">{header}
    <section className="study-card study-intro">
      <Sparkles size={48} className="study-sparkle" />
      <h1>You did it!</h1>
      <p>{surveyAssigned ? 'Thank you for reading with Readlr today. Now tell us what you think!' : 'Thank you for reading with Readlr today. Please wait for your teacher.'}</p>
      {surveyAssigned && <button className="study-primary" onClick={() => setSurvey(true)}>Tell us what you think</button>}
    </section>
  </main>;
}
