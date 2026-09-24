import { motion, useReducedMotion } from "motion/react";
import type { BridgeMode } from "./bridgeCurriculum";

export function BridgeCrossingScene({ built, region, mode }: { built: boolean; region: number; mode: BridgeMode }) {
  const reduced = useReducedMotion();
  const stone = region === 1 && (mode === "echo" || mode === "switch");
  const sky = region === 2;
  const setting = sky ? "floating cloud islands" : region === 1 ? stone ? "rocky mountain cliffs" : "a waterfall gorge" : "a grassy riverbank";
  const repair = mode === "missing" ? "the missing plank lowers into place" : mode === "switch" ? "the crossing straightens and locks together" : mode === "echo" ? "the crossing rises piece by piece" : "the two sides join together";
  return <svg className="bridge-scene" viewBox="0 0 900 310" role="img" aria-label={`${built ? `Repaired bridge: ${repair}` : "A bridge waiting for repair"} across ${setting}`}>
    <path d="M0 0H900V310H0Z" fill={sky ? "#BAE6FD" : region === 1 ? "#CFFAFE" : "#D9F99D"}/>
    {region === 0 && <>
      <path d="M0 80Q140 25 300 110T640 65T900 100V310H0Z" fill="#86EFAC"/>
      <path d="M410 0Q330 90 460 180T470 330" fill="none" stroke="#ECFEFF" strokeWidth="190"/>
      <path d="M410 0Q330 90 460 180T470 330" fill="none" stroke="#38BDF8" strokeWidth="170"/>
      <path d="M0 210Q150 165 290 215L300 310H0ZM620 220Q760 155 900 220V310H610Z" fill="#4ADE80"/>
      {[320,570,610].map((x,i)=><ellipse key={x} cx={x} cy={250+i%2*24} rx="22" ry="12" fill="#94A3B8" stroke="#E2E8F0" strokeWidth="4"/>)}
      {mode === "missing" && [650,680,710].map((x,i)=><g key={x}><path d={`M${x} 245q-12-40 ${i*5} -80`} fill="none" stroke="#16A34A" strokeWidth="5"/><path d={`M${x+i*5} 165v-22`} stroke="#D97706" strokeWidth="8" strokeLinecap="round"/></g>)}
      {mode === "switch" && <g><path d="M740 205Q705 135 730 45" fill="none" stroke="#15803D" strokeWidth="14"/><path d="M660 60Q720-15 820 50Q860 75 825 100H650Z" fill="#22C55E"/>{[665,700,770,810].map(x=><path key={x} d={`M${x} 65q-15 55 0 80`} fill="none" stroke="#4ADE80" strokeWidth="10" strokeLinecap="round"/>)}</g>}
    </>}
    {region === 1 && <>
      <path d="M0 160L140 0 300 165 410 40 550 170 745 0 900 155V310H0Z" fill="#A5B4FC"/>
      <path d="M95 53L140 0 189 57 157 42 138 59 120 39ZM690 63L745 0 800 58 770 41 742 65 720 40Z" fill="#FFFFFF"/>
      <path d="M0 115L285 135 315 180 265 310H0ZM900 100L630 135 590 185 645 310H900Z" fill={stone?"#818CF8":"#2DD4BF"}/>
      <path d="M0 170L275 170M0 245L292 220M635 170H900M620 235L900 265" stroke={stone?"#6366F1":"#0D9488"} strokeWidth="8" fill="none"/>
      <path d="M0 115L285 135 300 153 0 139ZM900 100L630 135 614 155 900 125Z" fill="#BBF7D0"/>
      {!stone && <><path d="M365 0H535V310H350Z" fill="#38BDF8"/><motion.path d="M390-50V360M445-50V360M505-50V360" stroke="#A5F3FC" strokeWidth="12" strokeDasharray="65 35" animate={reduced?{}:{strokeDashoffset:[0,-100]}} transition={{duration:3,repeat:Infinity,ease:"linear"}}/></>}
      {stone && <path d="M300 300Q450 230 630 310" fill="none" stroke="#38BDF8" strokeWidth="35"/>}
    </>}
    {sky && <>
      <path d="M0 270Q55 210 125 260Q190 190 265 260Q350 230 400 285Q490 220 575 275Q655 195 740 250Q830 205 900 260V310H0Z" fill="white"/>
      <path d="M30 167L110 285 210 255 290 175ZM610 175L705 280 825 245 890 160Z" fill="#A78BFA"/>
      <path d="M30 167Q140 105 290 175Q155 220 30 167ZM610 175Q755 105 890 160Q760 225 610 175Z" fill="#86EFAC" stroke="#F0FDF4" strokeWidth="4"/>
      <path d="M110 270L140 200M720 270L750 202" stroke="#8B5CF6" strokeWidth="8"/>
      {mode === "missing" && <motion.g initial={false} animate={{x:built?0:-35,y:built?0:-22,rotate:built?0:-12}} transition={{duration:reduced?0:1}}><path d="M760 40L795 75 760 110 725 75Z" fill="#F472B6" stroke="white" strokeWidth="4"/><path d="M760 110Q720 140 765 175" fill="none" stroke="#8B5CF6" strokeWidth="3"/><path d="M760 175V205" stroke="#7C3AED" strokeWidth="8"/></motion.g>}
      {mode === "switch" && <path d="M630 65h100q35 0 15-20M670 91h140q30 0 15-20" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>}
    </>}
    {(mode === "echo" || mode === "repair") && <g transform="translate(750 130)">
      {mode === "echo" ? sky ? <><path d="M0 55V-70M-25-65H30" stroke="#7C3AED" strokeWidth="6"/><motion.path d="M0-55L8-35 28-32 13-17 17 5 0-5-17 5-13-17-28-32-8-35Z" fill={built?"#FBBF24":"#DDD6FE"} stroke="white" strokeWidth="3" animate={built&&!reduced?{rotate:[0,-12,12,0]}:{rotate:0}} transition={{duration:.8}}/></> : [0,1,2].map(i=><motion.path key={i} d={`M${i*24-35} 50l-13-38 13-37 13 37Z`} initial={false} animate={{fill:built?"#FBBF24":"#C4B5FD"}} transition={{duration:.4,delay:reduced?0:i*.2}} stroke="white" strokeWidth="3"/>) : <><path d="M-20 50V-12H20V50" fill="#A78BFA" stroke="white" strokeWidth="4"/><motion.circle cy="-20" r="23" initial={false} animate={{fill:built?"#FBBF24":"#CBD5E1"}}/><path d="M-12-20h24M0-32v24" stroke="white" strokeWidth="4"/></>}
    </g>}
    {region===1 && mode==="missing" && <g transform="translate(735 130)"><motion.g animate={built&&!reduced?{rotate:360}:{rotate:0}} transition={{duration:5,repeat:Infinity,ease:"linear"}}><circle r="45" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="9"/>{[0,45,90,135].map(a=><path key={a} d="M-40 0H40" transform={`rotate(${a})`} stroke="#D97706" strokeWidth="6"/>)}</motion.g></g>}
    <path d="M280 190H620" stroke={stone?"#6366F1":"#A78BFA"} strokeWidth="34" opacity=".18"/>
    {!stone && <path d="M280 130Q450 165 620 130M280 130V205M620 130V205" fill="none" stroke={sky?"#A78BFA":"#0D9488"} strokeWidth="5"/>}
    {Array.from({length:7},(_,i)=>{
      const affected=mode==="missing"?i===3:mode==="switch"?i>=2&&i<=4:mode==="repair"?i>=1&&i<=5:i>=2&&i<=4;
      const x=280+i*49;
      const offset=mode==="join"?(i<3?-60:60):mode==="switch"?35:0;
      const drop=mode==="missing"?-95:mode==="echo" || (stone && mode==="switch")?65:mode==="repair"?45:0;
      return <motion.g key={i} initial={false} animate={{x:built||!affected?0:offset,y:built||!affected?0:drop,opacity:built||!affected?1:.25,rotate:built||!affected?0:mode==="switch"?16:0}} transition={{duration:reduced?0:.65,delay:reduced?0:built?i*.09:0}} style={{transformOrigin:`${x+22}px 195px`}}>
        <rect x={x} y="180" width="47" height={stone?36:26} rx={stone?5:3} fill={stone?"#C7D2FE":sky?"#FDE68A":"#FBBF24"} stroke={stone?"#818CF8":"#FFF7ED"} strokeWidth="3"/>
        <path d={`M${x+9} 189h28`} stroke={stone?"#EEF2FF":"#F59E0B"} strokeWidth="2"/>
      </motion.g>;
    })}
    {mode==="repair" && <motion.path d="M270 158Q450-60 630 158" fill="none" stroke={sky?"#F472B6":"#FBBF24"} strokeWidth="9" initial={false} animate={{pathLength:built?1:0,opacity:built?1:0}} transition={{duration:reduced?0:1.2}}/>}
    {region===0 && mode==="join" && <path d="M670 255l12-35 12 35M704 252l12-35 12 35" stroke="#16A34A" strokeWidth="5" fill="none"/>}
  </svg>;
}
