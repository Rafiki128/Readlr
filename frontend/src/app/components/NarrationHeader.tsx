import type { ReactNode } from "react";
import { SkipForward } from "lucide-react";
import "./narrationHeader.css";

export function NarrationHeader({ icon, canSkip, onSkip }: { icon?: ReactNode; canSkip: boolean; onSkip?: () => void }) {
  return <div className="narration-header">
    <span className="narration-header__label">{icon}Milo says</span>
    <button type="button" className="narration-skip" data-available={canSkip}
      disabled={!canSkip} aria-hidden={!canSkip} tabIndex={canSkip ? 0 : -1}
      title="Skip the explanation. Recording will not start." onClick={onSkip}>
      <SkipForward size={16} aria-hidden="true"/><span>Skip explanation</span>
    </button>
  </div>;
}
