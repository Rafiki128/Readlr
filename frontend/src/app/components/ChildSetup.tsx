import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Volume2 } from "lucide-react";
import { ReadingWorldBackdrop } from "./ReadingWorldBackdrop";
import { CharacterCompanion } from "./CharacterCompanion";
import { GrownUpConfirm } from "./GrownUpConfirm";
import { useBridgeAudio } from "../../hooks/useBridgeAudio";

// Starter avatars that every new learner may wear (matches the free rewards on the server).
const STARTER_AVATARS = [
  { emoji: "🦊", name: "Fox" }, { emoji: "🐻", name: "Bear" },
  { emoji: "🐼", name: "Panda" }, { emoji: "🐨", name: "Koala" },
];
const MAX_NICKNAME = 20;
const MILO_LINE = "Pick a name and an animal friend.";

interface ChildSetupProps {
  token: string;
  onDone: (learner: { id: number; name: string; avatar: string }) => void;
  onLogout: () => Promise<void>;
}

// One-time setup after a guardian registers: nickname and starter avatar for the child.
export function ChildSetup({ token, onDone, onLogout }: ChildSetupProps) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const reduced = useReducedMotion();
  const audio = useBridgeAudio();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const trimmed = nickname.trim();

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmed || !avatar) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/learner/profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, avatar }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "We could not save this yet. Please try again.");
      audio.stop();
      onDone(data.learner);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not save this yet. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="world-welcome-screen reading-world-welcome welcome-story-entry">
      <ReadingWorldBackdrop welcome/>
      <motion.form
        onSubmit={save}
        initial={reduced ? false : { y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="welcome-invitation w-full"
      >
        <div className="welcome-brand"><img src="/readlr_logo_mark.svg" alt=""/><span className="readlr-wordmark">Readlr</span><small>THE READING CHRONICLES</small></div>
        {/* Inner column keeps every control inside the card's gold side lines. */}
        <div className="mx-auto w-full max-w-md px-8">
        <div className="flex items-center justify-center gap-3">
          <div><CharacterCompanion state={audio.isPlaying ? "speaking" : "encouraging"} gesture="wave" size={120}/></div>
          <button type="button" aria-label="Listen to Milo" title="Listen to Milo"
            onClick={() => { audio.stop(); void audio.narrateText({ file: "", text: MILO_LINE }).catch(() => {}); }}
            className="min-h-12 min-w-12 rounded-xl flex items-center justify-center bg-[var(--paper)] text-[#4F46E5]">
            <Volume2 className="w-6 h-6"/>
          </button>
        </div>
        <h1>{MILO_LINE}</h1>

        <label htmlFor="child-nickname" className="block text-left text-[var(--ink)] font-medium text-sm mt-6 mb-2">Child's nickname</label>
        <input
          id="child-nickname"
          value={nickname}
          maxLength={MAX_NICKNAME}
          autoComplete="off"
          onChange={(e) => setNickname(e.target.value)}
          aria-describedby="child-nickname-hint"
          className="w-full min-h-12 px-4 py-3 border-2 border-[var(--gray-soft)] rounded-lg focus:outline-none focus:border-[#4F46E5] transition-colors bg-card text-[var(--ink)]"
          disabled={saving}
        />
        <span id="child-nickname-hint" className="block text-left text-xs text-[var(--ink-soft)] mt-2">Use a nickname, not your child's full name. Up to {MAX_NICKNAME} letters.</span>

        <fieldset className="mt-6">
          <legend className="block text-left text-[var(--ink)] font-medium text-sm mb-2">Animal friend</legend>
          <div className="grid grid-cols-4 gap-3">
            {STARTER_AVATARS.map(({ emoji, name }) => (
              <button
                key={emoji}
                type="button"
                aria-label={name}
                aria-pressed={avatar === emoji}
                onClick={() => setAvatar(emoji)}
                disabled={saving}
                className={`h-16 min-w-12 rounded-xl text-4xl flex items-center justify-center transition-all ${
                  avatar === emoji ? "bg-[var(--accent-soft)] ring-2 ring-[#4F46E5]" : "bg-[var(--paper)] hover:bg-[var(--paper-deep)]"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </fieldset>

        {message && <span role="status" className="block text-sm text-[var(--ink-soft)] mt-4">{message}</span>}

        <button type="submit" disabled={saving || !trimmed || !avatar} className="world-primary mt-6">
          {saving ? "Saving..." : "Start reading"} <ArrowRight className="w-5 h-5"/>
        </button>
        <button type="button" onClick={() => setLogoutOpen(true)} className="block mx-auto mt-4 min-h-12 text-sm underline text-[var(--ink-soft)]">Sign out</button>
        </div>
      </motion.form>

      <GrownUpConfirm open={logoutOpen} question="Do you want to log out?" busy={loggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLoggingOut(true); void onLogout().finally(() => { setLoggingOut(false); setLogoutOpen(false); }); }}/>
    </div>
  );
}
