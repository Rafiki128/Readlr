import { motion, useReducedMotion } from "motion/react";

import { CROSSING_SPOTS } from "./bridgeMapLayout";
const curve = (a:{x:number;y:number},b:{x:number;y:number}) => `C${a.x} ${(a.y+b.y)/2} ${b.x} ${(a.y+b.y)/2} ${b.x} ${b.y}`;

export function ContinuousBridgeLandscape({ completed }: {completed:number[]}) {
  const reduced=useReducedMotion();
  const water=[{x:500,y:4000},...CROSSING_SPOTS,{x:500,y:250}];
  const river=`M500 4000 ${water.slice(1).map((p,i)=>curve(water[i],p)).join(" ")}`;
  // Approaches share the horizontal tangent of each bridge deck.
  const route = [...CROSSING_SPOTS,{x:500,y:240}].map((p,i)=>{
    const side=i%2?-1:1;
    const previous=i===0?{x:650,y:3780}:CROSSING_SPOTS[i-1];
    const start={x:previous.x+(i===0?0:side*68),y:previous.y+(i===0?0:16)};
    const end={x:p.x+(i===15?0:side*68),y:p.y+16};
    const approach=`M${start.x} ${start.y} C${start.x+(i===0?0:side*85)} ${i===0?start.y-100:start.y} ${end.x+(i===15?0:side*85)} ${i===15?end.y+85:end.y} ${end.x} ${end.y}`;
    const deck=i<15?`M${end.x} ${end.y}H${p.x-side*68}`:"";
    return {approach,deck,open:i===0||completed.includes(i),repaired:completed.includes(i+1)};
  });
  const road=route.map(({approach,deck})=>`${approach} ${deck}`).join(" ");
  return <svg className="continuous-landscape__art" viewBox="0 0 1000 4000" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="bridge-terrain" x2="0" y2="1"><stop stopColor="#BAE6FD"/><stop offset=".27" stopColor="#E0F2FE"/><stop offset=".5" stopColor="#99F6E4"/><stop offset=".76" stopColor="#86EFAC"/><stop offset="1" stopColor="#D9F99D"/></linearGradient>
      <linearGradient id="bridge-river" x2="0" y2="1"><stop stopColor="#A5B4FC"/><stop offset=".38" stopColor="#67E8F9"/><stop offset="1" stopColor="#38BDF8"/></linearGradient>
    </defs>
    <path d="M0 0H1000V4000H0Z" fill="url(#bridge-terrain)"/>
    {[850,1450,2050,2600].map((y,i)=><g key={y} opacity={i>2?.4:.85}>
      <path d={`M-150 ${y+580}L180 ${y-200}L480 ${y+460}L780 ${y-100}L1180 ${y+620}Q850 ${y+770} 530 ${y+630}Q200 ${y+770}-150 ${y+580}Z`} fill={i%2?"#5EEAD4":"#A5B4FC"}/>
      <path d={`M116 ${y-50}L180 ${y-200}L249 ${y-48}L208 ${y-76}L179 ${y-49}L151 ${y-81}ZM719 ${y+28}L780 ${y-100}L855 ${y+45}L799 ${y+11}L766 ${y+33}Z`} fill="#F0FDFA"/>
    </g>)}
    <path d={river} fill="none" stroke="#F0FDFA" strokeWidth="88"/>
    <path d={river} fill="none" stroke="url(#bridge-river)" strokeWidth="72"/>
    <motion.path d={river} fill="none" stroke="#FFFFFF" strokeWidth="5" strokeDasharray="20 70" opacity=".6" animate={reduced?{}:{strokeDashoffset:[0,180]}} transition={{duration:6,repeat:Infinity,ease:"linear"}}/>
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={road} stroke="#A3B9AA" strokeWidth="29"/>
      <path d={road} stroke="#FFF8E7" strokeWidth="24"/>
      {route.map(({approach,deck,open,repaired},i)=><g key={i}>
        {open && <path d={approach} stroke="#FBBF24" strokeWidth="10"/>}
        {repaired && <path d={deck} stroke="#FBBF24" strokeWidth="10"/>}
      </g>)}
    </g>
    {CROSSING_SPOTS.map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y})`}>
      <path d="M-65 0H65M-65 32H65" fill="none" stroke={completed.includes(i+1)?i>=10?"#A78BFA":i>=5?"#0D9488":"#D97706":"#94A3B8"} strokeWidth="3" strokeLinecap="round"/>
      <path d="M-65-5V4M65-5V4M-65 28V37M65 28V37" stroke={completed.includes(i+1)?"#8B5CF6":"#94A3B8"} strokeWidth="5" strokeLinecap="round"/>
    </g>)}
    {[2950,3200,3450,3690].map((y,i)=><g key={y} transform={`translate(${i%2?820:150} ${y})`}><path d="M0 30V-45" stroke="#16A34A" strokeWidth="10"/><path d="M-45-20Q-75-70-20-90Q25-140 52-78Q92-24 35-12Z" fill="#22C55E"/><path d="M-70 40l10-18m-10 18l-10-16" stroke="#10B981" strokeWidth="5"/><circle cx="-70" cy="20" r="8" fill="#FACC15"/></g>)}
    {[450,800,1130].map((y,i)=><g key={y} opacity=".9"><path d={`M-70 ${y}Q20 ${y-80} 80 ${y-30}Q150 ${y-115} 240 ${y-10}Q290 ${y+60} -70 ${y+50}Z`} fill="white"/><path d={`M750 ${y+120}Q800 ${y+30} 860 ${y+90}Q940 ${y} 1020 ${y+110}V${y+180}H760Z`} fill="white"/></g>)}
    <g transform="translate(500 220) scale(.78 .72)">
      <path d="M-180 0L-110 140L0 205L120 130L185 0Z" fill="#A78BFA"/><ellipse rx="190" ry="64" fill="#86EFAC" stroke="#F0FDF4" strokeWidth="9"/>
      <path d="M-110 0Q0-160 110 0" fill="none" stroke="#EC4899" strokeWidth="18"/><path d="M-94 0Q0-132 94 0" fill="none" stroke="#FBBF24" strokeWidth="12"/>
      <path d="M-35 15V-55Q0-95 35-55V15" fill="#FEF3C7" stroke="white" strokeWidth="7"/>
      {[-130,-70,70,130].map((x,i)=><g key={x}><path d={`M${x} 24v-28`} stroke="#16A34A" strokeWidth="5"/><circle cx={x} cy="-10" r="15" fill={i%2?"#F472B6":"#FBBF24"}/><circle cx={x} cy="-10" r="5" fill="white"/></g>)}
    </g>
    <g>
      <path d="M500 220C500 285 690 265 740 190S790 160 860 160" fill="none" stroke="#FFFFFF" strokeWidth="31"/>
      <path d="M500 220C500 285 690 265 740 190S790 160 860 160" fill="none" stroke={completed.length===15?"#FBBF24":"#CBD5E1"} strokeWidth="20"/>
      {completed.length===15 && <motion.path d="M500 220C500 285 690 265 740 190S790 160 860 160" fill="none" stroke="white" strokeWidth="4" strokeDasharray="4 24" animate={reduced?{}:{strokeDashoffset:[0,-112]}} transition={{duration:5,repeat:Infinity,ease:"linear"}}/>}
      <path d="M770 179Q750 150 790 142Q810 110 840 135Q880 113 910 143Q957 140 952 180Z" fill="white"/>
      <g transform="translate(855 158) scale(.8 1)" opacity={completed.length===15?1:.65}>
        <path d="M-82 0V-82H-45V-53H45V-82H82V0Z" fill="#C4B5FD" stroke="white" strokeWidth="4"/>
        <path d="M-90-82L-64-116L-37-82ZM37-82L64-116L90-82Z" fill="#8B5CF6"/>
        <path d="M-33-53V-111H-20V-98H-7V-111H7V-98H20V-111H33V-53Z" fill="#A78BFA" stroke="white" strokeWidth="3"/>
        <path d="M-19 0V-28Q0-55 19-28V0Z" fill={completed.length===15?"#FBBF24":"#94A3B8"} stroke="white" strokeWidth="3"/>
        <path d="M-67-60h8v18h-8ZM59-60h8v18h-8ZM-5-82h10v17H-5Z" fill="#FFFFFF"/>
        <path d="M0-111V-142L30-133L0-123" fill="#F472B6" stroke="#7C3AED" strokeWidth="3"/>
      </g>
    </g>
  </svg>;
}
