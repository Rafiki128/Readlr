import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, Play, Shield, Sparkles, Eye, Circle, Wind, DoorOpen, Star } from "lucide-react";
import { useAudioManager } from "../../hooks/useAudioManager";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import "./vowelAdventureMap.css";
import { VowelPowerSymbol } from "./VowelPowerSymbol";

const POWERS = [
  { vowel: "A", name: "A Armor", icon: Shield, color: "#F59E0B" },
  { vowel: "E", name: "E Echo", icon: Sparkles, color: "#EC4899" },
  { vowel: "I", name: "I Insight", icon: Eye, color: "#06B6D4" },
  { vowel: "O", name: "O Orb", icon: Circle, color: "#8B5CF6" },
  { vowel: "U", name: "U Uplift", icon: Wind, color: "#10B981" },
];
const REGIONS = [
  { name: "Meadow Trail", subtitle: "Where the adventure begins", color: "#D9F99D", ink: "#22C55E", points: [[25, 32], [55, 53], [74, 77]] },
  { name: "Garden Trail", subtitle: "Follow the flowers", color: "#FBCFE8", ink: "#EC4899", points: [[73, 29], [42, 52], [25, 78]] },
  { name: "Spring Trail", subtitle: "Across the sparkling stream", color: "#BAE6FD", ink: "#06B6D4", points: [[26, 31], [70, 50], [47, 77]] },
  { name: "Orchard Trail", subtitle: "Under the fruit trees", color: "#E9D5FF", ink: "#8B5CF6", points: [[74, 31], [47, 54], [24, 78]] },
  { name: "Grove Trail", subtitle: "The heart of the valley", color: "#A7F3D0", ink: "#10B981", points: [[28, 30], [70, 51], [52, 78]] },
];

function PavilionArt() {
  return <svg viewBox="0 0 280 180" role="img" aria-label="Vowel Dojo pavilion">
    <ellipse cx="140" cy="164" rx="116" ry="12" fill="#679487" opacity=".2" />
    <path d="M50 146H230L250 164H30Z" fill="#A5B4FC" /><path d="M50 138H230V149H50Z" fill="#FFFFFF" />
    <path d="M68 65H212V137H68Z" fill="#FFF7ED" /><path d="M103 83Q140 57 177 83V137H103Z" fill="#6D28D9" />
    <path d="M116 93Q140 74 164 93V137H116Z" fill="#CFFAFE" />
    <path d="M60 62H75V142H60ZM205 62H220V142H205Z" fill="#A78BFA" />
    <path d="M25 66Q62 49 80 23H200Q218 49 255 66Z" fill="#8B5CF6" />
    <path d="M25 66Q140 82 255 66L247 77Q140 94 33 77Z" fill="#6D28D9" />
    <path d="M76 24Q140 8 204 24L196 32H84Z" fill="#C4B5FD" />
    <path d="M124 109L140 98L156 109L152 126L140 136L128 126Z" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="3" />
    <path d="M32 140V116M248 140V116" stroke="#16A34A" strokeWidth="5" /><circle cx="32" cy="105" r="17" fill="#4ADE80" /><circle cx="248" cy="105" r="17" fill="#4ADE80" />
  </svg>;
}

function Landscape({ region }: { region: number }) {
  return <svg className="adventure-landscape" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 55Q170 5 305 70T610 70T1000 30V0H0Z" fill="#fff" opacity=".35" />
    <path d="M0 370Q140 315 310 410T690 400T1000 360V500H0Z" fill={REGIONS[region].ink} opacity=".09" />
    {region === 2 && <><path d="M850 -20Q590 100 810 260T720 520" fill="none" stroke="#38BDF8" strokeWidth="100" /><path d="M840 -20Q590 100 800 260T710 520" fill="none" stroke="#ECFEFF" strokeWidth="7" strokeDasharray="30 30" /></>}
    {[{ x: 100, y: 215 }, { x: 875, y: 145 }, { x: 820, y: 375 }, { x: 140, y: 445 }].filter(({y})=>region!==4 || y<300).map(({ x, y }, i) => <g key={i} transform={`translate(${x} ${y})`}><g className="landscape-tree">
      <ellipse cy="12" rx="45" ry="10" fill="#3e6659" opacity=".12" />
      <path d="M0 10V-55" stroke="#60974D" strokeWidth="10" strokeLinecap="round" />
      {region === 1 ? <><path d="M0 0Q-35-45-20-62M0-15Q35-45 24-65" stroke="#16A34A" strokeWidth="5" fill="none" /><circle cy="-66" r="23" fill="#F472B6" /><circle cx="-24" cy="-46" r="20" fill="#F9A8D4" /><circle cx="24" cy="-48" r="22" fill="#EC4899" /></> : <><path d="M-39-25Q-60-53-23-70Q-12-108 20-83Q59-78 40-42Q36-18 0-24Z" fill={region === 3 ? "#A78BFA" : "#4ADE80"} /><path d="M-26-47Q-36-67-13-73Q-4-91 14-74" fill="none" stroke="#fff" strokeWidth="5" opacity=".25" />{region === 3 && <><circle cx="-20" cy="-50" r="8" fill="#FB923C" /><circle cx="20" cy="-60" r="8" fill="#F43F5E" /></>}</>}
    </g></g>)}
    {[160, 370, 630, 910].map((x, i) => <g key={x} transform={`translate(${x} ${110 + (i % 2) * 260})`}><path d="M0 10V-5M0 5L-10-1M0 2L9-6" stroke="#16A34A" strokeWidth="3" /><circle cy="-9" r="7" fill={region === 1 ? "#EC4899" : "#FACC15"} /><circle cy="-9" r="2" fill="#fff9d6" /></g>)}
  </svg>;
}

