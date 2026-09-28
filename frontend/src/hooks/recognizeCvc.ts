export type WordRecognition = 'matched' | 'different' | 'uncertain' | 'unavailable';
export async function recognizeCvc(blob:Blob,target:string,signal:AbortSignal):Promise<{status:Exclude<WordRecognition,'unavailable'>; transcript:string}> {
  const token=localStorage.getItem('auth_token');
  if(!token) throw new Error('Sign in to check your word.');
  const body=new FormData(); body.append('audio',blob,'recording'); body.append('target',target);
  const response=await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/audio/cvc-recognize`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`},body,signal,
  });
  if(!response.ok) throw new Error(response.status===401?'Please sign in again to check your word.':'Word checking is unavailable. Please try again shortly.');
  const result=await response.json();
  if(result.target!==target || result.source!=='groq-whisper' || !['matched','different','uncertain'].includes(result.status)) throw new Error('We could not check that recording. Please try again.');
  return {status:result.status,transcript:typeof result.transcript==='string'?result.transcript.trim().slice(0,80):''};
}
