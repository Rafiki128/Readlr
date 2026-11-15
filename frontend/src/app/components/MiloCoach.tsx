import { useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { getLearningSettings, learningVolume } from '../../hooks/learningSettings';
import { getMiloGuidance, miloGuidanceSeenKey, type MiloGuidanceAction, type MiloGuidanceContext, type MiloGuidanceEvent } from '../../hooks/miloGuidance';
import { CharacterCompanion } from './CharacterCompanion';
import { recordedLine } from '../../hooks/recordedLines';
import { trackMouth } from '../../hooks/miloMouth';
import { interruptNow, playOnSpeaker } from '../../hooks/speaker';
import './miloCoach.css';

interface MiloCoachProps {
  learnerId: number;
  context: MiloGuidanceContext;
  event: Exclude<MiloGuidanceEvent, 'return'>;
  cueKey?: string | number;
  engaged?: boolean;
  onAction?: (action: Exclude<MiloGuidanceAction, 'none'>) => void;
  previewMode?: boolean;
}

export function MiloCoach({ learnerId, context, event, cueKey, engaged = false, onAction, previewMode = false }: MiloCoachProps) {
  const [dismissedCue, setDismissedCue] = useState<string | null>(null);
  const cue = `${context}:${event}:${cueKey ?? ''}`;
  const [returning] = useState(() => {
    if (previewMode || learnerId <= 0) return false;
    try {
      return localStorage.getItem(miloGuidanceSeenKey(learnerId, context)) === 'seen';
    } catch {
      return false;
    }
  });
  const effectiveEvent: MiloGuidanceEvent = event === 'intro' && returning ? 'return' : event;
  const line = getMiloGuidance(context, effectiveEvent, getLearningSettings().narration_mode);

  useEffect(() => {
    if (previewMode || learnerId <= 0) return;
    try { localStorage.setItem(miloGuidanceSeenKey(learnerId, context), 'seen'); } catch { /* Guidance remains available without storage. */ }
  }, [context, learnerId, previewMode]);
  const recording = useRef<HTMLAudioElement | null>(null);
  const speaking = useRef<(() => void) | null>(null);
  // Only Milo's own speech is cancelled, so a hint change never cuts another line.
  const silence = () => { if (speaking.current) window.speechSynthesis?.cancel(); recording.current?.pause(); recording.current = null; speaking.current?.(); speaking.current = null; };
  useEffect(() => silence, []);
  useEffect(() => { silence(); }, [cue]);
  useEffect(() => {
    if (engaged) silence();
  }, [engaged]);

  if (engaged || dismissedCue === cue) return null;

  const speak = () => {
    if (getLearningSettings().sound_volume === 0) return;
    silence();
    const file = recordedLine(line.text);
    if (file) {
      const audio = new Audio(file);
      audio.volume = learningVolume();
      trackMouth(audio);
      recording.current = audio;
      void playOnSpeaker(audio).catch(() => {});
      return;
    }
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.volume = learningVolume();
    utterance.rate = 0.94;
    speaking.current = interruptNow(recording, silence);
    utterance.onend = utterance.onerror = () => { speaking.current?.(); speaking.current = null; };
    window.speechSynthesis.speak(utterance);
  };

  return (
    <aside className="milo-coach" aria-live="polite" aria-label="Milo's guidance">
      <div className="milo-coach__character"><CharacterCompanion size={104} state={event === 'success' ? 'celebrating' : event.includes('error') ? 'encouraging' : 'idle'} gesture={event.includes('error') ? 'wave' : 'point'} cueKey={cue} /></div>
      <div className="milo-coach__bubble">
        <div className="milo-coach__heading"><strong>Milo</strong><span>{effectiveEvent === 'return' ? 'Quick reminder' : event === 'success' ? 'Nice work' : event.includes('error') ? 'A little help' : 'Ready when you are'}</span></div>
        <p>{line.text}</p>
        <div className="milo-coach__actions">
          <button onClick={speak}><Volume2 /> Hear Milo</button>
          {line.action !== 'none' && onAction && <button className="milo-coach__action" onClick={() => { if(line.action !== 'none') onAction(line.action); }}>{line.actionLabel}</button>}
        </div>
      </div>
      <button className="milo-coach__dismiss" onClick={() => { silence(); setDismissedCue(cue); }} aria-label="Dismiss Milo's explanation" title="Dismiss explanation"><X /></button>
    </aside>
  );
}
