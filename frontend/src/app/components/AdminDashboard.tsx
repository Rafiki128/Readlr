import { Fragment, useEffect, useMemo, useState } from 'react';
import { AlertCircle, LogOut, RefreshCw, Search, Users, Radio, Trophy, TrendingUp, SlidersHorizontal, ChevronDown, CalendarDays, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../modules/auth/auth.context.js';
import { stickerSummary } from './stickers';
import { AdminClassroomControls } from './AdminClassroomControls';
import { AdminPasswordRequests } from './AdminPasswordRequests';
import { AdminSurveyResponses } from './AdminSurvey';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import './adminDashboard.css';
import { accessLabel, type ClassroomState } from './classroomAccess';

interface Learner {
  earnedProgress?: Record<number,number>;
  id: number; email: string; name: string; avatar: string; grade: number;
  createdAt: string; lastActivity: string | null;
  presence: { stage: number | null; level: number | null; screen: string; last_seen: string } | null;
  progress: Array<{ stageId: number; completedLevels: number; totalLevels: number; completionPercentage: number; lastUpdated: string }>;
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const stageNames = ['Vowels', 'Blending', 'CVC words'];
const connected = (learner: Learner) => !!learner.presence && Date.now() - Date.parse(learner.presence.last_seen) < 45000;
function getCompletion(learner: Learner) {
  const total = learner.progress.reduce((sum, stage) => sum + stage.totalLevels, 0);
  return total ? Math.round(learner.progress.reduce((sum, stage) => sum + stage.completedLevels, 0) / total * 100) : 0;
}
function DateStamp({ value }: { value: string | null }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <span className="admin-muted">No activity yet</span>;
  const date = new Date(value);
  return <time dateTime={value} className="admin-date"><span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><small>{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></time>;
}

export function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [view, setView] = useState<'overview' | 'controls' | 'passwords' | 'surveys'>('overview');
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
        const response = await fetch(`${API_URL}/admin/learners`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
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
  const metrics = [
    { label: 'Learners', value: learners.length, icon: Users, tone: 'violet' },
    { label: 'Recently connected', value: learners.filter(connected).length, icon: Radio, tone: 'green' },
    { label: 'All stages complete', value: learners.filter(l => getCompletion(l) === 100).length, icon: Trophy, tone: 'gold' },
    { label: 'Average completion', value: learners.length ? Math.round(learners.reduce((n, l) => n + getCompletion(l), 0) / learners.length) + '%' : 'Not yet available', icon: TrendingUp, tone: 'pink' },
  ];
  const manage = (id: number) => {
    setTarget(String(id)); setView('controls');
    document.getElementById('classroom-controls')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  return <main className="admin-dashboard">
    <header className="admin-nav"><div className="admin-shell admin-nav-inner">
      <div className="admin-brand"><img src="/readlr-mark.svg" alt="" /><strong>Readlr</strong><span>Classroom</span></div>
      <div className="admin-account"><span>{user?.email}</span><button className="admin-icon-button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={19} /></button></div>
    </div></header>
    <div className="admin-workspace"><aside className="admin-sidebar"><p>CLASSROOM MANAGEMENT</p><nav aria-label="Admin navigation"><button aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}><Users size={19} />Learner overview</button><button aria-current={view === 'controls' ? 'page' : undefined} onClick={() => setView('controls')}><SlidersHorizontal size={19} />Classroom controls</button><button aria-current={view==='passwords'?'page':undefined} onClick={()=>setView('passwords')}><ShieldCheck size={19}/>Password requests <span aria-live="polite">{passwordCount || ''}</span></button><button aria-current={view==='surveys'?'page':undefined} onClick={()=>setView('surveys')}><TrendingUp size={19}/>Student feedback</button></nav><div className="admin-sidebar-note"><Trophy size={21} />Earned rewards stay safe.<small>Access changes keep progress. Only a confirmed reset restarts selected stages.</small></div></aside><div className="admin-shell admin-content">
      <div className="admin-intro"><div><p className="admin-eyebrow">LEARN. PRACTICE. GROW.</p><h1>{view === 'surveys' ? 'Listen to your learners' : view === 'overview' ? 'Your classroom' : view === 'passwords' ? 'Account recovery' : 'Manage access'}</h1><p className="admin-muted">Every learner's journey, together in one place.</p></div>
        <div className="admin-today"><CalendarDays size={19} /><div>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}<small>{Intl.DateTimeFormat().resolvedOptions().timeZone.split('_').join(' ')}</small></div></div>
      </div>
      <section hidden={view !== 'overview'} className="admin-metrics" aria-label="Class summary">{metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} className="admin-metric"><span className={`admin-metric-icon ${tone}`}><Icon size={22} /></span><div><strong>{isLoading ? '...' : error && !updated ? 'Unavailable' : value}</strong><span>{label}</span></div></div>)}</section>
      <div hidden={view !== 'controls'}>{token && <AdminClassroomControls token={token} learners={learners} target={target} onTargetChange={setTarget} onSaved={data => { setAccess(data); setAccessError(false); }} />}</div>
      <div hidden={view !== 'passwords'}>{token&&<AdminPasswordRequests token={token} onCount={setPasswordCount}/>}</div>
      {view==='surveys'&&token&&<AdminSurveyResponses token={token}/>}
      <section hidden={view !== 'overview'} className="admin-roster" aria-labelledby="roster-heading">
        <div className="admin-section-heading"><div><h2 id="roster-heading">Learner overview <span className="admin-count">{learners.length}</span></h2><p>Synced lesson completion, not pronunciation accuracy.</p></div><div className="admin-refresh"><small>{updated ? `Updated ${updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Waiting for data'}</small><button className="admin-icon-button" onClick={() => setRefresh(n => n + 1)} aria-label="Refresh learners" title="Refresh learners"><RefreshCw size={18} /></button></div></div>
        <div className="admin-roster-tools"><div className="admin-filters" aria-label="Filter learners">{[['all', 'All learners'], ['connected', 'Connected'], ['complete', 'Completed']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <div className="admin-search-sort"><label className="admin-search"><Search size={18} /><input aria-label="Search learners" placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} /></label><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort learners"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Name: A to Z</SelectItem><SelectItem value="progress">Most progress</SelectItem><SelectItem value="recent">Latest activity</SelectItem></SelectContent></Select></div>
        </div>
        {error && <p className="admin-error" role="alert"><AlertCircle size={18} />{error}{updated && ' Showing the last loaded data.'}</p>}
        {isLoading ? <p className="admin-empty">Loading learner data...</p> : !filtered.length ? <div className="admin-empty"><Users size={28} /><strong>{learners.length ? 'No matching learners' : 'No learners yet'}</strong><span>{learners.length ? 'Try a different name or filter.' : 'Registered learners will appear here.'}</span></div> :
          <table className="admin-table"><thead><tr><th>Learner</th><th>Stage progress</th><th>Completion</th><th>Access status</th><th>Latest activity</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {filtered.slice((currentPage - 1) * 15, currentPage * 15).map(learner => {
              const completion = getCompletion(learner);
              const stickers = stickerSummary(Object.fromEntries(learner.progress.map(s => [s.stageId, Math.max(s.completedLevels,learner.earnedProgress?.[s.stageId] ?? 0)])));
              return <Fragment key={learner.id}><tr className="admin-learner-row">
                <td className="admin-identity"><div className="admin-person"><span className="admin-avatar">{learner.avatar || learner.name.slice(0, 1)}</span><div><strong>{learner.name}</strong><small>{learner.email}</small><span className="admin-grade">Grade {learner.grade}</span></div></div></td>
                <td className="admin-stages"><div className="admin-stage-grid">{learner.progress.map(stage => <div key={stage.stageId} className={`admin-stage stage-${stage.stageId}`}><div><strong>{stageNames[stage.stageId - 1] || `Stage ${stage.stageId}`}</strong><span>{stage.completedLevels}/{stage.totalLevels}</span></div><div className="admin-track"><i style={{ width: `${stage.totalLevels ? Math.min(100, stage.completedLevels / stage.totalLevels * 100) : 0}%` }} /></div><small>{stage.completedLevels >= stage.totalLevels ? 'Complete' : `Next: level ${stage.completedLevels + 1}`}</small><span className="sr-only">Stage {stage.stageId}: {stage.completedLevels} / {stage.totalLevels}{stage.completedLevels < stage.totalLevels ? ` (next: ${stage.completedLevels + 1})` : ' - complete'}</span></div>)}</div></td>
                <td className="admin-completion"><strong>{completion}%</strong><small>{completion === 100 ? 'Journey complete' : 'Of the full journey'}</small></td>
                <td className="admin-access"><span className="admin-access-badge">{accessError ? 'Unable to verify' : access ? accessLabel(access.overrides[String(learner.id)] ?? access.policy) : 'Loading access...'}</span><small>{!accessError && access ? access.overrides[String(learner.id)] ? 'Individual override' : 'Class setting' : 'Refresh to check permissions'}</small></td>
                <td className="admin-activity"><span className={`admin-presence ${connected(learner) ? 'online' : ''}`}>{connected(learner) ? 'Recently connected' : 'Last active'}</span><DateStamp value={learner.lastActivity} /></td>
                <td className="admin-row-actions"><button className="admin-icon-button" aria-label={`Manage ${learner.name}`} title="Manage access" onClick={() => manage(learner.id)}><SlidersHorizontal size={17} /></button><button className="admin-icon-button" aria-label={`Details for ${learner.name}`} aria-expanded={expanded === learner.id} aria-controls={`learner-details-${learner.id}`} title="Learner details" onClick={() => setExpanded(expanded === learner.id ? null : learner.id)}><ChevronDown size={18} style={{ transform: expanded === learner.id ? 'rotate(180deg)' : undefined }} /></button></td>
              </tr>{expanded === learner.id && <tr className="admin-detail-row" id={`learner-details-${learner.id}`}><td colSpan={6}><div className="admin-details"><div><h3>Sticker collection</h3><p>{stickers.earned} of {stickers.total} collected {stickers.recent.map(item => <span key={item.id} title={item.name} aria-label={item.name}>{item.emoji}</span>)}</p><small>{stickers.next ? `Next: ${stickers.next.name}` : 'Every sticker collected'}</small></div><div><h3>Last reported screen</h3><p>{learner.presence ? learner.presence.stage ? `Stage ${learner.presence.stage}${learner.presence.level ? `, level ${learner.presence.level}` : ''}` : learner.presence.screen.split('-').join(' ') : 'No report yet'}</p><DateStamp value={learner.presence?.last_seen ?? null} /></div><div><h3>Joined Readlr</h3><DateStamp value={learner.createdAt} /></div></div></td></tr>}</Fragment>;
            })}
          </tbody></table>}
        <div className="admin-pagination"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div><footer className="admin-roster-footer">{filtered.length} of {learners.length} learners<span>Times shown in your local timezone</span></footer>
      </section>
    </div></div>
  </main>;
}
