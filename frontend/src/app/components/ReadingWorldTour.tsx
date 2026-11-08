import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import { CharacterCompanion } from './CharacterCompanion';
import { LandmarkArt } from './AdventureArt';
import { useBridgeAudio } from '../../hooks/useBridgeAudio';
import { miloLine, stopMiloScript, waitForMiloScript } from '../../hooks/miloScripts';
import './readingWorldTour.css';

export const WORLD_TOUR_STOPS = [
  {id:'TOUR-001', target:'.chronicle-book.is-current', art:'gate', title:'Welcome to your Reading World!', text:'These ten books are your reading adventures. Finish one stop to open the next. Learning Camp will help you get ready for Book 1.'},
  {id:'TOUR-002', target:'[data-tour="Sticker Book"]', art:'stickers', title:'Collect your reading treasures', text:'Finish the first three stops in Book 1 to open your Sticker Book. Tap a sticker to remember how you earned it!'},
  {id:'TOUR-003', target:'[data-tour="Sound Library"]', art:'sound', title:'Listen to your growing collection', text:'The Sound Library opens with your Sticker Book. Listen to sounds, join sound teams, and record your own voice. More sounds arrive as you read.'},
  {id:'TOUR-004', target:'[data-tour="My Progress"]', art:'progress', title:'See yourself grow', text:'Finish Book 1 to open My Progress and Achievements. See your practice and discover the awards you are working toward.'},
  {id:'TOUR-005-REV', target:'[data-tour="Learning Camp"]', art:'camp', title:'First stop: Learning Camp!', text:'Milo will guide you through three practices. Tap a sound, then drag or tap letter tiles to build ma and am. You can skip any practice. When you are done, Book 1 opens. Let us try together!'},
] as const;

export function ReadingWorldTour({onFinish}:{onFinish:()=>void}) {
  const [step,setStep]=useState(0);
  const audio=useBridgeAudio();
  const stop=WORLD_TOUR_STOPS[step];
  const panel=useRef<HTMLDivElement>(null);
  const [layout,setLayout]=useState({left:16,top:16,clip:'none'});
  useLayoutEffect(()=>{
    const target=document.querySelector<HTMLElement>(stop.target);
    if(!target)return;
    target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    const measure=()=>{
      const r=target.getBoundingClientRect(),w=window.innerWidth,h=window.innerHeight;
      const left=Math.max(8,r.left-8),top=Math.max(8,r.top-8),right=Math.min(w-8,r.right+8),bottom=Math.min(h-8,r.bottom+8);
      const pw=panel.current?.offsetWidth??380,ph=panel.current?.offsetHeight??360;
      const candidates=[{left:right+20,top:Math.max(12,top)},{left:left-pw-20,top:Math.max(12,top)},{left:Math.max(12,(w-pw)/2),top:bottom+16},{left:Math.max(12,(w-pw)/2),top:top-ph-16}];
      const fit=candidates.find(p=>p.left>=12&&p.left+pw<=w-12&&p.top>=12&&p.top+ph<=h-12);
      const position=fit??{left:Math.max(12,(w-pw)/2),top:Math.max(12,h-ph-12)};
      setLayout({...position,clip:`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${left}px ${top}px,${right}px ${top}px,${right}px ${bottom}px,${left}px ${bottom}px,${left}px ${top}px)`});
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(target);if(panel.current)observer.observe(panel.current);
    window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
  },[stop]);
  useEffect(()=>{
    const target=document.querySelector(stop.target);
    target?.classList.add('world-tour-target');
    return()=>{target?.classList.remove('world-tour-target');};
  },[stop]);
  useEffect(()=>{
    let live=true;
    void waitForMiloScript().then(()=>{if(live)return audio.narrateText(miloLine(stop.id,stop.text));}).catch(()=>{});
    return()=>{live=false;audio.stop();};
  },[stop]);
  const finish=()=>{audio.stop();onFinish();};
  const move=(next:number)=>{audio.stop();setStep(next);};
  return <Dialog.Root open onOpenChange={open=>{if(!open)finish();}}><Dialog.Portal>
    <Dialog.Overlay className="reading-tour-shade" style={{clipPath:layout.clip}}/>
    <Dialog.Content ref={panel} className="reading-tour-panel" style={{left:layout.left,top:layout.top}} onInteractOutside={event=>event.preventDefault()}>
      <div className="reading-tour-art" aria-hidden="true"><LandmarkArt kind={stop.art}/></div>
      <div className="reading-tour-copy">
        <div className="reading-tour-guide"><CharacterCompanion size={60} state={audio.isPlaying?'speaking':'idle'}/><span>Milo's world tour</span><button aria-label="Listen to Milo's tour guide" title="Listen to Milo" onClick={()=>{audio.stop();stopMiloScript();void audio.narrateText(miloLine(stop.id,stop.text)).catch(()=>{});}}><Volume2/></button></div>
        <Dialog.Title>{stop.title}</Dialog.Title>
        <Dialog.Description>{stop.text}</Dialog.Description>
        <progress value={step+1} max={WORLD_TOUR_STOPS.length} aria-label="World tour progress"/>
        <footer><button disabled={step===0} onClick={()=>move(step-1)} aria-label="Previous tour step" title="Previous"><ArrowLeft/></button><span>{step+1} of {WORLD_TOUR_STOPS.length}</span><button className="reading-tour-next" onClick={()=>step===WORLD_TOUR_STOPS.length-1?finish():move(step+1)}>{step===WORLD_TOUR_STOPS.length-1?'Go to Learning Camp':'Next'}<ArrowRight/></button></footer>
        <button className="reading-tour-skip" onClick={finish}>Skip to Learning Camp</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
