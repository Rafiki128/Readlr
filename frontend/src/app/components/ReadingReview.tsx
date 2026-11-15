import { useState } from 'react';
import { ArrowLeft, Eye, RotateCcw } from 'lucide-react';
import { ReadingJourney } from './ReadingJourney';
import { Book1Guide } from './Book1Guide';
import { ChronicleHome } from './ChronicleHome';
import { SoundLearningCamp } from './SoundLearningCamp';
import { StickerBookView } from './StickerBook';
import { ReadingProgressDashboard } from './ReadingProgressDashboard';
import { CurriculumSoundLibrary } from './CurriculumSoundLibrary';
import { WorldDestination } from './WorldDestination';
import { CurriculumAchievements } from './CurriculumAchievements';
import { WelcomeScreen } from './WelcomeScreen';
import { emptyLearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import { READING_CHAPTERS } from './aralCurriculum';
import './readingReview.css';

export function ReadingReview({onBack,onSignIn}:{onBack:()=>void;onSignIn?:()=>void}) {
  const reviewState={...emptyLearnerCurriculumState(),campOrientationStep:3,guidedStops:['gate:mango','gate:apple','gate:top']};
  const reviewBooks=READING_CHAPTERS.map(chapter=>chapter.id);
  const [session,setSession]=useState(0);
  const [place,setPlace]=useState<'home'|'camp'|'book'|'progress'|'stickers'|'sounds'|'achievements'>('home');
  const [book,setBook]=useState(0);
  const [welcome,setWelcome]=useState(false);
  if(welcome)return <div className="reading-review"><header className="reading-review-bar"><strong>Welcome screen preview</strong><button className="reading-secondary" onClick={()=>setWelcome(false)}><ArrowLeft size={18}/>Back to review</button></header><div className="reading-review-content"><WelcomeScreen userName="Reader" onStart={()=>{setWelcome(false);setPlace('home');}}/></div></div>;
  return <div className="reading-review">
    <header className="reading-review-bar">
      <div><strong><Eye size={18}/> Readlr review</strong><p>All chapters open. Learner progress and rewards stay unchanged.</p></div>
      <div className="reading-review-actions">
        <button onClick={()=>setWelcome(true)}>Welcome screen</button>
        {onSignIn&&<button onClick={onSignIn}>Sign in for AI word checking</button>}
        <button onClick={()=>{setSession(value=>value+1);setPlace('home');}} title="Reset this review session"><RotateCcw size={18}/>Start fresh</button>
        <button onClick={onBack}><ArrowLeft size={18}/>Exit review</button>
      </div>
    </header>
    <p className="reading-review-note">Work in progress: some pictures and voices are provisional. Microphone checks send your recording to the speech service; results are for review only.</p>
    <div className="reading-review-content">{place==='home'?<ChronicleHome reviewMode initialIndex={book} onFocusBook={setBook} onProgress={()=>setPlace('progress')} onStickers={()=>setPlace('stickers')} onSounds={()=>setPlace('sounds')} onAchievements={()=>setPlace('achievements')} onOpenCamp={()=>setPlace('camp')} onOpenBook={index=>{setBook(index);setPlace('book');}}/>:place==='camp'?<SoundLearningCamp key={session} reviewMode onBack={()=>setPlace('home')}/>:place==='progress'?<WorldDestination kind="progress" onBack={()=>setPlace('home')}>{back=><ReadingProgressDashboard learnerId={null} token={null} userName="Review" state={reviewState} completedBooks={reviewBooks} onBack={back}/>}</WorldDestination>:place==='stickers'?<WorldDestination kind="stickers" onBack={()=>setPlace('home')}>{back=><StickerBookView learnerName="Review" curriculumState={reviewState} completedBooks={reviewBooks} onBack={back}/>}</WorldDestination>:place==='sounds'?<WorldDestination kind="sounds" onBack={()=>setPlace('home')}>{back=><CurriculumSoundLibrary completedBooks={reviewBooks} onBack={back}/>}</WorldDestination>:place==='achievements'?<CurriculumAchievements state={reviewState} completedBooks={reviewBooks} onBack={()=>setPlace('home')}/>:<ReadingJourney key={`${session}-${book}`} learnerId={0} initialChapter={book} reviewMode onBack={()=>setPlace('home')}/>}</div>
    {place==='book'&&book===0&&<Book1Guide learnerId={0} save={false}/>}
  </div>;
}
