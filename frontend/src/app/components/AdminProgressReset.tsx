import { useState } from 'react';
import { RotateCcw, BookOpen, Users, UserRound, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { CLASSROOM_API } from '../hooks/useClassroom';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from './ui/alert-dialog';
import { READING_CHAPTERS } from './aralCurriculum';
import { chronicleSounds } from './chronicleLessons';

type ResetScope = 'all' | 'book' | 'challenge';

export function AdminProgressReset({ token, target, name }: { token: string; target: string; name: string }) {
  const [scope, setScope] = useState<ResetScope>('all');
  const [chapter, setChapter] = useState('gate');
  const [stop, setStop] = useState('mango');
  const [confirm, setConfirm] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [failed, setFailed] = useState(false);
  async function reset() {
    if (busy || word !== 'RESET') return;
    if (scope !== 'all' && !chapter) return;
    if (scope === 'challenge' && !stop) return;
    setBusy(true); setResult(''); setFailed(false);
    try {
      const response = await fetch(`${CLASSROOM_API}/admin/classroom/reset`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          target: target === 'class' ? 'class' : Number(target),
          scope: scope === 'all' ? 'learning-progress' : scope,
          chapter: scope === 'all' ? undefined : chapter,
          stop: scope === 'challenge' ? stop : undefined,
          confirmation: word,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Restart could not be confirmed.');
      setResult(data.message); setConfirm(false); setWord('');
      window.dispatchEvent(new CustomEvent('readlr:admin-progress-reset', {
        detail: { scope, chapter: scope === 'all' ? undefined : chapter, stop: scope === 'challenge' ? stop : undefined },
      }));
    } catch (error) {
      setFailed(true);
      setResult(error instanceof Error ? error.message : 'Restart could not be confirmed. Refresh progress before trying again.');
    } finally { setBusy(false); }
  }
  return <section className="admin-reset-tools" aria-labelledby="reset-heading">
    <header className="admin-reset-heading"><span className="admin-reset-icon"><RotateCcw size={21}/></span><div><h3 id="reset-heading">Restart progress</h3><p>Restart an account, one book, or one challenge.</p></div></header>
    {!confirm && result && <div role="status" className={`admin-control-notice ${failed?'is-error':''}`}>{failed?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<span>{result}</span></div>}
    <div className="admin-reset-scope">{target==='class'?<Users size={19}/>:<UserRound size={19}/>}<div><small>Restart applies to</small><strong>{name}</strong></div><span>{target==='class'?'All current learners, including individual overrides':'Only this learner'}</span></div>
    <fieldset disabled={busy} className="admin-reset-stages"><legend>Choose progress to restart</legend>
      <label className={`admin-reset-stage${scope==='all'?' is-selected':''}`}><input type="radio" name="reset-scope" checked={scope==='all'} onChange={()=>setScope('all')}/><span className="admin-reset-stage-icon"><Users size={22}/></span><span className="admin-reset-stage-copy"><strong>All gameplay levels and ten book checkpoints</strong><span>Restart the entire account's learning progress.</span></span></label>
      <label className={`admin-reset-stage${scope==='book'?' is-selected':''}`}><input type="radio" name="reset-scope" checked={scope==='book'} onChange={()=>setScope('book')}/><span className="admin-reset-stage-icon"><BookOpen size={22}/></span><span className="admin-reset-stage-copy"><strong>One book</strong><span>Reset every stop and the final gate in a single book.</span></span></label>
      {scope==='book'&&<label className="admin-reset-picker">Book<select value={chapter} onChange={e=>setChapter(e.target.value)}>{READING_CHAPTERS.map((book,index)=><option key={book.id} value={book.id}>Book {index+1} - {book.title}</option>)}</select></label>}
      <label className={`admin-reset-stage${scope==='challenge'?' is-selected':''}`}><input type="radio" name="reset-scope" checked={scope==='challenge'} onChange={()=>setScope('challenge')}/><span className="admin-reset-stage-icon"><RotateCcw size={22}/></span><span className="admin-reset-stage-copy"><strong>One challenge or stop</strong><span>Reset only a selected sound lesson, practice, adventure, or final gate.</span></span></label>
      {scope==='challenge'&&<div className="admin-reset-pickers"><label>Book<select value={chapter} onChange={e=>{const next=e.target.value;setChapter(next);const index=READING_CHAPTERS.findIndex(book=>book.id===next);setStop(chronicleSounds(index).length?chronicleSounds(index)[0].word:'blend');}}>{READING_CHAPTERS.map((book,index)=><option key={book.id} value={book.id}>Book {index+1} - {book.title}</option>)}</select></label><label>Challenge<select value={stop} onChange={e=>setStop(e.target.value)}>
        {(() => {const index=READING_CHAPTERS.findIndex(book=>book.id===chapter);return [
          ...chronicleSounds(index).map(card=>({id:card.word,label:`${card.letter} for ${card.word}`})),
          {id:'blend',label:'Sound joining'},
          {id:'games',label:'Word adventure'},
          {id:'check',label:'Final gate'},
        ].map(option=><option key={option.id} value={option.id}>{option.label}</option>);})()}
      </select></label></div>}
    </fieldset>
    <div className="admin-reset-impact"><div><RotateCcw size={18}/><div><h4>Starts again</h4><p>{scope==='all'?'Every gameplay level, completed book stop, and checkpoint resets.':scope==='book'?`The selected book and its final gate restart from the beginning.`:'Only the selected challenge or stop loses its completion.'}</p></div></div><div><BookOpen size={18}/><div><h4>Stays saved</h4><p>{scope==='all'?'Guided activity details, earned rewards, recordings, profile details, and access settings stay saved.':'Other books and challenges, rewards, recordings, profile details, and access settings stay saved.'}</p></div></div></div>
    <footer className="admin-reset-actions"><p>This cannot be undone here.<small>Access overrides can keep books and stops open after the restart.</small></p><button type="button" className="admin-reset-review" disabled={busy} onClick={()=>{setWord('');setResult('');setConfirm(true);}}>Review restart<ArrowRight size={17}/></button></footer>
    <AlertDialog open={confirm} onOpenChange={open=>{if(!busy)setConfirm(open);}}>
      <AlertDialogContent className="admin-confirm-dialog">
        <AlertDialogTitle>{scope==='all'?`Restart all progress for ${name}?`:scope==='book'?`Restart ${READING_CHAPTERS.find(book=>book.id===chapter)?.title} for ${name}?`:`Restart this ${chapter} challenge for ${name}?`}</AlertDialogTitle>
        <AlertDialogDescription>{scope==='all'?`All gameplay levels, completed book stops, and all ten book checkpoints will restart.`:scope==='book'?`Every guided stop and the final gate in this book will restart.`:`Only ${stop} in this book will lose its completion. The rest of the learner's progress stays unchanged.`} {target==='class'?'This affects every current learner, including learners with individual access overrides.':'Other learners are not affected.'}</AlertDialogDescription>
        <label>Type RESET to confirm<input aria-label="Reset confirmation" className="admin-reset-confirmation" autoComplete="off" value={word} disabled={busy} onChange={e=>setWord(e.target.value)}/></label>
        {result&&<p role="alert">{result}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><button className="admin-confirm-apply admin-reset-submit" disabled={busy||word!=='RESET'} onClick={()=>void reset()}>{busy?'Restarting...':'Restart all progress'}</button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
