import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Headphones, Mic, Search, Volume2, Square, LockKeyhole, Library, AudioLines, BookOpen, X } from 'lucide-react';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import { curriculumLibraryItems, CAMP_BLEND_VOWELS, VOWEL_SOUND_TEXT, type LibraryCollection } from './curriculumLibraryContent';
import { useCvcRecorder } from '../../hooks/useCvcRecorder';
import { DEV_UNLOCK_ALL, patchLearnerCurriculumState, readLearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import './curriculumSoundLibrary.css';

const collections: {id:LibraryCollection;label:string;symbol:string}[]=[{id:'short',label:'Short vowels',symbol:'a'},{id:'long',label:'Long vowels',symbol:'ee'},{id:'consonants',label:'Consonants',symbol:'m'},{id:'blends',label:'Sound teams',symbol:'am'},{id:'words',label:'Book words',symbol:'mat'}];
const isVowelFirst=(word:string)=>CAMP_BLEND_VOWELS.some(v=>word.startsWith(v));
export function CurriculumSoundLibrary({onBack,learnerId,completedBooks=[]}:{onBack:()=>void;learnerId?:number|null;completedByStage?:Record<number,number>;unlocked?:boolean;completedBooks?:string[]}) {
  const [group,setGroup]=useState<LibraryCollection>('short');
  const [order,setOrder]=useState<'cv'|'vc'>('cv');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState('a · apple');
  const [message,setMessage]=useState('');
  const [teamMotion,setTeamMotion]=useState(false);
  const [recording,setRecording]=useState(false),[busy,setBusy]=useState(false),[seconds,setSeconds]=useState(4),[clip,setClip]=useState<string|null>(null),[replaying,setReplaying]=useState(false);
  const clipPlayer=useRef<HTMLAudioElement>(null),live=useRef(true);
  const recorder=useCvcRecorder();
  const audio=useBridgeAudio(group==='blends'?'/audio/stage2':'/audio/stage3');
  const allowed=curriculumLibraryItems(group,DEV_UNLOCK_ALL?10:completedBooks.length);
  const shelf=curriculumLibraryItems(group).filter(i=>group!=='blends'||isVowelFirst(i.word)===(order==='vc'));
  const available=shelf.filter(i=>allowed.some(a=>a.label===i.label));
  const item=available.find(i=>i.label===selected)??available[0];
  const results=shelf.filter(i=>`${i.label} ${i.word}`.toLowerCase().includes(query.trim().toLowerCase()));
  const collection=collections.find(c=>c.id===group)!;
  useEffect(()=>{live.current=true;return()=>{live.current=false;audio.stop();recorder.stop();};},[]);
  useEffect(()=>()=>{if(clip)URL.revokeObjectURL(clip);},[clip]);
  useEffect(()=>{if(group==='blends'&&audio.isPlaying)setTeamMotion(true);},[group,audio.isPlaying]);
  const stopPlayback=()=>{audio.stop();clipPlayer.current?.pause();setReplaying(false);setTeamMotion(false);};
  const reset=()=>{stopPlayback();setClip(null);setMessage('');};
  const choose=(next:LibraryCollection)=>{if(busy)return;reset();setGroup(next);setQuery('');setSelected('');};
  async function hear(soundOnly=false){
    if(!item||busy)return;
    stopPlayback();setMessage('');
    try{
      if(soundOnly&&vowelSound)await audio.narrateText({file:`VowelSound-${item.word.toUpperCase()}.wav`,text:vowelSound});
      else if(soundOnly)await audio.play(soundFile);
      else await audio.narrateText({file:`Pronounce${item.word.toUpperCase()}.wav`,text:item.word});
    }catch(e){if((e as Error).name!=='AbortError')setMessage('That sound could not play. Please try again.');}
  }
  async function record(){
    if(busy||!item)return;
    const word=item.word;
    setBusy(true);stopPlayback();setMessage('Getting your microphone ready...');
    try{
      const blob=await recorder.capture(setSeconds,async()=>{if(live.current){setRecording(true);setMessage(`Say ${word}.`);}});
      if(!live.current)return;
      setRecording(false);setClip(URL.createObjectURL(blob));setMessage('Your voice is ready. Listen and compare with Milo.');
      if(learnerId){const state=readLearnerCurriculumState(learnerId);patchLearnerCurriculumState(learnerId,{soundRecordings:[...state.soundRecordings,{word,recordedAt:new Date().toISOString()}].slice(-200)});}
    }catch(error){if(live.current)setMessage(error instanceof Error?error.message:'The microphone could not start.');}
    finally{if(live.current){setBusy(false);setRecording(false);}}
  }
  const sound=item?.label.split(' · ')[0]??'';
  // zh is spelled su in treasure.
  const spelling=sound==='zh'?'su':sound;
  const highlight=item?.word.indexOf(spelling)??-1;
  // Pure sounds exist for the short vowels and every consonant tile; qu uses the q recording.
  const vowelSound=group==='long'?VOWEL_SOUND_TEXT[item?.word??'']:undefined;
  const soundFile=group==='short'?`/audio/stage1/${sound.toUpperCase()}.wav`:group==='consonants'&&/^([b-df-hj-np-tv-z]|qu|sh|ch|th|ng|zh)$/.test(sound)?`/audio/stage2/classic-milo/SoundShelf-${(sound==='qu'?'q':sound).toUpperCase()}.wav`:'';
  function wordArt(word:string){return group==='blends'?<span className="sl-team-art">{word.split('').map((letter,i)=><span key={i} data-vowel={CAMP_BLEND_VOWELS.some(v=>v===letter)}>{letter}</span>)}</span>:<ReadingAnchorArt word={word}/>;}
  return <main className="sound-archive">
    <header className="sl-header"><button className="sl-back" aria-label="Back to my world" title="Back to my world" onClick={()=>{stopPlayback();recorder.stop();onBack();}}><ArrowLeft/></button><div className="sl-heading"><p>The Reading World</p><h1>Sound Library</h1></div><span className="sl-library-mark" aria-hidden="true"><Library/></span></header>
    <nav className="sl-tabs" aria-label="Sound collections">{collections.map(c=><button key={c.id} aria-pressed={group===c.id} disabled={busy} onClick={()=>choose(c.id)}><span>{c.symbol}</span>{c.label}</button>)}</nav>
    <div className="sl-workspace">
      <section className="sl-collection" aria-label={collection.label}>
        <div className="sl-shelf-heading"><div><h2>{collection.label}</h2><p>{available.length} ready to explore <span> / {shelf.length} in this collection</span></p></div><BookOpen aria-hidden="true"/></div>
        {group==='blends'&&<div className="sl-order" role="group" aria-label="Sound team order"><button disabled={busy} aria-pressed={order==='cv'} onClick={()=>{reset();setOrder('cv');setSelected('');}}>m + a <ArrowRight/> ma</button><button disabled={busy} aria-pressed={order==='vc'} onClick={()=>{reset();setOrder('vc');setSelected('');}}>a + m <ArrowRight/> am</button></div>}
        <label className="sl-search"><Search/><input placeholder="Find a sound or word" aria-label="Find a sound or word" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" title="Clear search" onClick={()=>setQuery('')}><X/></button>}</label>
        {!available.length&&<div className="sl-discovery-note"><LockKeyhole/><p>More sounds are on their way.<br/><span>These examples open as you reach later books.</span></p></div>}
        <div className="sl-shelves">{results.map(i=>{const unlocked=allowed.some(a=>a.label===i.label);return <button className={`sl-sound ${unlocked?'':'is-locked'}`} key={i.label} disabled={busy||!unlocked} aria-pressed={unlocked&&item?.label===i.label} aria-label={`${i.label}${unlocked?'':', discover in a later book'}`} onClick={()=>{reset();setSelected(i.label);}}><span className="sl-tile-art" aria-hidden="true">{wordArt(i.word)}</span><strong>{group==='blends'?i.label:group==='words'?i.word:i.label.split(' · ')[0]}</strong><span className="sl-tile-caption">{unlocked?<>{i.word}<Volume2/></>:<>To discover<LockKeyhole/></>}</span></button>;})}</div>
        {!results.length&&<div className="sl-no-results"><Search/><h3>No matching sounds</h3><p>Try a letter or a shorter word.</p><button onClick={()=>setQuery('')}>Show this shelf</button></div>}
      </section>
      <aside className="sl-player" aria-label="Listening desk">
        <div className="sl-player-label"><Headphones/><span>Listening desk</span><AudioLines aria-hidden="true"/></div>
        {item?<>
          <div className={`sl-feature-art ${group==='blends'&&teamMotion?'is-blending':''}`} aria-hidden="true">{group==='blends'?<div className="sl-blend-stage">{wordArt(item.word)}<span className="sl-team-result">{item.word}</span></div>:wordArt(item.word)}</div>
          <div className="sl-word"><span>{group==='blends'?'Sound team':group==='words'?'From your books':`Sound ${sound}`}</span><h2>{group==='blends'?<>{item.word[0]}<span className="sl-join"> + </span>{item.word[1]}<ArrowRight/>{item.word}</>:highlight>=0&&group!=='words'?<>{item.word.slice(0,highlight)}<mark>{spelling}</mark>{item.word.slice(highlight+spelling.length)}</>:item.word}</h2><p>{item.cue}</p></div>
          <div className="sl-listen-row"><button className="sl-listen" disabled={busy} onClick={()=>audio.isPlaying?stopPlayback():void hear()}>{audio.isPlaying?<Square/>:<Volume2/>}{audio.isPlaying?'Stop':group==='blends'?'Hear the sound team':'Hear the word'}</button>{(soundFile||vowelSound)&&<button className="sl-sound-only" disabled={busy} onClick={()=>void hear(true)}><AudioLines/>{group==='consonants'?'Consonant':'Vowel'} sound: {sound}</button>}</div>
          <div className={`sl-voice-station ${recording?'is-recording':''}`}><span>Your turn</span><div><button className="sl-record" disabled={busy} onClick={()=>void record()}><Mic/>{recording?`Recording · ${seconds}`:busy?'Getting ready...':'Record'}</button><button className="sl-replay" disabled={!clip||busy} title="Hear my voice" aria-label={replaying?'Stop my voice':'Hear my voice'} onClick={()=>{if(replaying){clipPlayer.current?.pause();setReplaying(false);}else{audio.stop();void clipPlayer.current?.play().then(()=>setReplaying(true)).catch(()=>setMessage('Your recording could not play. Please try again.'));}}}>{replaying?<Square/>:<Headphones/>}My voice</button></div></div>
          {clip&&<audio ref={clipPlayer} src={clip} onEnded={()=>setReplaying(false)}/>}
          <p className="sl-status" role="status">{message||'Little sounds. Your own voice.'}</p>
        </>:<div className="sl-empty-player"><div className="sl-waiting-books" aria-hidden="true"><span>a</span><span>ee</span><span>oo</span></div><h2>A shelf of new discoveries</h2><p>Keep exploring your books to bring these sounds into your library.</p><button className="sl-listen" onClick={()=>choose('short')}><Volume2/>Hear sounds I know</button></div>}
      </aside>
    </div>
  </main>;
}
