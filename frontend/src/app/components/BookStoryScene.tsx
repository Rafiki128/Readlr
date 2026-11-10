import { useId, type ReactNode } from "react";
import "./bookStory.css";

/**
 * The illustrated background of a book's story page: one scene per book, drawn in the same flat style as the
 * reading world. Purely decorative; the page text carries the meaning.
 */
interface Theme { sky: [string, string]; hill: string; ground: [string, string]; back?: (id: string) => ReactNode; front?: (id: string) => ReactNode; indoor?: boolean }

const twinkle = (points: [number, number, number][], fill = "#fff6c2") =>
  points.map(([x, y, r], i) => <path key={i} className="story-twinkle" style={{ animationDelay: `${(i * 0.37) % 2.4}s` }} d={`M${x} ${y - r}L${x + r * .3} ${y - r * .3}L${x + r} ${y}L${x + r * .3} ${y + r * .3}L${x} ${y + r}L${x - r * .3} ${y + r * .3}L${x - r} ${y}L${x - r * .3} ${y - r * .3}Z`} fill={fill}/>);

const fireflies = (points: [number, number][]) =>
  points.map(([x, y], i) => <g key={i} className="story-firefly" style={{ animationDelay: `${i * 0.6}s` }}><circle cx={x} cy={y} r="9" fill="#fff3a0" opacity=".35"/><circle cx={x} cy={y} r="3.5" fill="#fff8c8"/></g>);

const pine = (x: number, y: number, s: number, c = "#1f8a6a", k = "#16735a") =>
  <g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-5" y="-8" width="10" height="22" rx="3" fill="#8a5a36"/><path d="M0-110-40-40h18l-30 40h104L22-40h18Z" fill={c}/><path d="M0-110 6-40h-6l6 40h46L22-40h18Z" fill={k}/></g>;

const bunting = (d: string, flags: [number, number][], colors = ["#ffcc57", "#ef77a5", "#8c70d4", "#4cc3a0"]) =>
  <g><path d={d} stroke="#6b5a4a" strokeWidth="2.5" fill="none"/>{flags.map(([x, y], i) => <path key={i} d={`M${x - 11} ${y}h22l-11 24Z`} fill={colors[i % colors.length]}/>)}</g>;

const flowers = (points: [number, number, string][]) =>
  points.map(([x, y, c], i) => <g key={i} transform={`translate(${x} ${y})`}><path d="M0 4v16" stroke="#2f8f5b" strokeWidth="3"/><circle cy="-5" r="6" fill={c}/><circle cx="6" r="6" fill={c}/><circle cy="5" r="6" fill={c}/><circle cx="-6" r="6" fill={c}/><circle r="4" fill="#ffe27a"/></g>);

