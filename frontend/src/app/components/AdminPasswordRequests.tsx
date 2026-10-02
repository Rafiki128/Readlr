import {useEffect,useState} from 'react';
import {KeyRound,RefreshCw} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';
import '../../modules/auth/components/passwordRecovery.css';
import {CLASSROOM_API} from '../hooks/useClassroom';
interface Recovery {id:string;user_id:number;status:string;created_at:string;expires_at:string;users:{email:string}}
export function AdminPasswordRequests({token,onCount}:{token:string;onCount:(count:number)=>void}) {
  const [requests,setRequests]=useState<Recovery[]>([]);
  const [error,setError]=useState('');
  const [chosen,setChosen]=useState<Recovery|null>(null);
  const [verified,setVerified]=useState(false);
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [query,setQuery]=useState('');
  async function load() {
    const res=await fetch(`${CLASSROOM_API}/admin/password-requests`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    const data=await res.json();if(!res.ok) throw new Error(data.message || 'Requests unavailable');
    if(!Array.isArray(data.requests)) throw new Error('Password requests are unavailable.');
    return data.requests as Recovery[];
  }
  useEffect(()=>{let active=true,running=false;const poll=async()=>{
    if(running)return;running=true;
    try {const data=await load();if(active){setRequests(data);onCount(data.filter(r=>r.status==='pending').length);setError('');}}
    catch(e){if(active)setError(e instanceof Error?e.message:'Requests unavailable');}
    finally{running=false;}
  };void poll();const timer=setInterval(poll,15000);return()=>{active=false;clearInterval(timer);};},[token,onCount]);
  async function decide(action:'approve'|'reject') {
    if(!chosen||busy)return;setBusy(true);setError('');
    try {
      const res=await fetch(`${CLASSROOM_API}/admin/password-requests/${chosen.id}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,verified}),signal:AbortSignal.timeout(10000)});
      const data=await res.json();if(!res.ok)throw new Error(data.message);
      if(data.code)setCode(data.code);else setChosen(null);
      setRequests(previous=>previous.map(r=>r.id===chosen.id?{...r,status:action==='approve'?'approved':'rejected'}:r));
    }catch(e){setError(e instanceof Error?e.message:'Could not update request');}finally{setBusy(false);}
  }
  return <section className="admin-access-section" aria-labelledby="password-requests-heading"><header className="admin-section-heading"><div><h2 id="password-requests-heading"><KeyRound size={20}/>Password requests</h2><p>Verify the learner in person before issuing a one-time code. Never ask for their new password.</p></div><button className="admin-icon-button" aria-label="Refresh password requests" onClick={()=>void load().then(data=>{setRequests(data);setError('');}).catch(e=>setError(e.message))}><RefreshCw size={18}/></button></header>
    {error&&!chosen&&<p role="alert" className="admin-error">{error}</p>}
    <label className="admin-search"><input aria-label="Search password requests" placeholder="Search email" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="admin-recovery-list">{requests.filter(r=>r.status!=='rejected'&&r.users.email.toLowerCase().includes(query.toLowerCase())).map(r=><div className="admin-recovery-row" key={r.id}><div><strong>{r.users.email}</strong><small>Request {r.id.slice(0,8).toUpperCase()} · {new Date(r.created_at).toLocaleString()}</small></div><span>{r.status==='pending'?'Awaiting verification':'Code issued'}</span><button className="admin-discard" disabled={r.status!=='pending'} onClick={()=>{setChosen(r);setVerified(false);setCode('');setError('');}}>Review request</button></div>)}{!requests.length&&<p className="admin-empty">No active password requests.</p>}</div>
    <Dialog open={!!chosen} onOpenChange={open=>{if(!open&&!busy){setChosen(null);setCode('');}}}><DialogContent className="recovery-dialog"><DialogTitle>{code?'One-time reset code':'Verify password request'}</DialogTitle><DialogDescription>{chosen?.users.email} · Request {chosen?.id.slice(0,8).toUpperCase()}</DialogDescription>{error&&<p role="alert" className="recovery-error">{error}</p>}{code?<><code className="recovery-code">{code}</code><p>Give this code only to the learner you verified. It expires in 15 minutes and is shown only once. They must use the browser where they requested the reset.</p><button className="recovery-primary" onClick={()=>{setChosen(null);setCode('');}}>Done</button></>:<><label className="recovery-verify"><input type="checkbox" checked={verified} disabled={busy} onChange={e=>setVerified(e.target.checked)}/>I verified this learner in person and matched their request ID.</label><button className="recovery-primary" disabled={!verified||busy} onClick={()=>void decide('approve')}>{busy?'Updating...':'Issue reset code'}</button><button className="admin-discard" disabled={busy} onClick={()=>void decide('reject')}>Decline request</button></>}</DialogContent></Dialog>
  </section>;
}
