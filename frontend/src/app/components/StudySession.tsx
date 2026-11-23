import { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { StudyState } from '../hooks/useStudySession';
import { CLASSROOM_API } from '../hooks/useClassroom';
import { StudyWordTest } from './StudyWordTest';
import { ReadingWorldBackdrop } from './ReadingWorldBackdrop';
import { BackgroundMusicToggle } from './BackgroundMusicToggle';
import { WelcomeScreen } from './WelcomeScreen';
import { LearnerBrand } from './LearnerBrand';
import './kidHeader.css';
import './study.css';

export function StudySession({token, study, onUpdate, onRefresh, onLogout, onEnter}:{
  token:string; study:StudyState; onUpdate:(state:StudyState)=>void; onRefresh:()=>void; onLogout:()=>void; onEnter:()=>void;
}) {
  const [error,setError]=useState('');
  async function enter(){
    try {
      const r=await fetch(CLASSROOM_API+'/study/me/enter',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({phase:study.phase}),signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error();
      const state=await r.json(); onEnter(); onUpdate(state);
    } catch {setError('Could not enter yet. Please check your connection and try again.');onRefresh();}
  }
  if (!study.test) return <><WelcomeScreen key={error} validationComplete onStart={()=>void enter()}/>{error&&<p className="study-entry-error" role="alert">{error}</p>}</>;
  return <main className="study-shell study-world"><ReadingWorldBackdrop welcome/>
    <header className="world-navigation kid-header study-world-header backdrop-blur-md border-b border-[var(--hairline)] sticky top-0 z-50">
      <div className="kid-header-row"><div className="kid-logo"><LearnerBrand/></div>
        <div className="kid-header-end"><BackgroundMusicToggle/><button className="grid h-11 w-11 place-items-center rounded-full bg-white text-violet-700 shadow-md" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={18}/></button></div>
      </div>
    </header>
    <StudyWordTest key={study.test.phase} token={token} test={study.test} onUpdate={onUpdate} onRefresh={onRefresh}/>
  </main>;
}