const THEMES: Record<string, Theme> = {
  gate: {
    sky: ["#d8f6e6", "#fff4cf"], hill: "#a6dcb6", ground: ["#86cf93", "#62b57b"],
    back: () => <><circle cx="470" cy="300" r="62" fill="#ffe08a"/><circle cx="470" cy="300" r="88" fill="#ffe08a" opacity=".35"/></>,
    front: () => <>{pine(52, 372, 1.15)}{pine(118, 384, .85, "#2a9a75", "#1f8565")}{pine(548, 378, 1.05)}{pine(498, 392, .7, "#2a9a75", "#1f8565")}
      <g transform="translate(470 430)"><rect x="-4" y="-2" width="8" height="16" rx="3" fill="#f6e9d2"/><path d="M-16 0a16 13 0 0 1 32 0Z" fill="#e8564f"/><circle cx="-6" cy="-6" r="2.5" fill="#fff"/><circle cx="5" cy="-8" r="2" fill="#fff"/></g>
      <g transform="translate(140 445) scale(.8)"><rect x="-4" y="-2" width="8" height="16" rx="3" fill="#f6e9d2"/><path d="M-16 0a16 13 0 0 1 32 0Z" fill="#ff9b54"/><circle cx="-5" cy="-6" r="2.5" fill="#fff"/></g>
      {fireflies([[90, 250], [205, 300], [420, 230], [545, 280], [300, 190]])}</>,
  },
  lantern: {
    sky: ["#3b2f6b", "#f2a0b6"], hill: "#6c4f92", ground: ["#4f7f6d", "#3f6a5b"],
    back: () => <><circle cx="490" cy="92" r="34" fill="#fff3c4"/><circle cx="480" cy="84" r="6" fill="#efe0a6"/><circle cx="500" cy="102" r="4" fill="#efe0a6"/>{twinkle([[80, 60, 7], [170, 110, 5], [300, 50, 6], [400, 130, 5], [560, 170, 6], [240, 160, 4]])}</>,
    front: () => <><path d="M-10 60Q150 125 300 78T610 92" stroke="#3a2f4f" strokeWidth="2.5" fill="none"/>
      {[[40, 80], [110, 100], [185, 108], [262, 88], [340, 76], [420, 90], [500, 96], [570, 90]].map(([x, y], i) =>
        <g key={i} className="story-lantern" style={{ animationDelay: `${i * .3}s`, transformOrigin: `${x}px ${y}px` }}><circle cx={x} cy={y + 20} r="18" fill="#ffd36b" opacity=".3"/><path d={`M${x} ${y}v6`} stroke="#3a2f4f" strokeWidth="2"/><rect x={x - 9} y={y + 6} width="18" height="24" rx="7" fill={i % 2 ? "#ffcf5c" : "#ff9fc4"}/><rect x={x - 6} y={y + 3} width="12" height="5" rx="2" fill="#5b4a6e"/></g>)}
      {fireflies([[120, 330], [480, 300], [560, 380], [70, 400]])}</>,
  },
  market: {
    sky: ["#8fd8ff", "#eaf9ff"], hill: "#a9e08d", ground: ["#f2d9a2", "#e5c487"],
    back: () => <><circle cx="520" cy="80" r="36" fill="#ffd95b"/>{[[70, 250], [500, 260]].map(([x, y], i) =>
      <g key={i} transform={`translate(${x} ${y})`}><rect x="-50" y="20" width="100" height="70" fill="#fff4dc"/><path d="M-60 20h120l-8-28h-104Z" fill={i ? "#4cc3a0" : "#ef77a5"}/>{[-45, -15, 15, 45].map(d => <path key={d} d={`M${d - 15} 20a15 12 0 0 0 30 0`} fill={i ? "#3aa889" : "#d95c8d"}/>)}<rect x="-40" y="45" width="80" height="10" rx="3" fill="#c98b4f"/></g>)}</>,
    front: () => <>{bunting("M-10 40Q150 95 300 55T610 60", [[40, 58], [95, 74], [150, 82], [205, 78], [260, 64], [330, 56], [390, 62], [450, 66], [510, 60], [565, 56]])}
      {[[60, 420], [535, 430], [575, 400]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><rect x="-26" y="-22" width="52" height="40" rx="4" fill="#c98b4f"/><path d="M-26-8h52M-26 6h52" stroke="#a46e3a" strokeWidth="3"/><circle cx="-10" cy="-26" r="9" fill={i ? "#ff9b54" : "#e8564f"}/><circle cx="8" cy="-27" r="9" fill="#7cc95b"/></g>)}</>,
  },
  garden: {
    sky: ["#c8f1ff", "#fffbe2"], hill: "#7fc98a", ground: ["#93d77d", "#72c067"],
    back: () => <><path d="M0 250q30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0 30-30 60 0V340H0Z" fill="#2f9a6a"/>
      <path d="M200 340V190a100 100 0 0 1 200 0v150" stroke="#e98fb7" strokeWidth="14" fill="none"/>{[...Array(9)].map((_, i) => { const a = Math.PI * (i / 8); return <circle key={i} cx={300 - Math.cos(a) * 100} cy={190 - Math.sin(a) * 100} r="11" fill={["#ff8fb8", "#ffd36b", "#c9a2ff"][i % 3]}/>; })}</>,
    front: () => <>{flowers([[40, 420, "#ff8fb8"], [80, 445, "#ffd36b"], [120, 425, "#c9a2ff"], [480, 430, "#ff8fb8"], [520, 450, "#9fd8ff"], [560, 425, "#ffd36b"], [440, 455, "#c9a2ff"]])}
      <g className="story-butterfly"><path d="M0 0q-13-15-17 0q4 11 17 0Z" fill="#ff9ccb"/><path d="M0 0q13-15 17 0q-4 11-17 0Z" fill="#ffc857"/></g></>,
  },
  bridge: {
    sky: ["#a9dcff", "#e9f7ff"], hill: "#9fd3a8", ground: ["#8fcf86", "#73bb72"],
    back: () => <g fill="#b8c4e8"><rect x="210" y="170" width="180" height="150"/><rect x="190" y="130" width="50" height="190"/><rect x="360" y="130" width="50" height="190"/>{[190, 205, 220, 235, 360, 375, 390, 405].map(x => <rect key={x} x={x} y="118" width="10" height="14"/>)}{[210, 235, 260, 285, 310, 335, 360, 385].map(x => <rect key={x} x={x} y="158" width="12" height="14"/>)}<path d="M275 320v-50a25 25 0 0 1 50 0v50Z" fill="#8f9cc6"/><path d="M215 130v-40l26 14-26 14" fill="#ef77a5"/><path d="M385 130v-40l26 14-26 14" fill="#ffcc57"/></g>,
    front: () => <><path d="M0 382q150-14 300 0t300 0v34q-150 14-300 0t-300 0Z" fill="#53c1e3"/><path d="M40 394q20-6 40 0M200 400q20-6 40 0M380 392q20-6 40 0M520 402q20-6 40 0" stroke="#d6f6ff" strokeWidth="3" fill="none" strokeLinecap="round"/></>,
  },
  magic: {
    sky: ["#2e2a6b", "#7b5cc9"], hill: "#4a3d8f", ground: ["#5c4aa8", "#4b3a92"], indoor: true,
    back: () => <>{[90, 300, 510].map(x => <path key={x} d={`M${x - 70} 340V170a70 70 0 0 1 140 0v170Z`} fill="#3b3383" stroke="#8f7ce0" strokeWidth="4"/>)}{[90, 300, 510].map(x => <ellipse key={x} cx={x} cy="230" rx="38" ry="52" fill="#a99cf0" opacity=".35"/>)}{twinkle([[60, 70, 8], [180, 120, 6], [300, 60, 9], [430, 110, 6], [550, 70, 8], [250, 300, 5], [470, 290, 5]], "#fff2a8")}</>,
    front: () => <>{[...Array(8)].map((_, i) => <path key={i} d={`M${i * 80 - 20} 400l40-14 40 14-40 14Z`} fill={i % 2 ? "#6b58bf" : "#7d69d1"}/>)}<path d="M40 150q60-40 120 0t120 0" stroke="#f7a8d8" strokeWidth="4" fill="none" opacity=".6"/><path d="M380 110q60-40 120 0t100 0" stroke="#9fe3ff" strokeWidth="4" fill="none" opacity=".6"/></>,
  },
  key: {
    sky: ["#f3dab3", "#e8c28c"], hill: "#d9ab72", ground: ["#b9834f", "#a3703f"], indoor: true,
    back: () => <><g stroke="#d4a46c" strokeWidth="2" fill="none">{[...Array(7)].map((_, r) => <path key={r} d={`M0 ${40 + r * 44}h600`}/>)}{[...Array(7)].map((_, r) => [...Array(8)].map((_, c) => <path key={`${r}-${c}`} d={`M${c * 80 + (r % 2) * 40} ${40 + r * 44}v44`}/>))}</g>
      <path d="M440 340V190a60 60 0 0 1 120 0v150Z" fill="#8a5a36" stroke="#6b4428" strokeWidth="5"/><circle cx="540" cy="270" r="6" fill="#f5c84c"/>
      <path d="M30 70h240" stroke="#6b4428" strokeWidth="6" strokeLinecap="round"/>{[60, 110, 160, 210, 250].map((x, i) => <g key={x} className="story-key" style={{ animationDelay: `${i * .4}s`, transformOrigin: `${x}px 70px` }}><path d={`M${x} 70v14`} stroke="#6b4428" strokeWidth="2"/><circle cx={x} cy="92" r="8" fill="none" stroke="#f5c84c" strokeWidth="4"/><path d={`M${x} 100v22m0-6h6m-6-8h5`} stroke="#f5c84c" strokeWidth="4" strokeLinecap="round"/></g>)}
      {[[330, 120], [600 - 30, 120]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><rect x="-6" y="0" width="12" height="34" rx="3" fill="#6b4428"/><path className="story-flame" d="M0-26q14 12 0 26-14-14 0-26Z" fill="#ffb54a"/><circle cy="-8" r="16" fill="#ffd36b" opacity=".3"/></g>)}</>,
  },
  library: {
    sky: ["#f8ebcf", "#f0dcb4"], hill: "#e2c79a", ground: ["#c98b4f", "#b5783f"], indoor: true,
    back: () => <>{[[0, 150], [470, 130]].map(([x, w], s) => <g key={s} transform={`translate(${x} 60)`}><rect width={w} height="290" fill="#a46e3a"/>{[0, 1, 2, 3].map(r => <g key={r}><rect x="6" y={r * 72 + 62} width={w - 12} height="8" fill="#7d5229"/>{[...Array(Math.floor((w - 16) / 15))].map((_, b) => <rect key={b} x={10 + b * 15} y={r * 72 + 14 + (b % 3) * 4} width="12" height={48 - (b % 3) * 4} rx="2" fill={["#e8564f", "#4cc3a0", "#ffcc57", "#8c70d4", "#3f78e0"][(b + r + s) % 5]}/>)}</g>)}</g>)}
      <path d="M240 60h120v110H240Z" fill="#bfe9ff" stroke="#a46e3a" strokeWidth="8"/><path d="M300 60v110M240 115h120" stroke="#a46e3a" strokeWidth="5"/></>,
    front: () => <><ellipse cx="300" cy="440" rx="200" ry="30" fill="#c0475e" opacity=".85"/><ellipse cx="300" cy="440" rx="170" ry="22" fill="none" stroke="#ffcc57" strokeWidth="3"/>
      {[[200, 210, -18, "#3f78e0"], [420, 190, 14, "#e8564f"]].map(([x, y, a, c], i) => <g key={i} className="story-float" style={{ animationDelay: `${i * 1.1}s` }} transform={`translate(${x} ${y}) rotate(${a})`}><path d="M-26-16h24v32h-24Z" fill={c as string}/><path d="M2-16h24v32H2Z" fill={c as string}/><path d="M-22-12h20v24h-20ZM4-12h20v24H4Z" fill="#fffaf0"/></g>)}</>,
  },
  tower: {
    sky: ["#14204a", "#3c56a3"], hill: "#25406e", ground: ["#2f5876", "#26485f"],
    back: () => <><path d="M470 60a40 40 0 1 0 34 62 32 32 0 1 1-34-62Z" fill="#fff3c4"/>{twinkle([[60, 50, 6], [130, 110, 4], [210, 60, 7], [290, 140, 4], [360, 70, 5], [420, 160, 4], [560, 180, 6], [100, 190, 4], [250, 220, 5]])}
      <path d="M150 110 210 60 290 140 360 70" stroke="#c9d6ff" strokeWidth="1.5" strokeDasharray="4 5" fill="none" opacity=".7"/>
      <g fill="#1d3358"><rect x="40" y="200" width="60" height="140"/><path d="M30 200 70 140l40 60Z"/><rect x="510" y="180" width="54" height="160"/><path d="M500 180l37-60 37 60Z"/></g><g fill="#ffd36b">{[[62, 230], [62, 280], [530, 210], [530, 260], [530, 305]].map(([x, y], i) => <rect key={i} className="story-window" style={{ animationDelay: `${i * .5}s` }} x={x} y={y} width="14" height="20" rx="7"/>)}</g></>,
  },
  crown: {
    sky: ["#8f2346", "#c4466a"], hill: "#a33558", ground: ["#7a1f3d", "#661836"], indoor: true,
    back: () => <><path d="M0 0h130q-30 160 10 340H0Z" fill="#c0283f"/><path d="M600 0H470q30 160-10 340h140Z" fill="#c0283f"/><path d="M30 0q10 170-10 340M80 0q20 170 10 340M570 0q-10 170 10 340M520 0q-20 170-10 340" stroke="#9d1d33" strokeWidth="6" fill="none"/>
      <path d="M0 40q75 50 150 0t150 0 150 0 150 0" stroke="#f5c84c" strokeWidth="8" fill="none"/>{[75, 225, 375, 525].map(x => <circle key={x} cx={x} cy="64" r="8" fill={x % 2 ? "#4cc3a0" : "#9fd8ff"} stroke="#f5c84c" strokeWidth="3"/>)}{twinkle([[180, 130, 7], [420, 120, 7], [300, 90, 6]], "#ffe27a")}</>,
    front: () => <path d="M250 340h100l90 160H160Z" fill="#c0283f" stroke="#f5c84c" strokeWidth="4"/>,
  },
};

