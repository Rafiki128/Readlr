import { motion } from "motion/react";
import { Home, Settings, HelpCircle, User, LogOut, Menu, X, FileText } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { useFrames } from "../hooks/useFrames";
import { AvatarFrame } from "./AvatarFrame";

interface NavigationHeaderProps {
  userName?: string;
  userAvatar?: string;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}

export function NavigationHeader({
  userName,
  userAvatar,
  currentScreen,
  onNavigate,
  onLogout,
}: NavigationHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { equippedAssetKey } = useFrames();

  const menuItems = [
    { id: "stage-selection", label: "Stages", icon: Home },
    { id: "dashboard", label: "Progress", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help", icon: HelpCircle },
  ];

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
                    onClick={() => onNavigate(item.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      active
                        ? "bg-card text-[#4F46E5] border border-[var(--hairline)]"
                        : "text-[var(--ink-soft)] hover:bg-card hover:text-[var(--ink)]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
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
                <button
                  onClick={() => onNavigate("profile")}
                  className="hover:ring-2 hover:ring-[#4F46E5] rounded-full transition-all"
                  title="My Profile"
                >
                  <AvatarFrame assetKey={equippedAssetKey} size={40}>
                    <span className="text-xl">{userAvatar}</span>
                  </AvatarFrame>
                </button>
                {onLogout && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-2 text-[var(--ink-muted)] hover:text-[#DC2626] hover:bg-card rounded-lg transition-colors"
                        title="Logout"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card rounded-2xl border border-[var(--hairline)]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[var(--ink)] text-xl">
                          Leaving so soon? 👋
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--ink-soft)]">
                          Are you sure you want to log out? Your progress is saved!
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border border-[var(--hairline)] text-[var(--ink-soft)] hover:bg-[var(--paper)]">
                          Stay
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onLogout}
                          className="rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        >
                          Yes, log out
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                    onNavigate(item.id);
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
                </button>
              );
            })}

            {onLogout && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full px-4 py-3.5 rounded-xl flex items-center gap-3 text-left text-[#DC2626] hover:bg-card transition-colors">
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card rounded-2xl border border-[var(--hairline)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[var(--ink)] text-xl">
                      Leaving so soon? 👋
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[var(--ink-soft)]">
                      Are you sure you want to log out? Your progress is saved!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl border border-[var(--hairline)] text-[var(--ink-soft)] hover:bg-[var(--paper)]">
                      Stay
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { onLogout(); setMenuOpen(false); }}
                      className="rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                    >
                      Yes, log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}
