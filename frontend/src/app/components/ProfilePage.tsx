import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Pencil, Check, X, Star, Trophy, Flame, Lock } from "lucide-react";
import { useAuth } from "../../modules/auth/auth.context";
import { useFrames } from "../hooks/useFrames";
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

interface ProfilePageProps {
  onBack: () => void;
  onAvatarUpdate: (avatar: string) => void;
  onNameUpdate: (name: string) => void;
}

interface LearnerProfile {
  id: number;
  name: string;
  avatar: string;
  grade: number;
}

interface StageProgress {
  stage_id: number;
  completed_levels: number;
  total_levels: number;
  completion_percentage: number;
}

interface ProgressSummary {
  stages: StageProgress[];
  overall_completion_percentage: number;
}

export function ProfilePage({ onBack, onAvatarUpdate, onNameUpdate }: ProfilePageProps) {
  const { user, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const { frames, equipFrame, equippedAssetKey } = useFrames();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation dialog state
  const [pendingName, setPendingName] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState("");
  const [showNameConfirm, setShowNameConfirm] = useState(false);
  const [showAvatarConfirm, setShowAvatarConfirm] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!token) return;
      try {
        const [profileRes, progressRes] = await Promise.all([
          fetch(`${API_URL}/learner/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/progress/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.learner);
          setEditedName(data.learner.name);
        } else {
          toast.error("Could not load your profile. Try refreshing!");
        }
        if (progressRes.ok) {
          const data = await progressRes.json();
          setProgress(data);
        } else {
          toast.error("Could not load your progress. Try refreshing!");
        }
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
        toast.error("Something went wrong loading your profile!");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const saveChanges = async (updates: { name?: string; avatar?: string }) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/learner/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.learner);
        if (updates.name) {
          onNameUpdate(data.learner.name);
          toast.success("Name updated!", {
            description: `Your name is now "${data.learner.name}" 🎉`,
          });
        }
        if (updates.avatar) {
          onAvatarUpdate(data.learner.avatar);
          toast.success("Avatar updated!", {
            description: `Looking good ${data.learner.avatar}`,
          });
        }
      } else {
        toast.error("Could not save. Try again!");
      }
    } catch {
      toast.error("Something went wrong!");
    } finally {
      setIsSaving(false);
    }
  };

  // Name flow: pencil → edit → checkmark → confirm dialog → save
  const handleSaveName = () => {
    if (!editedName.trim() || editedName.trim() === profile?.name) {
      setIsEditingName(false);
      return;
    }
    setPendingName(editedName.trim());
    setShowNameConfirm(true);
    setIsEditingName(false);
  };

  const handleConfirmName = () => {
    saveChanges({ name: pendingName });
    setShowNameConfirm(false);
  };

  const handleCancelName = () => {
    setEditedName(profile?.name || "");
    setShowNameConfirm(false);
  };

  // Avatar flow: pencil → picker → click emoji → confirm dialog → save
  const handlePickAvatar = (emoji: string) => {
    if (emoji === profile?.avatar) {
      setIsPickingAvatar(false);
      return;
    }
    setPendingAvatar(emoji);
    setIsPickingAvatar(false);
    setShowAvatarConfirm(true);
  };

  const handleConfirmAvatar = () => {
    saveChanges({ avatar: pendingAvatar });
    setShowAvatarConfirm(false);
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

  const totalCompleted = progress?.stages.reduce((sum, s) => sum + s.completed_levels, 0) ?? 0;
  const totalLevels = progress?.stages.reduce((sum, s) => sum + (s.total_levels ?? 0), 0) ?? 0;
  const overallPct = progress?.overall_completion_percentage ?? 0;

  if (isLoading) {
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

  const displayName = profile?.name || user?.name || "Friend";
  const displayAvatar = profile?.avatar || "🦊";
  const displayGrade = profile?.grade || 1;

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Back button */}
          <motion.button
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--ink-soft)] hover:text-[var(--ink)] mb-8 transition-colors bg-card border border-[var(--hairline)] rounded-full px-4 py-2 hover:bg-[var(--paper-deep)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </motion.button>

          <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">My Account</p>

          <motion.h1
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight mb-8"
          >
            My Profile
          </motion.h1>

          {/* Avatar + Name card */}
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-6 border border-[var(--hairline)] mb-4"
          >
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                <AvatarFrame assetKey={equippedAssetKey} size={80}>
                  <span className="text-4xl">{displayAvatar}</span>
                </AvatarFrame>
                <button
                  onClick={() => setIsPickingAvatar(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#4F46E5] rounded-full flex items-center justify-center shadow-sm hover:bg-[#4338CA] transition-colors"
                >
                  <Pencil className="w-3 h-3 text-white" />
                </button>
              </div>

              {/* Name */}
              <div className="flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setIsEditingName(false);
                          setEditedName(profile?.name || "");
                        }
                      }}
                      className="text-2xl text-[var(--ink)] bg-[var(--paper)] border border-[#4F46E5] rounded-lg px-3 py-1 outline-none w-full"
                      maxLength={30}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSaving}
                      className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center hover:bg-[#4338CA] transition-colors"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => { setIsEditingName(false); setEditedName(profile?.name || ""); }}
                      className="w-8 h-8 bg-card border border-[var(--hairline)] rounded-lg flex items-center justify-center hover:bg-[var(--paper)] transition-colors"
                    >
                      <X className="w-4 h-4 text-[var(--ink-soft)]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl text-[var(--ink)]">{displayName}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="w-7 h-7 bg-[var(--paper)] rounded-lg flex items-center justify-center hover:bg-[var(--paper-deep)] transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-[var(--ink-muted)]" />
                    </button>
                  </div>
                )}
                <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mt-1">
                  Grade {displayGrade} Learner
                </p>
              </div>
            </div>
          </motion.div>

          {/* Avatar picker */}
          {isPickingAvatar && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 border border-[#4F46E5]/30 mb-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--ink)]">Pick your avatar!</h3>
                <button
                  onClick={() => setIsPickingAvatar(false)}
                  className="w-7 h-7 bg-[var(--paper)] rounded-lg flex items-center justify-center hover:bg-[var(--paper-deep)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--ink-soft)]" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handlePickAvatar(emoji)}
                    className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center transition-all hover:scale-110 ${
                      displayAvatar === emoji
                        ? "bg-[var(--accent-soft)] ring-2 ring-[#4F46E5]"
                        : "bg-[var(--paper)] hover:bg-[var(--paper-deep)]"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Frame picker */}
              <div className="mt-5 pt-5 border-t border-[var(--hairline)]">
                <h3 className="text-[var(--ink)] mb-3">Pick a frame!</h3>
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
                        <AvatarFrame assetKey={frame.asset_key} size={48}>
                          <span className="text-lg">{displayAvatar}</span>
                        </AvatarFrame>
                        {frame.equipped && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4F46E5] rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {!frame.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-[var(--ink-soft)]" />
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
            </motion.div>
          )}

          {/* Account info */}
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border border-[var(--hairline)] mb-4"
          >
            <h3 className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-4">Account Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[var(--hairline)]">
                <span className="text-sm text-[var(--ink-soft)]">Email</span>
                <span className="text-sm text-[var(--ink)]">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--hairline)]">
                <span className="text-sm text-[var(--ink-soft)]">Role</span>
                <span className="text-sm text-[var(--ink)] capitalize">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--ink-soft)]">Grade</span>
                <span className="text-sm text-[var(--ink)]">Grade {displayGrade}</span>
              </div>
            </div>
          </motion.div>

          {/* Progress stats */}
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-6 border border-[var(--hairline)] mb-4"
          >
            <h3 className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-4">My Progress</h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[var(--tint-amber)] rounded-xl p-4 text-center">
                <Trophy className="w-6 h-6 text-[#F59E0B] mx-auto mb-2" />
                <p className="text-2xl text-[var(--ink)]">{totalCompleted}</p>
                <p className="text-xs text-[var(--ink-muted)] mt-1">Levels Done</p>
              </div>
              <div className="bg-[var(--accent-soft)] rounded-xl p-4 text-center">
                <Star className="w-6 h-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-2xl text-[var(--ink)]">{overallPct}%</p>
                <p className="text-xs text-[var(--ink-muted)] mt-1">Overall</p>
              </div>
              <div className="bg-[var(--tint-mint)] rounded-xl p-4 text-center">
                <Flame className="w-6 h-6 text-[#10B981] mx-auto mb-2" />
                <p className="text-2xl text-[var(--ink)]">{totalLevels}</p>
                <p className="text-xs text-[var(--ink-muted)] mt-1">Total Levels</p>
              </div>
            </div>
            {progress && progress.stages.length > 0 ? (
              <div className="space-y-3">
                {progress.stages.map((stage) => (
                  <div key={stage.stage_id}>
                    <div className="flex justify-between text-xs text-[var(--ink-soft)] mb-1">
                      <span>Stage {stage.stage_id}</span>
                      <span>{stage.completed_levels} / {stage.total_levels} levels</span>
                    </div>
                    <div className="h-2 bg-[var(--paper-deep)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.completion_percentage}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-[#4F46E5] rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)] text-center py-2">
                No progress yet — go complete some levels! 🚀
              </p>
            )}
          </motion.div>

        </div>
      </div>

      {/* Name confirmation dialog */}
      <AlertDialog open={showNameConfirm} onOpenChange={setShowNameConfirm}>
        <AlertDialogContent className="bg-card rounded-2xl border border-[var(--hairline)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink)] text-xl">
              Change your name? ✏️
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--ink-soft)]">
              Your name will change from{" "}
              <span className="font-medium text-[var(--ink)]">"{profile?.name}"</span>{" "}
              to{" "}
              <span className="font-medium text-[#4F46E5]">"{pendingName}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelName}
              className="rounded-xl border border-[var(--hairline)] text-[var(--ink-soft)] hover:bg-[var(--paper)]"
            >
              Keep old name
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmName}
              disabled={isSaving}
              className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white"
            >
              {isSaving ? "Saving..." : "Yes, change it!"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Avatar confirmation dialog */}
      <AlertDialog open={showAvatarConfirm} onOpenChange={setShowAvatarConfirm}>
        <AlertDialogContent className="bg-card rounded-2xl border border-[var(--hairline)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink)] text-xl">
              Change your avatar? 🎨
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[var(--ink-soft)]">
                <p className="mb-3">Switch your avatar from</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-14 h-14 bg-[var(--paper-deep)] rounded-full flex items-center justify-center text-3xl">
                    {displayAvatar}
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
              disabled={isSaving}
              className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white"
            >
              {isSaving ? "Saving..." : "Yes, switch it!"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}