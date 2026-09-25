import { motion, AnimatePresence } from "motion/react";
import { Volume2, Bell, Moon, Globe, User, Shield, ChevronRight, X, Lock, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../modules/auth/auth.context";
import { useFrames } from "../hooks/useFrames";
import { updateLearningSettings } from "../../hooks/learningSettings";
import { applyDarkMode } from "../hooks/useDarkMode";
import { AvatarFrame } from "./AvatarFrame";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

const AVATAR_OPTIONS = [
  "🦊", "🐻", "🐼", "🐨", "🦁", "🐯",
  "🐸", "🐧", "🦋", "🐝", "🦄", "🐙",
  "🐳", "🦕", "🐢", "🐬",
];

interface SettingsProps {
  onNavigate?: (screen: string) => void;
  onAvatarUpdate?: (avatar: string) => void;
}

interface SettingsPayload {
  sound_volume: number;
  voice_feedback: boolean;
  daily_reminders: boolean;
  achievement_alerts: boolean;
  dark_mode: boolean;
  language: string;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-[#4F46E5]" : "bg-[var(--track)]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export function Settings({ onNavigate, onAvatarUpdate }: SettingsProps) {
  const { token, logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const { frames, equipFrame, equippedAssetKey } = useFrames();

  const [volume, setVolume] = useState(80);
  const [voiceFeedback, setVoiceFeedback] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [achievementAlerts, setAchievementAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("Filipino");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState("🦊");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState("");
  const [showAvatarConfirm, setShowAvatarConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const volumeSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) {
        setIsLoadingSettings(false);
        return;
      }
      try {
        const [settingsRes, learnerRes] = await Promise.all([
          fetch(`${API_URL}/settings/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/learner/me`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          updateLearningSettings(data.settings);
          setVolume(data.settings.sound_volume);
          setVoiceFeedback(data.settings.voice_feedback);
          setNotifications(data.settings.daily_reminders);
          setAchievementAlerts(data.settings.achievement_alerts);
          setDarkMode(data.settings.dark_mode);
          setLanguage(data.settings.language);
        }
        if (learnerRes.ok) {
          const data = await learnerRes.json();
          setCurrentAvatar(data.learner.avatar);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [token]);

  const saveSettings = async (updates: Partial<SettingsPayload>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/settings/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (response.ok) updateLearningSettings(updates);
      return response.ok;
    } catch {
      return false;
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (volumeSaveTimeout.current) clearTimeout(volumeSaveTimeout.current);
    volumeSaveTimeout.current = setTimeout(async () => {
      const ok = await saveSettings({ sound_volume: value });
      if (ok) {
        toast.success("Volume updated!", { description: `Set to ${value}%` });
      } else {
        toast.error("Could not save. Try again!");
      }
    }, 500);
  };

  const handleToggleSetting = async (
    key: keyof SettingsPayload,
    value: boolean,
    setter: (v: boolean) => void,
    label: string
  ) => {
    setter(value);
    const ok = await saveSettings({ [key]: value } as Partial<SettingsPayload>);
    if (ok) {
      toast.success(`${label} ${value ? "on" : "off"}`);
    } else {
      setter(!value);
      toast.error("Could not save. Try again!");
    }
  };

  const handleLanguageChange = async (value: string) => {
    const previous = language;
    setLanguage(value);
    const ok = await saveSettings({ language: value });
    if (ok) {
      toast.success("Language updated!", { description: value });
    } else {
      setLanguage(previous);
      toast.error("Could not save. Try again!");
    }
  };

  const handleConfirmDeleteData = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Account deleted", {
          description: "Your data has been removed.",
        });
        logout();
      } else {
        toast.error("Could not delete your data. Try again!");
      }
    } catch {
      toast.error("Something went wrong!");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePickAvatar = (emoji: string) => {
    if (emoji === currentAvatar) {
      setShowAvatarPicker(false);
      return;
    }
    setPendingAvatar(emoji);
    setShowAvatarPicker(false);
    setShowAvatarConfirm(true);
  };

  const handleConfirmAvatar = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/learner/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: pendingAvatar }),
      });
      if (response.ok) {
        setCurrentAvatar(pendingAvatar);
        onAvatarUpdate?.(pendingAvatar);
        toast.success("Avatar updated!", {
          description: `Looking good ${pendingAvatar}`,
        });
      } else {
        toast.error("Could not save. Try again!");
      }
    } catch {
      toast.error("Something went wrong!");
    } finally {
      setIsSaving(false);
      setShowAvatarConfirm(false);
    }
  };

  const handleCancelAvatar = () => {
    setPendingAvatar("");
    setShowAvatarConfirm(false);
  };

  const handleSelectFrame = async (frameId: number, name: string) => {
    const ok = await equipFrame(frameId);
    if (ok) {
      toast.success("Frame equipped!", { description: `Wearing "${name}" now` });
    } else {
      toast.error("Could not equip that frame. Try again!");
    }
  };

  const sections: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: typeof Volume2;
    tint: string;
    color: string;
  }> = [
    { id: "audio", title: "Audio", subtitle: "Sound and voice", icon: Volume2, tint: "#EEF2FF", color: "#4F46E5" },
    { id: "notif", title: "Notifications", subtitle: "Reminders and alerts", icon: Bell, tint: "#FCE7F3", color: "#DB2777" },
    { id: "appearance", title: "Appearance", subtitle: "Visual preferences", icon: Moon, tint: "#E0E7FF", color: "#4338CA" },
    { id: "language", title: "Language", subtitle: "Interface language", icon: Globe, tint: "#D1FAE5", color: "#10B981" },
    { id: "account", title: "Account", subtitle: "Profile settings", icon: User, tint: "#FFF7ED", color: "#F59E0B" },
    { id: "privacy", title: "Privacy & Safety", subtitle: "Data and security", icon: Shield, tint: "#F2EEE6", color: "#4B5266" },
  ];

  const SectionHeader = ({ id }: { id: string }) => {
    const s = sections.find((x) => x.id === id)!;
    const Icon = s.icon;
    return (
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.tint }}>
          <Icon className="w-5 h-5" style={{ color: s.color }} />
        </div>
        <div className="leading-tight">
          <h2 className="text-lg text-[var(--ink)]">{s.title}</h2>
          <p className="text-xs text-[var(--ink-muted)]">{s.subtitle}</p>
        </div>
      </div>
    );
  };

  const Row = ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[var(--ink)]">{title}</p>
        {description && <p className="text-xs text-[var(--ink-muted)] mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  if (isLoadingSettings) {
    return (
      <div className="size-full bg-[var(--paper)] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="text-5xl"
        >
          🦊
        </motion.div>
      </div>
    );
  }

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-center mb-8">
            <span className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Settings</span>
          </div>

          {/* Title */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Preferences</p>
            <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">Settings</h1>
            <p className="text-[var(--ink-soft)] mt-2">Customize your learning experience.</p>
          </motion.div>

          <div className="space-y-4">
            {/* Audio */}
            <motion.section
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-card rounded-2xl p-6 border border-[var(--hairline)]"
            >
              <SectionHeader id="audio" />
              <div className="divide-y divide-[var(--hairline)]">
                <div className="py-3.5">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-[var(--ink)]">Volume</p>
                    <span className="text-sm text-[#4F46E5]">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-[var(--paper-deep)] rounded-full appearance-none cursor-pointer accent-[#4F46E5]"
                  />
                </div>
                <Row title="Voice feedback" description="Play audio for correct answers">
                  <Toggle
                    checked={voiceFeedback}
                    onChange={(v) => handleToggleSetting("voice_feedback", v, setVoiceFeedback, "Voice feedback")}
                  />
                </Row>
              </div>
            </motion.section>

            {/* Notifications */}
            <motion.section
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-6 border border-[var(--hairline)]"
            >
              <SectionHeader id="notif" />
              <div className="divide-y divide-[var(--hairline)]">
                <Row title="Daily reminders" description="A reminder when you open Readlr, once a day">
                  <Toggle
                    checked={notifications}
                    onChange={(v) => handleToggleSetting("daily_reminders", v, setNotifications, "Daily reminders")}
                  />
                </Row>
                <Row title="Achievement alerts" description="Celebrate your wins">
                  <Toggle
                    checked={achievementAlerts}
                    onChange={(v) => handleToggleSetting("achievement_alerts", v, setAchievementAlerts, "Achievement alerts")}
                  />
                </Row>
              </div>
            </motion.section>

            {/* Appearance */}
            <motion.section
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-6 border border-[var(--hairline)]"
            >
              <SectionHeader id="appearance" />
              <div className="divide-y divide-[var(--hairline)]">
                <Row title="Dark mode" description="Reduce eye strain">
                  <Toggle
                    checked={darkMode}
                    onChange={(v) =>
                      handleToggleSetting("dark_mode", v, (x) => { setDarkMode(x); applyDarkMode(x); }, "Dark mode")
                    }
                  />
                </Row>
              </div>
            </motion.section>

            {/* Language */}
            <motion.section
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-6 border border-[var(--hairline)]"
            >
              <SectionHeader id="language" />
              <select
                value="English"
                disabled
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--hairline)] rounded-xl text-[var(--ink)] focus:border-[#4F46E5] focus:outline-none focus:ring-4 focus:ring-[var(--accent-soft)] transition-all"
              >
                <option value="English">English</option>
              </select>
              <p className="text-sm text-[var(--ink-muted)] mt-2">Lessons and recordings are currently available in English.</p>
            </motion.section>

            {/* Account */}
            <motion.section
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl p-6 border border-[var(--hairline)]"
            >
              <SectionHeader id="account" />
              <div className="divide-y divide-[var(--hairline)]">
                {/* Edit profile — navigates to profile page */}
                <button
                  onClick={() => onNavigate?.("profile")}
                  className="w-full py-3.5 flex items-center justify-between text-left text-[var(--ink)] hover:text-[#4F46E5] transition-colors"
                >
                  <span>Edit profile</span>
                  <ChevronRight className="w-4 h-4 text-[var(--ink-muted)]" />
                </button>

                {/* Change avatar — opens popup */}
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="w-full py-3.5 flex items-center justify-between text-left text-[var(--ink)] hover:text-[#4F46E5] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span>Change avatar</span>
                    <AvatarFrame assetKey={equippedAssetKey} size={32}>
                      <span className="text-lg">{currentAvatar}</span>
                    </AvatarFrame>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--ink-muted)]" />
                </button>
              </div>
            </motion.section>

            {/* Privacy */}
            <motion.section
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl p-6 border border-[var(--hairline)]"
            >
              <SectionHeader id="privacy" />
              <div className="divide-y divide-[var(--hairline)]">
                <button className="w-full py-3.5 flex items-center justify-between text-left text-[var(--ink)] hover:text-[#4F46E5] transition-colors">
                  <span>Privacy policy</span>
                  <ChevronRight className="w-4 h-4 text-[var(--ink-muted)]" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3.5 flex items-center justify-between text-left text-[#DC2626] hover:opacity-80 transition-opacity"
                >
                  <span>Delete my data</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.section>
          </div>

          <p className="mt-8 text-center text-xs text-[var(--ink-muted)]">
            Readlr v1.0.0 · Team 2526-sem2-it332-27
          </p>
        </div>
      </div>

      {/* Avatar picker popup */}
      <AnimatePresence>
        {showAvatarPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="fixed inset-0 bg-black/30 z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card rounded-2xl p-6 border border-[var(--hairline)] w-full max-w-sm shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg text-[var(--ink)]">Pick your avatar!</h3>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">Choose your favourite character</p>
                  </div>
                  <button
                    onClick={() => setShowAvatarPicker(false)}
                    className="w-8 h-8 bg-[var(--paper)] rounded-lg flex items-center justify-center hover:bg-[var(--paper-deep)] transition-colors"
                  >
                    <X className="w-4 h-4 text-[var(--ink-soft)]" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handlePickAvatar(emoji)}
                      disabled={isSaving}
                      className={`h-14 rounded-xl text-3xl flex items-center justify-center transition-all hover:scale-110 ${
                        currentAvatar === emoji
                          ? "bg-[var(--accent-soft)] ring-2 ring-[#4F46E5]"
                          : "bg-[var(--paper)] hover:bg-[var(--paper-deep)]"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {isSaving && (
                  <p className="text-xs text-center text-[var(--ink-muted)] mt-4">Saving...</p>
                )}

                {/* Frame picker */}
                <div className="mt-5 pt-5 border-t border-[var(--hairline)]">
                  <h3 className="text-sm text-[var(--ink)] mb-3">Pick a frame!</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {frames.map((frame) => (
                      <button
                        key={frame.id}
                        onClick={() => frame.unlocked && handleSelectFrame(frame.id, frame.name)}
                        disabled={!frame.unlocked}
                        title={
                          frame.unlocked
                            ? frame.name
                            : `${frame.name} — finish ${frame.unlock_stage_title ?? `Stage ${frame.unlock_stage_number}`} to unlock`
                        }
                        className={`flex flex-col items-center gap-1 ${frame.unlocked ? "cursor-pointer" : "cursor-not-allowed"}`}
                      >
                        <div className={`relative ${frame.unlocked ? "" : "opacity-40 grayscale"}`}>
                          <AvatarFrame assetKey={frame.asset_key} size={44}>
                            <span className="text-base">{currentAvatar}</span>
                          </AvatarFrame>
                          {frame.equipped && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4F46E5] rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          {!frame.unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Lock className="w-3.5 h-3.5 text-[var(--ink-soft)]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--ink-muted)] text-center leading-tight">
                          {frame.unlocked ? frame.name : `Stage ${frame.unlock_stage_number}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Avatar confirmation dialog */}
      <AlertDialog open={showAvatarConfirm} onOpenChange={setShowAvatarConfirm}>
        <AlertDialogContent className="bg-card rounded-2xl border border-[var(--hairline)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink)] text-xl">
              Change your avatar? 🎨
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[var(--ink-soft)]">
                <p className="mb-3">Switch your avatar to this one?</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-14 h-14 bg-[var(--paper-deep)] rounded-full flex items-center justify-center text-3xl">
                    {currentAvatar}
                  </div>
                  <span className="text-[var(--ink-muted)]">→</span>
                  <div className="w-14 h-14 bg-[var(--accent-soft)] rounded-full flex items-center justify-center text-3xl ring-2 ring-[#4F46E5]">
                    {pendingAvatar}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelAvatar}
              className="rounded-xl border border-[var(--hairline)] text-[var(--ink-soft)] hover:bg-[var(--paper)]"
            >
              Keep old one
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAvatar}
              className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white"
            >
              Yes, switch it!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete data confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card rounded-2xl border border-[var(--hairline)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink)] text-xl">
              Delete your data?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--ink-soft)]">
              This permanently deletes your account, progress, and settings. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl border border-[var(--hairline)] text-[var(--ink-soft)] hover:bg-[var(--paper)]"
            >
              Keep my data
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteData}
              disabled={isDeleting}
              className="rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {isDeleting ? "Deleting..." : "Yes, delete it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
