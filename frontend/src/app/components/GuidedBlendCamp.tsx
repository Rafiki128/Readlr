import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Headphones, Loader2, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { queueEvidenceAttempt } from '../../hooks/evidenceRecords';
import {
  acceptGuidedTile,
  createGuidedBlendEvidence,
  GUIDED_BLEND_LESSONS,
  resolveGuidedLessonMedia,
  verifyGuidedMedia,
} from './learningCampCurriculum';
import './guidedBlendCamp.css';
import { MiloCoach } from './MiloCoach';
import { playClip } from '../../hooks/speaker';

interface GuidedBlendCampProps {
  learnerId: number;
  curriculumVersion: string;
  mediaManifestVersion: string;
  onBack: () => void;
  onComplete: () => void;
  previewMode?: boolean;
  startLessonIndex?: number;
}

type Phase = 'checking' | 'listen' | 'build' | 'success' | 'blocked';

export function GuidedBlendCamp({
  learnerId,
  curriculumVersion,
  mediaManifestVersion,
  onBack,
  onComplete,
  previewMode = false,
  startLessonIndex = 0,
}: GuidedBlendCampProps) {
  const [lessonIndex, setLessonIndex] = useState(Math.min(Math.max(startLessonIndex, 0), GUIDED_BLEND_LESSONS.length - 1));
  const [phase, setPhase] = useState<Phase>('checking');
  const [placed, setPlaced] = useState<string[]>([]);
  const [hintCount, setHintCount] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [heard, setHeard] = useState<boolean[]>([false, false, false]);
  const [recorded, setRecorded] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const sessionId = useRef(crypto.randomUUID());
  const startedAt = useRef(new Date().toISOString());
  const lesson = useMemo(
    () => resolveGuidedLessonMedia(GUIDED_BLEND_LESSONS[lessonIndex], mediaManifestVersion),
    [lessonIndex, mediaManifestVersion],
  );
  const audioMedia = lesson.media.filter((asset) => asset.kind === 'audio');
  const meaningImage = lesson.media.find((asset) => asset.kind === 'image');
  const bank = useMemo(() => lesson.word === 'mat' ? ['t', 'm', 'a'] : [...lesson.letters].reverse(), [lesson]);
  const guidanceEvent = phase === 'success' ? 'success' : hintCount >= 2 ? 'repeated_error' : hintCount === 1 ? 'first_error' : 'intro';

  useEffect(() => {
    let active = true;
    setPhase('checking');
    setPlaced([]);
    setHintCount(0);
    setHeard([false, false, false]);
    setRecorded(false);
    startedAt.current = new Date().toISOString();
    if (previewMode) {
      setPhase('listen');
      return () => { active = false; };
    }
    void verifyGuidedMedia(lesson).then((available) => {
      if (active) setPhase(available ? 'listen' : 'blocked');
    });
    return () => { active = false; };
  }, [lesson, previewMode]);

  useEffect(() => {
    rootRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase, lessonIndex]);

  const recordCompletion = () => {
    if (recorded) return;
    if (previewMode) {
      setRecorded(true);
      return;
    }
    const attempt = createGuidedBlendEvidence({
      lesson,
      sessionId: sessionId.current,
      curriculumVersion,
      mediaManifestVersion,
      hintCount,
      startedAt: startedAt.current,
      capturedOffline: !navigator.onLine,
    });
    queueEvidenceAttempt(learnerId, attempt);
    setRecorded(true);
  };

  const hearModel = async (index: number) => {
    if (playingIndex !== null || phase !== 'listen') return;
    setPlayingIndex(index);
    try {
      if (previewMode) await new Promise((resolve) => window.setTimeout(resolve, 350));
      else await playClip(audioMedia[index].url);
      setHeard((current) => current.map((value, position) => position === index ? true : value));
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setPhase('blocked');
    } finally {
      setPlayingIndex(null);
    }
  };

  const chooseTile = (letter: string) => {
    if (phase !== 'build' || placed.includes(letter) && lesson.letters.filter((item) => item === letter).length === 1) return;
    const result = acceptGuidedTile(lesson.letters, placed, letter);
    if (!result.correct) {
      setHintCount((count) => count + 1);
      return;
    }
    setPlaced(result.placed);
    if (result.placed.length === lesson.letters.length) {
      setPhase('success');
      if (!meaningImage || previewMode) recordCompletion();
    }
  };

  const nextLesson = () => {
    if (lessonIndex === GUIDED_BLEND_LESSONS.length - 1) {
      onComplete();
      return;
    }
    setLessonIndex((index) => index + 1);
  };

  if (phase === 'checking') {
    return <main className="guided-blend guided-blend--center"><Loader2 className="guided-blend__spinner" /><h1>Opening the Wordsmith Tent...</h1><p>Checking the approved sound models.</p></main>;
  }

  if (phase === 'blocked') {
    return (
      <main className="guided-blend guided-blend--center">
        <div className="guided-blend__blocked-icon"><Headphones /></div>
        <p className="guided-blend__eyebrow">Sound models unavailable</p>
        <h1>This activity is resting for now</h1>
        <p>The approved sounds did not load, so Readlr will not replace them with a different voice.</p>
        <button className="guided-blend__secondary" onClick={onBack}><ArrowLeft /> Return to Camp</button>
      </main>
    );
  }

  return (
    <main className="guided-blend" ref={rootRef}>
      {previewMode && <div className="guided-blend__preview"><Sparkles /> Design preview: audio is simulated and no learner record is saved.</div>}
      <header className="guided-blend__topbar">
        <button onClick={onBack} className="guided-blend__icon-button" aria-label="Return to Camp" title="Return to Camp"><ArrowLeft /></button>
        <div>
          <p>Wordsmith Tent</p>
          <strong>{lesson.title}</strong>
        </div>
        <span>{lessonIndex + 1} / {GUIDED_BLEND_LESSONS.length}</span>
      </header>

      <section className="guided-blend__room">
        <div className="guided-blend__banner">
          <p className="guided-blend__eyebrow">Guided practice</p>
          <h1>{phase === 'listen' ? 'Hear how the sounds join' : phase === 'build' ? lesson.prompt : `You built ${lesson.word}!`}</h1>
          <p>{phase === 'listen' ? 'Play each model from left to right.' : phase === 'build' ? 'Tap the letter tiles in reading order.' : 'The sounds travelled together and became one word.'}</p>
        </div>

        <MiloCoach
          learnerId={learnerId}
          context="guided_blend"
          event={guidanceEvent}
          cueKey={`${lesson.activityId}-${hintCount}-${phase}`}
          engaged={playingIndex !== null}
          previewMode={previewMode}
          onAction={(action) => {
            if (action === 'play_sound_model') { setHeard([false, false, false]); setPhase('listen'); }
            if (action === 'offer_hint') rootRef.current?.querySelector('.guided-blend__slots')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }}
        />

        {phase === 'listen' && (
          <div className="guided-blend__models">
            {audioMedia.map((asset, index) => (
              <button
                key={asset.assetId}
                onClick={() => void hearModel(index)}
                disabled={playingIndex !== null}
                className={heard[index] ? 'is-heard' : ''}
              >
                <span>{heard[index] ? <Check /> : playingIndex === index ? <Loader2 className="guided-blend__spinner" /> : <Volume2 />}</span>
                <small>Step {index + 1}</small>
                <strong>{asset.label}</strong>
              </button>
            ))}
          </div>
        )}

        {(phase === 'build' || phase === 'success') && (
          <div className="guided-blend__workbench">
            <div className="guided-blend__slots" aria-label={`${placed.length} of ${lesson.letters.length} letters placed`}>
              {lesson.letters.map((_, index) => (
                <motion.span key={index} animate={placed[index] ? { scale: [0.85, 1.06, 1] } : {}}>
                  {placed[index] ?? ''}
                </motion.span>
              ))}
            </div>
            {phase === 'build' && (
              <div className="guided-blend__bank" aria-label="Letter tiles">
                {bank.map((letter, index) => {
                  const used = placed.includes(letter) && lesson.letters.filter((item) => item === letter).length === 1;
                  return <button key={`${letter}-${index}`} disabled={used} onClick={() => chooseTile(letter)}>{letter}</button>;
                })}
              </div>
            )}
            {phase === 'build' && hintCount > 0 && <p className="guided-blend__hint">Look for <strong>{lesson.letters[placed.length]}</strong> next. Read from left to right.</p>}
            {phase === 'success' && meaningImage && (previewMode ? (
              <div className="guided-blend__meaning guided-blend__meaning--placeholder" role="img" aria-label="Placeholder picture of a mat"><span /><span /><span /></div>
            ) : <img className="guided-blend__meaning" src={meaningImage.url} alt="A mat" onLoad={recordCompletion} onError={() => setPhase('blocked')} />)}
          </div>
        )}

        <footer className="guided-blend__actions">
          {phase === 'listen' && (
            <button className="guided-blend__primary" disabled={!heard.every(Boolean)} onClick={() => setPhase('build')}>Build the word <ArrowRight /></button>
          )}
          {phase === 'build' && placed.length > 0 && (
            <button className="guided-blend__secondary" onClick={() => { setPlaced([]); setHintCount((count) => count + 1); }}><RotateCcw /> Start the tiles again</button>
          )}
          {phase === 'success' && (
            <button className="guided-blend__primary" disabled={!recorded} onClick={nextLesson}>
              {lessonIndex === GUIDED_BLEND_LESSONS.length - 1 ? 'Finish guided trail' : 'Try the next word'} <Sparkles />
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
