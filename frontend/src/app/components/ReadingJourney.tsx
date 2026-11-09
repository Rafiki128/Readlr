import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Crown, Flag, Headphones, Lightbulb, Mic, Puzzle, RotateCcw, Sparkles, TrainFront, Volume2 } from 'lucide-react';
import { ARAL_VERSION, ARAL_MEDIA_VERSION, READING_CHAPTERS, makeReadingRound, readingEvidenceResult, shuffleReading, type ReadingChapter, type ReadingTask } from './aralCurriculum';
import { SoundLearningCamp, CampSoundLesson } from './SoundLearningCamp';
import type { SoundCard } from './aralCurriculum';
import { ChronicleBlendLesson } from './ChronicleBlendLesson';
import { ChronicleBookWorld } from './ChronicleBookWorld';
import { AdventureBackdrop } from './AdventureArt';
import { CHRONICLES } from './chronicleContent';
import { CharacterCompanion } from './CharacterCompanion';
import { ActivityScene } from './ActivityScene';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import { useCvcRecorder } from '../../hooks/useCvcRecorder';
import { recognizeCvc } from '../../hooks/recognizeCvc';
import { usePracticeSession } from '../../hooks/usePracticeSession';
import { createEvidenceAttempt, queueEvidenceAttempt, type EvidenceResult } from '../../hooks/evidenceRecords';
import { loadReadingProgress, loadDevelopmentReadingProgress, startReadingCheckpoint, checkReadingWord, retryReadingWord, checkReadingMeaning, skipReadingCheckpoint, skipReadingMeaning, type ReadingCheckpoint } from '../../hooks/readingCheckpoints';
import { availableLocalReadingChapters, clearGuidedRoundStep, completeLocalReadingChapter, queueReadingBookUnlock, readGuidedActivity, readGuidedReadingStops, readGuidedRoundStep, readLocalReadingProgress, readReadingAccessSnapshot, saveGuidedActivity, saveGuidedReadingStop, saveGuidedRoundStep, saveReadingAccessSnapshot, saveReadingCarouselFocus } from '../../hooks/readingLocalProgress';
import './readingJourney.css';
import { devicePracticeNotice, ReadingServiceError } from '../../hooks/readingProgressError';
import { SoundOrchard, LetterTrain, VoiceRail } from './FirstGateGames';
import { addSpokenStation, bookOneAction, FIRST_GATE_WORDS, firstGateShowsWordModel } from './firstGateLogic';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { ReadingWordPicture } from './ReadingWordPicture';
import { chronicleSounds } from './chronicleLessons';
import { LanternVowelSort, LanternVoiceTrail } from './LanternLaneGames';
import { addLitLantern } from './lanternLaneLogic';
import { MarketVoiceTrail, WordMarketBuilder } from './WordMarketGames';
import { addStockedLabel, MARKET_WORDS } from './wordMarketLogic';
import { GardenVoiceTrail, GardenVowelBeds } from './SecretGardenGames';
import { addBloomedWord, GARDEN_WORDS } from './secretGardenLogic';
import { DrawbridgePlankBuilder, DrawbridgeVoiceTrail } from './CastleDrawbridgeGames';
import { addRaisedPlank, DRAWBRIDGE_WORDS } from './castleDrawbridgeLogic';
import { ChangingWordMirrors, ChangingWordsVoiceTrail } from './ChangingWordsGames';
import { addTransformedWord, CHANGING_WORDS } from './changingWordsLogic';
import { KeyKeeperLocks, KeyKeeperVoiceTrail } from './KeyKeeperGames';
import { addUnlockedWord, KEY_WORDS } from './keyKeeperLogic';
import { RoyalLibraryVoiceTrail, RoyalStoryRepair } from './RoyalLibraryGames';
import { addRestoredStory, LIBRARY_WORDS } from './royalLibraryLogic';
import { VowelLift, VowelTowerVoiceTrail } from './VowelTowerGames';
import { addAwakenedVowelWord, VOWEL_TOWER_WORDS } from './vowelTowerLogic';
import { CrownChamberVoiceTrail, CrownJewelForge } from './CrownChamberGames';
import { addRestoredCrownWord, CROWN_CHAMBER_WORDS } from './crownChamberLogic';
import { MiloSays } from './MiloSays';

