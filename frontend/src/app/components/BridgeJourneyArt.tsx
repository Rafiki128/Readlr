import { motion, useReducedMotion } from "motion/react";
import { BRIDGE_STOPS } from "./bridgeMapLayout";

export function WorkshopHouse({ interior = false }: { interior?: boolean }) {
  return <svg viewBox={interior ? "0 0 1200 680" : "0 0 320 250"} preserveAspectRatio={interior ? "none" : "xMidYMid meet"} aria-hidden="true">
    {interior ? <>
      <path d="M0 0H1200V680H0Z" fill="#F5F3FF" />
      <path d="M0 0H1200V62H0Z" fill="#8B5CF6" /><path d="M0 62L600 10L1200 62" fill="none" stroke="#C4B5FD" strokeWidth="16" />
      <path d="M0 540H1200V680H0Z" fill="#ECFCCB" /><path d="M0 540H1200" stroke="#A3E635" strokeWidth="8" />
      <path d="M45 60V540M1155 60V540" stroke="#C4B5FD" strokeWidth="20" />
      {[100,940].map(x=><g key={x}><path d={`M${x} 120q80-85 160 0v150h-160Z`} fill="#BAE6FD" stroke="white" strokeWidth="12" /><path d={`M${x+80} 70V270M${x} 180h160`} stroke="white" strokeWidth="8" /><path d={`M${x-12} 280h184`} stroke="#A78BFA" strokeWidth="12" strokeLinecap="round" /></g>)}
      <path d="M320 410H880L940 470H260Z" fill="#FBBF24" stroke="#FFF7ED" strokeWidth="8" /><path d="M285 470H915V490H285Z" fill="#F59E0B" /><path d="M305 490V610M895 490V610" stroke="#F59E0B" strokeWidth="28" />
      <path d="M440 392Q600 250 760 392" stroke="#8B5CF6" strokeWidth="12" fill="none" />
      {[445,500,555,610,665,720].map((x,i)=><path key={x} d={`M${x} 388h40v26h-40Z`} fill={i%2?"#EC4899":"#06B6D4"} stroke="white" strokeWidth="3" />)}
    </> : <>
      <ellipse cx="160" cy="234" rx="145" ry="12" fill="#16A34A" opacity=".2" />
      <path d="M50 100H270V224H50Z" fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="8" />
      <path d="M22 105L160 12L298 105Z" fill="#8B5CF6" stroke="#EDE9FE" strokeWidth="7" />
      <path d="M125 145q35-30 70 0v79h-70Z" fill="#F59E0B" /><path d="M67 130h43v44H67ZM210 130h43v44H210Z" fill="#38BDF8" stroke="white" strokeWidth="7" />
      <path d="M43 207H277V225H43Z" fill="#A78BFA" /><path d="M115 226H205L220 240H100Z" fill="#FDE68A" />
      <circle cx="160" cy="78" r="20" fill="#FBBF24" /><path d="M150 80h20M160 70v20" stroke="white" strokeWidth="6" strokeLinecap="round" />
    </>}
  </svg>;
}

