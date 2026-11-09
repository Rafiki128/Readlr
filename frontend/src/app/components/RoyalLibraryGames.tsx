import { useState, type CSSProperties } from 'react';
import { ArrowRight, BookOpen, Check, Feather, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CharacterCompanion } from './CharacterCompanion';
import { ReadingAnchorArt } from './ReadingAnchorArt';
import { LIBRARY_STORIES, LIBRARY_WORDS, readRoyalLibraryStep, saveRoyalLibraryStep, storyWordFits } from './royalLibraryLogic';
import './royalLibraryGames.css';
import { MiloSays } from './MiloSays';

export function RoyalStoryRepair({learnerId,onComplete}:{learnerId:number;onComplete:()=>void}) {
  const reduced=useReducedMotion();
  const initial=Math.min(readRoyalLibraryStep(learnerId),LIBRARY_WORDS.length-1);
  const [wordIndex,setWordIndex]=useState(initial);
  const [chosen,setChosen]=useState('');
  const [message,setMessage]=useState('Read the little story. Choose the word that makes sense.');
  const word=LIBRARY_WORDS[wordIndex];
  const story=LIBRARY_STORIES[word];
  const finished=chosen===word;
  const [before,after]=story.clue.split('___');

  function repair(answer:string) {
    if(finished)return;
    if(!storyWordFits(word,answer)){setChosen(answer);setMessage(`${answer} does not finish this story. We can read it and try again.`);return;}
    setChosen(answer);setMessage(`${word} makes sense. The story is whole again!`);
  }
  function nextStory() {
    const next=wordIndex+1;saveRoyalLibraryStep(learnerId,next);
    if(next===LIBRARY_WORDS.length){onComplete();return;}
    setWordIndex(next);setChosen('');setMessage('Another royal book needs its missing word.');
  }

  return <section className={`royal-story-game ${finished?'is-restored':''}`}>
    <header><CharacterCompanion state={finished?'celebrating':'idle'} gesture="point" size={76}/><div><span>The Royal Library</span><h2>{finished?'The story is whole!':'Mend the little story'}</h2><MiloSays text={message}/></div><b>Story {wordIndex+1} of {LIBRARY_WORDS.length}</b></header>
    <div className="royal-library-scene">
      <div className="library-shelves" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="royal-open-book">
        <span className="library-feather"><Feather/></span>
        <BookOpen aria-hidden="true"/>
        <p>{before}<strong className={finished?'is-filled':''}>{finished?word:'___'}</strong>{after}</p>
        <small>{finished?'A page restored':'One word is missing'}</small>
      </div>
      <div className="story-word-desk"><span>Choose a word</span><div>{story.choices.map((answer,index)=><motion.button key={answer} className={chosen===answer&&!finished?'is-tried':''} disabled={finished} onClick={()=>repair(answer)} initial={reduced?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.08}}><ReadingAnchorArt word={answer}/><strong>{answer}</strong>{finished&&answer===word&&<Check/>}</motion.button>)}</div>{finished&&<button className="reading-primary library-next" onClick={nextStory}>{wordIndex+1===LIBRARY_WORDS.length?<>Open the story trail<Sparkles/></>:<>Next story<ArrowRight/></>}</button>}</div>
    </div>
  </section>;
}

export function RoyalLibraryVoiceTrail({active,restored}:{active:string;restored:string[]}) {
  return <div className="library-voice-trail" aria-label={`${restored.length} of ${LIBRARY_WORDS.length} royal books restored`}>
    <span className="library-shelf-line" aria-hidden="true"/>
    {LIBRARY_WORDS.map((word,index)=><div className={`${restored.includes(word)?'is-restored':''} ${active===word?'is-active':''}`} style={{'--book-order':index} as CSSProperties} key={word}><span className="voice-book"><BookOpen/><strong>{word}</strong></span>{restored.includes(word)&&<Check/>}</div>)}
  </div>;
}
