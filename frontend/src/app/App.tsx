import { useState, useEffect, useRef } from "react";
import { TrailRewardDialog } from "./components/TrailRewardDialog";
import { StageCompleteDialog, type UnlockedFrame } from "./components/StageCompleteDialog";
import { getTrailReward, type TrailReward } from "./components/trailRewards";
import { newStickerReward, type StickerReward } from "./components/stickers";
import { motion } from "motion/react";
import { AuthProvider, useAuth, AuthScreen } from "../modules/auth/index";
import { NavigationHeader } from "./components/NavigationHeader";
import { Landing } from "./components/Landing";
import { LearnerProfile } from "./components/LearnerProfile";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { StageSelection } from "./components/StageSelection";
import { GameLevel } from "./components/GameLevel";
import { StoryScene } from "./components/StoryScene";
import { bridgeStorageKey, furtherBridgeJourney, readBridgeJourney } from "./components/stageTwoContent";
import { cvcStorageKey, furtherCvcJourney, readCvcJourney } from "./components/cvcContent";
import { ChapterBridge } from "./components/ChapterBridge";
import { LevelMap } from "./components/LevelMap";
import { StickerBook } from "./components/StickerBook";
import { UnifiedDashboard } from "./components/UnifiedDashboard";
import { VowelPowerComplete } from "./components/VowelPowerComplete";
import { PhonemeBank } from "./components/PhonemeBank";
import { Settings } from "./components/Settings";
import { Achievements } from "./components/Achievements";
import { Help } from "./components/Help";
import { ProfilePage } from "./components/ProfilePage";
import { useDarkMode } from "./hooks/useDarkMode";
import { AdminDashboard } from "./components/AdminDashboard";

// Stage configuration for determining progress
const STAGE_CONFIG: Record<number, { title: string; totalLevels: number; nextStageId?: number }> = {
  1: { title: "Valley of Vowels", totalLevels: 20, nextStageId: 2 },
  2: { title: "Blending Bridges", totalLevels: 20, nextStageId: 3 },
  3: { title: "CVC Kingdom", totalLevels: 20 },
};

const DEFAULT_PROGRESS: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

function getProgressStorageKey(userId?: number): string | null {
  return userId ? `readlr_progress_user_${userId}` : null;
}

