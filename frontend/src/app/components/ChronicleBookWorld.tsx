import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Feather, Headphones, KeyRound, LockKeyhole, Mic, Puzzle, Sparkles, Volume2 } from 'lucide-react';
import { CHRONICLES } from './chronicleContent';
import { READING_CHAPTERS, type SoundCard } from './aralCurriculum';
import { DEV_UNLOCK_ALL } from '../../hooks/learnerCurriculumState';
import { AdventureBackdrop, LandmarkArt } from './AdventureArt';
import { CharacterCompanion } from './CharacterCompanion';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import { useWorldExit } from './useWorldExit';
import { ChroniclePages } from './ChroniclePages';
import { ChronicleTrailArt } from './ChronicleTrailArt';
import { chronicleSounds } from './chronicleLessons';
import { chronicleStopLocked, trailLayout, trailPageSegments } from './chronicleRoute';
import './chronicleWorld.css';
import './chronicleBook.css';

export function ChronicleBookWorld({index,completed,practiceDone,available,reviewMode,challengesOpen=false,openStops=[],onBack,onFinishBook,onPractice,onCheckpoint,onSound,onBlend,visited=[],bookPage=0,onPageChange,celebrateStop}:{index:number;completed:boolean;practiceDone:boolean;available:boolean;reviewMode:boolean;challengesOpen?:boolean;openStops?:string[];onBack:()=>void;onFinishBook:()=>void;onPractice:()=>void;onCheckpoint:()=>void;onSound:(card:SoundCard)=>void;onBlend:()=>void;visited?:string[];bookPage?:number;onPageChange?:(page:number)=>void;celebrateStop?:string|null}) {
  const transition=useWorldExit(200);
  const [closingBook,setClosingBook]=useState(false);
  const closeTimer=useRef<number|null>(null);
  const theme=CHRONICLES[index],chapter=READING_CHAPTERS[index];
  const sound=useBridgeAudio('/audio/stage3');
  const leave=(action:()=>void)=>{sound.stop();transition.exit(action);};
  useEffect(()=>()=>{if(closeTimer.current!==null)window.clearTimeout(closeTimer.current);},[]);
  const closeFinishedBook=()=>{
    if(closingBook)return;
    sound.stop();setClosingBook(true);
    closeTimer.current=window.setTimeout(onFinishBook,1050);
  };
  const sounds=chronicleSounds(index);
  const lessonDraft=[
    ...sounds.map(card=>({id:card.word,title:`${card.letter} for ${card.word}`,hint:card.category==='consonants'?'Meet the sound':`${card.category} vowel`,word:card.word,action:()=>onSound(card),done:visited.includes(card.word)})),
    {id:'blend',title:index===1?'Light word lanterns':index===2?'Build the first labels':index===3?'Grow word sprouts':index===4?'Join the bridge words':index===5?'Wake the word mirrors':index===6?'Forge the sound keys':index===7?'Gather the missing words':index===8?'Raise the vowel lift':index===9?'Gather the crown sounds':'Bring sounds together',hint:index===2?'Slide sounds into order':index===3?'Join, slide and bloom':index===4?'Listen, join and build':index===5?'Listen, swap and discover':index===6?'Listen from first to last':index===7?'Read, think and choose':index===8?'Compare short and long':index===9?'Join and compare':'Listen, slide, blend',word:'',action:onBlend,done:visited.includes('blend')},
    {id:'games',title:index===1?'Lantern word trail':index===2?'Stock the word stalls':index===3?'Tend the word beds':index===4?'Repair the drawbridge':index===5?'Transform the word runes':index===6?'Open the word locks':index===7?'Mend the little stories':index===8?'Wake the tower windows':index===9?'Restore the crown jewels':'Word adventure',hint:index===1?'Sort, build and read':index===2?'Build, match and read':index===3?'Plant, choose and read':index===4?'Fit, build and read':index===5?'Change one sound and read':index===6?'Fit each sound key and read':index===7?'Choose meaning and read':index===8?'Listen, compare and read':index===9?'Build, choose, and read':'Build, find and read',word:'',action:onPractice,done:practiceDone},
    {id:'check',title:index===1?'The lantern tower':index===2?'Market checkout':index===3?'The garden gate':index===4?'The castle gate':index===5?'The mirror door':index===6?'The keeper door':index===7?'The royal reading desk':index===8?'The star observatory':index===9?'The reading throne':'The final gate',hint:index===1?'Read all six words':index===2?'Read all six labels':index===3?'Read all six blooms':index===4?'Read all six planks':index===5?'Read all six runes':index===6?'Read all six word keys':index===7?'Read all six story words':index===8?'Read five vowel spells':index===9?'Read all eight words':'Read your words',word:'',action:onCheckpoint,done:completed}
  ];
  const lessons=lessonDraft.map((lesson,position,all)=>{
    const locked=chronicleStopLocked(all,position,{available,completed,reviewMode:reviewMode||DEV_UNLOCK_ALL,practiceDone,challengesOpen,openStops});
    return {...lesson,locked};
  });
  const trailPages=Array.from({length:Math.ceil(lessons.length/3)},(_,page)=>{
      const pageStart=page*3;
      const stops=lessons.slice(pageStart,pageStart+3);
      const points=trailLayout(index,page,stops.length);
      const previousStop=lessons[pageStart-1];
      const nextStop=lessons[pageStart+stops.length];
      const routeSegments=trailPageSegments(stops,points,{hasPrevious:Boolean(previousStop),hasNext:Boolean(nextStop),previousDone:previousStop?.done??false,nextDone:nextStop?.done??false});
      const celebratingPage=stops.some(stop=>stop.id===celebrateStop);
      const celebratingStop=stops.findIndex(stop=>stop.id===celebrateStop);
      return <div className={`book-trail-page ${celebratingPage?'is-celebrating':''}`} key={page}>
        <header><div><p>{chapter.title} · {index===9?'Final trail':`Trail ${page+1}`}</p><h2>{index===1?(page===0?'Wake the lane lights':page===1?'Carry words through the dusk':'Reach the lantern tower'):index===2?(page===0?'Open the sound stalls':page===1?'Stock the word market':'Reach market checkout'):index===3?(page===0?'Wake the garden sounds':page===1?'Grow the word garden':'Open the garden gate'):index===4?(page===0?'Find the river sounds':page===1?'Rebuild the crossing':'Lower the castle bridge'):index===5?(page===0?'Enter the whispering hall':'Transform the word runes'):index===6?(page===0?'Meet the keeper sounds':'Unlock the word doors'):index===7?(page===0?'Wake the royal shelves':page===1?'Mend the little stories':'Read at the royal desk'):index===8?(page===0?'Meet the long vowels':page===1?'Climb the vowel tower':'Reach the star observatory'):index===9?'Enter the Crown Chamber':page===0?'Meet the sounds':page===1?'Make a little word':'Read and discover'}</h2><p className="book-trail-narration">{index===0?(page===0?'Milo follows a whisper through the orchard. Each little sound brings the gate closer.':'The sounds have found each other. Help Milo weave them into words and wake the woodland gate.'):index===1?(page===0?'Lantern Lane is dim. Every new sound wakes a lamp and brings color back to the path.':page===1?'Sort the middle sounds, build the words, and light a trail toward the tower.':'Read all six lantern words aloud so the great lamp can shine.'):index===2?(page===0?'The market stalls are quiet. Learn p, f, and n to raise their colorful awnings.':page===1?'Slide each sound into place, match every label to its object, and read the stalls aloud.':'Read all six labels on your own so the market bell can ring.'):index===3?(page===0?'The garden is resting. Learn o, b, and h to wake its first shoots.':page===1?'Plant each middle-vowel seed, build the words, and help every bed bloom.':'Read all six garden words aloud so the hidden gate can open.'):index===4?(page===0?'A river separates Milo from the castle. Learn u, g, and d to find the first bridge pieces.':page===1?'Listen for short u, fit each word plank, and rebuild the crossing one piece at a time.':'Read all six bridge words aloud so the drawbridge can lower at the castle gate.'):index===5?(page===0?'The hall is quiet. Learn r and c, then follow the first rune toward the word mirrors.':'Change one beginning sound at a time, read each new word, and wake the great mirror door.'):index===6?(page===0?'The keeper chamber is locked. Learn w and k, then follow the first brass key deeper inside.':'Listen to each word from its beginning to its ending. Fit every sound key and open the keeper door.'):index===7?(page===0?'The royal shelves are sleeping. Learn v, y, x, j, and z to wake the missing volumes.':page===1?'Read each little sentence, choose the word that makes sense, and return it to its story.':'Read all six restored words aloud so the royal book can close with a happy ending.'):index===8?(page===0?'The tower stairs are sleeping. Learn how silent e and the ee team give vowels a long, clear voice.':page===1?'Compare short and long words. Each word you read lights another floor on the climb.':'Read five long-vowel spells aloud to wake the observatory at the top of the tower.'):index===9?'Every skill from your journey is waiting here. Gather the sounds, restore all eight word jewels, and read them at the throne.':theme.story[page===0?0:1]}</p></div><CharacterCompanion state="idle" gesture="point" size={85}/></header><div className="book-page-map">
        <div className="book-map-landscape" aria-hidden="true"/>
        <ChronicleTrailArt page={page} chapter={index} points={points} restored={stops.map(stop=>stop.done)} celebrating={celebratingStop}/>
        <svg className={`book-route ${index===1?'book-route--lantern':''} ${index===2?'book-route--market':''} ${index===3?'book-route--garden':''} ${index===4?'book-route--drawbridge':''} ${index===5?'book-route--hall':''} ${index===6?'book-route--keys':''} ${index===7?'book-route--library':''} ${index===8?'book-route--tower':''} ${index===9?'book-route--crown':''}`} viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true">
          {routeSegments.map((segment,segmentIndex)=>{
            const revealMask=`route-reveal-${index}-${page}-${segmentIndex}`;
            return <g key={segment.path} className={`${segment.revealed?'route-revealed':'route-waiting'} ${segment.completed?'route-complete':''} ${segment.active?'route-active':''}`}>
              <defs><mask id={revealMask}><path pathLength="1" className="theme-route-mask" d={segment.path}/></mask></defs>
              <path className="route-edge" d={segment.path}/>
              <path className="route-track" d={segment.path}/>
              <path className="lantern-string-bulbs lantern-string-bulbs--base" d={segment.path}/>
              <path className="lantern-string-bulbs lantern-string-bulbs--lit" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="market-route-cobbles market-route-cobbles--base market-route-cobbles--base-blue" d={segment.path}/>
              <path className="market-route-cobbles market-route-cobbles--base market-route-cobbles--base-pink" d={segment.path}/>
              <path className="market-route-cobbles market-route-cobbles--blue" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="market-route-cobbles market-route-cobbles--pink" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="garden-route-stem garden-route-stem--base" d={segment.path}/>
              <path className="garden-route-buds garden-route-buds--base garden-route-buds--base-gold" d={segment.path}/>
              <path className="garden-route-buds garden-route-buds--base garden-route-buds--base-pink" d={segment.path}/>
              <path className="garden-route-stem garden-route-stem--grown" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="garden-route-buds garden-route-buds--gold" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="garden-route-buds garden-route-buds--pink" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="drawbridge-route-rope" d={segment.path}/>
              <path className="drawbridge-route-planks drawbridge-route-planks--base" d={segment.path}/>
              <path className="drawbridge-route-planks drawbridge-route-planks--built" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="hall-route-stone" d={segment.path}/>
              <path className="hall-route-runes hall-route-runes--base" d={segment.path}/>
              <path className="hall-route-runes hall-route-runes--lit" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="keeper-route-chain" d={segment.path}/>
              <path className="keeper-route-teeth keeper-route-teeth--base" d={segment.path}/>
              <path className="keeper-route-teeth keeper-route-teeth--gold" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="library-route-ink library-route-ink--base" d={segment.path}/>
              <path className="library-route-ink library-route-ink--written" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="library-route-bookmarks library-route-bookmarks--base" d={segment.path}/>
              <path className="library-route-bookmarks library-route-bookmarks--lit" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="tower-route-steps tower-route-steps--base" d={segment.path}/>
              <path className="tower-route-steps tower-route-steps--lit" d={segment.path} mask={`url(#${revealMask})`}/>
              <path className="crown-route-carpet" d={segment.path}/>
              <path className="crown-route-jewels crown-route-jewels--base" d={segment.path}/>
              <path className="crown-route-jewels crown-route-jewels--lit" d={segment.path} mask={`url(#${revealMask})`}/>
              {segment.revealed&&<path pathLength="1" className="book-route-progress" d={segment.path}/>} 
              {segment.active&&(index===2?<g className="market-delivery-cart" opacity="0"><path d="M-15-10h25l7 16h-38Z"/><path d="M-10-10v-9h15v9"/><circle cx="-12" cy="10" r="4"/><circle cx="10" cy="10" r="4"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1200ms" fill="freeze" rotate="auto"/></g>:index===3?<g className="garden-growing-bud" opacity="0"><circle r="8"/><path d="M0 8v13M0 14q-11-8-12 2M0 14q11-8 12 2"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1350ms" fill="freeze" rotate="auto"/></g>:index===4?<g className="drawbridge-moving-hammer" opacity="0"><path d="M-3-15h6v25h-6Z"/><path d="M-13-19h26v9h-26Z"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1350ms" fill="freeze" rotate="auto"/></g>:index===5?<g className="hall-moving-spark" opacity="0"><path d="m0-13 4 9 10 4-10 4-4 10-4-10-10-4 10-4Z"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1350ms" fill="freeze" rotate="auto"/></g>:index===6?<g className="keeper-moving-key" opacity="0"><circle cx="-9" r="8"/><path d="M-1 0h23m-8 0v8m7-8v6"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1350ms" fill="freeze" rotate="auto"/></g>:index===7?<g className="library-moving-quill" opacity="0"><path d="M-13 12Q-7-14 15-18 11 4-13 12Z"/><path d="M-12 12 15-17M-7 6l12 1"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1400ms" fill="freeze" rotate="auto"/></g>:index===8?<g className="tower-moving-star" opacity="0"><path d="m0-14 4 9 10 5-10 4-4 10-4-10-10-4 10-5Z"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1450ms" fill="freeze" rotate="auto"/></g>:index===9?<g className="crown-moving-jewel" opacity="0"><path d="M0-13 11-5 7 10H-7L-11-5Z"/><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur="1450ms" fill="freeze" rotate="auto"/></g>:<circle className="book-route-light" r="8" opacity="0"><set attributeName="opacity" to="1" begin="850ms" fill="freeze"/><animateMotion path={segment.path} begin="850ms" dur={index===1?'1200ms':'900ms'} fill="freeze"/></circle>)}
            </g>;
          })}
        </svg>
        {celebratingPage&&<div className="book-map-celebration" aria-hidden="true">{Array.from({length:10},(_,spark)=><i key={spark}/>)}</div>}
        {stops.map((stop,i)=>{const point=points[i];const celebrating=celebrateStop===stop.id;return <button key={stop.id} style={{'--stop-x':`${point.x/9}%`,'--stop-y':`${point.y/3.6}%`} as CSSProperties} className={`book-map-stop ${stop.done?'is-done':''} ${celebrating?'is-newly-done':''}`} disabled={stop.locked} onClick={()=>leave(stop.action)}><span className="book-map-token">{stop.locked?<LockKeyhole/>:stop.word?<ReadingAnchorArt word={stop.word}/>:index===6&&stop.id==='games'?<KeyRound/>:index===7&&stop.id==='games'?<Feather/>:(index===8||index===9)&&stop.id==='games'?<Sparkles/>:stop.id==='check'?<Mic/>:stop.id==='blend'?<Headphones/>:<Puzzle/>}{stop.done&&<Check className="book-stop-check"/>}{celebrating&&<span className="book-stop-sparkles" aria-hidden="true">{[0,1,2,3,4,5].map(star=><i key={star}/>)}<Sparkles/></span>}</span><strong>{stop.title}</strong><small>{stop.hint}</small></button>})}
      </div><footer><BookOpen size={18}/><span>{theme.skill} · {page*3+1}–{Math.min(page*3+3,lessons.length)} of {lessons.length} stops</span></footer></div>;
    });
  const pages=[
    <div className="chronicle-story-spread" key="story"><div className="chronicle-story-picture"><LandmarkArt kind={theme.emblem}/><CharacterCompanion state={sound.isPlaying?'speaking':'idle'} gesture="point" size={150}/></div><div><p>CHRONICLE {index+1}</p><h2>{chapter.title}</h2><p className="storybook-story">{theme.story[0]}</p><p>{theme.story[1]}</p><button className="reading-secondary" disabled={sound.isPlaying} onClick={()=>void sound.narrateText({file:'',text:theme.story.join(' ')}).catch(()=>{})}><Volume2/>Read with Milo</button><p className="book-page-hint">Turn the page to explore your trail.</p></div></div>,
    ...trailPages,
    ...(completed?[<div className={`chronicle-story-spread chronicle-closing-spread ${index===9?'chronicle-series-finale':''}`} key="closing">
      <div className="chronicle-story-picture chronicle-closing-picture">
        <div className="chronicle-sticker-award" aria-label={`${theme.prize} sticker earned`}><Sparkles/><span><LandmarkArt kind={theme.emblem}/></span><strong>{theme.prize}</strong><small>Book {index+1} sticker</small></div>
        {index===9&&<div className="chronicle-ten-books" aria-label="All ten chronicles complete"><strong>10</strong><span>chronicles complete</span></div>}
        <CharacterCompanion state="celebrating" gesture="reveal" size={155}/>
      </div>
      <div>
        <p>{index===9?'THE READING CHRONICLES COMPLETE':`CHRONICLE ${index+1} COMPLETE`}</p>
        <h2>{index===9?'You finished all ten reading books!':index===0?'You finished your very first reading book!':`You finished ${chapter.title}!`}</h2>
        <p className="storybook-story">{index===0?'You listened to the sounds, joined little words, and read them aloud. The First Gate is glowing because of you!':index===1?'You listened for short a, e, and i, built six little words, and read each one aloud. Every lamp on Lantern Lane is shining!':index===2?'You built six CVC labels from beginning to end, matched them to their objects, and read every one aloud. The Word Market is open!':index===3?'You planted vowel seeds, listened for short o, spotted the different sound in bin, and read all six garden words aloud. The Secret Garden is blooming because of you!':index===4?'You fitted short-u word planks, rebuilt the crossing, and read all six bridge words aloud. The castle drawbridge is open because of you!':index===5?'You changed one beginning sound at a time, discovered six new words, and read every glowing rune aloud. The Hall of Changing Words is awake!':index===6?'You listened from the first sound to the last, fitted six sound keys, and read every word aloud. Every door in the keeper chamber is open!':index===7?'You found the words that made sense, mended six little stories, and read every restored word aloud. The Royal Library is telling stories again!':index===8?'You compared short and long vowels, discovered the power of silent e and ee, and read every tower word aloud. The Vowel Tower is shining from bottom to top!':'You brought every reading skill together and restored all eight crown jewels. The road beyond the Reading World is still unwritten, ready for the next adventure when it arrives.'}</p>
        <div className="chronicle-earned-note"><Check/><span><strong>{theme.prize} sticker earned</strong><small>{index===1?'Your vowel listening will help you read new CVC words in the Word Market.':index===2?'Your beginning-middle-ending word building will help the Secret Garden bloom.':index===3?'Your short-o listening will help you hear the new vowel at the Castle Drawbridge.':index===4?'Your short-u listening will help you change one sound in the next book.':index===5?'Your sound-changing skill will help you find the word keys in the next book.':index===6?'Your beginning-and-ending sound listening will help you mend stories in the Royal Library.':index===7?'Your story sense will help you compare new vowel sounds in the Vowel Tower.':index===8?'Your long-vowel reading will help you enter the Crown Chamber.':index===9?'Your Crown Reader sticker celebrates the whole ten-book journey.':'It is waiting in your Sticker Book.'}</small></span></div>
        <p className="chronicle-close-cue">{index===READING_CHAPTERS.length-1?'Close this chronicle and return to your Reading World. A new path can begin here someday.':'Close this book and Milo will bring the next chronicle into view.'}</p>
        <button className="world-primary chronicle-close-book" disabled={closingBook} onClick={closeFinishedBook}><BookOpen/>{closingBook?'Closing the book...':index===READING_CHAPTERS.length-1?'Close the final book':'Close this book'}<ArrowRight/></button>
      </div>
    </div>]:[])
  ];
  return <main className={`book-world book-centered-world ${transition.leaving?'world-is-leaving':''} ${closingBook?'is-closing-book':''}`} style={{'--chronicle-color':theme.color,'--chronicle-light':theme.light} as CSSProperties}>
    <AdventureBackdrop theme={theme.emblem}/>
    <header className="book-world-header"><button className="reading-icon activity-back-button" title="Back home" aria-label="Back home" onClick={()=>leave(onBack)}><ArrowLeft/></button><div><p>Chronicle {index+1} · {theme.skill}</p><h1>{chapter.title}</h1></div><span className="book-world-skill"><LandmarkArt kind={theme.emblem}/>{completed?<Check/>:<BookOpen/>}</span></header>
    <ChroniclePages title={chapter.title} initialPage={bookPage} onPageChange={onPageChange} pages={pages}/>
  </main>;
}
