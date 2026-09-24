import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, LogOut, RefreshCw, Search, Users } from 'lucide-react';
import { useAuth } from '../../modules/auth/auth.context.js';

interface Learner {
  id: number;
  email: string;
  name: string;
  avatar: string;
  grade: number;
  createdAt: string;
  lastActivity: string | null;
  progress: Array<{
    stageId: number;
    completedLevels: number;
    totalLevels: number;
    completionPercentage: number;
    lastUpdated: string;
  }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function formatDate(value: string | null): string {
  if (!value) return 'No activity yet';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function getCompletion(learner: Learner): number {
  const total = learner.progress.reduce((sum, stage) => sum + stage.totalLevels, 0);
  const completed = learner.progress.reduce((sum, stage) => sum + stage.completedLevels, 0);
  return total ? Math.round((completed / total) * 100) : 0;
}

export function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLearners = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/admin/learners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load learners');
      setLearners(data.learners);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load learners');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLearners();
  }, [token]);

  const filteredLearners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return learners;
    return learners.filter((learner) =>
      `${learner.name} ${learner.email}`.toLowerCase().includes(normalizedQuery),
    );
  }, [learners, query]);

  return (
    <main className="min-h-screen bg-[#F6F7FB] text-[var(--ink)]">
      <header className="border-b border-[#DDE1EA] bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4F46E5]">Readlr Admin</p>
            <h1 className="mt-1 text-2xl font-semibold">Learner overview</h1>
            <p className="mt-1 text-sm text-[#667085]">Monitor account activity and learning progress.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 py-2 text-sm font-medium text-[var(--ink-soft)] hover:bg-[#F6F7FB]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#DDE1EA] bg-card p-5">
            <div className="flex items-center gap-3 text-[#667085]"><Users className="h-5 w-5" /><span className="text-sm">Learners</span></div>
            <p className="mt-3 text-3xl font-semibold">{learners.length}</p>
          </div>
          <div className="rounded-xl border border-[#DDE1EA] bg-card p-5">
            <p className="text-sm text-[#667085]">Signed in as</p>
            <p className="mt-3 truncate text-lg font-semibold">{user?.email}</p>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-[#DDE1EA] bg-card">
          <div className="flex flex-col gap-4 border-b border-[#DDE1EA] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">All learners</h2>
              <p className="mt-1 text-sm text-[#667085]">{filteredLearners.length} matching accounts</p>
            </div>
            <div className="flex gap-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search learners"
                  className="w-full rounded-lg border border-[#DDE1EA] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4F46E5] sm:w-64"
                />
              </label>
              <button type="button" onClick={loadLearners} aria-label="Refresh learners" className="rounded-lg border border-[#DDE1EA] p-2 text-[var(--ink-soft)] hover:bg-[#F6F7FB]">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading && <div className="p-8 text-center text-sm text-[#667085]">Loading learner data...</div>}
          {!isLoading && error && (
            <div className="flex items-center gap-3 p-8 text-sm text-[#B42318]"><AlertCircle className="h-5 w-5" />{error}</div>
          )}
          {!isLoading && !error && filteredLearners.length === 0 && <div className="p-8 text-center text-sm text-[#667085]">No learners found.</div>}
          {!isLoading && !error && filteredLearners.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#F8F9FC] text-xs uppercase tracking-wide text-[#667085]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Learner</th>
                    <th className="px-5 py-3 font-medium">Grade</th>
                    <th className="px-5 py-3 font-medium">Completion</th>
                    <th className="px-5 py-3 font-medium">Last activity</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0F4]">
                  {filteredLearners.map((learner) => {
                    const completion = getCompletion(learner);
                    return (
                      <tr key={learner.id} className="hover:bg-[#FAFBFF]">
                        <td className="px-5 py-4"><p className="font-medium">{learner.avatar} {learner.name}</p><p className="mt-1 text-xs text-[#667085]">{learner.email}</p></td>
                        <td className="px-5 py-4 text-[var(--ink-soft)]">Grade {learner.grade}</td>
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-[#E7E9F0]"><div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${completion}%` }} /></div><span className="text-[var(--ink-soft)]">{completion}%</span></div></td>
                        <td className="px-5 py-4 text-[var(--ink-soft)]">{formatDate(learner.lastActivity)}</td>
                        <td className="px-5 py-4 text-[var(--ink-soft)]">{formatDate(learner.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}