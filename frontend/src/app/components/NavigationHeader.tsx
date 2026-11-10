import { motion } from "motion/react";
import { Home, Settings, HelpCircle, User, LogOut, Menu, X, FileText, TentTree, LockKeyhole, ChevronDown } from "lucide-react";
import { LandmarkArt } from "./AdventureArt";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GrownUpConfirm } from "./GrownUpConfirm";
import { useFrames } from "../hooks/useFrames";
import { AvatarFrame } from "./AvatarFrame";
import "./kidHeader.css";
import { readSeenRewards, rewardCounts, saveSeenRewards, type RewardKind } from "../../hooks/rewardCounts";
import { miloNod } from "../../hooks/miloReactions";
import type { LearnerCurriculumState } from "../../hooks/learnerCurriculumState";

interface NavigationHeaderProps {
  userName?: string;
  userAvatar?: string;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout?: () => void | Promise<void>;
  surveyAssigned?: boolean;
  learningCampEnabled?: boolean;
  featureAccess?:{progress:boolean;stickers:boolean;sounds:boolean;achievements:boolean};
  learnerId?: number | null;
  rewardState?: { state: LearnerCurriculumState; completedBooks: string[] };
}

// art is the same illustration the place uses elsewhere in the reading world.
interface KidPlace { id: string; label: string; art: string; color: string; unlocked: boolean; hint?: string; tour?: string }

