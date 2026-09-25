import { useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Crown, Lock, Sparkles, Star, Zap } from "lucide-react";
import { POINT_STICKERS, getTrailPoints } from "./trailRewards";
import { STICKERS, isStickerEarned, type Sticker } from "./stickers";
import { AvatarFrame } from "./AvatarFrame";
import { useFrames, type FrameOption } from "../hooks/useFrames";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import "./rewardsCollection.css";

interface Correction { word: string; stageId: number; attemptNumber: number; timestamp: string; selfCorrected: boolean }
function loadSelfCorrections(): Correction[] {
  try {
    const records = JSON.parse(localStorage.getItem("readlr_attempt_records") || "[]");
    return Array.isArray(records) ? records.filter(record => record?.selfCorrected === true && typeof record.word === "string") : [];
  } catch { return []; }
}
interface StickerBookProps { onBack: () => void; completedByStage?: Record<number, number>; avatar?: string }
const PAGES = [
  { id: 1, title: "Valley of Vowels", color: "#b45309", tint: "#fff4d6", icon: Star },
  { id: 2, title: "Blending Bridges", color: "#6550c5", tint: "#eeebff", icon: Zap },
  { id: 3, title: "CVC Kingdom", color: "#087f68", tint: "#ddf7eb", icon: Crown },
];

export function StickerBook(props: StickerBookProps) {
  const { frames, equipFrame, isLoadingFrames } = useFrames();
  return <StickerBookView {...props} frames={frames} equipFrame={equipFrame} loadingFrames={isLoadingFrames}/>;
}