function readProgressFromStorage(userId?: number): Record<number, number> {
  const storageKey = getProgressStorageKey(userId);
  if (!storageKey) return { ...DEFAULT_PROGRESS };

  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? { ...DEFAULT_PROGRESS, ...JSON.parse(saved) } : { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function saveProgressToStorage(userId: number | undefined, progress: Record<number, number>) {
  const storageKey = getProgressStorageKey(userId);
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify(progress));
}

// Vowel mapping for stage 1 (levels 1-5 correspond to A, E, I, O, U)
const VOWEL_MAP: Record<number, { vowel: string; name: string }> = {
  1: { vowel: "A", name: "Apple" },
  2: { vowel: "E", name: "Egg" },
  3: { vowel: "I", name: "Igloo" },
  4: { vowel: "O", name: "Octopus" },
  5: { vowel: "U", name: "Umbrella" },
  6: { vowel: "A", name: "Apple" },
  7: { vowel: "A", name: "Ant" },
  8: { vowel: "A", name: "Axe" },
  9: { vowel: "A", name: "Alligator" },
  10: { vowel: "A", name: "Astronaut" },
  11: { vowel: "A", name: "Anchor" },
  12: { vowel: "A", name: "Arrow" },
  13: { vowel: "A", name: "Acorn" },
  14: { vowel: "A", name: "Apron" },
  15: { vowel: "A", name: "Album" },
  16: { vowel: "E", name: "Egg" },
  17: { vowel: "E", name: "Elephant" },
  18: { vowel: "E", name: "Elbow" },
  19: { vowel: "E", name: "Engine" },
  20: { vowel: "E", name: "Envelope" },
  21: { vowel: "E", name: "Exit" },
  22: { vowel: "E", name: "Echo" },
  23: { vowel: "E", name: "Emerald" },
  24: { vowel: "E", name: "Eskimo" },
  25: { vowel: "E", name: "Exercise" },
  26: { vowel: "I", name: "Igloo" },
  27: { vowel: "I", name: "Insect" },
  28: { vowel: "I", name: "Ink" },
  29: { vowel: "I", name: "Island" },
  30: { vowel: "I", name: "Invitation" },
  31: { vowel: "I", name: "Iguana" },
  32: { vowel: "I", name: "Idea" },
  33: { vowel: "I", name: "Ice" },
  34: { vowel: "I", name: "Iron" },
  35: { vowel: "I", name: "Inside" },
  36: { vowel: "O", name: "Octopus" },
  37: { vowel: "O", name: "Orange" },
  38: { vowel: "O", name: "Ostrich" },
  39: { vowel: "O", name: "Otter" },
  40: { vowel: "O", name: "Owl" },
  41: { vowel: "O", name: "Ocean" },
  42: { vowel: "O", name: "Olive" },
  43: { vowel: "O", name: "Oven" },
  44: { vowel: "O", name: "Office" },
  45: { vowel: "O", name: "Orbit" },
  46: { vowel: "U", name: "Umbrella" },
  47: { vowel: "U", name: "Unicorn" },
  48: { vowel: "U", name: "Up" },
  49: { vowel: "U", name: "Under" },
  50: { vowel: "U", name: "Uniform" },
  51: { vowel: "U", name: "Ukulele" },
  52: { vowel: "U", name: "Uncle" },
  53: { vowel: "U", name: "Utensil" },
  54: { vowel: "U", name: "Urn" },
  55: { vowel: "U", name: "Us" },
};

// Blending mapping for stage 2
const BLENDING_MAP: Record<number, { consonant: string; vowel: string; name: string }> = {
  1: { consonant: "M", vowel: "A", name: "MA" },
  2: { consonant: "B", vowel: "A", name: "BA" },
  3: { consonant: "T", vowel: "A", name: "TA" },
  4: { consonant: "S", vowel: "A", name: "SA" },
  5: { consonant: "L", vowel: "A", name: "LA" },
  6: { consonant: "P", vowel: "A", name: "PA" },
  7: { consonant: "N", vowel: "A", name: "NA" },
  8: { consonant: "D", vowel: "A", name: "DA" },
};

// CVC Word mapping for stage 3
const CVC_MAP: Record<number, { word: string }> = {
  1: { word: "CAT" },
  2: { word: "MAN" },
  3: { word: "HAT" },
  4: { word: "PIG" },
  5: { word: "DOG" },
  6: { word: "SUN" },
  7: { word: "BED" },
  8: { word: "CUP" },
  9: { word: "BUS" },
  10: { word: "TOP" },
};



type Screen =
  | "landing"
  | "auth"
  | "learner-profile"
  | "welcome"
  | "stage-selection"
  | "story-scene"
  | "chapter-bridge"
  | "level-map"
  | "game"
  | "vowel-power-complete"
  | "sticker-book"
  | "dashboard"
  | "phoneme-bank"
  | "settings"
  | "achievements"
  | "help"
  | "profile"
  | "admin-learners";

interface AppRouteState {
  screen: Screen;
  authMode?: "login" | "register";
  stageId?: number;
  levelId?: number;
}

const DEFAULT_ROUTE: AppRouteState = { screen: "landing" };

function parseAppPath(pathname: string): AppRouteState {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return DEFAULT_ROUTE;
  if (path === "/login") return { screen: "auth", authMode: "login" };
  if (path === "/register") return { screen: "auth", authMode: "register" };
  if (path === "/profile/setup") return { screen: "learner-profile" };
  if (path === "/welcome") return { screen: "welcome" };
  if (path === "/home") return { screen: "stage-selection" };
  if (path === "/stickers") return { screen: "sticker-book" };
  if (path === "/progress") return { screen: "dashboard" };
  if (path === "/sounds") return { screen: "phoneme-bank" };
  if (path === "/settings") return { screen: "settings" };
  if (path === "/achievements") return { screen: "achievements" };
  if (path === "/help") return { screen: "help" };
  if (path === "/profile") return { screen: "profile" };
  if (path === "/admin/learners") return { screen: "admin-learners" };

  const stageMatch = path.match(/^\/stage-(\d+)(?:\/(chapters|chapter-(\d+)(?:\/(intro|complete|power-complete|summary|level-complete))?))?$/);
  if (stageMatch) {
    const stageId = Number(stageMatch[1]);
    const stageSection = stageMatch[2];
    const levelId = stageMatch[3] ? Number(stageMatch[3]) : 1;
    const chapterSection = stageMatch[4];

    if (!stageSection) return { screen: "story-scene", stageId, levelId: 1 };
    // The bridge and word-magic journeys own their activities; old chapter links open their maps.
    if (stageId !== 1) return { screen: "level-map", stageId, levelId: 1 };
    if (stageSection === "chapters") return { screen: "level-map", stageId, levelId: 1 };
    if (chapterSection === "intro") return { screen: "chapter-bridge", stageId, levelId };
    if (chapterSection === "power-complete") return { screen: "vowel-power-complete", stageId, levelId };
    // The old celebration and summary screens were removed; their links open the map.
    if (chapterSection) return { screen: "level-map", stageId, levelId: 1 };

    return { screen: "game", stageId, levelId };
  }

  return DEFAULT_ROUTE;
}

function buildAppPath(screen: Screen, stageId: number, levelId: number, authMode: "login" | "register"): string {
  switch (screen) {
    case "landing":
      return "/";
    case "auth":
      return authMode === "login" ? "/login" : "/register";
    case "learner-profile":
      return "/profile/setup";
    case "welcome":
      return "/welcome";
    case "stage-selection":
      return "/home";
    case "story-scene":
      return `/stage-${stageId}`;
    case "chapter-bridge":
      return `/stage-${stageId}/chapter-${levelId}/intro`;
    case "level-map":
      return `/stage-${stageId}/chapters`;
    case "game":
      return `/stage-${stageId}/chapter-${levelId}`;
    case "vowel-power-complete":
      return `/stage-${stageId}/chapter-${levelId}/power-complete`;
    case "sticker-book":
      return "/stickers";
    case "dashboard":
      return "/progress";
    case "phoneme-bank":
      return "/sounds";
    case "settings":
      return "/settings";
    case "achievements":
      return "/achievements";
    case "help":
      return "/help";
    case "profile":
      return "/profile";
    case "admin-learners":
      return "/admin/learners";
    default:
      return "/";
  }
}

function AppContent() {
  const { isAuthenticated, user, token, isLoading: isAuthLoading, logout } = useAuth();
  useDarkMode();
  const initialRoute = parseAppPath(window.location.pathname);
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialRoute.screen);
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialRoute.authMode ?? 'register');
  const [selectedStage, setSelectedStage] = useState<number>(initialRoute.stageId ?? 1);
  const [selectedLevel, setSelectedLevel] = useState<number>(initialRoute.levelId ?? 1);
  const [mapEntry, setMapEntry] = useState<"dojo" | "valley" | "bridges" | undefined>();
  const [completedByStage, setCompletedByStage] = useState<Record<number, number>>({ ...DEFAULT_PROGRESS });
  const [stickerReward, setStickerReward] = useState<TrailReward | StickerReward | null>(null);
  const [stageComplete, setStageComplete] = useState<{ stageId: number; frames: UnlockedFrame[] } | null>(null);
  const completionHandledRef = useRef(false);

  useEffect(() => { setStickerReward(null); setStageComplete(null); }, [user?.id]);
  useEffect(() => {
    if (currentScreen !== "level-map" && currentScreen !== "vowel-power-complete") setStickerReward(null);
    if (currentScreen === "game") completionHandledRef.current = false;
  }, [currentScreen]);
  // Links or history entries to a locked level go back to the map instead of skipping ahead.
  useEffect(() => {
    if (currentScreen === "game" && selectedLevel > (completedByStage[selectedStage] ?? 0) + 1) setCurrentScreen("level-map");
  }, [currentScreen, selectedStage, selectedLevel, completedByStage]);
  const [learnerName, setLearnerName] = useState("");
  const [learnerAvatar, setLearnerAvatar] = useState("🦊");
  const [learnerId, setLearnerId] = useState<number | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [hasCheckedLearnerProfile, setHasCheckedLearnerProfile] = useState(false);
  const [isSyncingProgress, setIsSyncingProgress] = useState(false);
  const [isLevelJustCompleted, setIsLevelJustCompleted] = useState(false);
  const publicScreens: Screen[] = ["landing", "auth"];
  const isPublicScreen = publicScreens.includes(currentScreen);

  useEffect(() => {
    if (isAuthenticated && user?.role === "learner") {
      setCompletedByStage(readProgressFromStorage(user.id));
      return;
    }

    if (!isAuthenticated) {
      setCompletedByStage({ ...DEFAULT_PROGRESS });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseAppPath(window.location.pathname);
      if (route.screen === "vowel-power-complete" && !isLevelJustCompleted) {
        setCurrentScreen("level-map");
        setIsLevelJustCompleted(false);
        return;
      }
      setCurrentScreen(route.screen);
      if (route.authMode) setAuthMode(route.authMode);
      if (route.stageId) setSelectedStage(route.stageId);
      if (route.levelId) setSelectedLevel(route.levelId);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isLevelJustCompleted]);

  useEffect(() => {
    const nextPath = buildAppPath(currentScreen, selectedStage, selectedLevel, authMode);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }, [currentScreen, selectedStage, selectedLevel, authMode]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && !isPublicScreen) {
      setCurrentScreen("landing");
    }
  }, [isAuthLoading, isAuthenticated, isPublicScreen]);

  useEffect(() => {
    const route = parseAppPath(window.location.pathname);
    if (route.screen === "vowel-power-complete" && !isLevelJustCompleted) {
      setCurrentScreen("level-map");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && (currentScreen === "landing" || currentScreen === "auth")) {
      setCurrentScreen(user.role === "admin" ? "admin-learners" : "learner-profile");
    }
  }, [isAuthenticated, user, currentScreen]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin" && currentScreen !== "admin-learners") {
      setCurrentScreen("admin-learners");
    }
  }, [isAuthenticated, user, currentScreen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasCheckedLearnerProfile(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "learner" && token && !learnerId && !hasCheckedLearnerProfile) {
      setIsCheckingProfile(true);
      
      const checkProfile = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const response = await fetch(`${API_URL}/learner/user/${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setLearnerName(data.name);
            setLearnerAvatar(data.avatar);
            setLearnerId(data.id);
            setCurrentScreen("welcome");
          } else if (currentScreen !== "learner-profile") {
            setCurrentScreen("learner-profile");
          }
        } catch (error) {
          console.log('No existing profile found, showing setup screen');
          if (currentScreen !== "learner-profile") {
            setCurrentScreen("learner-profile");
          }
        } finally {
          setIsCheckingProfile(false);
          setHasCheckedLearnerProfile(true);
        }
      };

      checkProfile();
    }
  }, [isAuthenticated, user, token, learnerId, hasCheckedLearnerProfile, currentScreen]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "learner" && token && learnerId) {
      setIsSyncingProgress(true);
      
      const fetchProgress = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const response = await fetch(`${API_URL}/progress/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const progressData = await response.json();
            const newCompletedByStage: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

            const stages = Array.isArray(progressData) ? progressData : (progressData.stages ?? []);
            stages.forEach((progress: any) => {
              newCompletedByStage[progress.stage_id] = progress.completed_levels;
            });
            
            setCompletedByStage((prev) => {
              const mergedProgress = { ...prev };
              Object.entries(newCompletedByStage).forEach(([stageId, completedLevels]) => {
                mergedProgress[Number(stageId)] = Math.max(
                  mergedProgress[Number(stageId)] ?? 0,
                  completedLevels
                );
              });
              return mergedProgress;
            });

            // Keep whichever journey is further along on both the device and the server.
            const serverJourney = (stageId: number) => stages.find((progress: any) => progress.stage_id === stageId)?.journey;
            const bridge = furtherBridgeJourney(readBridgeJourney(learnerId), serverJourney(2));
            const cvc = furtherCvcJourney(readCvcJourney(learnerId), serverJourney(3));
            try {
              localStorage.setItem(bridgeStorageKey(learnerId)!, JSON.stringify(bridge));
              localStorage.setItem(cvcStorageKey(learnerId)!, JSON.stringify(cvc));
            } catch (error) {
              console.error('Failed to restore journeys on this device:', error);
            }
            const journeys: Array<[number, number, object]> = [
              [2, bridge.training.length + bridge.crossings.length, bridge],
              [3, cvc.completed, cvc],
            ];
            journeys.forEach(([stageId, count, journey]) => {
              if (count > newCompletedByStage[stageId] || (count > 0 && !serverJourney(stageId))) recordStageProgress(stageId, count, journey);
            });
          }
        } catch (error) {
          console.error('Failed to fetch progress from backend:', error);
        } finally {
          setIsSyncingProgress(false);
        }
      };

      fetchProgress();
    }
  }, [isAuthenticated, user, token, learnerId]);

  const handleGetStarted = () => {
    setAuthMode('register');
    setCurrentScreen("auth");
  };

  const handleSignIn = () => {
    setAuthMode('login');
    setCurrentScreen("auth");
  };

  const handleAuthSuccess = () => {
    // After auth, learner-profile will be shown (auto-navigate via useEffect)
  };

  const handleProfileComplete = (name: string, avatar: string, newLearnerId?: number) => {
    setLearnerName(name);
    setLearnerAvatar(avatar);
    if (newLearnerId) setLearnerId(newLearnerId);
    setHasCheckedLearnerProfile(true);
    setCompletedByStage(readProgressFromStorage(user?.id));
    setCurrentScreen("welcome");
  };

  const handleStartAdventure = () => {
    setCurrentScreen("stage-selection");
  };

  const handleSelectStage = (stageId: number) => {
    setSelectedStage(stageId);
    setMapEntry(undefined);
    setCurrentScreen("story-scene");
  };

  const handleBeginChapter = () => {
    setMapEntry(selectedStage === 1 ? "dojo" : undefined);
    setCurrentScreen("level-map");
  };

  const handleGoDirectlyToValley = () => {
    if (selectedStage !== 1 || (completedByStage[1] ?? 0) < 5) return;
    setMapEntry("valley");
    setCurrentScreen("level-map");
  };

  const handleGoDirectlyToBridgeMap = () => {
    if (selectedStage !== 2 || readBridgeJourney(learnerId).training.length < 5) return;
    setMapEntry("bridges");
    setCurrentScreen("level-map");
  };

  const handleSelectLevel = (levelId: number) => {
    setMapEntry(undefined);
    completionHandledRef.current = false;
    setStickerReward(null);
    setSelectedLevel(levelId);
    setCurrentScreen("game");
  };

  // Saves a stage's completed-level count on this device and the server without ever lowering it.
  const recordStageProgress = async (stageId: number, completed: number, journey?: object) => {
    setCompletedByStage((prev) => {
      const nextProgress = { ...prev, [stageId]: Math.max(prev[stageId] ?? 0, completed) };
      saveProgressToStorage(user?.id, nextProgress);
      return nextProgress;
    });

    if (learnerId && token) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const stageConfig = STAGE_CONFIG[stageId];

        const progressRes = await fetch(`${API_URL}/progress/learners/${learnerId}/stages/${stageId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            completed_levels: completed,
            total_levels: stageConfig.totalLevels,
            journey,
          }),
        });
        if (progressRes.ok) {
          const data = await progressRes.json();
          if (data.unlocked_frames?.length) setStageComplete({ stageId, frames: data.unlocked_frames });
        }
      } catch (error) {
        console.error('Failed to save progress to backend:', error);
      }
    }
  };

  const handleLevelComplete = async () => {
    if (selectedStage === 1 && completionHandledRef.current) return;
    completionHandledRef.current = true;
    const previous = completedByStage[selectedStage] ?? 0;
    const completed = Math.max(previous, selectedLevel);
    const reward = selectedStage === 1
      ? getTrailReward(selectedLevel, previous) ?? newStickerReward(1, previous, completed)
      : null;

    setIsLevelJustCompleted(selectedStage === 1 && selectedLevel <= 5);
    setCurrentScreen(selectedStage === 1 && selectedLevel <= 5 ? "vowel-power-complete" : "level-map");
    if (reward) setStickerReward(reward);

    await recordStageProgress(selectedStage, completed);
  };

  const handleJourneyProgress = (completed: number, journey: object) => {
    const reward = newStickerReward(selectedStage, completedByStage[selectedStage] ?? 0, completed);
    if (reward) setStickerReward(reward);
    recordStageProgress(selectedStage, completed, journey);
  };

  const handleContinueDojoTraining = () => {
    const trained = completedByStage[1] ?? 0;
    if (selectedStage !== 1 || trained >= 5) return;
    setIsLevelJustCompleted(false);
    handleSelectLevel(trained + 1);
  };

  const handleContinueToNextStory = () => {
    if (selectedStage === 1 && selectedLevel <= 5) {
      setIsLevelJustCompleted(false);
      setMapEntry("dojo");
      setCurrentScreen("level-map");
      return;
    }
    const nextLevel = selectedLevel + 1;
    const stageConfig = STAGE_CONFIG[selectedStage];
    
    setIsLevelJustCompleted(false);
    
    if (stageConfig && nextLevel <= stageConfig.totalLevels) {
      if (selectedStage === 1) {
        setSelectedLevel(nextLevel);
        setCurrentScreen("level-map");
        return;
      }

      setSelectedLevel(nextLevel);
      setCurrentScreen("chapter-bridge");
    } else if (stageConfig?.nextStageId) {
      setSelectedStage(stageConfig.nextStageId);
      setSelectedLevel(1);
      setCurrentScreen("story-scene");
    } else {
      setCurrentScreen("stage-selection");
    }
  };

  const handleBeginChapterFromBridge = () => {
    // Go directly to the game level challenge
    setCurrentScreen("game");
  };

  const handleBackFromBridge = () => {
    // Go back to level map
    setCurrentScreen("level-map");
  };

  const handleBackFromCelebration = () => {
    if (selectedStage === 1) setMapEntry(selectedLevel <= 5 ? "dojo" : "valley");
    // Reset completion flag when leaving celebration screen
    setIsLevelJustCompleted(false);
    setCurrentScreen("level-map");
  };

  const handleViewProgress = () => {
    setCurrentScreen("dashboard");
  };

  const handleViewStickers = () => {
    setCurrentScreen("sticker-book");
  };

  const handleViewPhonemeBank = () => {
    setCurrentScreen("phoneme-bank");
  };

  const handleViewAchievements = () => {
    setCurrentScreen("achievements");
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleBackToStages = () => {
    setCurrentScreen("stage-selection");
  };

  const handleBackToLevelMap = () => {
    if (selectedStage === 1) setMapEntry(selectedLevel <= 5 ? "dojo" : "valley");
    setCurrentScreen("level-map");
  };

  const handleBackToRoleSelect = () => {
    logout();
    setCurrentScreen("auth");
    setAuthMode('login');
    setLearnerName("");
    setLearnerAvatar("🦊");
    setLearnerId(null);
    setHasCheckedLearnerProfile(false);
    setCompletedByStage({ ...DEFAULT_PROGRESS });
  };

  const noHeaderScreens = ["landing", "auth", "learner-profile", "welcome", "story-scene", "chapter-bridge", "level-map", "game", "vowel-power-complete"];
  const showLearnerHeader = user?.role === "learner" && !noHeaderScreens.includes(currentScreen);

  if (currentScreen === "landing") {
    return <Landing onGetStarted={handleGetStarted} onSignIn={handleSignIn} />;
  }

  if (currentScreen === "auth") {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    );
  }

  if (isAuthLoading && token && !user && !isPublicScreen) {
    return (
      <div className="size-full bg-[var(--paper)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E6DED2] border-t-[#4F46E5] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isPublicScreen) {
    return <Landing onGetStarted={handleGetStarted} onSignIn={handleSignIn} />;
  }

  if (user?.role === "admin") {
    return <AdminDashboard />;
  }

  return (
    <div className="size-full flex flex-col">
      {showLearnerHeader && (
        <NavigationHeader
          userName={learnerName}
          userAvatar={learnerAvatar}
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          onLogout={handleBackToRoleSelect}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {currentScreen === "learner-profile" && (
          <LearnerProfile onComplete={handleProfileComplete} />
        )}

        {currentScreen === "welcome" && (
          <WelcomeScreen onStart={handleStartAdventure} userName={learnerName} />
        )}

        {currentScreen === "stage-selection" && (
          <StageSelection
            learnerId={learnerId}
            onSelectStage={handleSelectStage}
            onViewProgress={handleViewProgress}
            onViewStickers={handleViewStickers}
            onViewPhonemeBank={handleViewPhonemeBank}
            onViewAchievements={handleViewAchievements}
            completedByStage={completedByStage}
          />
        )}

        {currentScreen === "story-scene" && (
          <StoryScene
            stageId={selectedStage}
            dojoCompleted={(completedByStage[1] ?? 0) >= 5}
            bridgeWorkshopCompleted={selectedStage === 2 && readBridgeJourney(learnerId).training.length === 5}
            onGoToValley={handleGoDirectlyToValley}
            onGoToBridgeMap={handleGoDirectlyToBridgeMap}
            onBack={handleBackToStages}
            onBegin={handleBeginChapter}
          />
        )}

        {currentScreen === "chapter-bridge" && (
          <ChapterBridge
            stageName={STAGE_CONFIG[selectedStage]?.title ?? "Chapter"}
            currentLevel={selectedLevel}
            vowel={
              selectedStage === 1
                ? VOWEL_MAP[selectedLevel]?.vowel ?? "A"
                : selectedStage === 2
                  ? BLENDING_MAP[selectedLevel]?.vowel ?? "A"
                  : CVC_MAP[selectedLevel]?.word.charAt(0) ?? "C"
            }
            vowelName={
              selectedStage === 1
                ? VOWEL_MAP[selectedLevel]?.name ?? "Apple"
                : selectedStage === 3
                  ? CVC_MAP[selectedLevel]?.word ?? "CAT"
                  : ""
            }
            stageId={selectedStage}
            // Pass the blending pair only if we are in Stage 2
            blendingPair={selectedStage === 2 ? {
              consonant: BLENDING_MAP[selectedLevel]?.consonant ?? "M",
              vowel: BLENDING_MAP[selectedLevel]?.vowel ?? "A"
            } : undefined}
            cvcWord={selectedStage === 3 ? CVC_MAP[selectedLevel]?.word ?? "CAT" : undefined}
            onBeginChapter={handleBeginChapterFromBridge}
            onBack={handleBackFromBridge}
          />
        )}

        {currentScreen === "level-map" && (
          <LevelMap
            learnerId={learnerId}
            stageId={selectedStage}
            initialView={mapEntry}
            completedCount={completedByStage[selectedStage] ?? 0}
            onBack={handleBackToStages}
            onSelectLevel={handleSelectLevel}
            onProgress={handleJourneyProgress}
          />
        )}

        {currentScreen === "game" && (
          <GameLevel
            key={`${selectedStage}-${selectedLevel}`}
            stageId={selectedStage}
            levelId={selectedLevel}
            onBack={handleBackToLevelMap}
            onComplete={handleLevelComplete}
          />
        )}

        {(currentScreen === "level-map" || currentScreen === "vowel-power-complete") && stickerReward && (
          <TrailRewardDialog reward={stickerReward} onClose={() => setStickerReward(null)} onBook={() => {
            setStickerReward(null);
            setCurrentScreen("sticker-book");
          }} />
        )}

        {stageComplete && !stickerReward && (
          <StageCompleteDialog
            stageTitle={STAGE_CONFIG[stageComplete.stageId]?.title ?? "this stage"}
            frames={stageComplete.frames}
            avatar={learnerAvatar}
            onClose={() => setStageComplete(null)}
          />
        )}

        {currentScreen === "vowel-power-complete" && (
          <VowelPowerComplete
            levelId={selectedLevel}
            onContinueTraining={(completedByStage[1] ?? 0) < 5 ? handleContinueDojoTraining : undefined}
            onContinue={handleContinueToNextStory}
            onBackToMap={handleBackFromCelebration}
          />
        )}

        {currentScreen === "sticker-book" && (
          <StickerBook onBack={handleBackToStages} completedByStage={completedByStage} avatar={learnerAvatar} />
        )}

        {currentScreen === "dashboard" && (
          <UnifiedDashboard
            userName={learnerName || user?.name}
            completedByStage={completedByStage}
            onBack={handleBackToStages}
          />
        )}

        {currentScreen === "phoneme-bank" && (
          <PhonemeBank onBack={handleBackToStages} completedByStage={completedByStage} />
        )}

        {currentScreen === "achievements" && (
          <Achievements onBack={handleBackToStages} completedByStage={completedByStage} />
        )}

        {currentScreen === "settings" && (
          <Settings
            onNavigate={handleNavigate}
            onAvatarUpdate={(avatar) => setLearnerAvatar(avatar)}
          />
        )}

        {currentScreen === "help" && (
          <Help />
        )}

        {currentScreen === "profile" && (
          <ProfilePage
            onBack={() => setCurrentScreen("stage-selection")}
            onAvatarUpdate={(avatar) => setLearnerAvatar(avatar)}
            onNameUpdate={(name) => setLearnerName(name)}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