interface Props { learnerId:number; previewMode?:boolean; reviewMode?:boolean; onBack:()=>void; initialTab?:'camp'|'kingdom'; initialChapter?:number }
export function ReadingJourney({learnerId,previewMode=false,reviewMode=false,onBack,initialTab='kingdom',initialChapter=0}:Props) {
  const sandbox=previewMode||reviewMode;
  const cachedAccess=readReadingAccessSnapshot(learnerId);
  const chapter=Math.max(0,Math.min(READING_CHAPTERS.length-1,initialChapter));
  const [round,setRound]=useState<{chapter:ReadingChapter;checkpoint:boolean}|null>(null);
  const [completed,setCompleted]=useState<string[]>(cachedAccess?.completed??[]);
  const [available,setAvailable]=useState<string[]>(cachedAccess?.available??[]);
  const [practiced,setPracticed]=useState(false);
  const [openStops,setOpenStops]=useState<string[]>([]);
  const [openChallenges,setOpenChallenges]=useState<number[]>(cachedAccess?.openChallenges??[]);
  const [lesson,setLesson]=useState<SoundCard|'blend'|null>(null);
  const [visited,setVisited]=useState<string[]>(()=>readGuidedReadingStops(learnerId));
  const [bookPage,setBookPage]=useState(0);
  const [saveError,setSaveError]=useState('');
  const [deviceProgress,setDeviceProgress]=useState(false);
  const [activityLeaving,setActivityLeaving]=useState(false);
  const [mapCelebration,setMapCelebration]=useState<string|null>(null);
  const [featureReward,setFeatureReward]=useState('');
  const transitionTimers=useRef<number[]>([]);
  const activityFinishing=useRef(false);
  const selected=READING_CHAPTERS[chapter];
  const stopKey=(stopId:string)=>`${selected.id}:${stopId}`;
  const stopVisited=(entries:string[],stopId:string)=>entries.includes(stopKey(stopId))||(selected.id==='gate'&&entries.includes(stopId));
  const chapterVisited=[...chronicleSounds(chapter).map(card=>card.word),'blend','games'].filter(stopId=>stopVisited(visited,stopId));
  const practiceFinished=practiced||stopVisited(visited,'games');
  useEffect(()=>()=>transitionTimers.current.forEach(window.clearTimeout),[]);
  function pageAfterStop(stopId:string,nextVisited:string[],nextPracticed:boolean,nextCompleted:boolean) {
    const ids=[...chronicleSounds(chapter).map(card=>card.word),'blend','games','check'];
    const stopIndex=ids.indexOf(stopId);
    if(stopIndex<0)return null;
    const page=1+Math.floor(stopIndex/3);
    const pageIds=ids.slice((page-1)*3,(page-1)*3+3);
    const isDone=(id:string)=>id==='games'?nextPracticed:id==='check'?nextCompleted:stopVisited(nextVisited,id);
    return pageIds.every(isDone)?page+1:null;
  }
  function finishActivity(stopId:string,apply:()=>void,nextPage:number|null) {
    if(activityFinishing.current)return;
    activityFinishing.current=true;
    setActivityLeaving(true);
    transitionTimers.current.push(window.setTimeout(()=>{
      setLesson(null);setRound(null);setActivityLeaving(false);
      transitionTimers.current.push(window.setTimeout(()=>{
        apply();setMapCelebration(stopId);activityFinishing.current=false;
        transitionTimers.current.push(window.setTimeout(()=>setMapCelebration(null),2400));
      },450));
      if(nextPage!==null)transitionTimers.current.push(window.setTimeout(()=>setBookPage(nextPage),3200));
    },850));
  }
  function finishBook() {
    saveReadingCarouselFocus(learnerId,chapter);
    if(!sandbox&&chapter<READING_CHAPTERS.length-1)queueReadingBookUnlock(learnerId,chapter,chapter+1);
    onBack();
  }
  useEffect(()=>{const saved=readGuidedReadingStops(learnerId);setVisited(saved);setPracticed(stopVisited(saved,'games'));},[learnerId,selected.id]);
  useEffect(()=>{
    if(sandbox||round||initialTab==='camp')return;
    const cached=readReadingAccessSnapshot(learnerId);
    if(cached){setCompleted(cached.completed);setAvailable(cached.available);setOpenChallenges(cached.openChallenges);}
    const controller=new AbortController();
    const refresh=()=>void loadReadingProgress(controller.signal).then(p=>{
      if(!controller.signal.aborted){
        const local=import.meta.env.DEV?readLocalReadingProgress(learnerId):[];
        const merged=[...new Set([...p.completed,...local])];
        const nextAvailable=[...new Set([...p.available,...availableLocalReadingChapters(merged)])];
        const nextChallenges=p.openChallenges??[];setOpenStops(p.openStops??[]);
        setCompleted(merged);setAvailable(nextAvailable);setOpenChallenges(nextChallenges);saveReadingAccessSnapshot(learnerId,{completed:merged,available:nextAvailable,openChallenges:nextChallenges});setDeviceProgress(false);setSaveError('');
      }
    }).catch(async error=>{
      if(!controller.signal.aborted&&import.meta.env.DEV){try{const p=await loadDevelopmentReadingProgress(learnerId,controller.signal);if(controller.signal.aborted)return;setCompleted(p.completed);setAvailable(p.available);setOpenChallenges(p.openChallenges??[]);setOpenStops(p.openStops??[]);saveReadingAccessSnapshot(learnerId,{completed:p.completed,available:p.available,openChallenges:p.openChallenges??[]});setDeviceProgress(true);setSaveError(devicePracticeNotice(error));}catch{if(!controller.signal.aborted)setSaveError('Teacher access could not be verified. Please reconnect.');}}
      else if(!controller.signal.aborted)setSaveError(error.message);
    });
    refresh();const timer=window.setInterval(refresh,15000);
    return()=>{controller.abort();window.clearInterval(timer);};
  },[learnerId,sandbox,round,initialTab]);
  if(initialTab==='camp')return <SoundLearningCamp learnerId={learnerId} onBack={onBack} reviewMode={reviewMode}/>;
  if(lesson)return <div className={`chronicle-activity-shell ${activityLeaving?'is-completing':''}`}><div className="activity-exit-sparkles" aria-hidden="true">{[0,1,2,3,4,5,6,7].map(item=><i key={item}/>)}</div><div className="chronicle-activity-paper">{lesson==='blend'?<ChronicleBlendLesson learnerId={learnerId} index={chapter} onBack={()=>setLesson(null)} onComplete={()=>{const next=saveGuidedReadingStop(learnerId,stopKey('blend'));finishActivity('blend',()=>setVisited(next),pageAfterStop('blend',next,practiceFinished,completed.includes(selected.id)));}}/>:<CampSoundLesson card={lesson} reviewMode={reviewMode} onBack={()=>setLesson(null)} onFinish={()=>{const next=saveGuidedReadingStop(learnerId,stopKey(lesson.word));const firstReward=selected.id==='gate'&&['mango','apple','top'].every(word=>next.includes(`gate:${word}`))&&!localStorage.getItem(`readlr_first_reward_v1_${learnerId}`);if(firstReward){localStorage.setItem(`readlr_first_reward_v1_${learnerId}`,'seen');setFeatureReward('Your Sticker Book and Sound Library are unlocked!');window.setTimeout(()=>setFeatureReward(''),4200);}finishActivity(lesson.word,()=>setVisited(next),pageAfterStop(lesson.word,next,practiceFinished,completed.includes(selected.id)));}}/>}</div></div>;
  if(round)return <div className={`chronicle-activity-shell ${activityLeaving?'is-completing':''}`}><div className="activity-exit-sparkles" aria-hidden="true">{[0,1,2,3,4,5,6,7].map(item=><i key={item}/>)}</div><div className="chronicle-activity-paper"><ReadingRound key={`${round.chapter.id}-${round.checkpoint}`} learnerId={learnerId} previewMode={previewMode} reviewMode={reviewMode} localMode={deviceProgress} chapter={round.chapter} checkpoint={round.checkpoint}
    onBack={()=>setRound(null)} onPractice={()=>setRound({chapter:round.chapter,checkpoint:false})} onComplete={(passed,deviceOnly=false)=>{
      const nextPracticed=practiceFinished||!round.checkpoint;
      let nextCompleted=completed;
      if(passed)nextCompleted=[...new Set([...completed,round.chapter.id])];
      const nextVisited=round.checkpoint?visited:saveGuidedReadingStop(learnerId,stopKey('games'));
      const targetPage=pageAfterStop(round.checkpoint?'check':'games',nextVisited,nextPracticed,nextCompleted.includes(round.chapter.id));
      finishActivity(round.checkpoint?'check':'games',()=>{
        if(!round.checkpoint){setPracticed(true);setVisited(nextVisited);}
        if(passed){
          const nextAvailable=[...new Set([...available,...availableLocalReadingChapters(nextCompleted)])];
          setCompleted(nextCompleted);setAvailable(nextAvailable);
          saveReadingAccessSnapshot(learnerId,{completed:nextCompleted,available:nextAvailable,openChallenges});
        }
        if((reviewMode||deviceProgress||deviceOnly)&&passed){
          const local=reviewMode?nextCompleted:completeLocalReadingChapter(learnerId,round.chapter.id);
          setCompleted(local);setAvailable(availableLocalReadingChapters(local));
        }
      },targetPage);
    }}/></div></div>;
  return <div className="chronicle-journey-shell">
    {saveError&&<p role="status" className="reading-preview">{saveError}</p>}
    {featureReward&&<div className="reading-feature-unlock" role="status"><Sparkles/><div><strong>New places unlocked!</strong><span>{featureReward}</span></div></div>}
    <ChronicleBookWorld index={chapter} completed={completed.includes(selected.id)} practiceDone={practiceFinished} available={sandbox||available.includes(selected.id)} reviewMode={sandbox} openStops={openStops.filter(stop=>stop.startsWith(`${selected.id}:`)).map(stop=>stop.split(':')[1])} challengesOpen={openChallenges.includes(chapter+1)} onBack={onBack} onFinishBook={finishBook} celebrateStop={mapCelebration}
      bookPage={bookPage} onPageChange={setBookPage} visited={chapterVisited} onSound={setLesson} onBlend={()=>setLesson('blend')}
      onPractice={()=>setRound({chapter:selected,checkpoint:false})} onCheckpoint={()=>setRound({chapter:selected,checkpoint:true})}/>
  </div>;
}

