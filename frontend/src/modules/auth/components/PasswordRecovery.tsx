import { useEffect, useState } from 'react';
import { KeyRound, Send, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../app/components/ui/dialog';
import './passwordRecovery.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const STORAGE = 'readlr_pending_recovery';
interface Ticket {id:string;secret:string;email:string}
function stored(): Ticket | null {
  try { const value=JSON.parse(sessionStorage.getItem(STORAGE) || 'null'); return value?.id && value?.secret && value?.email ? value : null; } catch { return null; }
}
export function PasswordRecovery({email:initialEmail,onClose}:{email:string;onClose:()=>void}) {
  const [ticket,setTicket]=useState<Ticket|null>(stored);
  const [email,setEmail]=useState(initialEmail);
  const [status,setStatus]=useState('pending');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [code,setCode]=useState('');
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  async function post(path:string,body:object) {
    const response=await fetch(`${API}/auth/recovery/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.message || 'Please try again shortly.');
    return data;
  }
  useEffect(()=> {
    if(!ticket || status==='used') return;
    let active=true,running=false;
    const poll=async()=> {
      if(running) return; running=true;
      try {const data=await post('status',ticket);if(active) {setStatus(data.status);setError('');}}
      catch(e) {if(active) setError(e instanceof Error?e.message:'Could not check request.');}
      finally {running=false;}
    };
    void poll();const timer=setInterval(poll,15000);
    return()=>{active=false;clearInterval(timer);};
  },[ticket,status==='used']);
  async function submit(e:React.FormEvent) {
    e.preventDefault(); if(busy) return;setBusy(true);setError('');
    try {
      if(!ticket) {
        const data=await post('request',{email});const next={id:data.id,secret:data.secret,email};
        sessionStorage.setItem(STORAGE,JSON.stringify(next));setTicket(next);setMessage(data.message);
      } else {
        if(password!==confirmPassword) throw new Error('Your passwords do not match.');
        const data=await post('complete',{...ticket,code,password,confirmPassword});
        setStatus('used');setPassword('');setConfirmPassword('');setCode('');setMessage(data.message);sessionStorage.removeItem(STORAGE);
      }
    } catch(e) {setError(e instanceof Error?e.message:'Please try again.');}
    finally {setBusy(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy) onClose();}}><DialogContent className="recovery-dialog">
    <span className="recovery-icon"><KeyRound size={26}/></span><DialogTitle>{status==='used'?'Password updated':'Forgot your password?'}</DialogTitle>
    <DialogDescription>{!ticket?'Send a request to your classroom administrator.':status==='approved'?'Your request is approved. Enter the code your administrator gave you and choose a new password.':status==='used'?'You can now sign in with your new password.':'Your administrator will verify your identity in person before giving you a reset code.'}</DialogDescription>
    {error&&<p className="recovery-error" role="alert">{error}</p>}
    {status==='used'?<><CheckCircle2 className="text-emerald-600"/><button className="recovery-primary" onClick={onClose}>Back to sign in</button></>:<form onSubmit={submit}>
      {!ticket?<><label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><button className="recovery-primary" disabled={busy}><Send size={17}/>{busy?'Sending...':'Request password reset'}</button></>:<>
        <div className="recovery-status" role="status"><strong>{status==='approved'?'Ready for your new password':status==='expired'?'Request expired':status==='rejected'?'Request declined':'Waiting for administrator'}</strong><span>{ticket.email}</span><small>Request {ticket.id.slice(0,8).toUpperCase()}</small></div>
        {status==='pending'&&<><p>{message || 'Keep this browser available. Your request status updates automatically.'}</p><button type="button" onClick={()=>{sessionStorage.removeItem(STORAGE);setTicket(null);setMessage('');}}>Use another email</button></>}
        {status==='approved'&&<><label>One-time code<input required autoComplete="one-time-code" maxLength={12} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} disabled={busy}/></label><label>New password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><label>Confirm new password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} disabled={busy}/></label><small>At least 8 characters. Your previous sessions will be signed out.</small><button className="recovery-primary" disabled={busy}>{busy?'Updating...':'Set new password'}</button></>}
        {['expired','rejected'].includes(status)&&<button type="button" className="recovery-primary" onClick={()=>{sessionStorage.removeItem(STORAGE);setTicket(null);setStatus('pending');setMessage('');}}>Start a new request</button>}
      </>}
    </form>}
  </DialogContent></Dialog>;
}