export function NavigationHeader({
  userName,
  userAvatar,
  currentScreen,
  onNavigate,
  onLogout,
  surveyAssigned = false,
  learningCampEnabled = false,
  featureAccess={progress:true,stickers:true,sounds:true,achievements:true},
  learnerId,
  rewardState,
}: NavigationHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [lockedHint, setLockedHint] = useState("");
  const hintTimer = useRef<number | null>(null);
  const { equippedAssetKey } = useFrames();
  // Learners (grade 1-3) get big picture buttons; grown-up pages wait behind one "Grown-ups" button.
  const kidMode = learningCampEnabled;

  // New stickers and awards: a "New!" badge until the learner opens that page, and one flying reward per new count.
  const counts = rewardState ? rewardCounts(rewardState.state, rewardState.completedBooks) : null;
  const [seen, setSeen] = useState<{ stickers: number; awards: number } | null>(null);
  const [flying, setFlying] = useState<{ kind: RewardKind; x: number; y: number } | null>(null);
  const navButtons = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const flown = useRef<{ stickers: number; awards: number } | null>(null);
  useEffect(() => {
    if (!learnerId || !counts) return;
    // Rewards a learner already had before this feature are treated as seen.
    const stored = readSeenRewards(learnerId) ?? counts;
    const next = { stickers: currentScreen === "sticker-book" ? counts.stickers : Math.min(stored.stickers, counts.stickers), awards: currentScreen === "achievements" ? counts.awards : Math.min(stored.awards, counts.awards) };
    if (!readSeenRewards(learnerId) || next.stickers !== stored.stickers || next.awards !== stored.awards) saveSeenRewards(learnerId, next);
    setSeen(next);
  }, [learnerId, counts?.stickers, counts?.awards, currentScreen]);
  useEffect(() => {
    if (!learnerId || !counts || !seen) return;
    const key = `readlr_rewards_flown_v1_${learnerId}`;
    if (!flown.current) { try { flown.current = JSON.parse(sessionStorage.getItem(key) ?? "null") ?? seen; } catch { flown.current = seen; } }
    const kind: RewardKind | null = counts.stickers > flown.current!.stickers && counts.stickers > seen.stickers ? "stickers" : counts.awards > flown.current!.awards && counts.awards > seen.awards ? "awards" : null;
    flown.current = { stickers: Math.max(flown.current!.stickers, counts.stickers), awards: Math.max(flown.current!.awards, counts.awards) };
    try { sessionStorage.setItem(key, JSON.stringify(flown.current)); } catch { /* Only affects repeat animations. */ }
    if (!kind || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const target = navButtons.current[kind === "stickers" ? "sticker-book" : "achievements"]?.getBoundingClientRect();
    if (!target) return;
    setFlying({ kind, x: target.left + target.width / 2 - window.innerWidth / 2, y: target.top + target.height / 2 - window.innerHeight / 2 });
    const done = window.setTimeout(() => setFlying(null), 1500);
    return () => window.clearTimeout(done);
  }, [learnerId, counts?.stickers, counts?.awards, seen]);
  const isNew = (id: string) => !!counts && !!seen && (id === "sticker-book" ? counts.stickers > seen.stickers : id === "achievements" ? counts.awards > seen.awards : false);

  useEffect(() => () => { if (hintTimer.current !== null) window.clearTimeout(hintTimer.current); }, []);
  useEffect(() => { setMenuOpen(false); setLockedHint(""); }, [currentScreen]);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try { await onLogout?.(); } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
      setMenuOpen(false);
    }
  };

  const showHint = (text: string) => {
    setLockedHint(text);
    miloNod();
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setLockedHint(""), 3500);
  };

  // The ids are the app's screens; data-tour names match the first-visit world tour.
  const kidPlaces: KidPlace[] = [
    { id: "stage-selection", label: "Books", art: "storybook", color: "#3f78e0", unlocked: true },
    ...(learningCampEnabled ? [{ id: "learning-camp", label: "Camp", art: "camp", color: "#24976a", unlocked: true, tour: "Learning Camp" }] : []),
    { id: "phoneme-bank", label: "Sounds", art: "sound", color: "#8556d1", unlocked: featureAccess.sounds, hint: "Finish 3 stops in Book 1 to open Sounds.", tour: "Sound Library" },
    { id: "sticker-book", label: "Stickers", art: "stickers", color: "#e0538b", unlocked: featureAccess.stickers, hint: "Finish 3 stops in Book 1 to open Stickers.", tour: "Sticker Book" },
    { id: "dashboard", label: "Progress", art: "progress", color: "#d9861f", unlocked: featureAccess.progress, hint: "Finish Book 1 to open Progress.", tour: "My Progress" },
    { id: "achievements", label: "Awards", art: "crown", color: "#c29411", unlocked: featureAccess.achievements, hint: "Finish Book 1 to open Awards." },
  ];

  const grownUpItems = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help", icon: HelpCircle },
    ...(surveyAssigned ? [{ id: "survey", label: "Survey", icon: FileText }] : []),
  ];

  const menuItems = [
    { id: "stage-selection", label: "Home", icon: Home, unlocked:true },
    ...(learningCampEnabled ? [{ id: "learning-camp", label: "Camp", icon: TentTree, unlocked:true }] : []),
    { id: "dashboard", label: "Progress", icon: User, unlocked:featureAccess.progress },
    { id: "settings", label: "Settings", icon: Settings, unlocked:true },
    { id: "help", label: "Help", icon: HelpCircle, unlocked:true },
    ...(surveyAssigned ? [{id:'survey',label:'Survey',icon:FileText,unlocked:true}] : []),
  ];

  const avatar = (userName || userAvatar) && (
    <button onClick={() => onNavigate("profile")} className="hover:ring-2 hover:ring-[#4F46E5] rounded-full transition-all flex-shrink-0" title="My Profile" aria-label="My profile">
      <AvatarFrame assetKey={equippedAssetKey} size={40}>
        <span className="text-xl">{userAvatar}</span>
      </AvatarFrame>
    </button>
  );

  if (kidMode) {
    return (
      <>
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${currentScreen === "stage-selection" || currentScreen === "learning-camp" ? "world-navigation" : ""} kid-header bg-[var(--paper)]/90 backdrop-blur-md border-b border-[var(--hairline)] sticky top-0 z-50`}
        >
          <div className="kid-header-row">
            <button className="kid-logo" onClick={() => onNavigate("stage-selection")} aria-label="Readlr home">
              <img src="/readlr-mark.svg" alt="" className="w-10 h-10 rounded-lg" />
              <span className="kid-logo-text">Readlr</span>
            </button>

            <nav className="kid-nav" aria-label="Places to visit">
              {kidPlaces.map(place => {
                const active = currentScreen === place.id;
                const fresh = place.unlocked && isNew(place.id);
                return (
                  <button
                    key={place.id}
                    ref={element => { navButtons.current[place.id] = element; }}
                    data-tour={place.tour}
                    aria-current={active ? "page" : undefined}
                    aria-label={place.unlocked ? `${place.label}${fresh ? ", something new" : ""}` : `${place.label}, locked. ${place.hint ?? ""}`}
                    className={`kid-nav-item ${active ? "is-active" : ""} ${place.unlocked ? "" : "is-locked"}`}
                    style={{ "--place-color": place.color } as CSSProperties}
                    onClick={() => place.unlocked ? onNavigate(place.id) : showHint(place.hint ?? "This opens soon.")}
                  >
                    <span className="kid-nav-art" aria-hidden="true"><LandmarkArt kind={place.art} />{!place.unlocked && <LockKeyhole className="kid-nav-lock" />}</span>
                    <span className="kid-nav-label">{place.label}</span>
                    {fresh && <span className="kid-nav-new" aria-hidden="true">New!</span>}
                  </button>
                );
              })}
            </nav>

            <div className="kid-header-end">
              {avatar}
              <div className="relative">
                <button className="kid-grownups" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen(open => !open)}>
                  <Settings className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden lg:inline">Grown-ups</span>
                  <ChevronDown className="w-4 h-4 hidden lg:inline" aria-hidden="true" />
                  <span className="sr-only lg:hidden">Grown-ups menu</span>
                </button>
                {menuOpen && (
                  <>
                    <button className="fixed inset-0 z-[55] cursor-default" aria-label="Close grown-ups menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />
                    <div role="menu" className="kid-grownups-menu" onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false); }}>
                      {userName && <p className="kid-grownups-name">{userName}</p>}
                      {grownUpItems.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <button key={item.id} role="menuitem" autoFocus={i === 0} onClick={() => { setMenuOpen(false); onNavigate(item.id); }}>
                            <Icon className="w-5 h-5" aria-hidden="true" />{item.label}
                          </button>
                        );
                      })}
                      {onLogout && (
                        <button role="menuitem" className="is-logout" onClick={() => setLogoutOpen(true)}>
                          <LogOut className="w-5 h-5" aria-hidden="true" />Log out
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {lockedHint && (
            <div className="kid-locked-hint" role="status">
              <LockKeyhole className="w-5 h-5" aria-hidden="true" />{lockedHint}
            </div>
          )}
        </motion.header>

        {flying && (
          <span className="kid-reward-fly" aria-hidden="true" style={{ "--fly-x": `${flying.x}px`, "--fly-y": `${flying.y}px` } as CSSProperties}>
            <LandmarkArt kind={flying.kind === "stickers" ? "stickers" : "crown"} />
          </span>
        )}
        <GrownUpConfirm open={logoutOpen} question="Do you want to log out?" busy={loggingOut}
          onConfirm={() => void confirmLogout()} onCancel={() => setLogoutOpen(false)}/>
      </>
    );
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-[var(--paper)]/85 backdrop-blur-md border-b border-[var(--hairline)] sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo */}
            <motion.div
              whileHover={{ y: -1 }}
              onClick={() => onNavigate("stage-selection")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <img src="/readlr-mark.svg" alt="Readlr" className="w-9 h-9 rounded-lg" />
              <div className="hidden sm:block leading-tight">
                <h1 className="text-lg text-[var(--ink)]">Readlr</h1>
                <p className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Learn to Read</p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center mx-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => item.unlocked&&onNavigate(item.id)}
                    disabled={!item.unlocked}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      active
                        ? "bg-card text-[#4F46E5] border border-[var(--hairline)]"
                        : "text-[var(--ink-soft)] hover:bg-card hover:text-[var(--ink)]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {!item.unlocked&&<LockKeyhole className="w-3.5 h-3.5" aria-label="Locked"/>}
                  </button>
                );
              })}
            </nav>

            {/* User Profile */}
            {(userName || userAvatar) && (
              <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                <div className="text-right leading-tight">
                  <p className="text-sm text-[var(--ink)]">{userName || "Learner"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Grade 1</p>
                </div>
                {avatar}
                {onLogout && (
                  <button
                    onClick={() => setLogoutOpen(true)}
                    className="p-2 text-[var(--ink-muted)] hover:text-[#DC2626] hover:bg-card rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-[var(--ink)] hover:bg-card rounded-lg"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          className="fixed inset-0 z-40 bg-[var(--paper)] md:hidden"
        >
          <div className="p-6 space-y-2">
            {userName && (
              <div className="flex items-center gap-3 pb-6 mb-2 border-b border-[var(--hairline)]">
                <AvatarFrame assetKey={equippedAssetKey} size={56}>
                  <span className="text-2xl">{userAvatar}</span>
                </AvatarFrame>
                <div>
                  <p className="text-lg text-[var(--ink)]">{userName}</p>
                  <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Grade 1 Learner</p>
                </div>
              </div>
            )}

            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if(item.unlocked)onNavigate(item.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl flex items-center gap-3 text-left transition-colors ${
                    active
                      ? "bg-card border border-[var(--hairline)] text-[#4F46E5]"
                      : "text-[var(--ink-soft)] hover:bg-card"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {!item.unlocked&&<LockKeyhole className="w-4 h-4 ml-auto" aria-label="Locked"/>}
                </button>
              );
            })}

            {onLogout && (
              <button onClick={() => setLogoutOpen(true)} className="w-full px-4 py-3.5 rounded-xl flex items-center gap-3 text-left text-[#DC2626] hover:bg-card transition-colors">
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            )}
          </div>
        </motion.div>
      )}

      <GrownUpConfirm open={logoutOpen} question="Do you want to log out?" busy={loggingOut}
        onConfirm={() => void confirmLogout()} onCancel={() => setLogoutOpen(false)}/>
    </>
  );
}
