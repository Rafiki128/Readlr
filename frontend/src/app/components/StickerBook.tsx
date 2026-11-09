import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Lock, Sparkles } from 'lucide-react';
import { emptyLearnerCurriculumState, patchLearnerCurriculumState, readLearnerCurriculumState, type LearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import { READING_CHAPTERS } from './aralCurriculum';
import { CHRONICLES } from './chronicleContent';
import { BOOK_STICKER_DESIGNS, RewardStickerArt } from './RewardStickerArt';
import { StickerAlbum, type AlbumSticker } from './StickerAlbum';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './rewardsCollection.css';
import './stickerCover.css';
import { HearMiloButton, useMiloInstruction } from './MiloSays';

interface StickerBookProps {
  onBack:()=>void;
  learnerId?:number|null;
  learnerName?:string;
  completedBooks?:string[];
  curriculumState?:LearnerCurriculumState;
  completedByStage?:Record<number,number>;
  avatar?:string;
  expandedKingdom?:boolean;
}

export function StickerBook(props:StickerBookProps) {
  return <StickerBookView {...props}/>;
}

export function StickerBookView({onBack,learnerId,learnerName='Reader',completedBooks=[],curriculumState=emptyLearnerCurriculumState()}:StickerBookProps) {
  const previouslyOpened=Boolean(learnerId&&readLearnerCurriculumState(learnerId).stickerBookOpened);
  const [albumOpen,setAlbumOpen]=useState(false);
  const [unwrapping,setUnwrapping]=useState(false);
  useEffect(()=>{
    const timer=window.setTimeout(()=>setUnwrapping(true),1200);
    return()=>window.clearTimeout(timer);
  },[]);
  useEffect(()=>{
    if(!unwrapping)return;
    const timer=window.setTimeout(()=>{
      setAlbumOpen(true);
      if(learnerId)patchLearnerCurriculumState(learnerId,{stickerBookOpened:true});
    },450);
    return()=>window.clearTimeout(timer);
  },[unwrapping,learnerId]);
  return <main className={`sticker-table-scene ${albumOpen?'has-open-album':''}`}>
    {!albumOpen&&<button className={`sticker-table-book ${unwrapping?'is-opening':''}`} onClick={()=>setUnwrapping(true)} disabled={unwrapping} aria-label="Open my Sticker Book">
      <span className="sticker-table-band">My Sticker Book</span>
      <span className="sticker-cover-art" aria-hidden="true"><span className="cover-star"><RewardStickerArt design="crown"/></span><span className="cover-apple"><RewardStickerArt design="apple"/></span><span className="cover-top"><RewardStickerArt design="top"/></span></span>
      <strong>{learnerName}'s collection</strong>
      <small>{previouslyOpened?'Opening your book...':'Tap the book to unwrap your first sticker'}</small>
    </button>}
    <div className="sticker-table-props" aria-hidden="true"><i/><i/><i/></div>
    {!albumOpen&&<button className="sticker-table-back" onClick={onBack}><ArrowLeft/>Back to my world</button>}
    {albumOpen&&<div className="sticker-album-reveal"><CurrentStickerAlbum onBack={onBack} learnerName={learnerName} completedBooks={completedBooks} state={curriculumState}/></div>}
  </main>;
}

function CurrentStickerAlbum({onBack,learnerName,completedBooks,state}:{onBack:()=>void;learnerName:string;completedBooks:string[];state:LearnerCurriculumState}) {
  const [selected,setSelected]=useState<AlbumSticker|null>(null);
  const starter:AlbumSticker[]=([['mango','Mango Sound'],['apple','Apple Sound'],['top','Top Sound']] as const).map(([word,title])=>({
    id:`gate:${word}`,title,earned:state.guidedStops.includes(`gate:${word}`),art:<RewardStickerArt design={word}/>,
    requirement:`Finish the ${word} sound stop in Book 1, The First Gate.`,
    achievement:`You explored ${word[0]}, the first sound in ${word}, and finished its sound stop in The First Gate!`,
  }));
  const bookStickers:AlbumSticker[]=READING_CHAPTERS.flatMap((chapter,index)=>[
    {id:`${chapter.id}:blend`,title:`${CHRONICLES[index].skill} Helper`,earned:state.guidedStops.includes(`${chapter.id}:blend`)||completedBooks.includes(chapter.id),art:<RewardStickerArt design={BOOK_STICKER_DESIGNS[index][0]}/>,requirement:`Finish the sound-joining stop in Book ${index+1}, ${chapter.title}.`,achievement:`You joined sounds into words in ${chapter.title}. This sticker celebrates your word practice!`},
    {id:`${chapter.id}:complete`,title:CHRONICLES[index].prize,earned:completedBooks.includes(chapter.id),art:<RewardStickerArt design={BOOK_STICKER_DESIGNS[index][1]}/>,requirement:`Complete Book ${index+1}, ${chapter.title}, including its final checkpoint.`,achievement:`You completed ${chapter.title} and its final reading checkpoint. You earned the ${CHRONICLES[index].prize} sticker!`},
  ]);
  const stickers=[...starter,...bookStickers];
  const earned=stickers.filter(sticker=>sticker.earned).length;
  const sayStickers=useMiloInstruction('Turn the pages and tap a sticker to remember how you earned it!');
  return <section className="rewards-page sticker-collection is-album-open"><div className="rewards-inner">
    <header><button className="reading-icon activity-back-button" onClick={onBack} aria-label="Back to my world"><ArrowLeft/></button><div><p>{learnerName}'s collection</p><h1>My Sticker Book<HearMiloButton onClick={sayStickers}/></h1><span>{earned} of {stickers.length} reading treasures found</span></div><Sparkles/></header>
    <StickerAlbum stickers={stickers} title="The Reading Chronicles" onSelect={setSelected} cover={<><BookOpen/><h2>Little sounds.<br/>Wonderful stories.</h2><p>Collected by {learnerName}</p><small>Every sticker remembers something you practiced.</small></>}/>
    </div>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="sticker-detail curriculum-sticker-detail">{selected&&<>
      <div className={`curriculum-sticker-preview ${selected.earned?'':'is-locked'}`} aria-hidden="true">{selected.art}</div>
      <DialogTitle>{selected.title}</DialogTitle>
      <DialogDescription>{selected.earned?selected.achievement:selected.requirement}</DialogDescription>
      <span className="sticker-detail-state">{selected.earned?<><Check size={18}/>Collected</>:<><Lock size={18}/>Still to discover</>}</span>
    </>}</DialogContent></Dialog>
  </section>;
}
