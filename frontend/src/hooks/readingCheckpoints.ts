import type { ClassroomPolicy } from '../app/hooks/useClassroom';
import { ReadingServiceError } from './readingProgressError';
import { READING_CHAPTERS } from '../app/components/aralCurriculum';
import { readLocalReadingProgress, availableLocalReadingChapters } from './readingLocalProgress';
export interface ReadingProgress { completed:string[]; available:string[]; epoch:number; openStops?:string[]; openChallenges?:number[] }

export async function loadDevelopmentReadingProgress(learnerId:number,signal?:AbortSignal):Promise<ReadingProgress> {
  if(!import.meta.env.DEV)throw new Error('Device practice is unavailable.');
  const {policy}=await request<{policy:ClassroomPolicy}>('/admin/classroom/me',undefined,signal);
  const allowed=policy.mode==='open'||policy.mode==='stage'&&policy.stage===3||policy.mode==='stages'&&policy.stages?.includes(3);
  if(!allowed)throw new Error('Your teacher has paused access to these books.');
  const completed=readLocalReadingProgress(learnerId);
  const normal=availableLocalReadingChapters(completed);
  return {completed,epoch:0,openStops:policy.readingOpenStops??[],openChallenges:policy.readingOpenChallenges??[],available:READING_CHAPTERS.filter((c,i)=>normal.includes(c.id)||policy.readingOpenStops?.some(stop=>stop.startsWith(`${c.id}:`))||i<(policy.readingUnlockThrough??0)||policy.readingOpenChallenges?.includes(i+1)).map(c=>c.id)};
}

export interface ReadingCheckpoint { id:string; words:string[]; results:Record<string,string>; passed:boolean }

async function request<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T> {
  const token=localStorage.getItem('auth_token');
  if(!token)throw new Error('Please sign in again.');
  
  const form=body instanceof FormData;
  const controller=new AbortController();
  const cancel=()=>controller.abort();
  
  if(signal?.aborted)controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  const timeout=window.setTimeout(cancel,25000);
  
  // Extract body logic to resolve SonarQube warning
  let requestBody: any = undefined;
  if (body !== undefined) {
    requestBody = form ? body : JSON.stringify(body);
  }

  try {
    const response=await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:3000/api'}${path}`,{
      method: body===undefined ? 'GET' : 'POST',
      signal: controller.signal,
      headers: {
        Authorization:`Bearer ${token}`,
        ...(form ? {} : {'Content-Type':'application/json'})
      },
      body: requestBody
    });
    
    const result=await response.json().catch(()=>null);
    if(!response.ok)throw new ReadingServiceError(response.status,result?.error||'The reading service request failed. Please retry.');
    if(!result)throw new ReadingServiceError(502,'The reading service returned an invalid response.');
    
    return result;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort',cancel);
  }
}

export const loadReadingProgress=(signal?:AbortSignal)=>request<ReadingProgress>('/evidence/me/reading-progress',undefined,signal);
export const startReadingCheckpoint=(chapter:string,signal?:AbortSignal)=>request<ReadingCheckpoint>('/evidence/me/reading-checkpoints',{chapter},signal);
export const skipReadingCheckpoint=(id:string,item:number,signal?:AbortSignal)=>request<ReadingCheckpoint>(`/evidence/me/reading-checkpoints/${id}/${item}/skip`,{},signal);
export const checkReadingMeaning=(id:string,response:string,signal?:AbortSignal)=>request<ReadingCheckpoint>(`/evidence/me/reading-checkpoints/${id}/meaning`,{response},signal);
export const skipReadingMeaning=(id:string,signal?:AbortSignal)=>request<ReadingCheckpoint>(`/evidence/me/reading-checkpoints/${id}/meaning`,{response:'skipped'},signal);

export function checkReadingWord(id:string,item:number,blob:Blob,signal:AbortSignal) {
  const form=new FormData();
  form.append('audio',blob,'recording');
  // Reverted to match audio.route.ts exactly
  return request<ReadingCheckpoint>(`/audio/reading-check/${id}/${item}`,form,signal);
}

export function retryReadingWord(id:string,item:number,blob:Blob,signal:AbortSignal) {
  const form=new FormData();
  form.append('audio',blob,'recording');
  // Reverted to match audio.route.ts exactly
  return request<ReadingCheckpoint>(`/audio/reading-check/${id}/${item}/retry`,form,signal);
}