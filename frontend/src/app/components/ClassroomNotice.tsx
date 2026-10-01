import { ArrowRight, ExternalLink, Pause, WifiOff } from 'lucide-react';
import type { ClassroomPolicy } from '../hooks/useClassroom';

export function ClassroomNotice({ policy, error, onStage, onLogout }: {
  policy: ClassroomPolicy | null; error: boolean; onStage: (stage: number) => void; onLogout: () => void;
}) {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6 text-[var(--ink)]">
    <div className="w-full max-w-lg text-center">
      {error ? <WifiOff className="mx-auto mb-6 h-12 w-12 text-amber-600" /> : <Pause className="mx-auto mb-6 h-12 w-12 text-violet-600" />}
      <h1 className="text-2xl font-bold">{error ? 'Let us reconnect' : !policy ? 'Getting your adventure ready...' : policy.mode === 'survey' ? 'A little check-in' : ['stage', 'stages'].includes(policy.mode) ? 'Your next activity is ready' : 'Time for a little break'}</h1>
      <p className="mt-4 text-lg text-[var(--ink-soft)]">{error ? 'We are checking your classroom connection. Your saved progress stays safe.' : policy?.message || (policy?.mode === 'paused' ? 'Your teacher will let you know when it is time to continue.' : 'Your teacher has chosen an activity for you.')}</p>
      {!error && policy && ['stage', 'stages'].includes(policy.mode) && (policy.mode === 'stage' ? [policy.stage!] : policy.stages ?? []).map(stage => <button key={stage} onClick={() => onStage(stage)} className="mx-auto mt-6 flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-4 font-bold text-white">Go to Stage {stage}<ArrowRight size={20} /></button>)}
      {!error && policy?.mode === 'survey' && <a href={policy.surveyUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-4 font-bold text-white">Open check-in<ExternalLink size={18} /></a>}
      <button onClick={onLogout} className="mx-auto mt-8 block text-sm underline">Sign out</button>
    </div>
  </main>;
}
