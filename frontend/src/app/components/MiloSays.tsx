import { useEffect, useRef, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";
import { microphoneOpen } from "../../hooks/backgroundMusic";
import "./miloSays.css";

// Gives up waiting after a minute so a stuck microphone never blocks the next instruction for good.
async function waitForMicrophone(cancelled: () => boolean) {
  for (let waited = 0; waited < 60000 && !cancelled() && microphoneOpen(); waited += 150) {
    await new Promise(resolve => setTimeout(resolve, 150));
  }
}

/** Reads an instruction aloud whenever it changes, for learners who can't read yet. Returns a replay function. */
export function useMiloInstruction(text: string | undefined, onFinished?: (text: string) => void) {
  const voice = useBridgeAudio("/audio/stage3", { instruction: true });
  const latest = useRef(text);
  latest.current = text;
  const finished = useRef(onFinished);
  finished.current = onFinished;
  const said = useRef(0);
  // Only the newest reading reports back, so a replay never ends the wait early.
  const say = () => {
    const spoken = latest.current;
    if (!spoken) return;
    const id = ++said.current;
    voice.stop();
    void voice.narrateText({ file: "", text: spoken }).catch(() => {}).then(() => { if (id === said.current) finished.current?.(spoken); });
  };
  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    void waitForMicrophone(() => cancelled).then(() => { if (!cancelled) say(); });
    return () => { cancelled = true; voice.stop(); };
  }, [text]);
  return say;
}

export function HearMiloButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return <button type="button" className={`milo-says-replay ${className}`} aria-label="Hear Milo say this" title="Hear Milo say this" onClick={onClick}><Volume2 aria-hidden="true" /></button>;
}

/** An instruction line Milo reads aloud, with a button to hear it again. `speak` replaces the text when it reads poorly aloud. */
export function MiloSays({ text, speak, className, role, children }: { text: string; speak?: string; className?: string; role?: string; children?: ReactNode }) {
  const say = useMiloInstruction(speak ?? text);
  return <p className={className} role={role} aria-live="polite">{children ?? text}{text && <HearMiloButton onClick={say} />}</p>;
}
