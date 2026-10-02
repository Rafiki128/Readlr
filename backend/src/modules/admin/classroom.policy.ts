export interface ClassroomPolicy {
  mode: 'open' | 'stage' | 'stages' | 'paused' | 'survey';
  stages?: number[];
  unlockThrough?: Record<number, number>;
  soundLibrary?: boolean;
  stage: number | null;
  message: string;
  surveyUrl: string;
}
export const OPEN_POLICY: ClassroomPolicy = { mode: 'open', stage: null, message: '', surveyUrl: '' };

export function parsePolicy(value: unknown): ClassroomPolicy {
  const p = value as ClassroomPolicy;
  if (!p || !['open', 'stage', 'stages', 'paused', 'survey'].includes(p.mode) ||
      typeof p.message !== 'string' || p.message.length > 240 ||
      typeof p.surveyUrl !== 'string' || p.surveyUrl.length > 2000 ||
      (p.mode === 'stage' && ![1, 2, 3].includes(p.stage as number)) ||
      (p.mode === 'stages' && (!Array.isArray(p.stages) || p.stages.length < 1 || p.stages.length > 3 || p.stages.some(s => ![1,2,3].includes(s))))) throw new Error('Invalid classroom policy');
  let surveyUrl = '';
  if (p.soundLibrary !== undefined && typeof p.soundLibrary !== 'boolean') throw new Error('Invalid Sound Library access');
  if (p.unlockThrough !== undefined && (!p.unlockThrough || typeof p.unlockThrough !== 'object' || Array.isArray(p.unlockThrough) ||
    Object.entries(p.unlockThrough).some(([stage, level]) => !['1','2','3'].includes(stage) || !Number.isInteger(level) || level < 0 || level > 20))) throw new Error('Invalid level unlocks');
  if (p.mode === 'survey') {
    const url = new URL(p.surveyUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Survey must use an HTTPS URL without credentials');
    const hosts = (process.env.ADMIN_SURVEY_HOSTS ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!hosts.includes(url.hostname.toLowerCase())) throw new Error('Survey host is not approved on the server');
    surveyUrl = url.href;
  }
  return {mode:p.mode, stage:p.mode === 'stage' ? p.stage : null, ...(p.mode === 'stages' ? { stages: [...new Set(p.stages)].sort() } : {}), ...(p.unlockThrough ? {unlockThrough: p.unlockThrough} : {}), ...(p.soundLibrary !== undefined ? {soundLibrary:p.soundLibrary} : {}), message:p.message.trim(), surveyUrl};
}

export function stagePermitted(policy: ClassroomPolicy, stage: number) {
  return [1,2,3].includes(stage) && (policy.mode === 'open' || (policy.mode === 'stage' && policy.stage === stage) || (policy.mode === 'stages' && !!policy.stages?.includes(stage)));
}
