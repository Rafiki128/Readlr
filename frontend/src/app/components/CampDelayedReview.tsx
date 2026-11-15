import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Flag, Loader2, Mic, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { queueEvidenceAttempt } from '../../hooks/evidenceRecords';
import { createDelayedSoundEvidence, createDelayedWordEvidence, delayedSoundUrl, DELAYED_REVIEW_ITEMS, verifyDelayedReviewMedia } from '../../hooks/delayedReview';
import { shuffleItems, WORD_CHECK, type CampLetter } from './learningCampIndependent';
import './campDelayedReview.css';
import { MiloCoach } from './MiloCoach';
import { useCvcRecorder } from '../../hooks/useCvcRecorder';
import { recognizeCvc } from '../../hooks/recognizeCvc';
import { playClip } from '../../hooks/speaker';

interface CampDelayedReviewProps {
  learnerId: number;
  curriculumVersion: string;
  mediaManifestVersion: string;
  onBack: () => void;
  onComplete: () => void;
  onPracticeBlend: () => void;
  previewMode?: boolean;
}

type Phase = 'checking' | 'intro' | 'sound' | 'word-read' | 'summary' | 'blocked';

export function CampDelayedReview({ learnerId, curriculumVersion, mediaManifestVersion, onBack, onComplete, onPracticeBlend, previewMode = false }: CampDelayedReviewProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [soundIndex, setSoundIndex] = useState(0);
  const [heard, setHeard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording,setRecording]=useState(false);
  const [seconds,setSeconds]=useState(4);
  const [message,setMessage]=useState('');
  const [results, setResults] = useState<boolean[]>([]);
  const sessionId = useRef(crypto.randomUUID());
  const startedAt = useRef(new Date().toISOString());
  const items = useMemo(() => shuffleItems(DELAYED_REVIEW_ITEMS), []);
  const choices = useMemo(() => items.map(() => shuffleItems<CampLetter>(['m', 'a', 't'])), [items]);
  const recorder=useCvcRecorder();
  const request=useRef<AbortController|null>(null);
  const item = items[soundIndex];

  useEffect(() => {
    let active = true;
    if (previewMode) { setPhase('intro'); return () => { active = false; }; }
    void verifyDelayedReviewMedia(mediaManifestVersion).then((available) => { if (active) setPhase(available ? 'intro' : 'blocked'); });
    return () => { active = false; request.current?.abort(); recorder.stop(); };
  }, [mediaManifestVersion, previewMode]);

  const context = () => ({ sessionId: sessionId.current, curriculumVersion, mediaManifestVersion, startedAt: startedAt.current, capturedOffline: !navigator.onLine });
  const save = (attempt: ReturnType<typeof createDelayedSoundEvidence>) => { if (!previewMode) queueEvidenceAttempt(learnerId, attempt); };
  const hear = async (url: string, next: () => void) => {
    if (playing || heard) return;
    setPlaying(true);
    try {
      if (previewMode) await new Promise((resolve) => window.setTimeout(resolve, 320)); else await playClip(url);
      next();
    } catch (error) { if ((error as Error).name !== 'AbortError') setPhase('blocked'); }
    finally { setPlaying(false); }
  };
  const answerSound = (response: CampLetter) => {
    if (!heard || !item) return;
    const correct = response === item.letter;
    save(createDelayedSoundEvidence({ ...context(), item, response }));
    setResults((current) => [...current, correct]);
    if (soundIndex === items.length - 1) { startedAt.current = new Date().toISOString(); setHeard(false); setPhase('word-read'); }
    else { setSoundIndex((current) => current + 1); setHeard(false); startedAt.current = new Date().toISOString(); }
  };
  const readWord=async()=>{
    if(recording)return;
    if(previewMode){save(createDelayedWordEvidence({...context(),response:'mat',status:'matched'}));setResults(current=>[...current,true]);setPhase('summary');return;}
    setMessage('Getting the microphone ready...');
    try{
      const blob=await recorder.capture(setSeconds,async()=>{setRecording(true);setMessage('Read the word now.');});
      setRecording(false);setMessage('Checking your reading...');
      const controller=new AbortController();request.current=controller;
      const result=await recognizeCvc(blob,WORD_CHECK.word,controller.signal);
      if(result.status==='uncertain'){setMessage('That was hard to hear. Try once more.');return;}
      save(createDelayedWordEvidence({...context(),response:result.transcript,status:result.status}));
      setResults(current=>[...current,result.status==='matched']);setPhase('summary');
    }catch(error){setRecording(false);setMessage(error instanceof Error?error.message:'Word checking is unavailable.');}
  };
  const correct = results.filter(Boolean).length;

  if (phase === 'checking') return <main className="camp-review camp-review--center"><Loader2 className="camp-review__spinner" /><h1>Opening Memory Meadow</h1><p>Readlr is checking the approved review media.</p></main>;
  if (phase === 'blocked') return <main className="camp-review camp-review--center"><div className="camp-review__blocked"><Volume2 /></div><h1>Review media is unavailable</h1><p>No substitute sound will be used for a retention check.</p><button className="camp-review__secondary" onClick={onBack}><ArrowLeft /> Return to Camp</button></main>;

  return <main className="camp-review">
    {previewMode && <div className="camp-review__preview"><Sparkles /> Design preview: the review is due now and no learner evidence is saved.</div>}
    <header className="camp-review__topbar"><button className="camp-review__icon" onClick={onBack} aria-label="Return to Camp"><ArrowLeft /></button><div><p>Delayed review</p><strong>Memory Meadow</strong></div><span>{phase === 'sound' ? `${soundIndex + 1} / 4` : phase === 'word-read'?'4 / 4':phase === 'summary' ? 'Complete' : 'Later check'}</span></header>
    <section className="camp-review__meadow"><div className="camp-review__hills" aria-hidden="true" /><div className="camp-review__lanterns" aria-hidden="true"><i /><i /><i /></div>
      <div className="camp-review__panel">
        {phase === 'intro' && <><div className="camp-review__round"><Clock3 /></div><p className="camp-review__eyebrow">A little time has passed</p><h1>What do you remember?</h1><p>This is a fresh check. Milo will not show the answer, and every result stays separate from your first Camp Check.</p><MiloCoach learnerId={learnerId} context="delayed_review" event="intro" cueKey="review-intro" previewMode={previewMode} /><div className="camp-review__notice"><Flag /> Three sounds and one word read. No picture clues and no score badge.</div><button className="camp-review__primary" onClick={() => { startedAt.current = new Date().toISOString(); setPhase('sound'); }}>Light the first lantern <ArrowRight /></button></>}
        {phase === 'sound' && item && <><p className="camp-review__eyebrow">Memory lantern {soundIndex + 1} of 3</p><h1>Which letter matches the sound?</h1><p>The sound plays once. Choose what you remember.</p><button className={`camp-review__listen ${heard ? 'is-heard' : ''}`} disabled={playing || heard} onClick={() => void hear(delayedSoundUrl(item.letter), () => setHeard(true))}>{playing ? <Loader2 className="camp-review__spinner" /> : heard ? <Check /> : <Volume2 />}<span>{heard ? 'Sound played' : 'Play sound once'}</span></button><div className="camp-review__choices">{choices[soundIndex].map((letter) => <button key={letter} disabled={!heard} onClick={() => answerSound(letter)}>{letter}</button>)}</div></>}
        {phase === 'word-read' && <><p className="camp-review__eyebrow">Final lantern</p><h1>Read this word from memory</h1><p>No model voice will say the answer first.</p><div className="camp-review__memory-word" aria-label="mat">mat</div><button className="camp-review__primary" disabled={recording} onClick={()=>void readWord()}><Mic/>{recording?`Listening... ${seconds}`:'Read mat aloud'}</button><p role="status">{message}</p></>}
        {phase === 'summary' && <><div className="camp-review__round camp-review__round--done"><Check /></div><p className="camp-review__eyebrow">Review recorded</p><h1>{correct === 4 ? 'Those skills stayed with you' : 'Now we know what to revisit'}</h1><p>{correct} of 4 review activities were correct. This is retention evidence, not an automatic mastery badge.</p><MiloCoach learnerId={learnerId} context="delayed_review" event={correct === 4 ? 'success' : correct < 2 ? 'repeated_error' : 'first_error'} cueKey={`review-${correct}`} previewMode={previewMode} onAction={(action) => { if (action === 'suggest_review') onPracticeBlend(); }} />{correct < 4 && <div className="camp-review__notice camp-review__notice--practice"><RotateCcw /> The original answers remain saved. Practice will not replace them.</div>}<div className="camp-review__actions">{correct < 4 && <button className="camp-review__secondary" onClick={onPracticeBlend}><RotateCcw /> Practice blending</button>}<button className="camp-review__primary" onClick={onComplete}>Return to Camp <Flag /></button></div></>}
      </div>
    </section>
  </main>;
}
