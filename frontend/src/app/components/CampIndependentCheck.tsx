import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Ear, Flag, Headphones, Loader2, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { queueEvidenceAttempt } from '../../hooks/evidenceRecords';
import {
  createMeaningCheckEvidence,
  createSoundCheckEvidence,
  createWordConstructionEvidence,
  resolveIndependentMedia,
  shuffleItems,
  SOUND_CHECK_ITEMS,
  verifyIndependentMedia,
  WORD_CHECK,
  type CampLetter,
  type SoundCheckItem,
} from './learningCampIndependent';
import './campIndependentCheck.css';
import { MiloCoach } from './MiloCoach';
import { playClip } from '../../hooks/speaker';

interface CampIndependentCheckProps {
  learnerId: number;
  curriculumVersion: string;
  mediaManifestVersion: string;
  onBack: () => void;
  onComplete: () => void;
  onGuidedBlend: () => void;
  previewMode?: boolean;
}

type Phase = 'checking' | 'intro' | 'sound' | 'word-audio' | 'word-build' | 'read-word' | 'meaning' | 'remediation' | 'summary' | 'blocked';
type Remediation = { type: 'sound'; item: SoundCheckItem } | { type: 'blend' } | { type: 'meaning' };

export function CampIndependentCheck({
  learnerId,
  curriculumVersion,
  mediaManifestVersion,
  onBack,
  onComplete,
  onGuidedBlend,
  previewMode = false,
}: CampIndependentCheckProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [soundIndex, setSoundIndex] = useState(0);
  const [soundHeard, setSoundHeard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [placed, setPlaced] = useState<CampLetter[]>([]);
  const [wordHeard, setWordHeard] = useState(false);
  const [remediation, setRemediation] = useState<Remediation | null>(null);
  const [pictureReady, setPictureReady] = useState(previewMode);
  const sessionId = useRef(crypto.randomUUID());
  const itemStartedAt = useRef(new Date().toISOString());
  const soundItems = useMemo(() => shuffleItems(SOUND_CHECK_ITEMS), []);
  const choiceOrders = useMemo(() => soundItems.map(() => shuffleItems<CampLetter>(['m', 'a', 't'])), [soundItems]);
  const wordTiles = useMemo(() => shuffleItems<CampLetter>(['m', 'a', 't']), []);
  const media = useMemo(() => resolveIndependentMedia(mediaManifestVersion), [mediaManifestVersion]);
  const currentSound = soundItems[soundIndex];
  const currentSoundMedia = media.soundItems.find((item) => item.letter === currentSound?.letter);

  useEffect(() => {
    let active = true;
    if (previewMode) {
      setPhase('intro');
      return () => { active = false; };
    }
    void verifyIndependentMedia(mediaManifestVersion).then((available) => {
      if (active) setPhase(available ? 'intro' : 'blocked');
    });
    return () => { active = false; };
  }, [mediaManifestVersion, previewMode]);

  const evidenceContext = () => ({
    sessionId: sessionId.current,
    curriculumVersion,
    mediaManifestVersion,
    startedAt: itemStartedAt.current,
    capturedOffline: !navigator.onLine,
  });

  const save = (attempt: ReturnType<typeof createSoundCheckEvidence>) => {
    if (!previewMode) queueEvidenceAttempt(learnerId, attempt);
  };

  const hear = async (url: string, after: () => void) => {
    if (playing) return;
    setPlaying(true);
    try {
      if (previewMode) await new Promise((resolve) => window.setTimeout(resolve, 350));
      else await playClip(url);
      after();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setPhase('blocked');
    } finally {
      setPlaying(false);
    }
  };

  const answerSound = (response: CampLetter) => {
    if (!soundHeard || !currentSound) return;
    save(createSoundCheckEvidence({ ...evidenceContext(), item: currentSound, response }));
    if (response !== currentSound.letter) {
      setRemediation({ type: 'sound', item: currentSound });
      setPhase('remediation');
      return;
    }
    if (soundIndex === soundItems.length - 1) {
      itemStartedAt.current = new Date().toISOString();
      setPhase('word-audio');
      return;
    }
    setSoundIndex((index) => index + 1);
    setSoundHeard(false);
    itemStartedAt.current = new Date().toISOString();
  };

  const chooseWordTile = (letter: CampLetter) => {
    if (phase !== 'word-build') return;
    const expected = WORD_CHECK.letters[placed.length];
    if (letter !== expected) {
      save(createWordConstructionEvidence({ ...evidenceContext(), response: [...placed, letter].join(''), result: 'incorrect' }));
      setRemediation({ type: 'blend' });
      setPhase('remediation');
      return;
    }
    const next = [...placed, letter];
    setPlaced(next);
    if (next.length === WORD_CHECK.letters.length) {
      save(createWordConstructionEvidence({ ...evidenceContext(), response: next.join(''), result: 'correct' }));
      itemStartedAt.current = new Date().toISOString();
      setPhase('read-word');
    }
  };

  const answerMeaning = (response: 'yes' | 'no') => {
    save(createMeaningCheckEvidence({ ...evidenceContext(), response }));
    if (response === 'no') {
      setRemediation({ type: 'meaning' });
      setPhase('remediation');
    } else setPhase('summary');
  };

  if (phase === 'checking') {
    return <main className="camp-check camp-check--center"><Loader2 className="camp-check__spinner" /><h1>Opening Lookout Point...</h1><p>Checking the approved assessment media.</p></main>;
  }

  if (phase === 'blocked') {
    return (
      <main className="camp-check camp-check--center">
        <div className="camp-check__blocked"><Headphones /></div>
        <p className="camp-check__eyebrow">Check unavailable</p>
        <h1>Lookout Point is resting</h1>
        <p>An approved sound or picture did not load. Readlr will not replace assessment items with unreviewed media.</p>
        <button className="camp-check__secondary" onClick={onBack}><ArrowLeft /> Return to Camp</button>
      </main>
    );
  }

  return (
    <main className="camp-check">
      {previewMode && <div className="camp-check__preview"><Sparkles /> Design preview: sounds and images are simulated; no assessment record is saved.</div>}
      <header className="camp-check__topbar">
        <button className="camp-check__icon-button" onClick={onBack} aria-label="Return to Camp" title="Return to Camp"><ArrowLeft /></button>
        <div><p>Lookout Point</p><strong>Camp Check</strong></div>
        <span>{phase === 'sound' ? `${soundIndex + 1} / 3` : phase === 'summary' ? 'Done' : 'Your turn'}</span>
      </header>

      <section className="camp-check__lookout">
        <div className="camp-check__mountains" aria-hidden="true" />
        <motion.div key={phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="camp-check__panel">
          {phase === 'intro' && (
            <>
              <div className="camp-check__round-icon"><Flag /></div>
              <p className="camp-check__eyebrow">A quiet try on your own</p>
              <h1>Ready for Camp Check?</h1>
              <p>You will hear three sounds, build one word, and check its meaning. Each sound plays once. Take your time.</p>
              <MiloCoach learnerId={learnerId} context="independent_check" event="intro" cueKey="check-intro" previewMode={previewMode} />
              <div className="camp-check__notice"><Ear /> Need help? We will stop the check and open a practice path. Help never changes an earlier answer.</div>
              <button className="camp-check__primary" onClick={() => { itemStartedAt.current = new Date().toISOString(); setPhase('sound'); }}>Begin <ArrowRight /></button>
            </>
          )}

          {phase === 'sound' && currentSound && currentSoundMedia && (
            <>
              <p className="camp-check__eyebrow">Sound {soundIndex + 1} of 3</p>
              <h1>Which letter matches the sound?</h1>
              <p>Play the sound once, then choose a letter.</p>
              <button className={`camp-check__listen ${soundHeard ? 'is-heard' : ''}`} disabled={playing || soundHeard} onClick={() => void hear(currentSoundMedia.url, () => setSoundHeard(true))}>
                {playing ? <Loader2 className="camp-check__spinner" /> : soundHeard ? <Check /> : <Volume2 />}
                <span>{soundHeard ? 'Sound played' : 'Play sound'}</span>
              </button>
              <div className="camp-check__choices">
                {choiceOrders[soundIndex].map((letter) => <button key={letter} disabled={!soundHeard} onClick={() => answerSound(letter)}>{letter}</button>)}
              </div>
            </>
          )}

          {phase === 'word-audio' && (
            <>
              <p className="camp-check__eyebrow">Word check</p>
              <h1>Listen once, then build the word</h1>
              <p>The word will not appear while you build it.</p>
              <button className={`camp-check__listen ${wordHeard ? 'is-heard' : ''}`} disabled={playing || wordHeard} onClick={() => void hear(media.wordAudio.url, () => setWordHeard(true))}>
                {playing ? <Loader2 className="camp-check__spinner" /> : wordHeard ? <Check /> : <Volume2 />}
                <span>{wordHeard ? 'Word played' : 'Play word'}</span>
              </button>
              <button className="camp-check__primary" disabled={!wordHeard} onClick={() => { itemStartedAt.current = new Date().toISOString(); setPhase('word-build'); }}>Build it <ArrowRight /></button>
            </>
          )}

          {phase === 'word-build' && (
            <>
              <p className="camp-check__eyebrow">No picture or printed answer</p>
              <h1>Build the word you heard</h1>
              <div className="camp-check__slots" aria-label={`${placed.length} of 3 letters placed`}>
                {WORD_CHECK.letters.map((_, index) => <span key={index}>{placed[index] ?? ''}</span>)}
              </div>
              <div className="camp-check__tiles">
                {wordTiles.map((letter) => <button key={letter} disabled={placed.includes(letter)} onClick={() => chooseWordTile(letter)}>{letter}</button>)}
              </div>
            </>
          )}

          {phase === 'read-word' && (
            <>
              <p className="camp-check__eyebrow">Unscored reading moment</p>
              <h1>Read the word you built</h1>
              <div className="camp-check__word">mat</div>
              <p>Say it quietly or aloud. Readlr does not score this spoken attempt.</p>
              <button className="camp-check__primary" onClick={() => { itemStartedAt.current = new Date().toISOString(); setPhase('meaning'); }}>Check its meaning <ArrowRight /></button>
            </>
          )}

          {phase === 'meaning' && (
            <>
              <p className="camp-check__eyebrow">Meaning check</p>
              <h1>Does this picture show a mat?</h1>
              <div className="camp-check__meaning">
                {previewMode ? <div className="camp-check__placeholder-mat" role="img" aria-label="Placeholder picture of a mat"><span /><span /><span /></div> : <img src={media.meaningImage.url} alt="A mat" onLoad={() => setPictureReady(true)} onError={() => setPhase('blocked')} />}
              </div>
              <div className="camp-check__yes-no">
                <button disabled={!pictureReady} onClick={() => answerMeaning('yes')}>Yes</button>
                <button disabled={!pictureReady} onClick={() => answerMeaning('no')}>No</button>
              </div>
              <p className="camp-check__fine-print">This two-choice item is stored separately and is not independent mastery evidence.</p>
            </>
          )}

          {phase === 'remediation' && remediation && (
            <>
              <div className="camp-check__round-icon camp-check__round-icon--help"><RotateCcw /></div>
              <p className="camp-check__eyebrow">Practice path</p>
              <h1>Let&apos;s strengthen one small skill</h1>
              <p>The check has ended. Practice will not replace or erase the answer you already gave.</p>
              {remediation.type === 'sound' && (
                <div className="camp-check__remedy">
                  <span className="camp-check__remedy-letter">{remediation.item.letter}</span>
                  <p>This letter matches the sound. Listen and look together.</p>
                  <button className="camp-check__secondary" disabled={playing} onClick={() => void hear(media.soundItems.find((item) => item.letter === remediation.item.letter)!.url, () => undefined)}><Volume2 /> Practice the sound</button>
                </div>
              )}
              {remediation.type === 'blend' && <div className="camp-check__remedy"><p>Return to the Wordsmith Tent to join the three sounds with visible tiles and approved models.</p><button className="camp-check__primary" onClick={onGuidedBlend}>Open guided blending <ArrowRight /></button></div>}
              {remediation.type === 'meaning' && <div className="camp-check__remedy"><p>A mat is a covering placed on the floor. The picture and word belong together.</p><div className="camp-check__word">mat</div></div>}
              {remediation.type !== 'blend' && <button className="camp-check__primary" onClick={onBack}>Finish practice <ArrowLeft /></button>}
            </>
          )}

          {phase === 'summary' && (
            <>
              <div className="camp-check__round-icon camp-check__round-icon--done"><Check /></div>
              <p className="camp-check__eyebrow">Camp Check complete</p>
              <h1>Your answers are ready for review</h1>
              <p>No percentage or mastery badge is invented here. Readlr saved each activity with the help and media conditions that actually occurred.</p>
              <MiloCoach learnerId={learnerId} context="independent_check" event="success" cueKey="check-complete" previewMode={previewMode} />
              <button className="camp-check__primary" onClick={onComplete}>Return to Camp <Flag /></button>
            </>
          )}
        </motion.div>
      </section>
    </main>
  );
}
