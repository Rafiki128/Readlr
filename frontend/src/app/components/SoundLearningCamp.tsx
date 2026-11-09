import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Headphones, Mic, RotateCcw, Shield, Volume2, X } from 'lucide-react';
import { SOUND_CARDS, type SoundCard } from './aralCurriculum';
import { AdventureBackdrop, LandmarkArt } from './AdventureArt';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { CampSoundShield } from './CampObjectArt';
import { CharacterCompanion } from './CharacterCompanion';
import { highlightedWord } from './chronicleContent';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import { useCvcRecorder } from '../../hooks/useCvcRecorder';
import { recognizeCvc } from '../../hooks/recognizeCvc';
import { recognizeSentence } from '../../hooks/recognizeSentence.ts';
import { CAMP_BLEND_CONSONANTS, CAMP_BLEND_VOWELS } from './curriculumLibraryContent';
import { useWorldExit } from './useWorldExit';
import './chronicleWorld.css';
import './soundLearningCamp.css';
import { ActivityScene } from './ActivityScene';
import { CampOrientation } from './CampOrientation';
import { readLearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import { HearMiloButton, useMiloInstruction } from './MiloSays';

type Area='vowels'|'consonants'|'blends';

const phrases:Record<string,string>={mango:'Milo picks a mango.',apple:'An apple grows on the tree.',egg:'An egg is in the nest.',insect:'A little insect rests on a leaf.',octopus:'The octopus waves hello.',umbrella:'An umbrella keeps Milo dry.',cape:'Milo wears a bright cape.',tree:'A tree grows tall.',kite:'The kite dances in the sky.',hope:'Milo has hope for a sunny day.',cube:'Milo builds with a cube.',sun:'The sun warms the garden.',top:'Milo spins a top.',tin:'Milo opens a tin.',pen:'Milo draws with a pen.',net:'Milo carries a net.',hat:'Milo puts on a hat.',bag:'A book is in the bag.',dog:'The dog sits by Milo.',goat:'The goat climbs a hill.',log:'Milo sits on a log.',rug:'rug to hug',fan:'Milo opens a colorful fan.',cup:'cup to cap',web:'A web hangs in the tree.',jet:'A jet flies high.',box:'Milo opens the box.',van:'The van stops by the gate.',yam:'Milo puts a yam in the basket.',zip:'Milo pulls the zip.',quilt:'A warm quilt covers the bed.'};
const blendExamples:Record<string,string>={ma:'mat',me:'met',mi:'mix',mo:'mop',mu:'mud',sa:'sat',se:'set',si:'sit',so:'sob',su:'sun',pa:'pan',pe:'pen',pi:'pin',po:'pot',pu:'pup',ta:'tap',te:'ten',ti:'tin',to:'top',tu:'tub'};

// Target words that trigger sentence/phrase mode for Books 5, 6, 7, 8, and 9
const SENTENCE_MODE_WORDS = ['umbrella', 'goat', 'dog', 'rug', 'cup', 'web', 'kite', 'van', 'yam', 'box', 'jet', 'zip', 'cape', 'tree', 'hope', 'cube'];

export const BOOK_5_NODES: Record<string, { nodeId: string; targetSound: string; phrase: string }> = {
  umbrella: { nodeId: 'u-umbrella', targetSound: 'u', phrase: 'a big umbrella' },
  goat: { nodeId: 'g-goat', targetSound: 'g', phrase: 'a fat goat' },
  dog: { nodeId: 'd-dog', targetSound: 'd', phrase: 'a small dog' }
};

// Book 6: Sound Substitution / Word Shaper Curriculum
export const BOOK_6_NODES: Record<string, { nodeId: string; targetSound: string; phrase: string }> = {
  rug: { nodeId: 'r-rug', targetSound: 'r to h', phrase: 'rug to hug' },
  cup: { nodeId: 'c-cup', targetSound: 'u to a', phrase: 'cup to cap' }
};

// Book 7: Cumulative Phrases Curriculum
export const BOOK_7_NODES: Record<string, { nodeId: string; targetSound: string; phrase: string }> = {
  web: { nodeId: 'w-web', targetSound: 'w', phrase: 'A web hangs in the tree.' },
  kite: { nodeId: 'k-kite', targetSound: 'k', phrase: 'The kite dances in the sky.' }
};

// Book 8: The Royal Library (Reading for Meaning)
export const BOOK_8_NODES: Record<string, { nodeId: string; targetSound: string; phrase: string }> = {
  van: { nodeId: 'v-van', targetSound: 'v', phrase: 'The van stops by the gate.' },
  yam: { nodeId: 'y-yam', targetSound: 'y', phrase: 'Milo puts a yam in the basket.' },
  box: { nodeId: 'x-box', targetSound: 'x', phrase: 'Milo opens the box.' },
  jet: { nodeId: 'j-jet', targetSound: 'j', phrase: 'A jet flies high.' },
  zip: { nodeId: 'z-zip', targetSound: 'z', phrase: 'Milo pulls the zip.' }
};

// Book 9: The Vowel Tower (Magic E & Long Vowels)
export const BOOK_9_NODES: Record<string, { nodeId: string; targetSound: string; phrase: string }> = {
  cape: { nodeId: 'long-a-cape', targetSound: 'long a', phrase: 'Milo wears a bright cape.' },
  tree: { nodeId: 'long-e-tree', targetSound: 'long e', phrase: 'A tree grows tall.' },
  kite: { nodeId: 'long-i-kite', targetSound: 'long i', phrase: 'The kite dances in the sky.' }, // Overlaps with Book 7 contextually
  hope: { nodeId: 'long-o-hope', targetSound: 'long o', phrase: 'Milo has hope for a sunny day.' },
  cube: { nodeId: 'long-u-cube', targetSound: 'long u', phrase: 'Milo builds with a cube.' }
};

function HighlightedSoundWord({word,sound}:{word:string;sound:string}) {
  const [before,target,after]=highlightedWord(word,sound);
  return <span className="camp-guidance-word" aria-label={word}>{before}<mark>{target}</mark>{after}</span>;
}

function HighlightedSoundSentence({sentence,word,sound}:{sentence:string;word:string;sound:string}) {
  const start=sentence.toLowerCase().indexOf(word.toLowerCase());
  if(start<0)return <>{sentence}</>;
  return <>{sentence.slice(0,start)}<HighlightedSoundWord word={sentence.slice(start,start+word.length)} sound={sound}/>{sentence.slice(start+word.length)}</>;
}

export function SoundLearningCamp({onBack,reviewMode=false,learnerId}:{onBack:()=>void;reviewMode?:boolean;learnerId?:number}) {
  const [area,setArea]=useState<Area|null>(null);
  const transition=useWorldExit();
  const [vowelMode,setVowelMode]=useState<'short'|'long'>('short');
  const [selected,setSelected]=useState<SoundCard|null>(null);
  const [visited,setVisited]=useState<string[]>([]);
  const [consonant,setConsonant]=useState('m'),[vowel,setVowel]=useState('a');
  const [joined,setJoined]=useState(false);
  const [message,setMessage]=useState('');
  const audio=useBridgeAudio('/audio/stage2');
  const placePrompt=!area?'Welcome to Learning Camp! Pick a place. Let us discover what sounds can do.':area==='blends'?'Choose two sounds. Slide them together!':area==='vowels'?'Choose a shield. Discover its sound in a word.':'Every letter has a sound to discover. Choose one!';
  const needsOrientation=!reviewMode&&!!learnerId&&readLearnerCurriculumState(learnerId).campOrientationStep<3;
  const sayPlace=useMiloInstruction(selected||needsOrientation?undefined:placePrompt);
  const cards=SOUND_CARDS.filter(c=>area==='vowels'?c.category===vowelMode:c.category==='consonants');
  const openArea=(value:Area)=>{audio.stop();setArea(value);setMessage('');};
  const goBack=()=>{audio.stop();area?setArea(null):transition.exit(onBack);};
  if(!reviewMode&&learnerId&&readLearnerCurriculumState(learnerId).campOrientationStep<3)return <CampOrientation learnerId={learnerId} onReady={onBack}/>;
  if(selected)return <CampSoundLesson key={`${selected.category}-${selected.word}`} card={selected} reviewMode={reviewMode} onBack={()=>setSelected(null)} onFinish={()=>{setVisited(items=>[...new Set([...items,selected.word])]);setSelected(null);}}/>;
  return <main className={`camp-world ${area?'camp-world--inside':''} ${transition.leaving?'world-is-leaving':''}`}><div className="camp-world-content">
    <AdventureBackdrop theme={area==='blends'?'bridge':'garden'}/>
    <header className="camp-header"><button className="reading-icon activity-back-button" aria-label={area?'Back to Camp':'Back home'} title={area?'Back to Camp':'Back home'} onClick={goBack}><ArrowLeft/></button><div><p>Learning Camp</p><h1>{area==='vowels'?'The Vowel Dojo':area==='consonants'?'The Consonant Grove':area==='blends'?'The Blending Workshop':'A little wonder. A little practice.'}</h1></div><CharacterCompanion state={audio.isPlaying?'speaking':'idle'} gesture="wave" size={100}/></header>
    {!area?<>
      <div className="camp-welcome"><span>Milo says</span><p>Pick a place. Let’s discover what sounds can do!</p><button className="reading-icon" title="Hear Milo" aria-label="Hear Milo" onClick={()=>void audio.narrateText({file:'',text:'Welcome to Learning Camp! Pick a place. Let us discover what sounds can do.'}).catch(()=>setMessage('Tap again to hear Milo.'))}><Volume2/></button></div>
      <section className="camp-destinations" aria-label="Camp places">
        {([{id:'vowels',title:'Vowel Dojo',sub:'Short & long vowel magic',kind:'dojo',letters:'a e i o u'},{id:'consonants',title:'Consonant Grove',sub:'Meet a sound. Find a word.',kind:'garden',letters:'m s t p n'},{id:'blends',title:'Blending Workshop',sub:'Bring the sounds together',kind:'bridge',letters:'m + a = ma'}] as const).map(place=><button key={place.id} className={`camp-destination camp-destination--${place.id}`} onClick={()=>openArea(place.id)}><div className="camp-destination-art"><LandmarkArt kind={place.kind}/><span>{place.letters}</span></div><h2>{place.title}</h2><p>{place.sub}</p><span className="camp-enter">Explore <ArrowRight size={18}/></span></button>)}
      </section><div className="camp-keepsake"><Shield size={20}/><span>{visited.length?'Your practice garden is growing!':'Every visit is a chance to grow.'}</span>{visited.length>0&&<span>{visited.length} sounds explored today</span>}</div>
    </> : area==='blends'?<section className="blend-studio">
      <div className="camp-welcome"><span>Milo says</span><p>Choose two sounds. Slide them together!</p><HearMiloButton onClick={sayPlace}/></div>
      <div className={`blend-scene ${joined?'is-joined':''}`}><LandmarkArt kind="bridge"/><div className="blend-pieces"><span>{consonant}</span><span>{vowel}</span></div>{joined&&<span className="blend-result">{consonant}{vowel}</span>}</div>
      <div className="blend-choices"><div role="group" aria-label="Choose a consonant">{CAMP_BLEND_CONSONANTS.map(c=><button key={c} aria-pressed={consonant===c} onClick={()=>{audio.stop();setConsonant(c);setJoined(false);}}>{c}</button>)}</div><span>+</span><div role="group" aria-label="Choose a vowel">{CAMP_BLEND_VOWELS.map(v=><button key={v} aria-pressed={vowel===v} onClick={()=>{audio.stop();setVowel(v);setJoined(false);}}>{v}</button>)}</div></div>
      <button className="world-primary" disabled={audio.isPlaying} onClick={()=>{setJoined(true);void audio.narrateText({file:`Pronounce${(consonant+vowel).toUpperCase()}.wav`,text:consonant+vowel}).catch(()=>setMessage('Tap again to hear the sound team.'));}}><Volume2/>Blend the sounds</button>
      {joined&&<button className="blend-word-link" onClick={()=>setSelected({letter:consonant+vowel,word:blendExamples[consonant+vowel],category:'consonants',cue:`Listen for ${consonant+vowel} at the start of ${blendExamples[consonant+vowel]}.`})}>Find it in <strong>{blendExamples[consonant+vowel]}</strong><ArrowRight size={18}/></button>}
    </section>:<>
      <div className="camp-shelf-heading"><p>{area==='vowels'?'Choose a shield. Discover its sound in a word.':'Every letter has a sound to discover. Choose one!'}<HearMiloButton onClick={sayPlace}/></p>{area==='vowels'&&<div className="camp-segment" role="group" aria-label="Vowel sounds"><button aria-pressed={vowelMode==='short'} onClick={()=>setVowelMode('short')}>Short vowels</button><button aria-pressed={vowelMode==='long'} onClick={()=>setVowelMode('long')}>Long vowels</button></div>}</div>
      <section className={`camp-sound-shelf camp-illustrated-shelf ${area==='vowels'?'camp-sound-shelf--shields':''}`} aria-label="Choose a letter">{cards.map(card=><button key={card.word} className="camp-sound-token" onClick={()=>setSelected(card)}><span className="camp-token-letter">{area==='vowels'&&<CampSoundShield/>}<span>{card.letter}</span></span><span className="camp-token-art"><ReadingAnchorArt word={card.word}/></span><span className="camp-token-word">{card.word}</span>{visited.includes(card.word)&&<Check className="camp-visited" aria-label="Practiced today"/>}</button>)}</section>
      {area==='consonants'&&<p className="camp-bottom-note">Some sounds stretch, like m and s. Others are quick, like p and t.</p>}
    </>}{message&&<p role="status" className="camp-feedback">{message}</p>}
  </div></main>;
}

export function CampSoundLesson({card,reviewMode,onBack,onFinish}:{card:SoundCard;reviewMode:boolean;onBack:()=>void;onFinish:()=>void}) {
  const [phase,setPhase]=useState<'listen'|'find'|'build-up'|'say'|'finish'>('listen');
  const [message,setMessage]=useState(card.cue);
  const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(4);
  const [clip,setClip]=useState<string|null>(null);
  
  const [activeBuildIndex, setActiveBuildIndex] = useState<number | null>(null);
  const [wordScores, setWordScores] = useState<Record<number, 'correct' | 'missed'>>({});
  
  const clipPlayer=useRef<HTMLAudioElement>(null);
  const buildSequenceId = useRef(0);
  const [heard,setHeard]=useState(false);
  const sound=useBridgeAudio('/audio/stage3');
  const recorder=useCvcRecorder();
  const live=useRef(true),inFlight=useRef(false),request=useRef<AbortController|null>(null);
  const finished=useRef(false);
  
  const parts=highlightedWord(card.word,card.letter);
  
  const isSentenceMode = SENTENCE_MODE_WORDS.includes(card.word);
  
  // Safe resolution chain for dynamic phrases based on curriculum node
  const sentence = BOOK_9_NODES[card.word]?.phrase 
    || BOOK_8_NODES[card.word]?.phrase 
    || BOOK_7_NODES[card.word]?.phrase 
    || BOOK_6_NODES[card.word]?.phrase 
    || BOOK_5_NODES[card.word]?.phrase 
    || phrases[card.word] 
    || `Milo finds the word ${card.word}.`;
  
  const sentenceArray = sentence.split(' ');
  const isFind=phase==='find';
  // Milo reads each new lesson message aloud; short status lines while recording stay silent.
  useMiloInstruction(['Getting your microphone ready...','Milo is checking...'].includes(message)?undefined:message===card.cue&&phrases[card.word]?`${phrases[card.word]} ${card.cue}`:message);

  useEffect(()=>{live.current=true;return()=>{live.current=false;request.current?.abort();recorder.stop();sound.stop();if(window.speechSynthesis)window.speechSynthesis.cancel();};},[]);
  useEffect(()=>()=>{if(clip)URL.revokeObjectURL(clip);},[clip]);
  
  function finishLesson(){if(finished.current)return;finished.current=true;sound.stop();if(window.speechSynthesis)window.speechSynthesis.cancel();onFinish();}
  
  useEffect(()=>{
    if(phase!=='finish')return;
    const timer=window.setTimeout(finishLesson,1700);
    return()=>window.clearTimeout(timer);
  },[phase]);

  // A word plays its Pronounce recording and a phrase its narration recording; anything not recorded uses the computer voice.
  const speakText = async (text: string): Promise<void> => {
    const word = text.toLowerCase().replace(/[^a-z]/g, '');
    try { await sound.narrateText({ file: text.trim().includes(' ') || !word ? '' : `Pronounce${word.toUpperCase()}.wav`, text }); }
    catch { /* Stopped, or no voice available: the sequence carries on. */ }
  };

  const playBuildSequence = async () => {
    sound.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    const currentId = ++buildSequenceId.current;
    for (let i = 0; i < sentenceArray.length; i++) {
      if (!live.current || buildSequenceId.current !== currentId || phase !== 'build-up') break;
      setActiveBuildIndex(i);
      await speakText(sentenceArray[i]);
      await new Promise((r) => window.setTimeout(r, 450));
    }
    if (live.current && buildSequenceId.current === currentId) {
      setActiveBuildIndex(null);
    }
  };

  useEffect(() => {
    if (phase !== 'build-up' || !isSentenceMode) return;
    void playBuildSequence();

    return () => {
      buildSequenceId.current++; 
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [phase]);

  async function narrate(wholePhrase=false){
    sound.stop();
    // Before any other message, Milo introduces the card with its picture sentence, as recorded.
    const textToSpeak = wholePhrase ? (message===card.cue&&phrases[card.word] ? `${phrases[card.word]} ${card.cue}` : message) : card.word;
    try {
      await sound.narrateText({
        file: wholePhrase ? '' : `Pronounce${card.word.toUpperCase()}.wav`,
        text: textToSpeak
      });
      if(live.current && !wholePhrase) setHeard(true);
    } catch(e) {
      if(window.speechSynthesis) {
        await speakText(textToSpeak);
        if(live.current && !wholePhrase) setHeard(true);
      } else if(live.current && !(e instanceof Error && e.name==='AbortError')) {
        setMessage('Tap the speaker to try again.');
      }
    }
  }

  async function record(){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);sound.stop();setMessage('Getting your microphone ready...');
    try{
      const blob=await recorder.capture(setSeconds,async()=>{
        if(live.current){
          setRecording(true);
          const promptMessage = BOOK_6_NODES[card.word] 
            ? 'Your turn! Read the changing words aloud.' 
            : 'Your turn! Read the phrase aloud.';
          setMessage(isSentenceMode ? promptMessage : `Your turn! Say ${card.word}.`);
        }
      });
      
      if(!live.current)return;
      setRecording(false);setClip(URL.createObjectURL(blob));
      setMessage('Milo is checking...');
      const controller=new AbortController();request.current=controller;
      const timer=window.setTimeout(()=>controller.abort(),25000);
      
      try{
        if (isSentenceMode) {
          const result = await recognizeSentence(blob, sentence, controller.signal);
          
          if(!live.current)return;
          setWordScores(result.wordScores || {});

          if (result.status === 'matched') {
            setPhase('finish');
            const successMessage = BOOK_6_NODES[card.word] 
                ? `Milo heard you change the words! Your practice flower is blooming.` 
                : `Milo heard you read the phrase! Your practice flower is blooming.`;
            setMessage(successMessage);
          } else {
            const firstMissedIndex = Object.keys(result.wordScores || {}).find(key => result.wordScores[Number(key)] === 'missed');
            if (firstMissedIndex) {
              const missedWord = sentenceArray[Number(firstMissedIndex)].replace(/[^a-zA-Z0-9]/g, '');
              setMessage(`Listen to the word "${missedWord}", then try again.`);
            } else {
              setMessage(`Let’s listen back. You can try reading it again.`);
            }
          }
        } else {
          const result=await recognizeCvc(blob,card.word,controller.signal,reviewMode);
          if(!live.current)return;
          if(result.status==='matched'){
            setPhase('finish');
            setMessage(`Milo heard ${card.word}! Your practice flower is blooming.`);
          } else {
            setMessage(result.status==='uncertain'?'Let’s listen back. You can try the word again.':`Listen to ${card.word}, then have another go. ${card.cue}`);
          }
        }
      }finally{clearTimeout(timer);}
    }catch(e){
      if(live.current)setMessage(e instanceof Error?e.message:'The microphone could not start. You can keep practicing.');
    }finally{
      inFlight.current=false;if(live.current){setBusy(false);setRecording(false);}
    }
  }

  return <main className={`camp-lesson camp-lesson--${card.category}`}>
    <AdventureBackdrop theme="garden"/>
    <header className="camp-lesson-header"><button className="reading-icon activity-back-button" aria-label="Back to sounds" title="Back to sounds" onClick={onBack}><ArrowLeft/></button><span>{card.category==='short'?'Short vowel':card.category==='long'?'Long vowel':'Sound discovery'} · {card.letter}</span><button className="reading-icon" aria-label="Close lesson" title="Close lesson" onClick={onBack}><X/></button></header>
    <div className="camp-lesson-steps" aria-label="Lesson steps">
      {['Listen','Find it',...(isSentenceMode ? ['Build'] : []), 'Say it'].map((label,i)=>(
        <span key={label} className={(isSentenceMode ? ['listen','find','build-up','say'] : ['listen','find','say'])[i]===phase||phase==='finish'?'is-current':''}>
          {i+1}<small>{label}</small>
        </span>
      ))}
    </div>
    <section className="camp-learning-window">
      <div className="camp-window-top"><span/><span/><span/></div>
      <div className="camp-lesson-narration"><CharacterCompanion state={recording?'listening':sound.isPlaying?'speaking':phase==='finish'?'celebrating':'idle'} gesture={phase==='finish'?'reveal':'point'} size={145}/><div><span>Milo says</span><p aria-live="polite">{phase==='find'?(message.startsWith('Look for ')?<>Look for <mark className="camp-guidance-sound">{card.letter}</mark> in <HighlightedSoundWord word={card.word} sound={card.letter}/>.</>:<>Can you find <mark className="camp-guidance-sound">{card.letter}</mark> in <HighlightedSoundWord word={card.word} sound={card.letter}/>? Tap the letter.</>):message}</p></div><button className="reading-icon" disabled={busy||sound.isPlaying} onClick={()=>void narrate(true)} title="Hear Milo explain" aria-label="Hear Milo explain"><Volume2/></button></div>
      <div className={`camp-picture-stage ${phase==='finish'?'is-blooming':''}`}><ActivityScene/><div className="camp-focus-picture"><ReadingAnchorArt word={card.word}/></div>{phase==='finish'&&<span className="camp-practice-flower"><LandmarkArt kind="garden"/></span>}</div>
      
      {phase === 'build-up' && isSentenceMode ? (
        <div className="camp-buildup-container" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '1.25rem', fontWeight: 500 }}>
            {BOOK_6_NODES[card.word] ? "Let's sound out the changing words:" : "Let's sound out the words first:"}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {sentenceArray.map((w, idx) => {
              const isGlowing = activeBuildIndex === idx;
              return (
                <div 
                  key={idx} 
                  onClick={async () => {
                    setActiveBuildIndex(idx);
                    await speakText(w);
                    setActiveBuildIndex(null);
                  }}
                  style={{ 
                    padding: '0.75rem 1.25rem', 
                    backgroundColor: isGlowing ? '#fde047' : '#fef3c7', 
                    border: isGlowing ? '2px solid #ca8a04' : '1px solid #f59e0b', 
                    borderRadius: '0.75rem', 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    color: '#1f2937',
                    cursor: 'pointer',
                    transform: isGlowing ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: isGlowing ? '0 0 20px rgba(234, 179, 8, 0.6)' : '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.25s ease-in-out'
                  }}
                >
                  {w}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', marginTop: '1.5rem' }}>
            {BOOK_6_NODES[card.word] ? "Ready? Read the new word!" : "Ready? Put them together into a phrase!"}
          </p>
        </div>
      ) : phase === 'say' && isSentenceMode ? (
        <div className="camp-sentence-reading" aria-label={sentence} style={{ textAlign: 'center', marginTop: '1rem' }}>
          {sentenceArray.map((w, index) => {
            const score = wordScores[index];
            const cleanWord = w.toLowerCase().replace(/[^a-z]/g, '');
            const isTargetWord = cleanWord === card.word.toLowerCase();

            return (
              <span 
                key={index} 
                className={`sentence-word ${wordScores[index] ? `is-${wordScores[index]}` : ''}`}
                style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 'bold',
                  margin: '0 0.25rem', 
                  color: score === 'missed' ? '#e74c3c' : score === 'correct' ? '#2ecc71' : 'inherit' 
                }}
              >
                {isTargetWord ? (
                  (() => {
                    const [before, target, after] = highlightedWord(w, card.letter);
                    return (
                      <>
                        {before}
                        <span style={{ 
                          backgroundColor: '#fde68a', 
                          color: '#b45309', 
                          padding: '2px 6px', 
                          borderRadius: '6px', 
                          display: 'inline-block',
                          margin: '0 1px'
                        }}>
                          {target}
                        </span>
                        {after}
                      </>
                    );
                  })()
                ) : (
                  w
                )}
              </span>
            );
          })}
        </div>
      ) : (
        <>
          <div className="camp-word" aria-label={card.word}>
            {isFind ? (
              [...parts[0].split('').map(text=>({text,correct:false})),{text:parts[1],correct:true},...parts[2].split('').map(text=>({text,correct:false}))].map((piece,i)=>(
                <button key={i} onClick={()=>{
                  if(piece.correct){
                    if (isSentenceMode) {
                      setPhase('build-up');
                      const findMessage = BOOK_6_NODES[card.word] 
                        ? `You found ${card.letter}! Let's review the changing words.` 
                        : `You found ${card.letter}! Let's review the words.`;
                      setMessage(findMessage);
                    } else {
                      setPhase('say');
                      setMessage(`You found it! Now say ${card.word}.`);
                    }
                  } else {
                    setMessage(`Look for ${parts[1]} in ${card.word}.`);
                  }
                }}>{piece.text}</button>
              ))
            ) : (
              <>{parts[0]}<mark>{parts[1]}</mark>{parts[2]}</>
            )}
          </div>
          <p className="camp-word-phrase"><HighlightedSoundSentence sentence={sentence} word={card.word} sound={card.letter}/></p>
        </>
      )}
    </section>
    
    <div className="camp-lesson-controls book-sequential-action" aria-live="polite">
      {phase==='listen' ? (
        !heard ? (
          <button className="world-primary" disabled={sound.isPlaying} onClick={()=>void narrate()}><Volume2/>{sound.isPlaying?'Listening...':`Hear ${card.word}`}</button>
        ) : (
          <button className="world-primary" disabled={sound.isPlaying} onClick={()=>{sound.stop();setPhase('find');setMessage(`Can you find ${card.letter} in ${card.word}? Tap the letter.`);}}>Find the sound<ArrowRight/></button>
        )
      ) : phase==='build-up' ? (
        <button className="world-primary" onClick={()=>{
          setPhase('say');
          const sayPrompt = BOOK_6_NODES[card.word] 
             ? 'Your turn! Read the changing words aloud.' 
             : 'Your turn! Read the phrase aloud.';
          setMessage(sayPrompt);
        }}>
          {BOOK_6_NODES[card.word] ? 'Start reading words' : 'Start reading phrase'} <ArrowRight/>
        </button>
      ) : phase==='say' ? (
        <button className={`world-primary camp-record ${recording?'is-listening':''}`} data-recording={recording} disabled={busy||sound.isPlaying} onClick={()=>void record()}>
          {recording ? <><span className="recording-pulse" aria-hidden="true"/><span className="recording-live">Live</span></> : <Mic/>}
          <span>{recording ? `Recording · ${seconds}` : busy ? 'Checking...' : isSentenceMode ? 'Read phrase' : `Say ${card.word}`}</span>
        </button>
      ) : phase==='finish' ? (
        <button className="world-primary" onClick={finishLesson}>Return to my trail<ArrowRight/></button>
      ) : null}
    </div>

    <>
      {heard && phase !== 'finish' && (
        <details className="book-practice-help">
          <summary>Need help?</summary>
          <button className="reading-secondary" disabled={busy || sound.isPlaying} onClick={() => {
            sound.stop();
            if (window.speechSynthesis) window.speechSynthesis.cancel();

            if (phase === 'build-up' && isSentenceMode) {
              void playBuildSequence(); 
            } else if (phase === 'say' && isSentenceMode) {
              void speakText(sentence);
            } else {
              void narrate();
            }
          }}>
            <Headphones aria-hidden="true" />
            {isSentenceMode && (phase === 'build-up' || phase === 'say') 
              ? (BOOK_6_NODES[card.word] ? 'Hear the words again' : 'Hear the phrase again') 
              : 'Hear the word again'}
          </button>
          
          {phase === 'say' && (
            <button className="camp-text-button" disabled={busy} onClick={() => { sound.stop(); setPhase('finish'); setMessage('You explored a new sound! Come back and say it with me any time.'); }}>
              Practice without recording
            </button>
          )}
        </details>
      )}

      {clip && (
        <div className="camp-replay">
          <audio ref={clipPlayer} src={clip} preload="metadata" />
          <button className="camp-replay-voice" disabled={busy} onClick={() => void clipPlayer.current?.play()} aria-label="Hear your voice" title="Hear your voice">
            <Headphones />
            <span>My voice</span>
          </button>
          <button className="reading-icon" disabled={busy} aria-label="Try again" title="Try again" onClick={() => { setPhase('say'); const retryMsg = BOOK_6_NODES[card.word] ? 'Read the words again when you are ready.' : 'Read the phrase again when you are ready.'; setMessage(isSentenceMode ? retryMsg : `Say ${card.word} again when you are ready.`); }}>
            <RotateCcw />
          </button>
        </div>
      )}
    </>
  </main>;
}