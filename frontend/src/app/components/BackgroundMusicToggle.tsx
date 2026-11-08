import { useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { backgroundMusicEnabled, setBackgroundMusicEnabled } from "../../hooks/backgroundMusic";

export function BackgroundMusicToggle() {
  const [on, setOn] = useState(backgroundMusicEnabled);
  const label = on ? "Turn music off" : "Turn music on";
  return <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-violet-300 bg-white text-violet-700 shadow-md hover:bg-violet-50" title={label} aria-label={label} aria-pressed={on} onClick={() => { setBackgroundMusicEnabled(!on); setOn(!on); }}>{on ? <Music size={20}/> : <VolumeX size={20}/>}</button>;
}
