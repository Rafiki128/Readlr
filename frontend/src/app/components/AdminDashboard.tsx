import { Fragment, useEffect, useMemo, useState } from 'react';
import { AlertCircle, LogOut, RefreshCw, Search, Users, Radio, Trophy, TrendingUp, SlidersHorizontal, ChevronDown, CalendarDays, ShieldCheck, FlaskConical } from 'lucide-react';
import { useAuth } from '../../modules/auth/auth.context.js';
import { AdminReadingDetail } from './AdminReadingDetail';
import { AdminClassroomControls } from './AdminClassroomControls';
import { AdminPasswordRequests } from './AdminPasswordRequests';
import { AdminSurveyResponses } from './AdminSurvey';
import { AdminStudy } from './AdminStudy';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import './adminDashboard.css';
import './adminCurriculum.css';
import { accessLabel, type ClassroomState } from './classroomAccess';

interface Learner {
  readingChapters?: number | null;
  curriculum?:{campPractices:number;campSkipped?:number;guidedStops:number;recordings:number;updatedAt:string}|null;
  earnedProgress?: Record<number,number>;
  id: number; email: string; name: string; avatar: string; grade: number; studyParticipant?: boolean;
  createdAt: string; lastActivity: string | null;
  presence: { stage: number | null; level: number | null; screen: string; last_seen: string } | null;
  progress: Array<{ stageId: number; completedLevels: number; totalLevels: number; completionPercentage: number; lastUpdated: string }>;
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const connected = (learner: Learner) => !!learner.presence && Date.now() - Date.parse(learner.presence.last_seen) < 45000;
function getCompletion(learner: Learner) {
  return Math.max(0,Math.min(100,(learner.readingChapters??0)*10));
}
function DateStamp({ value }: { value: string | null }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <span className="admin-muted">No activity yet</span>;
  const date = new Date(value);
  return <time dateTime={value} className="admin-date"><span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><small>{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></time>;
}

export function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [view, setView] = useState<'overview' | 'controls' | 'passwords' | 'surveys' | 'study'>('overview');
  const [passwordCount,setPasswordCount]=useState(0);
  const [access, setAccess] = useState<ClassroomState | null>(null);
  const [accessError, setAccessError] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [target, setTarget] = useState('class');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const refreshProgress = () => setRefresh(n => n + 1);
    window.addEventListener('readlr:admin-progress-reset', refreshProgress);
    return () => window.removeEventListener('readlr:admin-progress-reset', refreshProgress);
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    let busy = false;
    const loadAccess = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/classroom`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (active) { setAccess(data); setAccessError(false); }
      } catch { if (active) setAccessError(true); }
    };
    const load = async () => {
      if (busy) return;
      busy = true;
      void loadAccess();
      try {
        const response = await fetch(`${API_URL}/admin/learners`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load learners');
        if (active) { setLearners(data.learners); setUpdated(new Date()); setError(null); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Failed to load learners'); }
      finally { busy = false; if (active) setIsLoading(false); }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [token, refresh]);
  const filtered = useMemo(() => learners.filter(l =>
    `${l.name} ${l.email}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (filter === 'all' || (filter === 'connected' ? connected(l) : getCompletion(l) === 100)),
  ).sort((a, b) => sort === 'progress' ? getCompletion(b) - getCompletion(a) || a.name.localeCompare(b.name)
    : sort === 'recent' ? (Date.parse(b.lastActivity || '') || 0) - (Date.parse(a.lastActivity || '') || 0) : a.name.localeCompare(b.name)), [learners, query, filter, sort]);
  useEffect(() => setPage(1), [query, filter, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 15));
  const currentPage = Math.min(page, pageCount);
  const assessedLearners = learners.filter(learner => learner.readingChapters != null);
  const metrics = [
    { label: 'Learners', value: learners.length, icon: Users, tone: 'violet' },
    { label: 'Recently connected', value: learners.filter(connected).length, icon: Radio, tone: 'green' },
    { label: 'All 10 books complete', value: learners.filter(l => getCompletion(l) === 100).length, icon: Trophy, tone: 'gold' },
    { label: 'Average book completion', value: assessedLearners.length ? Math.round(assessedLearners.reduce((n, l) => n + getCompletion(l), 0) / assessedLearners.length) + '%' : 'Not yet available', icon: TrendingUp, tone: 'pink' },
  ];
  const [studyError, setStudyError] = useState<string | null>(null);
  const setStudyParticipant = async (id: number, studyParticipant: boolean) => {
    setStudyError(null);
    try {
      const response = await fetch(`${API_URL}/admin/learners/${id}/study-participant`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ studyParticipant }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Could not update the study participant flag');
      setLearners(list => list.map(learner => learner.id === id ? { ...learner, studyParticipant } : learner));
    } catch (e) { setStudyError(e instanceof Error ? e.message : 'Could not update the study participant flag'); }
  };
  const manage = (id: number) => {
    setTarget(String(id)); setView('controls');
    document.getElementById('classroom-controls')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  return <main className="admin-dashboard">
    <header className="admin-nav"><div className="admin-shell admin-nav-inner">
      <div className="admin-brand"><img src="/readlr-mark.svg" alt="" /><strong>Readlr</strong><span>Classroom</span></div>
      <div className="admin-account"><span>{user?.email}</span><button className="admin-icon-button" onClick={() => void logout()} aria-label="Sign out" title="Sign out"><LogOut size={19} /></button></div>
    </div></header>
    <div className="admin-workspace"><aside className="admin-sidebar"><p>CLASSROOM MANAGEMENT</p><nav aria-label="Admin navigation"><button aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}><Users size={19} />Learner overview</button><button aria-current={view === 'controls' ? 'page' : undefined} onClick={() => setView('controls')}><SlidersHorizontal size={19} />Classroom controls</button><button aria-current={view==='passwords'?'page':undefined} onClick={()=>setView('passwords')}><ShieldCheck size={19}/>Password requests <span aria-live="polite">{passwordCount || ''}</span></button><button aria-current={view==='surveys'?'page':undefined} onClick={()=>setView('surveys')}><TrendingUp size={19}/>Student feedback</button><button aria-current={view==='study'?'page':undefined} onClick={()=>setView('study')}><FlaskConical size={19}/>Pretest &amp; posttest</button></nav><div className="admin-sidebar-note"><Trophy size={21} />Earned rewards stay safe.<small>Book access changes preserve saved progress and earned rewards.</small></div></aside><div className="admin-shell admin-content">
      <div className="admin-intro"><div><p className="admin-eyebrow">LEARN. PRACTICE. GROW.</p><h1>{view === 'study' ? 'Validation study' : view === 'surveys' ? 'Listen to your learners' : view === 'overview' ? 'Your classroom' : view === 'passwords' ? 'Account recovery' : 'Manage access'}</h1><p className="admin-muted">Every learner's journey, together in one place.</p></div>
        <div className="admin-today"><CalendarDays size={19} /><div>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}<small>{Intl.DateTimeFormat().resolvedOptions().timeZone.split('_').join(' ')}</small></div></div>
      </div>
      <section hidden={view !== 'overview'} className="admin-metrics" aria-label="Class summary">{metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} className="admin-metric"><span className={`admin-metric-icon ${tone}`}><Icon size={22} /></span><div><strong>{isLoading ? '...' : error && !updated ? 'Unavailable' : value}</strong><span>{label}</span></div></div>)}</section>
      <div hidden={view !== 'controls'}>{token && <AdminClassroomControls token={token} learners={learners} target={target} onTargetChange={setTarget} onSaved={data => { setAccess(data); setAccessError(false); }} />}</div>
      <div hidden={view !== 'passwords'}>{token&&<AdminPasswordRequests token={token} onCount={setPasswordCount}/>}</div>
      {view==='surveys'&&token&&<AdminSurveyResponses token={token}/>}
      {view==='study'&&token&&<AdminStudy token={token}/>}
      <section hidden={view !== 'overview'} className="admin-roster" aria-labelledby="roster-heading">
        <div className="admin-section-heading"><div><h2 id="roster-heading">Learner overview <span className="admin-count">{learners.length}</span></h2><p>Synced lesson completion, not pronunciation accuracy.</p></div><div className="admin-refresh"><small>{updated ? `Updated ${updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Waiting for data'}</small><button className="admin-icon-button" onClick={() => setRefresh(n => n + 1)} aria-label="Refresh learners" title="Refresh learners"><RefreshCw size={18} /></button></div></div>
        <div className="admin-roster-tools"><div className="admin-filters" aria-label="Filter learners">{[['all', 'All learners'], ['connected', 'Connected'], ['complete', 'Completed']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <div className="admin-search-sort"><label className="admin-search"><Search size={18} /><input aria-label="Search learners" placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} /></label><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort learners"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Name: A to Z</SelectItem><SelectItem value="progress">Most progress</SelectItem><SelectItem value="recent">Latest activity</SelectItem></SelectContent></Select></div>
        </div>
        {error && <p className="admin-error" role="alert"><AlertCircle size={18} />{error}{updated && ' Showing the last loaded data.'}</p>}
        {isLoading ? <p className="admin-empty">Loading learner data...</p> : !filtered.length ? <div className="admin-empty"><Users size={28} /><strong>{learners.length ? 'No matching learners' : 'No learners yet'}</strong><span>{learners.length ? 'Try a different name or filter.' : 'Registered learners will appear here.'}</span></div> :
          <table className="admin-table"><thead><tr><th>Learner</th><th>Curriculum activity</th><th>Books complete</th><th>Access status</th><th>Latest activity</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {filtered.slice((currentPage - 1) * 15, currentPage * 15).map(learner => {
              const completion = getCompletion(learner);
              return <Fragment key={learner.id}><tr className="admin-learner-row">
                <td className="admin-identity"><div className="admin-person"><span className="admin-avatar">{learner.avatar || learner.name.slice(0, 1)}</span><div><strong>{learner.name}</strong><small>{learner.email}</small><span className="admin-grade">Grade {learner.grade}</span>{learner.studyParticipant && <span className="admin-grade">Study participant</span>}</div></div></td>
                <td className="admin-stages">{learner.curriculum?<div className="admin-curriculum-grid"><div className="admin-curriculum-item"><strong>Camp orientation</strong><p>{learner.curriculum.campPractices}<small> / 3 practiced</small></p><progress aria-label={`${learner.name} Camp orientation`} value={learner.curriculum.campPractices} max={3}/>{!!learner.curriculum.campSkipped&&<small>{learner.curriculum.campSkipped} skipped</small>}</div><div className="admin-curriculum-item"><strong>Book activities</strong><p>{learner.curriculum.guidedStops}<small> stops</small></p><small>Guided practice</small></div><div className="admin-curriculum-item"><strong>Sound Library</strong><p>{learner.curriculum.recordings}<small> recordings</small></p><small>Voice practice</small></div></div>:<span>Curriculum activity unavailable</span>}</td>
                <td className="admin-completion"><strong>{learner.readingChapters==null?'Unavailable':`${completion}%`}</strong>{learner.readingChapters!=null&&<progress aria-label={`${learner.name} book completion`} value={learner.readingChapters} max={10}/>}<small>{learner.readingChapters==null?'Reconnect to verify':`${learner.readingChapters} of 10 books`}</small><small>Final gates passed</small></td>
                <td className="admin-access"><span className="admin-access-badge">{accessError ? 'Unable to verify' : access ? accessLabel(access.overrides[String(learner.id)] ?? access.policy) : 'Loading access...'}</span><small>{!accessError && access ? access.overrides[String(learner.id)] ? 'Individual override' : 'Class setting' : 'Refresh to check permissions'}</small></td>
                <td className="admin-activity"><span className={`admin-presence ${connected(learner) ? 'online' : ''}`}>{connected(learner) ? 'Recently connected' : 'Last active'}</span><DateStamp value={learner.lastActivity} /></td>
                <td className="admin-row-actions"><button className="admin-icon-button" aria-label={`Manage ${learner.name}`} title="Manage access" onClick={() => manage(learner.id)}><SlidersHorizontal size={17} /></button><button className="admin-icon-button" aria-label={`Details for ${learner.name}`} aria-expanded={expanded === learner.id} aria-controls={`learner-details-${learner.id}`} title="Learner details" onClick={() => setExpanded(expanded === learner.id ? null : learner.id)}><ChevronDown size={18} style={{ transform: expanded === learner.id ? 'rotate(180deg)' : undefined }} /></button></td>
              </tr>{expanded === learner.id && <tr className="admin-detail-row" id={`learner-details-${learner.id}`}><td colSpan={6}>{token&&<AdminReadingDetail key={learner.id} userId={learner.id} token={token}/>}<div className="admin-details"><div><h3>Reading Chronicles</h3><p>{learner.readingChapters == null ? 'Checkpoint data unavailable' : `${learner.readingChapters} of 10 books complete`}</p><small>Independent final gates, separate from guided practice.</small></div><div><h3>Last reported screen</h3><p>{learner.presence ? learner.presence.screen.split('-').join(' ') : 'No report yet'}</p><DateStamp value={learner.presence?.last_seen ?? null} /></div><div><h3>Joined Readlr</h3><DateStamp value={learner.createdAt} /></div><div><h3>Research study</h3><label className="flex items-center gap-2"><input type="checkbox" checked={learner.studyParticipant === true} onChange={e => void setStudyParticipant(learner.id, e.target.checked)} />Study participant</label><small>Mark only after signed guardian consent and child assent are collected.</small>{studyError && <p className="admin-error" role="alert">{studyError}</p>}</div></div></td></tr>}</Fragment>;
            })}
          </tbody></table>}
        <div className="admin-pagination"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div><footer className="admin-roster-footer">{filtered.length} of {learners.length} learners<span>Times shown in your local timezone</span></footer>
      </section>
    </div></div>
  </main>;
}