function ReadingRound({learnerId,previewMode,reviewMode,localMode=false,chapter,checkpoint,onBack,onComplete,onPractice}:Props & {localMode?:boolean;chapter:ReadingChapter;checkpoint:boolean;onComplete:(passed:boolean,deviceOnly?:boolean)=>void;onPractice:()=>void}) {
  const sandbox=previewMode||reviewMode;
  const resumablePractice=['lanterns','market','garden','bridge','hall','keys','library','tower','crown'].includes(chapter.id)&&!checkpoint;
  const savedRound=resumablePractice?readGuidedRoundStep(learnerId,chapter.id):null;
  const [tasks,setTasks]=useState(()=>makeReadingRound(chapter,checkpoint));
  const [index,setIndex]=useState(()=>Math.min(savedRound?.step??0,makeReadingRound(chapter,checkpoint).length-1));
  const [done,setDone]=useState(false);
  const [successes,setSuccesses]=useState(()=>Math.min(savedRound?.step??0,makeReadingRound(chapter,checkpoint).length));
  const [unassessed,setUnassessed]=useState(0);
  const [complete,setComplete]=useState(()=>Boolean(savedRound&&savedRound.step>=makeReadingRound(chapter,checkpoint).length));
  const [retryQueue,setRetryQueue]=useState<ReadingTask[]>([]);
  const [remediation,setRemediation]=useState(false);
  const [originalTaskCount,setOriginalTaskCount]=useState(()=>tasks.length);
  const [correctedCount,setCorrectedCount]=useState(0);
  const [answerState,setAnswerState]=useState<'correct'|'incorrect'|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [recording,setRecording]=useState(false);
  const [seconds,setSeconds]=useState(4);
  const [placed,setPlaced]=useState<number[]>([]);
  const [heard,setHeard]=useState(false);
  const [helped,setHelped]=useState(false);
  const [clip,setClip]=useState<string|null>(null);
  const [selectedAnswer,setSelectedAnswer]=useState<string|null>(null);
  const clipPlayer=useRef<HTMLAudioElement>(null);
  const [issued,setIssued]=useState<ReadingCheckpoint|null>(null);
  const [loadingCheck,setLoadingCheck]=useState(checkpoint&&!sandbox&&!localMode);
  const [roundNumber,setRoundNumber]=useState(0);
  const [orchardDone,setOrchardDone]=useState(false);
  const [lanternSortDone,setLanternSortDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'vowel-sort'));
  const [marketBuilderDone,setMarketBuilderDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'label-builder'));
  const [gardenSeedsDone,setGardenSeedsDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'seed-beds'));
  const [drawbridgePlanksDone,setDrawbridgePlanksDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'bridge-planks'));
  const [changingMirrorsDone,setChangingMirrorsDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'changing-mirrors'));
  const [keyLocksDone,setKeyLocksDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'sound-locks'));
  const [royalStoriesDone,setRoyalStoriesDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'story-repair'));
  const [vowelLiftDone,setVowelLiftDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'vowel-lift'));
  const [crownForgeDone,setCrownForgeDone]=useState(()=>readGuidedActivity(learnerId,chapter.id,'crown-forge'));
  const [spokenStations,setSpokenStations]=useState<string[]>(()=>savedRound?.spoken??[]);
  const [checkpointFallback,setCheckpointFallback]=useState(false);
  const orchardHelp=useRef(new Set<string>());
  const active=tasks[index];
  const [tiles,setTiles]=useState(()=>shuffleReading([...tasks[0].word].map((letter,id)=>({letter,id}))));
  const started=useRef(new Date().toISOString());
  const session=useRef<string>(crypto.randomUUID());
  const live=useRef(true), inFlight=useRef(false), request=useRef<AbortController|null>(null);
  const audioItem=useRef(0);
  const heading=useRef<HTMLElement>(null);
  const practice=usePracticeSession(sandbox||localMode?null:learnerId,3,`aral-${chapter.id}-${active.word}`,active.word);
  const recorder=useCvcRecorder(sandbox||localMode?undefined:practice);
  const sound=useBridgeAudio('/audio/stage3');
  useEffect(()=>{live.current=true;return()=>{live.current=false;request.current?.abort();recorder.stop();sound.stop();};},[]);
  useEffect(()=>{
    if(!checkpoint||sandbox||localMode)return;
    const controller=new AbortController();setLoadingCheck(true);setIssued(null);
    void startReadingCheckpoint(chapter.id,controller.signal).then(row=>{
      if(controller.signal.aborted)return;
      const terminal=(value:string)=>['matched','different','skipped'].includes(value);
      setIssued(row);session.current=row.id;
      const issuedTasks:ReadingTask[]=[...row.words.map(word=>({word,kind:'read' as const,options:[],missing:0})),...(chapter.id==='gate'?[{word:'mat',kind:'meaning' as const,options:['mat','top','mango'],clue:'Which picture shows a mat?',missing:0}]:[])];
      setTasks(issuedTasks);
      setOriginalTaskCount(issuedTasks.length);setRetryQueue([]);setRemediation(false);setCorrectedCount(0);setAnswerState(null);
      const next=issuedTasks.findIndex((task,i)=>!terminal(task.kind==='meaning'?row.results.meaning:row.results[i]));
      setIndex(next<0?0:next);setComplete(next<0);
      setSuccesses(Object.values(row.results).filter(v=>v==='matched').length);
      setUnassessed(Object.values(row.results).filter(v=>v==='skipped').length);
      setMessage('');
    }).catch(error=>{
      if(controller.signal.aborted)return;
      if(import.meta.env.DEV&&error instanceof ReadingServiceError&&(error.status===404||error.status>=500)){
        const localTasks=makeReadingRound(chapter,true);
        setTasks(localTasks);setOriginalTaskCount(localTasks.length);setIndex(0);setCheckpointFallback(true);setMessage('Online checkpoint storage is unavailable. This round will be saved on this device.');
      }else setMessage(error.message);
    })
      .finally(()=>{if(!controller.signal.aborted)setLoadingCheck(false);});
    return()=>controller.abort();
  },[checkpoint,sandbox,localMode,chapter.id,roundNumber]);
  useEffect(()=>{setTiles(shuffleReading([...active.word].map((letter,id)=>({letter,id}))));},[tasks,index]);
  useEffect(()=>{heading.current?.scrollIntoView({block:'start'});},[index,complete]);
  useEffect(()=>()=>{if(clip)URL.revokeObjectURL(clip);},[clip]);
  function save(result:EvidenceResult,response:string|null,kind:'selection'|'construction'|'speech_prediction') {
    // Checkpoint evidence is inserted atomically by the recognition API.
    if(sandbox||localMode||checkpoint)return;
    const saved=queueEvidenceAttempt(learnerId,createEvidenceAttempt({sessionId:session.current,curriculumVersion:ARAL_VERSION,mediaManifestVersion:ARAL_MEDIA_VERSION,
      activityId:`aral.${chapter.id}.${checkpoint?'check':active.kind}`,skillId:`aral.${checkpoint?'read':active.kind}.${active.word}`,contentId:`aral.word.${active.word}`,
      mode:checkpoint?'independent_check':'practice',responseType:kind,responseValue:response,result,hintCount:helped?1:0,modelExposed:heard,answerExposed:!checkpoint&&active.kind==='build'&&(!firstBook||firstGateShowsWordModel(active.word)),reducedChoices:false,
      mediaAssetIds:[],startedAt:started.current,completedAt:new Date().toISOString(),capturedOffline:!navigator.onLine}));
    if(!saved)setMessage('Your answer was checked, but this device could not save it.');
  }
  function saveOrchard(word:string,letter:string,correct:boolean) {
    if(!sandbox&&!localMode){
      const saved=queueEvidenceAttempt(learnerId,createEvidenceAttempt({sessionId:session.current,curriculumVersion:ARAL_VERSION,mediaManifestVersion:ARAL_MEDIA_VERSION,
        activityId:'aral.gate.orchard',skillId:`aral.initial.${word[0]}`,contentId:`aral.anchor.${word}`,mode:'guided',responseType:'selection',responseValue:letter,
        result:correct?'correct':'incorrect',hintCount:orchardHelp.current.has(word)?1:0,modelExposed:orchardHelp.current.has(word),answerExposed:true,reducedChoices:true,
        mediaAssetIds:[],startedAt:started.current,completedAt:new Date().toISOString(),capturedOffline:!navigator.onLine}));
      if(!saved)setMessage('Your practice answer could not be saved on this device.');
    }
  }
  function returnLater(task=active) {
    setRetryQueue(queue=>queue.some(item=>item.kind===task.kind&&item.word===task.word&&item.clue===task.clue)?queue:[...queue,task]);
  }
  function markCorrect() {
    if(remediation)setCorrectedCount(value=>value+1);else setSuccesses(value=>value+1);
    setAnswerState('correct');setDone(true);
  }
  function markIncorrect(_messageText:string) {
    setAnswerState('incorrect');setHelped(true);setDone(true);returnLater();setMessage('We can try this one again soon.');
  }
  // A context scene spoken before answering is a model, so it counts as help (FR-3.5, FR-4.7).
  function hearScene(line:string) {
    if(!done){setHeard(true);setHelped(true);}
    void sound.narrateText({file:'',text:line});
  }
  async function hear() {
    if(inFlight.current)return;
    const item=audioItem.current;
    if(active.kind!=='listen')setHelped(true);
    try {await sound.narrateText({file:`Pronounce${active.word.toUpperCase()}.wav`,text:active.word});if(live.current&&item===audioItem.current)setHeard(true);} catch(error) {if(live.current&&item===audioItem.current&&!(error instanceof Error&&error.name==='AbortError'))setMessage('The word audio could not play. Please try again.');}
  }
  function leaveRound() {
    live.current=false;
    request.current?.abort();
    recorder.stop();
    sound.stop();
    onBack();
  }
  function answer(value:string,kind:'selection'|'construction'='selection') {
    if(done||busy)return;
    const correct=value===active.word;
    save(correct?'correct':'incorrect',value,kind);
    setSelectedAnswer(value);
    if(correct){markCorrect();setMessage(`Correct! You found ${active.word}.`);}
    else {markIncorrect(`Not quite. ${value} is not the answer.`);if(kind==='construction')setPlaced([]);}
  }
  async function answerMeaning(value:string) {
    if(done||busy)return;
    if(!checkpoint||sandbox||localMode||remediation){answer(value);return;}
    if(!issued)return;
    setBusy(true);setMessage('Checking the picture...');
    try{
      const controller=new AbortController();request.current=controller;
      const saved=await checkReadingMeaning(issued.id,value,controller.signal);
      if(!live.current)return;
      setIssued(saved);
      const correct=saved.results.meaning==='matched';
      setSelectedAnswer(value);
      if(correct){markCorrect();setMessage('Correct! That picture shows a mat.');}
      else markIncorrect('That picture was not the mat.');
    }catch(error){
      if(live.current&&import.meta.env.DEV&&error instanceof ReadingServiceError&&(error.status===404||error.status>=500)){
        setCheckpointFallback(true);
        setSelectedAnswer(value);
        if(value==='mat'){markCorrect();setMessage('Correct! That picture shows a mat. Saved on this device while online checkpoint storage is unavailable.');}
        else markIncorrect('That picture was not the mat.');
      }else if(live.current)setMessage(error instanceof Error?error.message:'The meaning check could not be saved.');
    }
    finally{if(live.current)setBusy(false);}
  }
  async function record() {
    if(inFlight.current||done)return;
    if(previewMode){setMessage('Sign in to check your voice. You can still explore the practice games here.');return;}
    inFlight.current=true;setBusy(true);setMessage('Getting your microphone ready...');sound.stop();
    try {
      const blob=await recorder.capture(setSeconds,async()=>{if(live.current){setRecording(true);setMessage('Milo is listening...');}});
      if(!live.current)return;
      setRecording(false);setClip(URL.createObjectURL(blob));setMessage('Checking your word...');
      const controller=new AbortController();request.current=controller;
      const timeout=window.setTimeout(()=>controller.abort(),25000);
      let result:Awaited<ReturnType<typeof recognizeCvc>>;
      let usedDeviceFallback=checkpointFallback;
      try {
        if(checkpoint&&!reviewMode&&!localMode&&!checkpointFallback){
          if(!issued)throw new Error('Return to the kingdom and reopen this checkpoint.');
          try {
            const originalIndex=issued.words.indexOf(active.word);
            if(originalIndex<0)throw new Error('Return to the kingdom and reopen this checkpoint.');
            const saved=remediation
              ? await retryReadingWord(issued.id,originalIndex,blob,controller.signal)
              : await checkReadingWord(issued.id,originalIndex,blob,controller.signal);
            if(live.current)setIssued(saved);
            const status=saved.results[originalIndex];
            if(!['matched','different','uncertain'].includes(status))throw new Error('This word was already left unassessed. Return to the kingdom.');
            result={status:status as 'matched'|'different'|'uncertain',transcript:''};
          } catch(error) {
            if(!(import.meta.env.DEV&&error instanceof ReadingServiceError&&(error.status===404||error.status>=500)))throw error;
            setCheckpointFallback(true);
            usedDeviceFallback=true;
            result=await recognizeCvc(blob,active.word,controller.signal,reviewMode);
          }
        }else result=await recognizeCvc(blob,active.word,controller.signal,reviewMode);
      } finally {window.clearTimeout(timeout);}
      if(!live.current)return;
      if(!sandbox&&!localMode)practice.recognize(result.status);save(readingEvidenceResult(result.status),null,'speech_prediction');
      if(result.status==='matched'){
        markCorrect();
        setSpokenStations(words=>chapter.id==='lanterns'?addLitLantern(words,active.word,result.status):chapter.id==='market'?addStockedLabel(words,active.word,result.status):chapter.id==='garden'?addBloomedWord(words,active.word,result.status):chapter.id==='bridge'?addRaisedPlank(words,active.word,result.status):chapter.id==='hall'?addTransformedWord(words,active.word,result.status):chapter.id==='keys'?addUnlockedWord(words,active.word,result.status):chapter.id==='library'?addRestoredStory(words,active.word,result.status):chapter.id==='tower'?addAwakenedVowelWord(words,active.word,result.status):chapter.id==='crown'?addRestoredCrownWord(words,active.word,result.status):addSpokenStation(words,active.word,result.status));
        const progressMessage=chapter.id==='gate'?' The train is moving.':chapter.id==='lanterns'?' A word lantern is glowing.':chapter.id==='market'?' A market stall is stocked.':chapter.id==='garden'?' A garden word is blooming.':chapter.id==='bridge'?' A drawbridge plank is in place.':chapter.id==='hall'?' A word rune is glowing.':chapter.id==='keys'?' A word lock is open.':chapter.id==='library'?' A royal book is restored.':chapter.id==='tower'?' A tower window is shining.':chapter.id==='crown'?' A crown jewel is shining.':'';
        setMessage(`Correct! Milo heard “${active.word}”.${usedDeviceFallback?' Saved on this device while online checkpoint storage is unavailable.':progressMessage}`);
      }
      else if(result.status==='different')markIncorrect(`Let's try “${active.word}” again in a moment.`);
      else markIncorrect('Let’s give that word another try in a moment.');
    } catch(error) {
      if(live.current){if(!sandbox&&!localMode)practice.recognize('unavailable');save('unavailable',null,'speech_prediction');setMessage(error instanceof Error?error.message:'Word checking is unavailable. Try again.');}
    } finally {inFlight.current=false;if(live.current){setBusy(false);setRecording(false);}}
  }
  function next() {
    audioItem.current++;
    sound.stop();setClip(null);
    if(index+1===tasks.length){
      if(retryQueue.length){const returning=retryQueue;setTasks(returning);setRetryQueue([]);setIndex(0);setRemediation(true);setPlaced([]);setSelectedAnswer(null);setDone(false);setHeard(false);setHelped(false);setAnswerState(null);setMessage('These challenges came back so you can finish them.');started.current=new Date().toISOString();setTiles(shuffleReading([...returning[0].word].map((letter,id)=>({letter,id}))));return;}
      if(resumablePractice&&answerState==='correct')saveGuidedRoundStep(learnerId,chapter.id,{step:tasks.length,spoken:spokenStations});
      setComplete(true);return;
    }
    const n=index+1;
    if(resumablePractice&&answerState==='correct'&&!remediation)saveGuidedRoundStep(learnerId,chapter.id,{step:n,spoken:spokenStations});
    setIndex(n);setPlaced([]);setSelectedAnswer(null);setDone(false);setHeard(false);setHelped(false);setAnswerState(null);setMessage('');started.current=new Date().toISOString();
    setTiles(shuffleReading([...tasks[n].word].map((letter,id)=>({letter,id}))));
  }
  async function skip() {
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);
    try {
      if(checkpoint&&!sandbox&&!localMode&&!checkpointFallback){
        if(!issued)throw new Error('Reopen this checkpoint to continue.');
        const controller=new AbortController();request.current=controller;
        const saved=active.kind==='meaning'?await skipReadingMeaning(issued.id,controller.signal):await skipReadingCheckpoint(issued.id,index,controller.signal);
        if(!live.current)return;
        setIssued(saved);
        if((active.kind==='meaning'?saved.results.meaning:saved.results[index])!=='skipped')throw new Error('This answer was already saved. Reopen the checkpoint to resume.');
      }
      save('no_response',null,active.kind==='read'?'speech_prediction':'selection');setUnassessed(s=>s+1);next();
    }catch(error){if(live.current)setMessage(error instanceof Error?error.message:'Could not save. Please retry.');}
    finally{inFlight.current=false;if(live.current)setBusy(false);}
  }
  const pass=checkpoint&&(reviewMode||localMode||checkpointFallback?(chapter.id==='gate'?successes===originalTaskCount:successes/originalTaskCount>=.8)&&unassessed===0:issued?.passed===true);
  const firstBook=chapter.id==='gate';
  const nextAction=bookOneAction(heard,done,checkpoint,active.kind);
  const roundPrompt=firstBook&&nextAction==='listen'?'Listen to the word first.':chapter.id==='gate'&&active.kind==='build'?'Build the word train.':chapter.id==='gate'&&!checkpoint&&active.kind==='read'?'Read your word to move the train.':taskPrompt(active);
  function restartRound() {
    if(resumablePractice)clearGuidedRoundStep(learnerId,chapter.id);
    setOrchardDone(false);
    setSpokenStations([]);orchardHelp.current.clear();
    setTasks(makeReadingRound(chapter,checkpoint));setIndex(0);setComplete(false);setDone(false);
    setSuccesses(0);setUnassessed(0);setRetryQueue([]);setRemediation(false);setOriginalTaskCount(makeReadingRound(chapter,checkpoint).length);setCorrectedCount(0);setAnswerState(null);setPlaced([]);setSelectedAnswer(null);setHeard(false);setHelped(false);setCheckpointFallback(false);setMessage('');
    session.current=crypto.randomUUID();started.current=new Date().toISOString();
    setIssued(null);setLoadingCheck(checkpoint&&!sandbox&&!localMode);setRoundNumber(n=>n+1);
  }
  if(checkpoint&&!sandbox&&!localMode&&!checkpointFallback&&(loadingCheck||!issued))return <main className="reading-journey"><button className="reading-secondary" onClick={leaveRound}><ArrowLeft/>Back to kingdom</button><p role="status">{loadingCheck?'Preparing your checkpoint...':message}</p>{!loadingCheck&&<button className="reading-primary" onClick={()=>setRoundNumber(n=>n+1)}>Try again</button>}</main>;
  if(chapter.id==='gate'&&!checkpoint&&!orchardDone)return <main className="reading-journey reading-round"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The First Gate</h1><CharacterCompanion state="idle" size={70}/></header><SoundOrchard onAttempt={saveOrchard} onComplete={()=>setOrchardDone(true)} onHear={word=>{orchardHelp.current.add(word);void sound.narrateText({file:'',text:word}).catch(()=>setMessage('Audio could not play. Please try again.'));}}/><p role="status">{message}</p></main>;
  if(chapter.id==='lanterns'&&!checkpoint&&!lanternSortDone)return <main className="reading-journey reading-round reading-round--lanterns"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>Lantern Lane</h1><span>Vowel 1 / 1</span></header><LanternVowelSort onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'vowel-sort');setLanternSortDone(true);}}/></main>;
  if(chapter.id==='market'&&!checkpoint&&!marketBuilderDone)return <main className="reading-journey reading-round reading-round--market"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Word Market</h1><span>Labels 1 / 1</span></header><WordMarketBuilder learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'label-builder');setMarketBuilderDone(true);}}/></main>;
  if(chapter.id==='garden'&&!checkpoint&&!gardenSeedsDone)return <main className="reading-journey reading-round reading-round--garden"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Secret Garden</h1><span>Seeds 1 / 1</span></header><GardenVowelBeds learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'seed-beds');setGardenSeedsDone(true);}}/></main>;
  if(chapter.id==='bridge'&&!checkpoint&&!drawbridgePlanksDone)return <main className="reading-journey reading-round reading-round--bridge"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Castle Drawbridge</h1><span>Planks 1 / 1</span></header><DrawbridgePlankBuilder learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'bridge-planks');setDrawbridgePlanksDone(true);}}/></main>;
  if(chapter.id==='hall'&&!checkpoint&&!changingMirrorsDone)return <main className="reading-journey reading-round reading-round--hall"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>Hall of Changing Words</h1><span>Mirrors 1 / 1</span></header><ChangingWordMirrors learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'changing-mirrors');setChangingMirrorsDone(true);}}/></main>;
  if(chapter.id==='keys'&&!checkpoint&&!keyLocksDone)return <main className="reading-journey reading-round reading-round--keys"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Key Keeper</h1><span>Locks 1 / 1</span></header><KeyKeeperLocks learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'sound-locks');setKeyLocksDone(true);}}/></main>;
  if(chapter.id==='library'&&!checkpoint&&!royalStoriesDone)return <main className="reading-journey reading-round reading-round--library"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Royal Library</h1><span>Stories 1 / 1</span></header><RoyalStoryRepair learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'story-repair');setRoyalStoriesDone(true);}}/></main>;
  if(chapter.id==='tower'&&!checkpoint&&!vowelLiftDone)return <main className="reading-journey reading-round reading-round--tower"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Vowel Tower</h1><span>Lift 1 / 1</span></header><VowelLift learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'vowel-lift');setVowelLiftDone(true);}}/></main>;
  if(chapter.id==='crown'&&!checkpoint&&!crownForgeDone)return <main className="reading-journey reading-round reading-round--crown"><header className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey"><ArrowLeft/></button><h1>The Crown Chamber</h1><span>Forge 1 / 1</span></header><CrownJewelForge learnerId={learnerId} onComplete={()=>{saveGuidedActivity(learnerId,chapter.id,'crown-forge');setCrownForgeDone(true);}}/></main>;
  return <main className={`reading-journey reading-round reading-round--${chapter.id}`}>
    <AdventureBackdrop theme={CHRONICLES[READING_CHAPTERS.findIndex(c=>c.id===chapter.id)]?.emblem}/>
    <header ref={heading} className="reading-heading"><button className="reading-icon activity-back-button" onClick={leaveRound} aria-label="Back to journey" title="Back to journey"><ArrowLeft/></button><div><p className="reading-eyebrow">{checkpoint?'Word checkpoint':'Practice adventure'}</p><h1>{chapter.title}</h1></div><span>{complete?tasks.length:index+1} / {tasks.length}</span></header>
    <div className={`reading-round-progress ${remediation?'is-returning':''}`} role="progressbar" aria-label={remediation?'Practice-again progress':'Challenge progress'} aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={complete?tasks.length:index+(done?1:0)}><span style={{width:`${Math.max(4,((complete?tasks.length:index+(done?1:0))/tasks.length)*100)}%`}}/></div>
    {complete?<ReadingCompletion chapter={chapter} checkpoint={checkpoint} pass={Boolean(pass)} reviewMode={Boolean(reviewMode)} successes={successes} originalTaskCount={originalTaskCount} correctedCount={correctedCount} unassessed={unassessed} spokenStations={spokenStations} words={[...new Set(tasks.filter(task=>task.kind==='read').map(task=>task.word))]} onPractice={onPractice} onRestart={restartRound} onReturn={()=>onComplete(Boolean(pass),checkpointFallback)}/>:<>
      <div className="reading-narration"><CharacterCompanion state={recording?'listening':sound.isPlaying?'speaking':answerState==='correct'?'celebrating':answerState==='incorrect'?'encouraging':'idle'} size={90}/><div><span>{remediation?'Milo brought this one back':'Milo says'}</span><h2>{roundPrompt}</h2><MiloSays text={message||'Take your time. There is no timer to beat.'} speak={message?message:`${roundPrompt} Take your time. There is no timer to beat.`}/></div></div>
      <section className={`reading-play reading-play--${active.kind} ${done?'reading-play--solved':''}`}>
        <ActivityScene/>
        {chapter.id==='gate'&&!checkpoint&&active.kind==='read'&&<VoiceRail word={active.word} spoken={spokenStations}/>}
        {chapter.id==='lanterns'&&!checkpoint&&active.kind==='read'&&<LanternVoiceTrail active={active.word} lit={spokenStations}/>}
        {chapter.id==='market'&&!checkpoint&&active.kind==='read'&&<MarketVoiceTrail active={active.word} stocked={spokenStations}/>}
        {chapter.id==='garden'&&!checkpoint&&active.kind==='read'&&<GardenVoiceTrail active={active.word} bloomed={spokenStations}/>} 
        {chapter.id==='bridge'&&!checkpoint&&active.kind==='read'&&<DrawbridgeVoiceTrail active={active.word} raised={spokenStations}/>} 
        {chapter.id==='hall'&&!checkpoint&&active.kind==='read'&&<ChangingWordsVoiceTrail active={active.word} transformed={spokenStations}/>} 
        {chapter.id==='keys'&&!checkpoint&&active.kind==='read'&&<KeyKeeperVoiceTrail active={active.word} unlocked={spokenStations}/>} 
        {chapter.id==='library'&&!checkpoint&&active.kind==='read'&&<RoyalLibraryVoiceTrail active={active.word} restored={spokenStations}/>} 
        {chapter.id==='tower'&&!checkpoint&&active.kind==='read'&&<VowelTowerVoiceTrail active={active.word} awakened={spokenStations}/>} 
        {chapter.id==='crown'&&!checkpoint&&active.kind==='read'&&<CrownChamberVoiceTrail active={active.word} restored={spokenStations}/>} 
        {firstBook&&nextAction==='listen'?<div className="book-sequential-action"><Headphones className="reading-big-icon"/><button className="reading-primary" disabled={sound.isPlaying} onClick={()=>void hear()}><Volume2/>{sound.isPlaying?'Listening...':active.kind==='listen'?'Hear the mystery word':'Hear the word'}</button></div>:active.kind==='build'&&chapter.id==='gate'?<LetterTrain key={`${index}-${roundNumber}`} word={active.word} done={done} showModel={firstGateShowsWordModel(active.word)} onAnswer={word=>answer(word,'construction')}/>:active.kind==='build'?<><div className="reading-target">{active.word}</div><div className="reading-slots" aria-label="Your word">{[...active.word].map((_,i)=><span key={i}>{placed[i]!==undefined?tiles.find(t=>t.id===placed[i])?.letter:''}</span>)}</div><div className="reading-tiles">{tiles.map(t=><button key={t.id} disabled={placed.includes(t.id)||done} onClick={()=>{const next=[...placed,t.id];setPlaced(next);if(next.length===active.word.length)answer(next.map(id=>tiles.find(t=>t.id===id)!.letter).join(''),'construction');}}>{t.letter}</button>)}<button className="reading-icon" onClick={()=>setPlaced([])} disabled={done} aria-label="Clear letters" title="Clear letters"><RotateCcw/></button></div></>:
        active.kind==='repair'||active.kind==='change'?<><div className="reading-change">{active.fromWord&&<><span className="reading-target">{active.fromWord}</span><ArrowRight aria-label="changes to"/></>}<div className="reading-target">{[...active.word].map((letter,i)=><span key={i}>{i===active.missing&&!done?'_':letter}</span>)}</div></div>{!firstBook&&<button className="reading-secondary" onClick={()=>void hear()} disabled={sound.isPlaying}><Volume2/>Hear the new word</button>}<div className="reading-tiles">{shuffleFixedLetters(active).map(letter=><button key={letter} disabled={done||!heard} onClick={()=>answer(active.word.slice(0,active.missing)+letter+active.word.slice(active.missing+1))}>{letter}</button>)}</div></>:
        active.kind==='listen'?<><Headphones className="reading-big-icon"/>{!firstBook&&<button className="reading-primary" onClick={()=>void hear()} disabled={sound.isPlaying}><Volume2/>Hear the mystery word</button>}<div className="reading-choices">{active.options.map(w=><button key={w} className={selectedAnswer===w?(answerState==='correct'?'is-correct':'is-wrong'):''} aria-label={selectedAnswer===w&&answerState==='correct'?`${w}, correct`:w} disabled={!heard||done} onClick={()=>answer(w)}>{w}{selectedAnswer===w&&answerState==='correct'&&<CheckCircle2 aria-hidden="true"/>}</button>)}</div></>:
        active.kind==='meaning'?<><BookOpen className="reading-big-icon"/><p className="reading-story">{active.clue}</p>{!checkpoint&&<button className="reading-secondary" disabled={sound.isPlaying} onClick={()=>{setHelped(true);void sound.narrateText({file:'',text:active.clue!.replace('___','blank')}).catch(()=>setMessage('Audio could not play.'));}}><Volume2/>Hear the story</button>}<div className="reading-meaning-pictures">{active.options.map(w=><button key={w} className={selectedAnswer===w?(answerState==='correct'?'is-correct':'is-wrong'):''} disabled={done||busy} onClick={()=>void answerMeaning(w)} aria-label={w}><ReadingAnchorArt word={w}/><span>{w}</span>{selectedAnswer===w&&answerState==='correct'&&<CheckCircle2 className="reading-picture-check" aria-hidden="true"/>}</button>)}</div></>:
          <>{(!checkpoint||done)&&<ReadingWordPicture word={active.word} onHear={hearScene} hearDisabled={busy||sound.isPlaying}/>}<div className="reading-target">{active.word}</div><div className="reading-actions">{(!firstBook||!done)&&<button className={`reading-primary ${recording?'is-listening':''}`} data-recording={recording} disabled={busy||done||sound.isPlaying} onClick={()=>void record()}>{recording?<><span className="recording-pulse" aria-hidden="true"/><span className="recording-live">Live</span></>:<Mic/>}<span>{recording?`Recording · ${seconds}`:busy?'Checking...':`Say ${active.word}`}</span></button>}{reviewMode&&!done&&<details className="book-practice-help"><summary>Preview tools</summary><button className="reading-secondary" disabled={busy} onClick={()=>{markCorrect();setSpokenStations(words=>chapter.id==='lanterns'?addLitLantern(words,active.word,'matched'):chapter.id==='market'?addStockedLabel(words,active.word,'matched'):chapter.id==='garden'?addBloomedWord(words,active.word,'matched'):chapter.id==='bridge'?addRaisedPlank(words,active.word,'matched'):chapter.id==='hall'?addTransformedWord(words,active.word,'matched'):chapter.id==='keys'?addUnlockedWord(words,active.word,'matched'):chapter.id==='library'?addRestoredStory(words,active.word,'matched'):chapter.id==='tower'?addAwakenedVowelWord(words,active.word,'matched'):chapter.id==='crown'?addRestoredCrownWord(words,active.word,'matched'):addSpokenStation(words,active.word,'matched'));setMessage('Preview result. No voice was assessed.');}}>Preview success</button></details>}</div>{clip&&<div className="reading-voice-replay"><audio ref={clipPlayer} src={clip} preload="metadata"/><button className="reading-icon" title="Hear my voice" aria-label="Hear my voice" onClick={()=>void clipPlayer.current?.play()}><Volume2/></button><span>My voice</span></div>}</>}
        {done&&active.kind!=='read'&&active.kind!=='meaning'&&<ReadingWordPicture word={active.word} onHear={hearScene} hearDisabled={sound.isPlaying}/>}
        {answerState&&<div className={`reading-answer-banner is-${answerState}`} role="status">{answerState==='correct'?<CheckCircle2 aria-hidden="true"/>:<RotateCcw aria-hidden="true"/>}<div><strong>{answerState==='correct'?'Correct!':'We can try this again'}</strong><span>{answerState==='correct'?`${active.word} is complete.`:'This word will come back after a few more challenges.'}</span></div></div>}
      </section>
      <footer className="reading-round-footer">{!done&&<details key={index} className="book-practice-help"><summary>Need help?</summary>{(firstBook?heard:active.kind==='read')&&!checkpoint&&<button className="reading-secondary" disabled={busy||sound.isPlaying} onClick={()=>void hear()}><Volume2 aria-hidden="true"/>{firstBook?'Hear the word again':'Hear the word'}</button>}<button className="reading-secondary" disabled={busy} onClick={()=>void skip()}>Try another word</button></details>}{done&&<button className="reading-primary" onClick={next}>{answerState==='incorrect'?'Next challenge':'Continue'}<ArrowRight/></button>}</footer>
    </>}
  </main>;
}
interface ReadingCompletionProps {
  chapter:ReadingChapter;checkpoint:boolean;pass:boolean;reviewMode:boolean;successes:number;originalTaskCount:number;correctedCount:number;unassessed:number;
  spokenStations:string[];words:string[];onPractice:()=>void;onRestart:()=>void;onReturn:()=>void;
}
function ReadingCompletion({chapter,checkpoint,pass,reviewMode,successes,originalTaskCount,correctedCount,unassessed,spokenStations,words,onPractice,onRestart,onReturn}:ReadingCompletionProps) {
  const gatePractice=chapter.id==='gate'&&!checkpoint;
  const lanterns=chapter.id==='lanterns';
  const market=chapter.id==='market';
  const garden=chapter.id==='garden';
  const bridge=chapter.id==='bridge';
  const hall=chapter.id==='hall';
  const keys=chapter.id==='keys';
  const library=chapter.id==='library';
  const tower=chapter.id==='tower';
  const crown=chapter.id==='crown';
  const title=checkpoint?(lanterns?(pass?'The lantern tower is shining!':'You reached the lantern tower!'):market?(pass?'The Word Market is open!':'You reached market checkout!'):garden?(pass?'The Secret Garden is in bloom!':'You reached the garden gate!'):bridge?(pass?'The castle drawbridge is down!':'You reached the castle gate!'):hall?(pass?'The Hall of Changing Words is awake!':'You reached the mirror door!'):keys?(pass?'The Key Keeper opened every door!':'You reached the keeper door!'):library?(pass?'The Royal Library stories are whole!':'You reached the royal reading desk!'):tower?(pass?'The Vowel Tower is awake!':'You reached the star observatory!'):crown?(pass?'The Crown Reader is here!':'You reached the reading throne!'):(pass?'The First Gate is open!':'You made it through the First Gate!')):gatePractice?'The word train reached the First Gate!':lanterns?'Lantern Lane is glowing!':market?'Every market stall is stocked!':garden?'Every word bed is blooming!':bridge?'The drawbridge is ready to cross!':hall?'Every word mirror is glowing!':keys?'Every sound key found its lock!':library?'Every little story found its word!':tower?'Every tower window is shining!':crown?'Every crown jewel is shining!':'Adventure complete!';
  const returning=useRef(false);
  function returnOnce(){if(returning.current)return;returning.current=true;onReturn();}
  useEffect(()=>{
    if(checkpoint&&!pass)return;
    const timer=window.setTimeout(returnOnce,2200);
    return()=>window.clearTimeout(timer);
  },[checkpoint,pass]);
  return <section className={`reading-summary ${gatePractice?'reading-summary--gate':''} ${checkpoint?'reading-summary--checkpoint':''} ${crown?'reading-summary--crown':''} ${pass?'is-passed':'is-practiced'}`}>
    {gatePractice&&<div className="gate-summary-scene" aria-hidden="true"><div className="gate-summary-rays"><Sparkles/><Sparkles/></div><div className="gate-summary-track"><TrainFront/><span/><Flag/></div></div>}
    {checkpoint&&<div className={`checkpoint-finish-scene ${lanterns?'checkpoint-finish-scene--lanterns':''} ${crown?'checkpoint-finish-scene--crown':''}`} aria-hidden="true"><Sparkles/><div className="checkpoint-gate"><span/>{lanterns?<Lightbulb/>:crown?<Crown/>:<BookOpen/>}<span/></div><Sparkles/></div>}
    <CharacterCompanion state={pass||!checkpoint?'celebrating':'encouraging'} size={160}/>
    <span className="reading-finish-ribbon">{checkpoint?'Challenge complete':'Adventure complete'}</span>
    <h2>{title}</h2>
    {checkpoint&&<div className="checkpoint-word-badges" aria-label={`Words completed: ${words.join(', ')}`}>{words.map((word,index)=><span key={word} style={{'--badge-order':index} as CSSProperties}><CheckCircle2 aria-hidden="true"/><strong>{word}</strong></span>)}</div>}
    {gatePractice&&<div className="gate-earned-words" aria-label={`${spokenStations.length} word stations reached`}>{FIRST_GATE_WORDS.map((word,index)=><span className={spokenStations.includes(word)?'is-earned':''} key={word}><small>Station {index+1}</small><strong>{spokenStations.includes(word)&&<CheckCircle2/>}{word}</strong></span>)}</div>}
    {lanterns&&!checkpoint&&<LanternVoiceTrail active="" lit={spokenStations}/>} 
    {market&&!checkpoint&&<MarketVoiceTrail active="" stocked={spokenStations}/>} 
    {garden&&!checkpoint&&<GardenVoiceTrail active="" bloomed={spokenStations}/>} 
    {bridge&&!checkpoint&&<DrawbridgeVoiceTrail active="" raised={spokenStations}/>} 
    {hall&&!checkpoint&&<ChangingWordsVoiceTrail active="" transformed={spokenStations}/>} 
    {keys&&!checkpoint&&<KeyKeeperVoiceTrail active="" unlocked={spokenStations}/>} 
    {library&&!checkpoint&&<RoyalLibraryVoiceTrail active="" restored={spokenStations}/>} 
    {tower&&!checkpoint&&<VowelTowerVoiceTrail active="" awakened={spokenStations}/>} 
    {crown&&!checkpoint&&<CrownChamberVoiceTrail active="" restored={spokenStations}/>} 
    <p className="reading-finish-message">{reviewMode?'Preview complete. No learner score or progress was saved.':checkpoint?(pass?(lanterns?'You read all six lantern words. The Word Market is ready for your next adventure.':market?'You read every market label independently. The Secret Garden is ready for you.':garden?'You read all six garden words, including the short-i contrast. The Castle Drawbridge is ready for you.':bridge?'You read all six short-u words independently. The Hall of Changing Words is ready for you.':hall?'You changed one sound at a time and read all six words independently. The Key Keeper is ready for you.':keys?'You listened from beginning to end and read all six word keys independently. The Royal Library is ready for you.':library?'You chose words that made sense and read all six independently. The Vowel Tower is ready for you.':tower?'You compared short and long vowels and read five long-vowel words independently. The Crown Chamber is ready.':crown?'You read all eight crown words independently. Every chronicle is complete, Crown Reader!':'You read the words independently. A new book is ready for your next adventure.'):'You finished every challenge and practiced every word. We can make them even stronger together.'):gatePractice?`${spokenStations.length} of 3 word stations reached. The words am, at, and mat are ready for your next story.`:lanterns?`${spokenStations.length} of 6 word lanterns are glowing. Short a, e, and i are ready for the tower.`:market?`${spokenStations.length} of ${MARKET_WORDS.length} word stalls are stocked. You built each CVC label from beginning to end.`:garden?`${spokenStations.length} of ${GARDEN_WORDS.length} garden words are blooming. You listened for short o and spotted bin's different middle sound.`:bridge?`${spokenStations.length} of ${DRAWBRIDGE_WORDS.length} drawbridge planks are raised. You listened for short u in every word.`:hall?`${spokenStations.length} of ${CHANGING_WORDS.length} word runes are glowing. You changed one sound while keeping the other sounds in place.`:keys?`${spokenStations.length} of ${KEY_WORDS.length} word locks are open. You listened for beginning and ending sounds.`:library?`${spokenStations.length} of ${LIBRARY_WORDS.length} royal books are restored. You chose words that made sense in each story.`:tower?`${spokenStations.length} of ${VOWEL_TOWER_WORDS.length} tower windows are shining. You compared short words, silent-e words, and the ee vowel team.`:crown?`${spokenStations.length} of ${CROWN_CHAMBER_WORDS.length} crown jewels are shining. You brought together vowel listening, word building, meaning, and reading.`:'Every practice visit can bring a different mix of words.'}</p>
    <div className="reading-actions reading-finish-actions">{checkpoint&&!pass?<button className="reading-primary" onClick={onPractice}><Puzzle/>Practice these words</button>:<button className="reading-primary" onClick={returnOnce}><Sparkles/>Returning to my book</button>}</div>
    <details className="reading-finish-more" onToggle={event=>{if(event.currentTarget.open)window.requestAnimationFrame(()=>event.currentTarget.scrollIntoView({block:'nearest',behavior:'smooth'}));}}><summary>More choices</summary><div>{checkpoint&&!pass&&<button className="reading-secondary" onClick={returnOnce}><ArrowLeft/>Back to my book</button>}<button className="reading-secondary" onClick={onRestart}><RotateCcw/>{checkpoint?'Try the challenge again':'Play again'}</button></div><p>{reviewMode?`${successes} of ${originalTaskCount} preview steps completed.`:`${successes} of ${originalTaskCount} completed on the first try${correctedCount?`; ${correctedCount} practiced again`:''}${unassessed?`; ${unassessed} saved for later`:''}.`}</p></details>
  </section>;
}
function taskPrompt(task:ReadingTask) {
  return ({build:'Build the word bridge.',repair:'Find the missing sound piece.',change:'Change one sound to make a new word.',listen:'Which word did you hear?',meaning:'Finish the little story.',read:'Read this word to open the gate.'})[task.kind];
}
function shuffleFixedLetters(task:ReadingTask) {
  const target=task.word[task.missing];
  const letters=[...new Set([target,...task.options.join('')])].slice(0,3);
  // Stable while answering, with the correct position varying by item.
  const offset=task.word.charCodeAt(0)%letters.length;
  return [...letters.slice(offset),...letters.slice(0,offset)];
}