export function VowelAdventureMap({ completedCount = 0, initialView, onBack, onSelectLevel }: {
  completedCount?: number; initialView?: "dojo" | "valley"; onBack: () => void; onSelectLevel: (id: number) => void;
}) {
  const completed = Math.max(0, Math.min(20, completedCount));
  const [room, setRoom] = useState(completed < 5 || initialView === "dojo" || (initialView !== "valley" && completed === 5));
  const [notice, setNotice] = useState(false);
  const [trailArrival, setTrailArrival] = useState(false);
  const { playAudio, stopAudio } = useAudioManager();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const next = Math.min(20, completed + 1);
  useEffect(() => {
    if (!room) {
      setTrailArrival(false);
      const container = scrollRef.current;
      if (!container) return;
      container.scrollTop = 0;
      const timer = window.setTimeout(() => {
        const node = currentRef.current;
        if (!node || !scrollRef.current) return;
        const view = scrollRef.current;
        const target = node.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop - view.clientHeight * 0.48;
        view.scrollTo({ top: Math.max(0, target), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        setTrailArrival(true);
      }, 750);
      return () => window.clearTimeout(timer);
    }
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (completed >= 5 && localStorage.getItem("readlr_vowel_dojo_unlock_dismissed") !== "true") {
      setNotice(true);
      const timer = setTimeout(() => playAudio("/audio/stage1/ValleyUnlocked.wav"), 450);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => playAudio(completed === 0
      ? "/audio/stage1/DojoIntro.wav"
      : "/audio/stage1/DojoReturn.wav"), 450);
    return () => clearTimeout(timer);
  }, [room, completed]);
  const dismiss = () => {
    localStorage.setItem("readlr_vowel_dojo_unlock_dismissed", "true");
    setNotice(false);
    stopAudio();
  };
  return <div className="vowel-adventure">
    <header className="adventure-topbar">
      <button onClick={onBack} aria-label="Back to stages"><ArrowLeft size={20} /><span>Home</span></button>
      <span><Star size={17} />{room ? `${Math.min(5, completed)} / 5 powers` : `${Math.max(0, completed - 5)} / 15 trails`}</span>
      <button onClick={() => { stopAudio(); setRoom(!room); }} disabled={!room ? false : completed < 5}><DoorOpen size={19} /><span>{room ? "Valley" : "Dojo"}</span></button>
    </header>
    <div className="adventure-scroll" ref={scrollRef}>
      <div key={room ? "dojo-heading" : "valley-heading"} className="adventure-heading"><p>CHAPTER 1</p><h1>{room ? "Vowel Dojo" : "Valley of Vowels"}</h1><span>{room ? "Train your voice. Give Milo his powers." : "A little voice. A grand adventure."}</span></div>
      {room ? <div className="dojo-world">
        <div className="dojo-pavilion"><PavilionArt /><p>Milo's training home</p></div>
        <div className="dojo-stations">
          {POWERS.map((power, index) => {
            const done = completed > index;
            const locked = index > completed;
            return <button key={power.vowel} disabled={locked} onClick={() => { stopAudio(); onSelectLevel(index + 1); }} className="dojo-station" data-locked={locked} data-next={index === completed} style={{ "--station-color": power.color } as React.CSSProperties} aria-label={`${power.name}${locked ? ", locked" : done ? ", practice again" : ", start training"}`}>
              <div className="dojo-station__figure"><VowelPowerSymbol vowel={power.vowel} /><span className="dojo-station__badge">{locked ? <Lock size={15} /> : done ? <Check size={16} /> : <Play size={15} fill="currentColor" />}</span></div>
              <strong>{power.name}</strong><small>{locked ? "Coming soon" : done ? "Practice again" : "Let's train!"}</small>
            </button>;
          })}
        </div>
        <div className="dojo-exit"><span>{completed >= 5 ? "Your powers are ready!" : "Five powers. One brave adventure."}</span><button disabled={completed < 5} onClick={() => { dismiss(); setRoom(false); }}>Into the valley <ArrowRight size={19} /></button></div>
      </div> : <div className="valley-world">
        {REGIONS.map((region, section) => {
          const start = 6 + section * 3;
          const restored = Math.max(0, Math.min(3, completed - start + 1));
          const finale = section === REGIONS.length - 1;
          const points = section === 0 ? [[25, 48], [55, 67], [74, 85]] : finale ? [[28, 20], [70, 37], [52, 53]] : region.points;
          const nodes = [[50, section === 0 ? 26 : 0], ...points, finale ? [78, 100] : [50, 100]];
          const segment = (a: number[], b: number[]) => `M${a[0] * 10} ${a[1] * 5} C${a[0] * 10} ${(a[1] + b[1]) * 2.5} ${b[0] * 10} ${(a[1] + b[1]) * 2.5} ${b[0] * 10} ${b[1] * 5}`;
          return <section key={region.name} className={`valley-region${section === 0 ? " valley-region--entrance" : ""}${finale ? " valley-region--finale" : ""}`} data-sleeping={completed + 1 < start} style={{ background: region.color }} aria-label={region.name}>
            <Landscape region={section} />
            {section === 0 && <button className="valley-dojo" onClick={() => setRoom(true)} aria-label="Visit the Vowel Dojo to train your powers again"><PavilionArt /><span><strong>Vowel Dojo</strong><small>Visit & train again</small></span><ArrowRight size={20} /></button>}
            <div className="valley-region__label"><h2>{region.name}</h2><span>{restored === 3 ? "All trails restored!" : region.subtitle}</span></div>
            <svg className="valley-path" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
              {finale && <path d="M570 500Q570 410 760 416T1050 360" fill="none" stroke="#38BDF8" strokeWidth="65" />}
              {nodes.slice(1).map((node, i) => <g key={i}>
                <path d={segment(nodes[i], node)} fill="none" stroke="#b5b9a5" strokeWidth="36" />
                <path d={segment(nodes[i], node)} fill="none" stroke="#fff8e7" strokeWidth="29" />
                {completed === start + i - 1 && <defs><mask id={`trail-reveal-${section}-${i}`} maskUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="700">
                  <path d={segment(nodes[i], node)} fill="none" stroke="white" strokeWidth="80" pathLength={1} className="valley-path__reveal" data-started={trailArrival} />
                </mask></defs>}
                {completed >= start + i - 1 && <path d={segment(nodes[i], node)} fill="none" stroke="#FBBF24" strokeWidth="12" mask={completed === start + i - 1 ? `url(#trail-reveal-${section}-${i})` : undefined} />}
              </g>)}
            </svg>
            {finale && <div className="valley-onward" data-ready={completed>=20}><div className="valley-onward__celebration"><Star size={24}/><strong>{completed>=20?"The valley is alive!":"Keep going, explorer!"}</strong></div><div className="valley-onward__sign"><span>Next adventure</span><h2>Blending Bridges</h2><p>{completed>=20?"Your next journey awaits":<><Lock size={14}/> Finish the valley to unlock</>}</p></div></div>}
            {points.map(([x, y], index) => {
              const id = start + index;
              const done = id <= completed;
              const locked = id > completed + 1;
              const current = id === next;
              return <button key={id} ref={current ? currentRef : undefined} className="valley-stop" data-next={current && !done} data-done={done} disabled={locked} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => onSelectLevel(id)} aria-label={`Trail ${id - 5}${done ? ", completed, play again" : locked ? ", locked" : ", play next"}`}>
                <span className="valley-stop__disc">{done ? <Check size={29} strokeWidth={3} /> : locked ? <Lock size={22} /> : <Play size={27} fill="currentColor" />}</span>
                <strong>{current && !done ? "Let's go!" : `Trail ${id - 5}`}</strong>
              </button>;
            })}
          </section>;
        })}
      </div>}
    </div>
    {!room && <footer className="adventure-bottom"><button onClick={() => setRoom(true)}><DoorOpen size={20} />Train in the Dojo</button>{completed < 20 && <button onClick={() => onSelectLevel(next)}>Continue <ArrowRight size={20} /></button>}</footer>}
    <Dialog open={notice && room} onOpenChange={(open) => { if (!open) dismiss(); }}><DialogContent className="bg-card text-center"><DoorOpen className="mx-auto h-12 w-12 text-amber-500" /><DialogTitle>The valley is open!</DialogTitle><DialogDescription>Your five powers are ready. Come back to the Dojo whenever you like.</DialogDescription><button className="adventure-unlock" onClick={() => { dismiss(); setRoom(false); }}>Let's explore <ArrowRight size={20} /></button></DialogContent></Dialog>
  </div>;
}