export function StickerBookView({ onBack, completedByStage = {}, avatar = "", frames = [], equipFrame, loadingFrames = false }: StickerBookProps & {
  frames?: FrameOption[]; equipFrame?: (id:number)=>Promise<boolean>; loadingFrames?:boolean;
}) {
  const [chapter, setChapter] = useState(1);
  const [selected, setSelected] = useState<Sticker | null>(null);
  const [wearing, setWearing] = useState<number | null>(null);
  const [frameMessage, setFrameMessage] = useState("");
  const reducedMotion = useReducedMotion();
  const corrections = useMemo(loadSelfCorrections, []);
  const page = PAGES[chapter-1];
  const Icon = page.icon;
  const collected = STICKERS.filter(sticker=>isStickerEarned(sticker,completedByStage));
  const pageStickers = STICKERS.filter(sticker=>sticker.stageId===chapter);
  const pageEarned = pageStickers.filter(sticker=>isStickerEarned(sticker,completedByStage)).length;
  const next = pageStickers.find(sticker=>!isStickerEarned(sticker,completedByStage));
  const pageFrames = frames.filter(frame=>frame.unlock_stage_number===chapter);
  const trailPoints = getTrailPoints(completedByStage[1] ?? 0);
  const nextBonus = POINT_STICKERS.find(sticker=>sticker.points>trailPoints);
  const style = {"--reward-color":page.color,"--reward-tint":page.tint} as CSSProperties;
  async function wear(id:number) {
    if (!equipFrame || wearing!==null) return;
    setWearing(id); setFrameMessage("");
    try { setFrameMessage(await equipFrame(id) ? "Your new frame is on!" : "Your frame could not be changed. Please try again."); }
    catch { setFrameMessage("Your frame could not be changed. Please try again."); }
    finally { setWearing(null); }
  }
  return <main className="rewards-page sticker-collection" style={style}>
    <div className="rewards-inner">
      <div className="rewards-topline"><button className="rewards-back" onClick={onBack}><ArrowLeft size={17}/>Stages</button><span><BookOpen size={17}/>My collection</span></div>
      <header className="rewards-heading"><div><p className="rewards-eyebrow">Little treasures, big adventures</p><h1>My Sticker Book</h1></div><p>Look at everything you have brought to life.</p></header>
      <section className="rewards-overview" aria-label="Sticker collection progress">
        <div className="album-stack" aria-hidden="true"><Star size={34}/></div>
        <div className="rewards-count"><strong>{collected.length}<span> / {STICKERS.length}</span></strong><p>stickers collected</p></div>
        <div className="rewards-summary-track"><div><span>Your adventure album</span><b>{Math.round(collected.length/STICKERS.length*100)}%</b></div><progress value={collected.length} max={STICKERS.length} aria-label="Album completion"/></div>
        <div className="rewards-next"><Sparkles size={20}/><div><small>{collected.length===STICKERS.length?"A complete collection":"More magic ahead"}</small><b>{STICKERS.length-collected.length===0?"Every treasure is yours!":`${STICKERS.length-collected.length} treasures to discover`}</b></div></div>
      </section>
      <nav className="rewards-tabs album-tabs" aria-label="Sticker chapters">{PAGES.map(item=>{const PageIcon=item.icon;return <button key={item.id} aria-pressed={chapter===item.id} onClick={()=>{setChapter(item.id);setFrameMessage("");}}><PageIcon size={18}/><span className="album-tab-title">{item.title}</span><span>{STICKERS.filter(sticker=>sticker.stageId===item.id&&isStickerEarned(sticker,completedByStage)).length}/{STICKERS.filter(sticker=>sticker.stageId===item.id).length}</span></button>;})}</nav>
      <section className="album-chapter" aria-label={page.title}>
        <header className="album-chapter-heading"><div><span className="album-chapter-icon"><Icon size={23}/></span><div><p>Chapter {chapter}</p><h2>{page.title}</h2></div></div><span>{pageEarned} of {pageStickers.length} collected</span></header>
        <div className="album-layout">
          <motion.div key={chapter} initial={reducedMotion?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} className="sticker-grid">
            {pageStickers.map(sticker=>{const earned=isStickerEarned(sticker,completedByStage);return <button key={sticker.id} className={`sticker-stamp ${earned?"is-collected":"is-uncollected"}`} onClick={()=>setSelected(sticker)} aria-label={`${sticker.name}, ${earned?"collected":"locked"}`}>
              <div className="sticker-stamp-art"><span aria-hidden="true">{sticker.emoji}</span>{earned?<Check className="sticker-check" size={17}/>:<Lock className="sticker-lock" size={16}/>}</div>
              <strong>{sticker.name}</strong><small>{earned?"Collected":`Level ${sticker.at}`}</small>
            </button>;})}
          </motion.div>
          <aside className="album-sidebar" aria-label="Chapter rewards">
            <div className="album-next-reward"><p className="rewards-eyebrow">{next?"Your next treasure":"Chapter complete"}</p><span className="album-next-art" aria-hidden="true">{next?.emoji ?? pageStickers[pageStickers.length-1].emoji}</span><h3>{next?.name ?? "All stickers collected!"}</h3><p>{next?`Complete level ${next.at} in ${page.title}.`:"Every memory has a place in your book."}</p></div>
            {chapter===1&&<div className="album-points"><Star size={21}/><div><b>{trailPoints} trail points</b><p>{nextBonus?`${nextBonus.points-trailPoints} to ${nextBonus.name}`:"Every valley bonus collected"}</p></div></div>}
            <div className="album-frames"><h3><Crown size={18}/>Stage frames</h3>{loadingFrames?<p>Loading your frames...</p>:pageFrames.length===0?<p>Frame details are unavailable right now.</p>:pageFrames.map(frame=><div className="album-frame" key={frame.id}>
              <AvatarFrame assetKey={frame.asset_key} size={56}><span className="frame-avatar">{avatar || <Icon size={23}/>}</span></AvatarFrame><div><b>{frame.name}</b><button disabled={!frame.unlocked || frame.equipped || wearing!==null || !equipFrame} onClick={()=>void wear(frame.id)}>{frame.equipped?<><Check size={13}/>Wearing</>:!frame.unlocked?<><Lock size={13}/>Finish Stage {chapter}</>:wearing===frame.id?"Saving...":"Wear frame"}</button></div>
            </div>)}<p role="status">{frameMessage}</p></div>
          </aside>
        </div>
        <footer className="album-pagination"><button className="rewards-back" aria-label="Previous chapter" disabled={chapter===1} onClick={()=>setChapter(chapter-1)}><ArrowLeft size={18}/></button><span>Chapter {chapter} of 3</span><button className="rewards-back" aria-label="Next chapter" disabled={chapter===3} onClick={()=>setChapter(chapter+1)}><ArrowRight size={18}/></button></footer>
      </section>
      <details className="correction-collection"><summary><Sparkles size={20}/><span>Self-Correction Stars</span><b>{corrections.length}</b></summary>{corrections.length===0?<p>No stars yet. Each brave new try is a step forward.</p>:<div className="correction-grid">{corrections.map((record,index)=><article key={`${record.timestamp}-${index}`}><Star size={24}/><h3>{record.word}</h3><p>Stage {record.stageId} / Try {record.attemptNumber}</p></article>)}</div>}</details>
    </div>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="sticker-detail" style={style}>{selected&&<>
      <span className="sticker-detail-art" aria-hidden="true">{selected.emoji}</span><DialogTitle>{selected.name}</DialogTitle><DialogDescription>{isStickerEarned(selected,completedByStage)?`Collected in ${page.title}. This treasure is yours!`:`Complete level ${selected.at} in ${page.title} to collect this sticker.`}</DialogDescription><span className="sticker-detail-state">{isStickerEarned(selected,completedByStage)?<><Check size={17}/>Collected</>:<><Lock size={17}/>Still to discover</>}</span>
    </>}</DialogContent></Dialog>
  </main>;
}
