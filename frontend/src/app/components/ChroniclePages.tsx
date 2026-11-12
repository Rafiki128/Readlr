import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './stickerAlbum.css';
import './chroniclePages.css';

/** Uses the same two-sided leaf and turn timing as StickerAlbum. */
export function ChroniclePages({pages,title,initialPage=0,onPageChange}:{pages:ReactNode[];title:string;initialPage?:number;onPageChange?:(page:number)=>void}) {
  const [page,setPage]=useState(initialPage);
  const [turning,setTurning]=useState<{from:number;to:number;direction:number}|null>(null);
  const busy=useRef(false);
  const stack=useRef<HTMLDivElement>(null);
  const [turnHeight,setTurnHeight]=useState<number|null>(null);
  const reduced=useReducedMotion();
  const [small,setSmall]=useState(()=>window.matchMedia('(max-width:700px)').matches);
  useEffect(()=>{
    const media=window.matchMedia('(max-width:700px)');
    const resize=()=>{setSmall(media.matches);setTurning(null);busy.current=false;};
    media.addEventListener('change',resize);
    return()=>media.removeEventListener('change',resize);
  },[]);
  function finish(){if(turning){setPage(turning.to);onPageChange?.(turning.to);}setTurning(null);busy.current=false;}
  useEffect(()=>{if(!turning)return;const timer=setTimeout(finish,800);return()=>clearTimeout(timer);},[turning]);
  function turn(to:number){
    if(busy.current||to<0||to>=pages.length)return;
    if(reduced){setPage(to);onPageChange?.(to);return;}
    // Hold the current page height so the book does not collapse while the leaf turns.
    busy.current=true;setTurnHeight(stack.current?.offsetHeight??null);setTurning({from:page,to,direction:to>page?1:-1});
  }
  useEffect(()=>{
    if(initialPage!==page&&!turning)turn(initialPage);
  },[initialPage,page,turning,pages.length,reduced]);
  // If the current page cannot fit inside the book on this screen, let the book grow to its natural
  // height (the world scrolls) instead of cutting text off. Re-checked on resize and on every page.
  const volume=useRef<HTMLElement>(null);
  useLayoutEffect(()=>{
    const book=volume.current;if(!book||turning)return;
    const fit=()=>{
      book.classList.remove('is-flowing');
      if(small)return;
      const current=book.querySelector<HTMLElement>('.album-paper-stack>.chronicle-page');
      if(!current)return;
      const boxes=[current,...current.querySelectorAll<HTMLElement>('.chronicle-story-spread>div:last-child,.book-page-map,.book-trail-page')];
      if(boxes.some(box=>box.scrollHeight>box.clientHeight+2))book.classList.add('is-flowing');
    };
    fit();
    const observer=new ResizeObserver(()=>fit());
    if(book.parentElement)observer.observe(book.parentElement);
    void document.fonts?.ready.then(fit);
    return()=>observer.disconnect();
  },[page,turning,small,pages]);
  function leaf(index:number,side:number,decorative=false){
    return <div className={`chronicle-half half-${side} ${small?'is-single':''}`} inert={decorative||!!turning}>
      <div className="chronicle-half-content"><div className="chronicle-page">{pages[index]}</div></div>
    </div>;
  }
  return <section ref={volume} className={`chronicle-volume ${turning?'is-turning':''}`} aria-label={`${title} book`}>
    <div className={`album-binding ${small?'single-page':''}`} aria-busy={!!turning}>
      <div className="album-paper-stack" ref={stack} style={turning&&turnHeight?{minHeight:turnHeight}:undefined}>
        {turning?.direction===1&&<div className="chronicle-turn-sparkles" aria-hidden="true">{Array.from({length:9},(_,index)=><i key={index}/>)}</div>}
        {turning?<div className="chronicle-static-spread">
          {leaf(small||turning.direction===-1?turning.to:page,0,true)}
          {!small&&leaf(turning.direction===1?turning.to:page,1,true)}
        </div>:<div className="chronicle-page">{pages[page]}</div>}
        {turning&&<div className="album-turning-leaf" data-direction={turning.direction} aria-hidden="true" onAnimationEnd={event=>{if(event.target===event.currentTarget)finish();}}>
          <div className="album-leaf-front">{leaf(turning.from,small?0:turning.direction===1?1:0,true)}</div>
          <div className="album-leaf-back">{leaf(turning.to,small?0:turning.direction===1?0:1,true)}</div>
        </div>}
      </div>
    </div>
    <nav className="album-page-controls" aria-label="Adventure book pages">
      <button className="reading-icon" title="Previous page" aria-label="Previous page" disabled={!!turning||page===0} onClick={()=>turn(page-1)}><ArrowLeft/></button>
      <span aria-live="polite">Page {page+1} of {pages.length}</span>
      <button className="reading-icon" title="Next page" aria-label="Next page" disabled={!!turning||page===pages.length-1} onClick={()=>turn(page+1)}><ArrowRight/></button>
    </nav>
  </section>;
}
