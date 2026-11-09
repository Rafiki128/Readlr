import { useState } from 'react';
import { ArrowLeft, Check, Trophy } from 'lucide-react';
import { CHRONICLES } from './chronicleContent';
import { READING_CHAPTERS } from './aralCurriculum';
import { completedBookOneStarterStops, type LearnerCurriculumState } from '../../hooks/learnerCurriculumState';
import { chronicleSounds } from './chronicleLessons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './curriculumAchievements.css';
import { AwardSculpture } from './AwardSculpture';
import { BOOK_STICKER_DESIGNS, type RewardStickerDesign } from './RewardStickerArt';
import { HearMiloButton, useMiloInstruction } from './MiloSays';
const cosmeticRewards:Record<string,string>={camp:'Frog and Turtle avatars, plus the Purple Heart border.',recordings:'Record five different words to earn Bee and Dolphin avatars and the Ice Crystal border.',gate:'Lion avatar and Purple Star border.',lanterns:'Penguin avatar.',market:'Tiger avatar.',garden:'Butterfly avatar.',bridge:'Whale avatar and Fire and Water border.',keys:'Octopus avatar.',library:'Dinosaur avatar and Red Ring border.',crown:'Unicorn avatar and Purple Dragon border.'};

export function CurriculumAchievements({onBack,state,completedBooks}:{onBack:()=>void;state:LearnerCurriculumState;completedBooks:string[]}) {
  const [selected,setSelected]=useState<string|null>(null);
  const bookAward=(index:number)=>{
    const chapter=READING_CHAPTERS[index];
    const stops=[...chronicleSounds(index).map(card=>card.word),'blend','games'];
    const earned=completedBooks.includes(chapter.id);
    const current=earned?stops.length+1:stops.filter(stop=>state.guidedStops.includes(`${chapter.id}:${stop}`)).length;
    return {id:chapter.id,title:CHRONICLES[index].prize,detail:`Complete ${chapter.title}, including its final checkpoint.`,earned,current,total:stops.length+1,unit:'stops'};
  };
  const achievements=[
    {id:'camp',title:'Camp Ready',detail:'Finish all three guided Camp practices.',earned:state.campOrientationStep>=3,current:Math.min(3,state.campOrientationStep),total:3,unit:'practices'},
    {id:'treasures',title:'First Treasures',detail:'Finish the first three sound stops in Book 1 to unlock the Sticker Book and Sound Library.',earned:completedBookOneStarterStops(state)>=3,current:completedBookOneStarterStops(state),total:3,unit:'sound stops'},
    bookAward(0),
    {id:'recordings',title:'My Voice Explorer',detail:'Make five recordings in the Sound Library.',earned:state.soundRecordings.length>=5,current:Math.min(5,state.soundRecordings.length),total:5,unit:'recordings'},
    ...READING_CHAPTERS.slice(1).map((_,index)=>bookAward(index+1)),
  ];
  const earned=achievements.filter(item=>item.earned).length;
  achievements.forEach(award=>{if(cosmeticRewards[award.id])award.detail+=` Collection reward: ${cosmeticRewards[award.id]} Choose your rewards in My Profile.`;});
  const active=achievements.find(item=>item.id===selected);
  const awardDesign=(id:string):RewardStickerDesign=>id==='camp'?'planks':id==='treasures'?'chest':id==='recordings'?'firefly':BOOK_STICKER_DESIGNS[Math.max(0,READING_CHAPTERS.findIndex(chapter=>chapter.id===id))][1];
  const sayAwards=useMiloInstruction('You are making progress. Choose an award to see what comes next.');
  return <main className="award-room"><div className="award-room-inner">
    <header className="award-heading"><button onClick={onBack} aria-label="Back to my world" title="Back to my world"><ArrowLeft/></button><div><p>The Reading World</p><h1>My Achievements<HearMiloButton onClick={sayAwards}/></h1></div><Trophy aria-hidden="true"/></header>
    <section className="award-overview" aria-label="Overall achievement progress"><div><strong>{earned} of {achievements.length} awards earned</strong><span>{Math.round(earned/achievements.length*100)}%</span></div><progress aria-label="Awards earned" value={earned} max={achievements.length}/></section>
    <section className="award-shelves" aria-label="My award shelf">{achievements.map(({id,title,earned:unlocked,current,total,unit},index)=><button key={id} className={`shelf-award ${unlocked?'is-earned':'is-growing'} trophy-style-${index%4}`} onClick={()=>setSelected(id)} aria-label={`${title}, ${current} of ${total} ${unit}. View award details`}>
      <span className="award-display" aria-hidden="true"><AwardSculpture design={awardDesign(id)} variant={index}/>{unlocked&&<Check className="award-earned-check"/>}</span>
      <strong>{title}</strong><span className="award-status">{unlocked?'Earned':`${current} of ${total} ${unit}`}</span><progress aria-label={`${title} progress`} value={current} max={total}/>
    </button>)}</section>
    <Dialog open={Boolean(active)} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="award-detail">{active&&<><div className={`award-detail-art ${active.earned?'':'is-growing'}`}><AwardSculpture design={awardDesign(active.id)} variant={achievements.indexOf(active)}/></div><DialogTitle>{active.title}</DialogTitle><DialogDescription>{active.earned?'You earned this award! ':''}{active.detail}</DialogDescription><progress aria-label={`${active.title} progress`} value={active.current} max={active.total}/><p>{active.current} of {active.total} {active.unit} complete</p>{!active.earned&&<p>{active.total-active.current} more to earn your award.</p>}</>}</DialogContent></Dialog>
  </div></main>;
}
