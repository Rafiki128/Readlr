import { useEffect, useState } from 'react';
import { Save, RefreshCw, ShieldCheck, RotateCcw, X, CheckCircle2, AlertCircle, Users, UserRound, Mountain, Link2, Crown, ArrowRight } from 'lucide-react';
import { CLASSROOM_API, type ClassroomPolicy } from '../hooks/useClassroom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';

import { accessLabel, type ClassroomState as State } from './classroomAccess';
import { AdminProgressReset } from './AdminProgressReset';
const OPEN: ClassroomPolicy = { mode: 'open', stage: null, message: '', surveyUrl: '' };
export function AdminClassroomControls({ token, learners, target, onTargetChange, onSaved }: { token: string; learners: { id: number; name: string; email: string }[]; target: string; onTargetChange: (value: string) => void; onSaved: (state: State) => void }) {
  const [targetSearch, setTargetSearch] = useState('');
  const [overridesOnly, setOverridesOnly] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [draft, setDraft] = useState<ClassroomPolicy>(OPEN);
  const [inherit, setInherit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeError, setNoticeError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const load = async () => {
    setBusy(true); setNoticeError(false);
    try {
      const res = await fetch(`${CLASSROOM_API}/admin/classroom`, { headers, signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Controls could not load');
      setState(data); setNotice('');
    } catch (e) { setNoticeError(true); setNotice((e as Error).message); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [token]);
  useEffect(() => {
    if (!state) return;
    setDraft(target === 'class' ? state.policy : state.overrides[target] ?? state.policy);
    setInherit(target !== 'class' && !state.overrides[target]);
  }, [state, target]);
  useEffect(() => { setNotice(''); }, [target]);
  const save = async () => {
    if (!state || busy) return;
    if (!inherit && draft.mode === 'stages' && !draft.stages?.length) return;
    setBusy(true); setNotice(''); setNoticeError(false);
    try {
      const res = await fetch(`${CLASSROOM_API}/admin/classroom`, {
        method: 'PUT', headers, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ target: target === 'class' ? 'class' : Number(target), revision: state.revision, policy: inherit ? null : draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Controls could not save');
      setState(data); onSaved(data); setNotice('Applied. Connected learners receive the change within about 15 seconds.');
    } catch (e) { setNoticeError(true); setNotice((e as Error).message); }
    finally { setBusy(false); }
  };
  const resetDraft = () => {
    if (!state) return;
    setDraft(target === 'class' ? state.policy : state.overrides[target] ?? state.policy);
    setInherit(target !== 'class' && !state.overrides[target]);
    setNotice('');
  };
  const visibleLearners = learners.filter(l => (!overridesOnly || state?.overrides[String(l.id)]) && `${l.name} ${l.email}`.toLowerCase().includes(targetSearch.toLowerCase()));
  const preview = inherit ? state?.policy : draft;
  const targetName = target === 'class' ? 'Entire class' : learners.find(l => String(l.id) === target)?.name ?? 'Selected learner';
  const controlClass = 'w-full rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-sm';
  return <section id="classroom-controls" className="admin-controls" aria-labelledby="classroom-heading">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="classroom-heading" className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20} className="text-emerald-600" />Classroom controls</h2>
        <p className="mt-1 text-sm text-[#667085]">Manage learning access and stage restarts for your class.</p></div>
      <button onClick={load} disabled={busy} title="Refresh saved controls (discards unsaved edits)" aria-label="Refresh saved controls" className="admin-icon-button"><RefreshCw size={18} /></button>
    </div>
    {state && <>
      <div className="admin-controls-layout"><aside className="admin-targets"><h3>Choose who to manage</h3><input aria-label="Find a learner to manage" placeholder="Search name or email" value={targetSearch} onChange={e => setTargetSearch(e.target.value)} /><label className="admin-override-filter"><input type="checkbox" checked={overridesOnly} onChange={e => setOverridesOnly(e.target.checked)} />Individual overrides only</label><button className={target === 'class' ? 'selected' : ''} disabled={busy} aria-pressed={target === 'class'} onClick={() => onTargetChange('class')}><strong>Entire class</strong><small>{learners.length} registered learners</small></button><p className="admin-target-count" aria-live="polite">{visibleLearners.length} of {learners.length} learners</p><div className="admin-target-list" role="region" aria-label="Learners to manage" tabIndex={0}>{visibleLearners.map(l => <button key={l.id} className={target === String(l.id) ? 'selected' : ''} disabled={busy} aria-pressed={target === String(l.id)} onClick={() => onTargetChange(String(l.id))}><strong>{l.name}</strong><small>{l.email}</small><span>{state.overrides[String(l.id)] ? 'Individual override' : 'Class setting'}</span></button>)}{visibleLearners.length === 0 && <p className="admin-no-targets">No learners match your search.</p>}</div></aside><div className="admin-control-editor">
      <div className="admin-editor-toolbar"><div><p className="admin-editor-kicker">{target === 'class' ? 'CLASS DEFAULT' : 'LEARNER ACCESS'}</p><h3>{target === 'class' ? 'Class-wide access' : learners.find(l => String(l.id) === target)?.name}</h3><small>Currently: {accessLabel(target === 'class' ? state.policy : state.overrides[target] ?? state.policy)}</small></div>
      </div>
      <section className="admin-access-section" aria-labelledby="access-heading">
      <header className="admin-reset-heading"><span className="admin-access-icon"><ShieldCheck size={22} /></span><div><h3 id="access-heading">Learning access</h3><p>Choose which activities are available. Saved progress stays unchanged.</p></div></header>
      {notice && <div role="status" className={`admin-control-notice ${noticeError ? 'is-error' : ''}`}>{noticeError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification" title="Dismiss notification"><X size={17} /></button></div>}
      <div className="admin-reset-scope admin-access-scope">{target === 'class' ? <Users size={19} /> : <UserRound size={19} />}<div><small>Access applies to</small><strong>{targetName}</strong></div><span>{target === 'class' ? 'Individual overrides stay in place' : inherit ? 'Following the class setting' : 'Individual access rule'}</span></div>
      <p className="admin-editor-description">{target === 'class' ? 'Applies to learners using the class setting. Individual overrides are kept.' : 'Choose a personal access rule, or use the class setting to remove an override.'}</p>
      <div className="admin-control-summary"><span className="admin-policy-badge"><ShieldCheck size={15} />{state.policy.mode === 'stages' ? `Unlocked stages: ${state.policy.stages?.join(', ')}` : state.policy.mode === 'stage' ? `Stage ${state.policy.stage} only` : state.policy.mode === 'open' ? 'Normal progression' : state.policy.mode === 'paused' ? 'Activities paused' : 'Survey invitation'}</span><span>{Object.keys(state.overrides).length} individual overrides. <span className="sr-only">Revision {state.revision}.</span></span></div>
      <fieldset disabled={busy} className="admin-access-fields">
        <div><label id="control-mode" className="mb-2 block text-sm font-medium">Access</label><Select value={inherit ? 'inherit' : draft.mode === 'stage' ? 'stages' : draft.mode} onValueChange={value => { setInherit(value === 'inherit'); if (value !== 'inherit') setDraft({ ...draft, mode: value as ClassroomPolicy['mode'], stage: draft.stage ?? 1, stages: draft.stages ?? [draft.stage ?? 1] }); }}><SelectTrigger aria-labelledby="control-mode" className={controlClass}><SelectValue /></SelectTrigger><SelectContent>{target !== 'class' && <SelectItem value="inherit">Use class setting</SelectItem>}<SelectItem value="open">Normal stage progression</SelectItem><SelectItem value="stages">Unlock selected stages</SelectItem><SelectItem value="paused">Pause activities</SelectItem><SelectItem value="survey">Survey invitation</SelectItem></SelectContent></Select></div>
        {!inherit && ['stage', 'stages'].includes(draft.mode) && <div className="admin-stage-options">
          <div className="admin-stage-options-heading"><strong>Stages learners can enter</strong><button type="button" onClick={() => setDraft({ ...draft, mode: 'stages', stage: null, stages: [1,2,3] })}>Unlock all stages</button></div>
          <div className="admin-reset-stage-list">{['Valley of Vowels', 'Blending Bridges', 'CVC Kingdom'].map((name, index) => { const id = index + 1; const Icon = [Mountain, Link2, Crown][index]; const selected = draft.mode === 'stage' ? [draft.stage!] : draft.stages ?? []; return <label key={id} className={`admin-reset-stage stage-${id}${selected.includes(id) ? ' is-selected' : ''}`}><input aria-label={`Stage ${id} ${name}`} type="checkbox" checked={selected.includes(id)} onChange={e => setDraft({ ...draft, mode: 'stages', stage: null, stages: e.target.checked ? [...selected, id].sort() : selected.filter(s => s !== id) })} /><span className="admin-reset-stage-icon"><Icon size={22} /></span><span className="admin-reset-stage-copy"><small>Stage {id}</small><strong>{name}</strong><span>{selected.includes(id) ? 'Available after applying' : 'Unavailable after applying'}</span></span></label>; })}</div>
          <p>Selected stages open immediately, even if earlier stages are unfinished. Progress and rewards are kept.</p>
          {draft.mode === 'stages' && !draft.stages?.length && <p className="text-red-700">Choose at least one stage.</p>}
        </div>}
        {!inherit && <label className="admin-access-message">Message to learners (optional)<textarea rows={2} maxLength={240} value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })} className={`${controlClass} mt-2`} /><span>{draft.message.length}/240</span></label>}
        {!inherit && draft.mode === 'survey' && <label className="text-sm font-medium">Approved HTTPS survey link<input type="url" value={draft.surveyUrl} onChange={e => setDraft({ ...draft, surveyUrl: e.target.value })} className={`${controlClass} mt-2`} placeholder="https://..." /></label>}
      </fieldset>
      <section className="admin-access-preview" aria-label="Access preview"><h3><ArrowRight size={15} />After applying</h3><strong>{preview ? accessLabel(preview) : 'Loading'}</strong><p>{preview?.mode === 'open' ? 'Learners continue from saved progress. Later stages unlock as earlier stages are completed.' : preview?.mode === 'paused' ? 'Learning activities are paused. Learners see a waiting screen and your message.' : preview?.mode === 'survey' ? 'Learners see a survey invitation instead of activities.' : 'Selected stage entrances are unlocked. Other stages are unavailable; levels inside each stage still follow their learning order.'}</p></section>
      <footer className="admin-access-actions"><p><ShieldCheck size={17} /><span>Progress and rewards stay safe.<small>Connected learners receive changes within about 15 seconds.</small></span></p><div><button disabled={busy} onClick={resetDraft} className="admin-icon-button" aria-label="Discard edits" title="Discard edits"><RotateCcw size={18} /></button><button disabled={busy || (!inherit && draft.mode === 'stages' && !draft.stages?.length)} onClick={() => setConfirming(true)} className="admin-apply"><Save size={17} />{busy ? 'Saving...' : 'Apply controls'}</button></div></footer>
      </section>
      <AdminProgressReset key={target} token={token} target={target} name={target === 'class' ? 'Entire class' : learners.find(l => String(l.id) === target)?.name ?? 'Selected learner'} />
      </div></div>
    </>}
    {!state && !notice && <p className="mt-4 text-sm">Loading controls...</p>}
    {!state && notice && <p role="alert" className="admin-control-notice is-error">{notice}</p>}
    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent className="admin-confirm-dialog">
        <span className="admin-confirm-icon"><ShieldCheck size={28} /></span>
        <AlertDialogTitle>Update {target === 'class' ? 'classroom' : 'learner'} access?</AlertDialogTitle>
        <AlertDialogDescription>
          {target === 'class' ? 'Entire class' : learners.find(l => String(l.id) === target)?.name}: {inherit ? 'Use the class setting.' : draft.mode === 'stages' ? `Unlock stages ${draft.stages?.join(', ')}. Other stages will be unavailable.` : draft.mode === 'stage' ? `Unlock Stage ${draft.stage} only.` : draft.mode === 'open' ? 'Follow normal stage progression.' : draft.mode === 'paused' ? 'Pause learning activities.' : 'Show the survey invitation.'}
        </AlertDialogDescription>
        <p className="admin-confirm-safe">Saved progress, completed lessons, and rewards stay unchanged. Unlocking a stage opens its entrance; lessons inside still follow their learning order.</p>
        {target === 'class' && <p className="admin-confirm-note">Individual learner overrides still take priority. Changes reach connected learners within about 15 seconds.</p>}
        <AlertDialogFooter><AlertDialogCancel>Keep current settings</AlertDialogCancel><AlertDialogAction className="admin-confirm-apply" onClick={() => void save()}>Confirm changes</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