export function BridgeJourneyArt({ region, completed }: { region: number; completed: number[] }) {
  const reduced = useReducedMotion();
  const points = BRIDGE_STOPS[region];
  // Approach each bridge from one bank and leave from the opposite bank.
  const entries = points.map(([x,y],i)=>[x+(i%2?12:-12),y]);
  const exits = points.map(([x,y],i)=>[x+(i%2?-12:12),y]);
  const segment = (a:number[],b:number[]) => `M${a[0]*10} ${a[1]*9}C${a[0]*10} ${(a[1]+b[1])*4.5} ${b[0]*10} ${(a[1]+b[1])*4.5} ${b[0]*10} ${b[1]*9}`;
  return <svg className="bridge-journey-art" viewBox="0 0 1000 900" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 0H1000V900H0Z" fill={["#D9F99D","#CFFAFE","#E0F2FE"][region]} />
    <path d="M-80 340L135 35L310 270L510 10L740 290L895 55L1100 350V900H0Z" fill={["#86EFAC","#67E8F9","#C4B5FD"][region]} />
    <path d="M74 120L135 35L197 118L153 99L130 118L112 98ZM439 99L510 10L583 100L535 79L506 94L479 75ZM842 126L895 55L951 132L913 110L886 126L870 110Z" fill="#FFFFFF" opacity=".9" />
    <path d="M-60 620L120 315L340 560L610 230L860 575L1040 330V900H0Z" fill={["#4ADE80","#2DD4BF","#A5B4FC"][region]} opacity=".65" />
    {region === 2 ? <>
      {[110,420,740].map((y,i)=><g key={y}><path d={`M0 ${y}Q120 ${y-70} 250 ${y}T530 ${y}T800 ${y}T1050 ${y}V${y+75}H0Z`} fill="white" opacity=".85" /><path d={`M${i%2?40:650} ${y+90}l140-85 150 85-95 65h-110Z`} fill="#C4B5FD" /><path d={`M${i%2?40:650} ${y+90}q145-70 290 0`} fill="#A7F3D0" /></g>)}
    </> : <>
      <path d="M460-40C120 170 860 270 520 450S170 700 570 940" fill="none" stroke="#FFFFFF" strokeWidth="170" />
      <path d="M460-40C120 170 860 270 520 450S170 700 570 940" fill="none" stroke={region===1?"#22D3EE":"#38BDF8"} strokeWidth="145" />
      <motion.path d="M460-40C120 170 860 270 520 450S170 700 570 940" fill="none" stroke="#BAE6FD" strokeWidth="8" strokeDasharray="35 65" animate={reduced?{}:{strokeDashoffset:[0,-200]}} transition={{duration:7,repeat:Infinity,ease:"linear"}} />
      {region===1 && [180,570].map(y=><g key={y}><path d={`M490 ${y}h140l-15 125H505Z`} fill="#7DD3FC" /><path d={`M515 ${y}v115m30-115v100m35-100v110`} stroke="white" strokeWidth="9" opacity=".8" /><ellipse cx="560" cy={y+130} rx="90" ry="25" fill="#67E8F9" /></g>)}
    </>}
    {[70,270,475,730].map((y,i)=><g key={y} transform={`translate(${i%2?870:110} ${y})`}><g className="journey-tree">
      <ellipse cy="62" rx="65" ry="20" fill="#22C55E" opacity=".15" />
      <path d="M0 60V-5" stroke="#16A34A" strokeWidth="12" />
      <path d="M-46 8Q-62-24-27-35Q-20-80 15-62Q65-67 48-20Q73 13 25 26H-22Z" fill={region===1?"#F472B6":region===2?"#A78BFA":"#4ADE80"} />
      <path d="M-25-13Q-39-32-11-35" stroke="white" strokeWidth="6" fill="none" opacity=".5" />
      <path d="M-65 70l-7-15m7 15l9-13" stroke="#16A34A" strokeWidth="4" /><circle cx="-65" cy="53" r="7" fill="#FBBF24" />
    </g></g>)}
    {[...entries,[50,0]].map((p,i)=>{
      const from=i===0?[50,100]:exits[i-1];
      const restored=completed.includes(region*5+i)||(region===0&&i===0);
      return <g key={i}><path d={segment(from,p)} fill="none" stroke="#FFFFFF" strokeWidth="36"/><path d={segment(from,p)} fill="none" stroke={restored?"#FBBF24":"#D6D3D1"} strokeWidth="24"/></g>;
    })}
    {points.map(([x,y],i)=>{
      const done=completed.includes(region*5+i+1);
      return <g key={i} transform={`translate(${x*10} ${y*9})`}><g className="journey-bridge-art">
        <path d="M-95-68Q-45-90 0-65T95-68L80 105Q10 145-80 105Z" fill={region===2?"#818CF8":"#0891B2"}/>
        {region!==2&&<><path d="M-66-65Q-40 0-64 110M-28-68Q5 0-23 125M32-68Q10 5 28 125M64-62Q85 5 58 112" stroke="#67E8F9" strokeWidth="12" fill="none"/><motion.path d="M-50-60V110M0-60V120M50-60V110" stroke="white" strokeWidth="4" strokeDasharray="12 26" animate={reduced?{}:{strokeDashoffset:[0,76]}} transition={{duration:2,repeat:Infinity,ease:"linear"}}/></>}
        <path d="M-165-48H-100L-87 40L-125 108L-165 65ZM100-48H165V65L123 108L87 40Z" fill={region===0?"#14B8A6":region===1?"#7C3AED":"#8B5CF6"}/>
        <path d="M-170-48Q-140-70-95-48L-91-8H-170ZM95-48Q140-70 170-48V-8H91Z" fill="#BEF264" stroke="#F7FEE7" strokeWidth="4"/>
        <ellipse cy="45" rx="115" ry="22" fill="#155E75" opacity=".13" />
        <path d="M-110-35Q0 5 110-35M-110 45Q0 85 110 45" fill="none" stroke={done?"#8B5CF6":"#94A3B8"} strokeWidth="7" />
        {[-110,110].map(a=><path key={a} d={`M${a}-55v130`} stroke={done?"#7C3AED":"#94A3B8"} strokeWidth="12" strokeLinecap="round" />)}
        {[-90,-54,-18,18,54].map((a,j)=><motion.path key={a} d={`M${a}-12h30v70h-30Z`} fill={done?(j%2?"#FBBF24":"#F59E0B"):"#CBD5E1"} stroke="white" strokeWidth="3" initial={false} animate={{opacity:done||j!==2?1:.1}} />)}
      </g></g>;
    })}
  </svg>;
}
