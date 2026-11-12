import { useEffect, useState } from 'react';
import { Save, RefreshCw, ShieldCheck, RotateCcw, X, CheckCircle2, AlertCircle, Users, UserRound, ArrowRight, ClipboardList } from 'lucide-react';
import { CLASSROOM_API, type ClassroomPolicy } from '../hooks/useClassroom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';

import { accessLabel, type ClassroomState as State } from './classroomAccess';
import { AdminProgressReset } from './AdminProgressReset';
import { AdminSurveyAssignment } from './AdminSurvey';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { READING_CHAPTERS } from './aralCurriculum';
import { adminReadingStops } from './adminReadingStops';
import './adminReadingDetail.css';
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
  const [section, setSection] = useState('access');
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
    if (!inherit && ['stage','stages','survey'].includes(draft.mode)) return;
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
        <p className="mt-1 text-sm text-[#667085]">Manage book access, practice, and progress for your class.</p></div>
      <button onClick={load} disabled={busy} title="Refresh saved controls (discards unsaved edits)" aria-label="Refresh saved controls" className="admin-icon-button"><RefreshCw size={18} /></button>
    </div>
    {state && <>
      <div className="admin-controls-layout"><aside className="admin-targets"><h3>Choose who to manage</h3><input aria-label="Find a learner to manage" placeholder="Search name or email" value={targetSearch} onChange={e => setTargetSearch(e.target.value)} /><label className="admin-override-filter"><input type="checkbox" checked={overridesOnly} onChange={e => setOverridesOnly(e.target.checked)} />Individual overrides only</label><button className={target === 'class' ? 'selected' : ''} disabled={busy} aria-pressed={target === 'class'} onClick={() => onTargetChange('class')}><strong>Entire class</strong><small>{learners.length} registered learners</small></button><p className="admin-target-count" aria-live="polite">{visibleLearners.length} of {learners.length} learners</p><div className="admin-target-list" role="region" aria-label="Learners to manage" tabIndex={0}>{visibleLearners.map(l => <button key={l.id} className={target === String(l.id) ? 'selected' : ''} disabled={busy} aria-pressed={target === String(l.id)} onClick={() => onTargetChange(String(l.id))}><strong>{l.name}</strong><small>{l.email}</small><span>{state.overrides[String(l.id)] ? 'Individual override' : 'Class setting'}</span></button>)}{visibleLearners.length === 0 && <p className="admin-no-targets">No learners match your search.</p>}</div></aside><div className="admin-control-editor">
      <div className="admin-editor-toolbar"><div><p className="admin-editor-kicker">{target === 'class' ? 'CLASS DEFAULT' : 'LEARNER ACCESS'}</p><h3>{target === 'class' ? 'Class-wide access' : learners.find(l => String(l.id) === target)?.name}</h3><small>Currently: {accessLabel(target === 'class' ? state.policy : state.overrides[target] ?? state.policy)}</small></div>
      </div>
      <Tabs value={section} onValueChange={setSection} className="admin-section-tabs">
      <TabsList aria-label="Classroom control sections" className="admin-section-nav">
        <TabsTrigger value="access"><ShieldCheck size={19}/><span>Learning access</span></TabsTrigger>
        <TabsTrigger value="survey"><ClipboardList size={19}/><span>Survey</span></TabsTrigger>
        <TabsTrigger value="reset"><RotateCcw size={19}/><span>Restart progress</span></TabsTrigger>
      </TabsList>
      <TabsContent value="access" forceMount className="admin-section-panel">
      <section className="admin-access-section" aria-labelledby="access-heading">
      <header className="admin-reset-heading"><span className="admin-access-icon"><ShieldCheck size={22} /></span><div><h3 id="access-heading">Learning access</h3><p>Choose which activities are available. Saved progress stays unchanged.</p></div></header>
      {notice && <div role="status" className={`admin-control-notice ${noticeError ? 'is-error' : ''}`}>{noticeError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification" title="Dismiss notification"><X size={17} /></button></div>}
      <div className="admin-reset-scope admin-access-scope">{target === 'class' ? <Users size={19} /> : <UserRound size={19} />}<div><small>Access applies to</small><strong>{targetName}</strong></div><span>{target === 'class' ? 'Individual overrides stay in place' : inherit ? 'Following the class setting' : 'Individual access rule'}</span></div>
      <p className="admin-editor-description">{target === 'class' ? 'Applies to learners using the class setting. Individual overrides are kept.' : 'Choose a personal access rule, or use the class setting to remove an override.'}</p>
      <div className="admin-control-summary"><span className="admin-policy-badge"><ShieldCheck size={15} />{accessLabel(state.policy)}</span><span>{Object.keys(state.overrides).length} individual overrides. <span className="sr-only">Revision {state.revision}.</span></span></div>
      <fieldset disabled={busy} className="admin-access-fields">
        <div><label id="control-mode" className="mb-2 block text-sm font-medium">Access</label><Select value={inherit ? 'inherit' : draft.mode === 'stage' || draft.mode === 'stages' ? 'previous' : draft.mode} onValueChange={value => { setInherit(value === 'inherit'); if (value !== 'inherit') setDraft({ mode: value as ClassroomPolicy['mode'], stage: null, message: draft.message, surveyUrl: '', readingUnlockThrough: draft.readingUnlockThrough, readingOpenChallenges: draft.readingOpenChallenges, readingOpenStops: draft.readingOpenStops }); }}><SelectTrigger aria-labelledby="control-mode" className={controlClass}><SelectValue /></SelectTrigger><SelectContent>{target !== 'class' && <SelectItem value="inherit">Use class setting</SelectItem>}<SelectItem value="open">Normal book progression</SelectItem><SelectItem value="paused">Pause activities</SelectItem>{['stage','stages'].includes(draft.mode)&&<SelectItem value="previous" disabled>Previous access rule - choose a current setting</SelectItem>}{draft.mode==='survey'&&<SelectItem value="survey" disabled>Previous survey rule - choose a current setting</SelectItem>}</SelectContent></Select></div>
        {!inherit&&['stage','stages'].includes(draft.mode)&&<p role="status">This account has an access rule from the previous curriculum. Choose normal book progression or pause activities, then apply to replace it. Saved progress and rewards are unchanged.</p>}
        {!inherit && draft.mode==='open' && <div className="admin-level-row">
          <label id="unlock-reading-chapters">Reading Chronicles: unlock books through<small>Opens books in order without awarding completion. Leave this on saved progress for the normal ten-book journey.</small></label>
          <Select value={String(draft.readingUnlockThrough??0)} onValueChange={value=>setDraft({...draft,readingUnlockThrough:Number(value)})}>
            <SelectTrigger aria-labelledby="unlock-reading-chapters"><SelectValue/></SelectTrigger><SelectContent>
              <SelectItem value="0">Follow checkpoint progress</SelectItem>
              {READING_CHAPTERS.map((chapter,index)=><SelectItem key={chapter.id} value={String(index+1)}>Through Book {index+1}: {chapter.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>}
        {!inherit && draft.mode==='open' && <fieldset className="admin-level-access">
          <legend>Book challenge overrides</legend>
          <p>Open an entire book or select individual stops. Other stops follow normal progression. Access never awards completion or rewards.</p>
          {READING_CHAPTERS.map((chapter,index)=>{
            const stops=adminReadingStops(index);
            const all=draft.readingOpenChallenges?.includes(index+1)??false;
            const selected=stops.filter(stop=>all||draft.readingOpenStops?.includes(`${chapter.id}:${stop.id}`)).length;
            return <details className="admin-stop-override" key={chapter.id}>
              <summary><strong>Book {index+1}: {chapter.title}</strong><span>{selected} / {stops.length} stops selected</span></summary>
              <label><input type="checkbox" checked={selected===stops.length} ref={node=>{if(node)node.indeterminate=selected>0&&selected<stops.length;}} onChange={e=>setDraft({...draft,readingOpenChallenges:e.target.checked?[...(draft.readingOpenChallenges??[]),index+1]:(draft.readingOpenChallenges??[]).filter(book=>book!==index+1),readingOpenStops:(draft.readingOpenStops??[]).filter(key=>!key.startsWith(`${chapter.id}:`))})}/>All stops, including the final gate</label>
              <div className="admin-stop-options">{stops.map((stop,i)=><label key={stop.id}><input type="checkbox" checked={all||!!draft.readingOpenStops?.includes(`${chapter.id}:${stop.id}`)} onChange={e=>{
                const key=`${chapter.id}:${stop.id}`;
                const current=all?[...(draft.readingOpenStops??[]),...stops.map(s=>`${chapter.id}:${s.id}`)]:draft.readingOpenStops??[];
                setDraft({...draft,readingOpenChallenges:(draft.readingOpenChallenges??[]).filter(book=>book!==index+1),readingOpenStops:[...new Set(e.target.checked?[...current,key]:current.filter(s=>s!==key))]});
              }}/><span><strong>{i+1}. {stop.label}</strong><small>{stop.kind}</small></span></label>)}</div>
            </details>;
          })}
        </fieldset>}
        {!inherit && <label className="admin-access-message">Message to learners (optional)<textarea rows={2} maxLength={240} value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })} className={`${controlClass} mt-2`} /><span>{draft.message.length}/240</span></label>}
        {!inherit && draft.mode === 'survey' && <p className="text-sm">This saved rule uses an older external invitation. Choose normal progression or another learning access mode, then assign the in-app survey in the Survey tab.</p>}
      </fieldset>
      <section className="admin-access-preview" aria-label="Access preview"><h3><ArrowRight size={15} />After applying</h3><strong>{preview ? accessLabel(preview) : 'Loading'}</strong><p>{preview?.mode === 'open' ? 'Learners continue from saved progress. Later books unlock when their preceding final gates are passed.' : preview?.mode === 'paused' ? 'Learning activities are paused. Learners see a waiting screen and your message.' : preview?.mode === 'survey' ? 'Learners see a survey invitation instead of activities.' : 'The previous access rule stays unchanged until you choose and apply a current setting.'}</p></section>
      <footer className="admin-access-actions"><p><ShieldCheck size={17} /><span>Progress and rewards stay safe.<small>Connected learners receive changes within about 15 seconds.</small></span></p><div><button disabled={busy} onClick={resetDraft} className="admin-icon-button" aria-label="Discard edits" title="Discard edits"><RotateCcw size={18} /></button><button disabled={busy || (!inherit && !['open','paused'].includes(draft.mode))} onClick={() => setConfirming(true)} className="admin-apply"><Save size={17} />{busy ? 'Saving...' : 'Apply controls'}</button></div></footer>
      </section>
      </TabsContent>
      <TabsContent value="reset" className="admin-section-panel"><AdminProgressReset key={target} token={token} target={target} name={targetName}/></TabsContent>
      <TabsContent value="survey" forceMount className="admin-section-panel admin-survey-panel">
      <AdminSurveyAssignment key={`survey-${target}`} token={token} target={target} name={targetName}/>
      </TabsContent>
      </Tabs>
      </div></div>
    </>}
    {!state && !notice && <p className="mt-4 text-sm">Loading controls...</p>}
    {!state && notice && <p role="alert" className="admin-control-notice is-error">{notice}</p>}
    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent className="admin-confirm-dialog">
        <span className="admin-confirm-icon"><ShieldCheck size={28} /></span>
        <AlertDialogTitle>Update {target === 'class' ? 'classroom' : 'learner'} access?</AlertDialogTitle>
        <AlertDialogDescription>
          {target === 'class' ? 'Entire class' : learners.find(l => String(l.id) === target)?.name}: {inherit ? 'Use the class setting.' : draft.mode === 'open' ? 'Follow book progression with the selected book overrides.' : 'Pause learning activities.'}
        </AlertDialogDescription>
        <p className="admin-confirm-safe">Saved progress, completed lessons, and rewards stay unchanged. Lesson overrides open extra practice without marking skipped lessons complete.</p>
        {!!preview?.readingUnlockThrough && <p className="admin-confirm-note">Reading Chronicles: unlock through Book {preview.readingUnlockThrough}. Checkpoints are not marked complete.</p>}
        {!!preview?.readingOpenChallenges?.length && <p className="admin-confirm-note">Open all challenges in Books {preview.readingOpenChallenges.join(', ')}, including their final gates. Completion and rewards are unchanged.</p>}
        {!!preview?.readingOpenStops?.length && <p className="admin-confirm-note">Open {preview.readingOpenStops.length} individually selected stops. Their books become accessible; other stops follow saved progress.</p>}
        <p className="admin-confirm-note">Sticker Book, Sound Library, Progress, and Achievements follow the learner's curriculum milestones.</p>
        {target === 'class' && <p className="admin-confirm-note">Individual learner overrides still take priority. Changes reach connected learners within about 15 seconds.</p>}
        <AlertDialogFooter><AlertDialogCancel>Keep current settings</AlertDialogCancel><AlertDialogAction className="admin-confirm-apply" onClick={() => void save()}>Confirm changes</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
