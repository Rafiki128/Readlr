import { motion, useReducedMotion } from "motion/react";
import { BridgeCrossingScene } from "./BridgeCrossingScene";
import type { BridgeMode } from "./bridgeCurriculum";

export function BridgeScene({ built = false, region = 0, workshop = false, mode = "join" }: { built?: boolean; region?: number; workshop?: boolean; mode?: BridgeMode }) {
  const reduced = useReducedMotion();
  if (workshop) return <svg className="bridge-scene" viewBox="0 0 900 310" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Milo's sound-building workbench">
    <path fill="#EDE9FE" d="M0 0H900V310H0Z" /><path d="M0 0L450 55L900 0" fill="#C4B5FD" />
    <path d="M140 20V160M760 20V160" stroke="#A78BFA" strokeWidth="12" />
    <path d="M200 35H320V130H200ZM590 35H710V130H590Z" fill="#BAE6FD" stroke="white" strokeWidth="10" />
    <path d="M260 35V130M200 82H320M650 35V130M590 82H710" stroke="white" strokeWidth="6" />
    <path d="M70 185H830L865 220H35Z" fill="#FBBF24" stroke="#FFF7ED" strokeWidth="6" />
    <path d="M70 220V310M830 220V310" stroke="#F59E0B" strokeWidth="28" />
    <path d="M365 180Q450 95 535 180" stroke="#8B5CF6" strokeWidth="10" fill="none" />
    {[365,400,435,470,505].map((x,i)=><motion.path key={x} d={`M${x} 177h28v18h-28Z`} fill={i%2 ? "#38BDF8" : "#EC4899"} initial={false} animate={{opacity:built?1:.2,y:built?0:-12}} transition={{duration:reduced?0:.4,delay:reduced?0:i*.1}} />)}
    <path d="M100 140h55v38h-55Z" fill="#10B981" /><path d="M725 140h55v38h-55Z" fill="#EC4899" />
  </svg>;
  return <BridgeCrossingScene built={built} region={region} mode={mode} />;
}