const CONFETTI = ["#ffcc57", "#ef77a5", "#8c70d4", "#4cc3a0", "#3f78e0"];

export function BookStoryScene({ emblem, celebrate = false }: { emblem: string; celebrate?: boolean }) {
  const id = useId().replace(/:/g, "");
  const theme = THEMES[emblem] ?? THEMES.gate;
  return <svg className={`book-story-scene scene-${emblem}`} viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={theme.sky[0]}/><stop offset="1" stopColor={theme.sky[1]}/></linearGradient></defs>
    <rect width="600" height="500" fill={`url(#${id}-sky)`}/>
    {theme.back?.(id)}
    {!theme.indoor && <path d="M0 330Q120 270 240 318T480 300 600 318V500H0Z" fill={theme.hill}/>}
    <path d={theme.indoor ? "M0 340H600V500H0Z" : "M0 372Q150 345 300 366T600 360V500H0Z"} fill={theme.ground[0]}/>
    <path d="M0 458Q200 432 400 454T600 446V500H0Z" fill={theme.ground[1]}/>
    {theme.front?.(id)}
    {celebrate && <g className="story-confetti">{[...Array(18)].map((_, i) => <rect key={i} x={30 + i * 31} y={-20 - (i % 4) * 30} width="9" height="14" rx="2" fill={CONFETTI[i % CONFETTI.length]} style={{ animationDelay: `${(i % 6) * .45}s` }} transform={`rotate(${(i * 37) % 90} ${34 + i * 31} ${-13 - (i % 4) * 30})`}/>)}</g>}
  </svg>;
}

/** Letter tiles for the book's practice words, floating around the scene. */
export function StoryWordTiles({ words }: { words: string[] }) {
  return <div className="story-word-tiles" aria-hidden="true">{words.slice(0, 3).map((word, i) => <span key={word} className={`story-word-tile story-word-tile--${i}`}>{word.split("").map((letter, j) => <b key={j}>{letter}</b>)}</span>)}</div>;
}
