import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Pointer, RotateCcw, ThumbsUp, X } from 'lucide-react';
import { BOOK1_GUIDE_SKIPPED, BOOK1_GUIDE_STEPS, guideKey, guideProgress, nextGuideStep, type GuideStep, type GuideStepId } from './book1GuideSteps';
import { CharacterCompanion } from './CharacterCompanion';
import { GrownUpConfirm } from './GrownUpConfirm';
import { HearMiloButton, useMiloInstruction } from './MiloSays';
import { patchLearnerCurriculumState, readLearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import './book1Guide.css';

type Box = { left: number; top: number; right: number; bottom: number };
const PAD = 8;

function boxOf(elements: Element[]): Box | null {
  const rects = elements.map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  return { left: Math.min(...rects.map(r => r.left)) - PAD, top: Math.min(...rects.map(r => r.top)) - PAD, right: Math.max(...rects.map(r => r.right)) + PAD, bottom: Math.max(...rects.map(r => r.bottom)) + PAD };
}

// Only controls the child can see count, so nothing inside a closed panel is ever lit up.
const shown = (selector: string) => [...document.querySelectorAll(selector)].filter(el => el.checkVisibility?.() ?? true);

// The lit-up area: the first stop only, every matching control otherwise, plus the drop boxes for a drag.
function targets(step: GuideStep): Element[] {
  const found = shown(step.target);
  const lit = step.id === 'first-stop' ? found.slice(0, 1) : found;
  return step.dragTo ? [...lit, ...shown(step.dragTo)] : lit;
}

const centre = (el: Element | null) => { const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; };

function saved(learnerId: number, save: boolean) {
  return save ? guideProgress(readLearnerCurriculumState(learnerId).guidedActivities) : { done: new Set<GuideStepId>(), skipped: false };
}

function remember(learnerId: number, key: string) {
  patchLearnerCurriculumState(learnerId, { guidedActivities: { ...readLearnerCurriculumState(learnerId).guidedActivities, [key]: true } });
}

export function Book1Guide({ learnerId, save }: { learnerId: number; save: boolean }) {
  const [progress, setProgress] = useState(() => saved(learnerId, save));
  const [replay, setReplay] = useState(false);
  const [step, setStep] = useState<GuideStep | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [onCover, setOnCover] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const reduced = useReducedMotion();
  const stable = useRef<{ id: GuideStepId; since: number; key: string } | null>(null);
  const keep = save && !replay;

  // Look for the next step's control and wait until it has stopped moving before showing it.
  useEffect(() => {
    const tick = () => {
      setOnCover(Boolean(document.querySelector('.story-read') && document.querySelector('[aria-label="Next page"]')));
      const next = nextGuideStep(progress.done, progress.skipped, selector => shown(selector).length > 0);
      const area = next && boxOf(targets(next));
      if (!next || !area) { stable.current = null; setStep(null); setBox(null); return; }
      const key = `${Math.round(area.left)},${Math.round(area.top)},${Math.round(area.right)},${Math.round(area.bottom)}`;
      if (stable.current?.id !== next.id || stable.current.key !== key) {
        // A new step brings its control on screen first, since page arrows can sit below the fold on phones.
        if (stable.current?.id !== next.id) document.querySelector(next.target)?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        stable.current = { id: next.id, since: Date.now(), key }; if (step?.id !== next.id) setStep(null); return;
      }
      if (Date.now() - stable.current.since >= 600) { setStep(next); setBox(area); }
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [progress, step]);

  function finish(id: GuideStepId) {
    setProgress(current => ({ ...current, done: new Set([...current.done, id]) }));
    setStep(null); setBox(null); stable.current = null;
    if (keep) remember(learnerId, guideKey(id));
  }

  // The real action finishes the step: a tap inside the control, or the expected result appearing.
  useEffect(() => {
    if (!step || !step.interactive) return;
    const onTap = (event: PointerEvent) => {
      if (step.doneWhen) return;
      const hit = targets(step).some(el => el.contains(event.target as Node));
      if (hit) window.setTimeout(() => finish(step.id), 0);
    };
    const watch = step.doneWhen ? window.setInterval(() => { if (document.querySelector(step.doneWhen!)) finish(step.id); }, 200) : 0;
    document.addEventListener('pointerdown', onTap, true);
    return () => { document.removeEventListener('pointerdown', onTap, true); if (watch) window.clearInterval(watch); };
  }, [step]);

  const [heardLine, setHeardLine] = useState<string>();
  const say = useMiloInstruction(step?.line, setHeardLine);
  const heard = heardLine === step?.line;

  function skip() {
    setConfirm(false); setStep(null); setBox(null);
    setProgress(current => ({ ...current, skipped: true }));
    if (keep) remember(learnerId, BOOK1_GUIDE_SKIPPED);
  }

  const finished = progress.skipped || BOOK1_GUIDE_STEPS.every(item => progress.done.has(item.id));
  const showAgain = finished && onCover && !step;

  if (!step || !box) {
    return <>{showAgain && <button type="button" className="book1-guide-again" onClick={() => { setReplay(true); setProgress({ done: new Set(), skipped: false }); }}><RotateCcw aria-hidden="true" />Show me again</button>}</>;
  }

  const w = window.innerWidth, h = window.innerHeight;
  const hole = `polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${box.left}px ${box.top}px,${box.right}px ${box.top}px,${box.right}px ${box.bottom}px,${box.left}px ${box.bottom}px,${box.left}px ${box.top}px)`;
  const bubbleAbove = box.top > h - box.bottom;
  const bubbleStyle = bubbleAbove ? { bottom: Math.max(12, h - box.top + 16) } : { top: Math.min(h - 12, box.bottom + 16) };
  const from = centre(document.querySelector(step.target));
  const to = step.dragTo ? centre(document.querySelector(step.dragTo)) : null;
  // The hand sits with its fingertip on the control and only moves relative to it.
  const hand = from && (to ? { x: [0, to.x - from.x], y: [0, to.y - from.y] } : { x: 0, y: [0, 10, 0] });

  return (
    <div className="book1-guide" role="dialog" aria-modal="false" aria-label="Book guide">
      <div className="book1-guide__shade" style={{ clipPath: hole }} />
      {(!step.interactive || !heard) && <div className="book1-guide__shade book1-guide__shade--look" />}
      <div className="book1-guide__ring" style={{ left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top }} />
      {hand && (
        <motion.div key={step.id} className="book1-guide__hand" aria-hidden="true" style={{ left: from.x - 44 * 0.4, top: from.y - 44 * 0.12 }}
          initial={{ x: 0, y: 0 }} animate={reduced ? { x: 0, y: 0 } : hand}
          transition={reduced ? { duration: 0 } : { duration: to ? 1.6 : 0.9, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}>
          <Pointer />
        </motion.div>
      )}
      <div className="book1-guide__bubble" style={{ ...bubbleStyle, left: Math.max(16, Math.min(w - 336, (box.left + box.right) / 2 - 160)) }}>
        <CharacterCompanion size={56} state="idle" />
        <p>{step.line}</p>
        <HearMiloButton onClick={say} />
        {!step.interactive && <button type="button" className="book1-guide__ok" disabled={!heard} onClick={() => finish(step.id)}><ThumbsUp aria-hidden="true" />OK</button>}
        <button type="button" className="book1-guide__skip" onClick={() => setConfirm(true)} aria-label="Skip the guide"><X aria-hidden="true" /></button>
      </div>
      <GrownUpConfirm open={confirm} question="Skip the guide?" confirmLabel="Yes" onConfirm={skip} onCancel={() => setConfirm(false)} />
    </div>
  );
}
