import { useEffect, useState } from 'react';
import { RotateCcw, ShieldCheck, Mountain, Link2, Crown, Users, UserRound, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { CLASSROOM_API } from '../hooks/useClassroom';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from './ui/alert-dialog';

const RESET_STAGES = [
  { id: 1, name: 'Valley of Vowels', detail: 'Dojo training and vowel trails', Icon: Mountain },
  { id: 2, name: 'Blending Bridges', detail: 'Workshop training and bridge challenges', Icon: Link2 },
  { id: 3, name: 'CVC Kingdom', detail: 'Word challenges and crown finale', Icon: Crown },
];

export function AdminProgressReset({ token, target, name }: { token: string; target: string; name: string }) {
  const [stages, setStages] = useState<number[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  useEffect(() => { setStages([]); setResult(''); setWord(''); }, [target]);
  async function reset() {
    if (busy || word !== 'RESET' || !stages.length) return;
    setBusy(true); setResult('');
    try {
      const response = await fetch(`${CLASSROOM_API}/admin/classroom/reset`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ target: target === 'class' ? 'class' : Number(target), stages, confirmation: word }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Reset could not be confirmed.');
      setResult(data.message); setConfirm(false); setStages([]);
      window.dispatchEvent(new Event('readlr:admin-progress-reset'));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Reset could not be confirmed. Refresh progress before trying again.');
    } finally { setBusy(false); }
  }
  return <section className="admin-reset-tools" aria-labelledby="reset-heading">
    <header className="admin-reset-heading"><span className="admin-reset-icon"><RotateCcw size={21} /></span><div><h3 id="reset-heading">Restart learning progress</h3><p>Start selected stages again without losing earned rewards.</p></div></header>
    {!confirm && result && <div role="status" className="admin-control-notice"><CheckCircle2 size={18} /><span>{result}</span><button type="button" onClick={() => setResult('')} aria-label="Dismiss reset notification" title="Dismiss reset notification"><X size={17} /></button></div>}
    <div className="admin-reset-scope">{target === 'class' ? <Users size={19} /> : <UserRound size={19} />}<div><small>Reset applies to</small><strong>{name}</strong></div><span>{target === 'class' ? 'Includes individual overrides' : 'Only this learner'}</span></div>
    <fieldset disabled={busy} className="admin-reset-stages"><legend>Choose stages to restart</legend>
      <label className="admin-reset-all"><input aria-label="All stages" type="checkbox" checked={stages.length === 3} ref={node => { if (node) node.indeterminate = stages.length > 0 && stages.length < 3; }} onChange={e => setStages(e.target.checked ? [1,2,3] : [])} />All stages<span>{stages.length} of 3 selected</span></label>
      <div className="admin-reset-stage-list">{RESET_STAGES.map(({id, name: stageName, detail, Icon}) => <label key={id} className={`admin-reset-stage stage-${id}${stages.includes(id) ? ' is-selected' : ''}`}><input aria-label={`Stage ${id}`} type="checkbox" checked={stages.includes(id)} onChange={e => setStages(e.target.checked ? [...stages,id].sort() : stages.filter(s => s !== id))} /><span className="admin-reset-stage-icon"><Icon size={22} /></span><span className="admin-reset-stage-copy"><small>Stage {id}</small><strong>{stageName}</strong><span>{detail}</span></span></label>)}</div>
    </fieldset>
    <div className="admin-reset-impact"><div><RotateCcw size={17} /><div><h4>Starts again</h4><p>Selected lesson completion and map progress.</p></div></div><div><ShieldCheck size={18} /><div><h4>Stays safe</h4><p>Stickers, points, avatar frames, practice history, and access settings.</p></div></div></div>
    <footer className="admin-reset-actions"><p aria-live="polite">{stages.length ? `${stages.length === 3 ? 'All stages' : `Stage${stages.length > 1 ? 's' : ''} ${stages.join(', ')}`} selected for ${name}.` : 'No stages selected.'}<small>A reset requires confirmation and cannot be undone here.</small></p><button type="button" className="admin-reset-review" disabled={busy || !stages.length} onClick={() => { setWord(''); setResult(''); setConfirm(true); }}>Review reset<ArrowRight size={17} /></button></footer>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}>
      <AlertDialogContent className="admin-confirm-dialog">
        <AlertDialogTitle>Restart learning for {name}?</AlertDialogTitle>
        <AlertDialogDescription>{stages.length === 1 ? 'Stage' : 'Stages'} {stages.join(', ')} will return to the beginning. {target === 'class' ? 'This includes all current learner profiles, even learners with individual access overrides.' : 'Other learners are not affected.'} This cannot be undone here.</AlertDialogDescription>
        <p className="admin-confirm-safe"><ShieldCheck size={18} />Earned rewards and practice history are preserved. Connected devices refresh within about 15 seconds. Offline devices update when they reconnect.</p>
        <label className="text-sm">Type RESET to confirm<input aria-label="Reset confirmation" className="admin-reset-confirmation" autoComplete="off" value={word} disabled={busy} onChange={e => setWord(e.target.value)} /></label>
        {result && <p role="alert">{result}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><button className="admin-confirm-apply admin-reset-submit" disabled={busy || word !== 'RESET'} onClick={() => void reset()}>{busy ? 'Resetting...' : 'Reset progress'}</button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
