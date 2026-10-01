import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { ClassroomPolicy } from '../hooks/useClassroom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import './classroomMessage.css';

// Remember acknowledgement per learner, including across screen changes and reloads.
export function ClassroomMessage({ policy, userId }: { policy: ClassroomPolicy | null; userId: number }) {
  const key = `readlr_classroom_message_${userId}`;
  const signature = policy ? JSON.stringify(policy) : '';
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; }
  });
  const dismiss = () => {
    setDismissed(signature);
    try { sessionStorage.setItem(key, signature); } catch { /* In-memory dismissal still works. */ }
  };
  const open = !!policy?.message.trim() && dismissed !== signature;
  return <Dialog open={open} onOpenChange={value => { if (!value) dismiss(); }}>
    <DialogContent className="classroom-message">
      <span className="classroom-message-icon"><MessageCircle size={26} /></span>
      <DialogTitle>A message from your teacher</DialogTitle>
      <DialogDescription className="classroom-message-text">{policy?.message}</DialogDescription>
      <p className="classroom-message-hint">Your learning progress is safe.</p>
      <button className="classroom-message-dismiss" onClick={dismiss}>Got it!</button>
    </DialogContent>
  </Dialog>;
}
