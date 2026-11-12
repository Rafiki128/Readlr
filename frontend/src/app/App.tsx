import { earnedProgress, preserveRewards } from "./components/progressReset";
import { useState, useEffect, useRef, useCallback } from "react";
import { useJourneySync } from "./hooks/useJourneySync";
import { useEvidenceSync } from "./hooks/useEvidenceSync";
import { useLearnerCurriculumState } from "./hooks/useLearnerCurriculumState";
import { curriculumUnlocks } from "../hooks/learnerCurriculumState";
import { loadReadingProgress } from "../hooks/readingCheckpoints";
import { notifyJourneyChanged } from "./components/journeySync";
import { useLearningSettings, markPracticeToday } from "./hooks/useLearningSettings";
import { getLearningSettings } from "../hooks/learningSettings";
import { TrailRewardDialog } from "./components/TrailRewardDialog";
import { StageCompleteDialog, type UnlockedFrame } from "./components/StageCompleteDialog";
import { getTrailReward, type TrailReward } from "./components/trailRewards";
import { newStickerReward, type StickerReward } from "./components/stickers";
import { AuthProvider, useAuth, AuthScreen } from "../modules/auth/index";
import { setBackgroundMusicLoggedIn } from "../hooks/backgroundMusic";
import { NavigationHeader } from "./components/NavigationHeader";
import { StudentSurvey } from "./components/StudentSurvey";
import { Landing } from "./components/Landing";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ChildSetup } from "./components/ChildSetup";
import { useFrames } from './hooks/useFrames';
import { ReadingWorldTour } from './components/ReadingWorldTour';
import { CampOrientation } from './components/CampOrientation';
import { shouldShowWorldTour, WORLD_TOUR_COMPLETED } from '../hooks/readingWorldTour';
import { patchLearnerCurriculumState, readLearnerCurriculumState } from '../hooks/learnerCurriculumState';
import { CurriculumSoundLibrary } from './components/CurriculumSoundLibrary';
import { WorldDestination } from './components/WorldDestination';
import { StageSelection } from "./components/StageSelection";
import { useClassroom } from "./hooks/useClassroom";
import { useStudySession } from "./hooks/useStudySession";
import { StudySession } from "./components/StudySession";
import { ClassroomMessage } from "./components/ClassroomMessage";
import { ClassroomNotice } from "./components/ClassroomNotice";
import { ReadingJourney } from './components/ReadingJourney';
import { ReadingReview } from './components/ReadingReview';
import { GameLevel } from "./components/GameLevel";
import { StoryScene } from "./components/StoryScene";
import { readBridgeJourney } from "./components/stageTwoContent";
import { ChapterBridge } from "./components/ChapterBridge";
import { LevelMap } from "./components/LevelMap";
import { StickerBook } from "./components/StickerBook";
import { ReadingProgressDashboard } from './components/ReadingProgressDashboard';
import { VowelPowerComplete } from "./components/VowelPowerComplete";
import { Settings } from "./components/Settings";
import { CurriculumAchievements } from './components/CurriculumAchievements';
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
  | "survey"
  | "landing"
  | "auth"
  | "welcome"
  | "stage-selection"
  | "learning-camp"
  | "reading-review"
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
  if (path === "/profile/setup") return { screen: "welcome" };
  if (path === "/welcome") return { screen: "welcome" };
  if (path === "/home") return { screen: "stage-selection" };
  if (path === "/learning-camp") return { screen: "learning-camp" };
  if (path === "/review") return { screen: "reading-review" };
  if (path === "/stickers") return { screen: "sticker-book" };
  if (path === "/progress") return { screen: "dashboard" };
  if (path === "/sounds") return { screen: "phoneme-bank" };
  if (path === "/survey") return { screen: "survey" };
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
    case "welcome":
      return "/welcome";
    case "stage-selection":
      return "/home";
    case "learning-camp":
      return "/learning-camp";
    case "reading-review":
      return "/review";
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
    case "survey":
      return "/survey";
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
  const { isAuthenticated, user, token, freshLogin, isLoading: isAuthLoading, logout } = useAuth();
  useFrames();
  useDarkMode();
  useLearningSettings(token, user?.id);
  useEffect(() => setBackgroundMusicLoggedIn(isAuthenticated), [isAuthenticated]);
  const initialRoute = parseAppPath(window.location.pathname);
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialRoute.screen);
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialRoute.authMode ?? 'register');
  const [selectedStage, setSelectedStage] = useState<number>(initialRoute.stageId ?? 1);
  const [selectedChronicle,setSelectedChronicle]=useState(0);
  const [selectedLevel, setSelectedLevel] = useState<number>(initialRoute.levelId ?? 1);
  const stageScreen = ["story-scene", "chapter-bridge", "level-map", "game", "vowel-power-complete"].includes(currentScreen);
  const classroom = useClassroom(token, user?.role === 'learner', {
    stage: stageScreen ? selectedStage : null,
    level: currentScreen === 'game' ? selectedLevel : null,
    screen: currentScreen,
  });
  const studySession = useStudySession(token, isAuthenticated && user?.role === 'learner');
  const [mapEntry, setMapEntry] = useState<"dojo" | "valley" | "bridges" | undefined>();
  const [completedByStage, setCompletedByStage] = useState<Record<number, number>>({ ...DEFAULT_PROGRESS });
  const [stickerReward, setStickerReward] = useState<TrailReward | StickerReward | null>(null);
  const [stageComplete, setStageComplete] = useState<{ stageId: number; frames: UnlockedFrame[] } | null>(null);
  const [journeyActivityOpen, setJourneyActivityOpen] = useState(false);
  const completionHandledRef = useRef(false);

  useEffect(() => { setStickerReward(null); setStageComplete(null); }, [user?.id]);
  useEffect(() => {
    if (currentScreen !== "level-map") setStickerReward(null);
    if (currentScreen === "game") completionHandledRef.current = false;
  }, [currentScreen]);
  // Links or history entries to a locked level go back to the map instead of skipping ahead.
  useEffect(() => {
    if (currentScreen === "game" && selectedLevel > Math.max((completedByStage[selectedStage] ?? 0) + 1, classroom.policy?.unlockThrough?.[selectedStage] ?? 0)) setCurrentScreen("level-map");
  }, [currentScreen, selectedStage, selectedLevel, completedByStage, classroom.policy]);
  const [learnerName, setLearnerName] = useState("");
  const [learnerAvatar, setLearnerAvatar] = useState("🦊");
  const [learnerId, setLearnerId] = useState<number | null>(null);
  const updateJourneyProgress = useCallback((stage:number,count:number) => {
    setCompletedByStage(previous => {
      const stored = readProgressFromStorage(user?.id);
      const next = Object.fromEntries([1,2,3].map(id => [id, Math.max(previous[id] ?? 0, stored[id] ?? 0)]));
      next[stage] = Math.max(next[stage] ?? 0,count);
      try { saveProgressToStorage(user?.id,next); } catch { /* Local journey data remains the backup. */ }
      return next;
    });
  },[user?.id]);
  const showJourneyFrames = useCallback((stageId:number, frames:UnlockedFrame[]) => setStageComplete({stageId,frames}), []);
  useJourneySync(user?.role === "learner" ? learnerId : null, token, updateJourneyProgress, user?.id, showJourneyFrames);
  useEvidenceSync(user?.role === "learner" ? learnerId : null, token);
  const curriculumState = useLearnerCurriculumState(learnerId, token);
  const [worldTourOpen,setWorldTourOpen]=useState(false);
  const [replayCampOrientation,setReplayCampOrientation]=useState(false);
  useEffect(()=>{setWorldTourOpen(false);setReplayCampOrientation(false);},[learnerId]);
  useEffect(()=>{
    if(currentScreen==='stage-selection'&&learnerId&&!curriculumState.loading&&shouldShowWorldTour(curriculumState.state,freshLogin))setWorldTourOpen(true);
  },[currentScreen,learnerId,curriculumState.loading,curriculumState.state,freshLogin]);
  const finishWorldTour=()=>{
    if(learnerId){
      const latest=readLearnerCurriculumState(learnerId);
      patchLearnerCurriculumState(learnerId,{guidedActivities:{...latest.guidedActivities,[WORLD_TOUR_COMPLETED]:true}});
    }
    setWorldTourOpen(false);
    setReplayCampOrientation(true);
    setCurrentScreen('learning-camp');
  };
  const [completedBooks,setCompletedBooks]=useState<string[]>([]);
  const featureAccess=curriculumUnlocks(curriculumState.state,completedBooks);
  useEffect(()=>{
    if(curriculumState.loading)return;
    const locked=(currentScreen==='dashboard'&&!featureAccess.progress)||(currentScreen==='sticker-book'&&!featureAccess.stickers)||(currentScreen==='phoneme-bank'&&!featureAccess.sounds)||(currentScreen==='achievements'&&!featureAccess.achievements);
    if(locked)setCurrentScreen(curriculumState.state.campOrientationStep<3?'learning-camp':'stage-selection');
  },[currentScreen,curriculumState.loading,curriculumState.state.campOrientationStep,featureAccess.progress,featureAccess.stickers,featureAccess.sounds,featureAccess.achievements]);
  useEffect(()=>{
    if(!learnerId||user?.role!=="learner")return;
    const controller=new AbortController();
    void loadReadingProgress(controller.signal).then(progress=>setCompletedBooks(progress.completed)).catch(()=>{});
    return()=>controller.abort();
  },[learnerId,user?.role,currentScreen]);
  const [hasCheckedLearnerProfile, setHasCheckedLearnerProfile] = useState(false);
  const [needsChildSetup, setNeedsChildSetup] = useState(false);
  const [isLevelJustCompleted, setIsLevelJustCompleted] = useState(false);
  const publicScreens: Screen[] = ["landing", "auth", ...(import.meta.env.DEV ? ['reading-review' as const] : [])];
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
      if(user.role === "admin")setCurrentScreen("admin-learners");
    }
  }, [isAuthenticated, user, currentScreen]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin" && currentScreen !== "admin-learners" && currentScreen !== "reading-review") {
      setCurrentScreen("admin-learners");
    }
  }, [isAuthenticated, user, currentScreen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasCheckedLearnerProfile(false);
      setNeedsChildSetup(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentScreen !== 'reading-review' && isAuthenticated && user?.role === "learner" && token && !learnerId && !hasCheckedLearnerProfile) {
      
      const checkProfile = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const response = await fetch(`${API_URL}/learner/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          // New accounts have no profile until the guardian finishes child setup.
          if(response.status===404){setNeedsChildSetup(true);return;}
          if(!response.ok)throw new Error('Learner profile is unavailable');
          const payload=await response.json();
          const data=payload.learner??payload;
          setLearnerName(data.name||user.name||'Reader');
          setLearnerAvatar(data.avatar||'🦊');
          setLearnerId(data.id);
          setCurrentScreen(freshLogin ? "welcome" : "stage-selection");
        } catch (error) {
          console.error('Unable to prepare learner profile',error);
        } finally {
          setHasCheckedLearnerProfile(true);
        }
      };

      checkProfile();
    }
  }, [isAuthenticated, user, token, learnerId, hasCheckedLearnerProfile, currentScreen, freshLogin]);

  const handleGetStarted = () => {
    setAuthMode('register');
    setCurrentScreen("auth");
  };

  const handleSignIn = () => {
    setAuthMode('login');
    setCurrentScreen("auth");
  };

  const handleAuthSuccess = () => {};

  const handleStartAdventure = () => {
    setCurrentScreen("stage-selection");
  };

  const handleSelectStage = (stageId: number, chapter = 0) => {
    setSelectedChronicle(chapter);
    setSelectedStage(stageId);
    setMapEntry(undefined);
    setCurrentScreen(stageId===3 ? "level-map" : "story-scene");
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
    markPracticeToday(user?.id);
    setMapEntry(undefined);
    completionHandledRef.current = false;
    setStickerReward(null);
    setSelectedLevel(levelId);
    setCurrentScreen("game");
  };

  // Persist locally before notifying the single retrying cloud writer.
  const recordStageProgress = async (stageId: number, completed: number, _journey?: object) => {
    if (learnerId) preserveRewards(learnerId, { [stageId]: completed });
    const stored = readProgressFromStorage(user?.id);
    saveProgressToStorage(user?.id, { ...stored, [stageId]: Math.max(stored[stageId] ?? 0, completed) });
    setCompletedByStage((prev) => {
      const nextProgress = { ...prev, [stageId]: Math.max(prev[stageId] ?? 0, completed) };
      return nextProgress;
    });

    // Stage 2/3 journey changes already notify the same writer.
    if (stageId !== 1) return;
    notifyJourneyChanged(learnerId);
  };

  const rewardProgress = Object.fromEntries([1,2,3].map(stage => [stage, Math.max(completedByStage[stage] ?? 0, earnedProgress(learnerId)[stage] ?? 0)]));

  const handleLevelComplete = async () => {
    if (selectedStage === 1 && completionHandledRef.current) return;
    completionHandledRef.current = true;
    const previous = completedByStage[selectedStage] ?? 0;
    const completed = selectedLevel <= previous + 1 ? Math.max(previous, selectedLevel) : previous;
    const reward = selectedStage === 1 && selectedLevel > 5 && selectedLevel <= previous + 1
      ? getTrailReward(selectedLevel, rewardProgress[1]) ?? newStickerReward(1, rewardProgress[1], completed)
      : null;

    setIsLevelJustCompleted(selectedStage === 1 && selectedLevel <= 5);
    setCurrentScreen(selectedStage === 1 && selectedLevel <= 5 ? "vowel-power-complete" : "level-map");
    if (reward && getLearningSettings().achievement_alerts) setStickerReward(reward);

    await recordStageProgress(selectedStage, completed);
  };

  const handleJourneyProgress = (completed: number, journey: object) => {
    const reward = newStickerReward(selectedStage, rewardProgress[selectedStage] ?? 0, completed);
    if (reward && getLearningSettings().achievement_alerts) setStickerReward(reward);
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
    if(featureAccess.progress)setCurrentScreen("dashboard");
  };

  const handleViewStickers = () => {
    if(featureAccess.stickers)setCurrentScreen("sticker-book");
  };

  const handleViewPhonemeBank = () => {
    if(featureAccess.sounds)setCurrentScreen("phoneme-bank");
  };

  const handleViewAchievements = () => {
    if(featureAccess.achievements)setCurrentScreen("achievements");
  };

  const handleNavigate = (screen: string) => {
    if(screen==='dashboard'&&!featureAccess.progress)return;
    if(screen==='sticker-book'&&!featureAccess.stickers)return;
    if(screen==='phoneme-bank'&&!featureAccess.sounds)return;
    if(screen==='achievements'&&!featureAccess.achievements)return;
    setCurrentScreen(screen as Screen);
  };

  const handleBackToStages = () => {
    setCurrentScreen("stage-selection");
  };

  const handleBackToLevelMap = () => {
    if (selectedStage === 1) setMapEntry(selectedLevel <= 5 ? "dojo" : "valley");
    setCurrentScreen("level-map");
  };

  const handleBackToRoleSelect = async () => {
    await logout({ learnerId });
    setCurrentScreen("auth");
    setAuthMode('login');
    setLearnerName("");
    setLearnerAvatar("🦊");
    setLearnerId(null);
    setHasCheckedLearnerProfile(false);
    setNeedsChildSetup(false);
    setCompletedByStage({ ...DEFAULT_PROGRESS });
  };

  const handleChildSetupDone = (learner: { id: number; name: string; avatar: string }) => {
    setLearnerName(learner.name);
    setLearnerAvatar(learner.avatar);
    setLearnerId(learner.id);
    setNeedsChildSetup(false);
    setCurrentScreen("welcome");
  };

  const noHeaderScreens = ["landing", "auth", "welcome", "story-scene", "chapter-bridge", "level-map", "game", "vowel-power-complete"];
  const showLearnerHeader = user?.role === "learner" && !noHeaderScreens.includes(currentScreen);

  if(currentScreen==='reading-review'&&import.meta.env.DEV) return <ReadingReview onBack={()=>setCurrentScreen(isAuthenticated?(user?.role==='admin'?'admin-learners':'stage-selection'):'landing')} onSignIn={!isAuthenticated?handleSignIn:undefined}/>;

  if (needsChildSetup && isAuthenticated && token && user?.role === "learner") {
    return <ChildSetup token={token} onDone={handleChildSetupDone} onLogout={handleBackToRoleSelect} />;
  }

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

  if (currentScreen === 'reading-review') {
    const back=()=>setCurrentScreen(user?.role==='admin'?'admin-learners':'stage-selection');
    if(user?.role==='admin'||import.meta.env.DEV)return <ReadingReview onBack={back}/>;
    return <main className="p-8"><h1>Review access is for administrators.</h1><button onClick={back}>Back to stages</button></main>;
  }

  if (user?.role === "admin") {
    return <AdminDashboard/>;
  }

  // A running pretest/posttest study session replaces the normal learner app.
  if (user?.role === 'learner' && token && learnerId && studySession.study?.active) {
    return <StudySession token={token} userId={user.id} learnerId={learnerId} study={studySession.study} surveyAssigned={classroom.surveyAssigned}
      onUpdate={studySession.setStudy} onRefresh={studySession.refresh} onLogout={handleBackToRoleSelect} />;
  }
  if (user?.role === 'learner' && token && !studySession.loaded) {
    return <main className="study-shell"><section className="study-card"><p>Loading...</p></section></main>;
  }

  const classroomMessage = user?.role === 'learner' && !classroom.error ? <ClassroomMessage key={user.id} userId={user.id} policy={classroom.policy} /> : null;
  if (currentScreen === 'survey' && token && user?.role === 'learner') return <><NavigationHeader userName={learnerName} userAvatar={learnerAvatar} currentScreen="survey" onNavigate={handleNavigate} onLogout={handleBackToRoleSelect} surveyAssigned={classroom.surveyAssigned}/><StudentSurvey key={user.id} token={token} userId={user.id} onBack={handleBackToStages}/></>;
  const allClassroomStagesUnlocked = classroom.policy?.mode === 'stages' &&
    [1, 2, 3].every(stage => classroom.policy?.stages?.includes(stage));
  const classroomBlocksCurrentScreen=!!classroom.policy&&(
    ['paused','survey'].includes(classroom.policy.mode)||
    (['stage','stages'].includes(classroom.policy.mode)&&(
      (stageScreen&&!(classroom.policy.mode==='stage'?[classroom.policy.stage]:classroom.policy.stages??[]).includes(selectedStage))||
      (currentScreen==='phoneme-bank'&&!allClassroomStagesUnlocked&&!classroom.policy.soundLibrary)
    ))
  );

  if (user?.role === 'learner' &&
    (classroom.error || classroomBlocksCurrentScreen)) {
    return <>{classroomMessage}{classroom.surveyAssigned&&<button className="m-4 rounded-lg bg-teal-700 text-white p-4" onClick={()=>setCurrentScreen('survey')}>Open your feedback survey</button>}<ClassroomNotice policy={classroom.policy} error={classroom.error} onLogout={handleBackToRoleSelect} onStage={stage => {
      setSelectedLevel(1); handleSelectStage(stage);
    }} /></>;
  }

  return (
    <div className="size-full flex flex-col">
      {classroomMessage}
      {showLearnerHeader && (
        <NavigationHeader
          surveyAssigned={classroom.surveyAssigned}
          userName={learnerName}
          userAvatar={learnerAvatar}
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          onLogout={handleBackToRoleSelect}
          learningCampEnabled
          featureAccess={featureAccess}
          learnerId={learnerId}
          rewardState={{ state: curriculumState.state, completedBooks }}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {currentScreen === "welcome" && (
          <WelcomeScreen onStart={handleStartAdventure} userName={learnerName} />
        )}

        {currentScreen === "stage-selection" && (
          <StageSelection
            unlockThrough={classroom.policy?.unlockThrough}
            allowedStage={classroom.policy?.mode === 'stage' ? classroom.policy.stage : null}
            allowedStages={classroom.policy?.mode === 'stages' ? classroom.policy.stages ?? [] : null}
            learnerId={learnerId}
            onSelectStage={handleSelectStage}
            onViewProgress={handleViewProgress}
            onViewStickers={handleViewStickers}
            onViewPhonemeBank={handleViewPhonemeBank}
            onViewAchievements={handleViewAchievements}
            onOpenLearningCamp={() => setCurrentScreen("learning-camp")}
            learningCampEnabled
            expandedKingdom
            completedByStage={completedByStage}
            curriculumState={curriculumState.state}
            completedBooks={completedBooks}
          />
        )}

        {currentScreen === "learning-camp" && learnerId && (replayCampOrientation?<CampOrientation learnerId={learnerId} replay onReady={()=>{setReplayCampOrientation(false);setCurrentScreen('stage-selection');}}/>:<ReadingJourney learnerId={learnerId} initialTab="camp" onBack={handleBackToStages}/>)}

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

        {currentScreen === "level-map" && (selectedStage===3 && learnerId ?
          <ReadingJourney key={`${learnerId}-${selectedChronicle}`} learnerId={learnerId} initialTab="kingdom" initialChapter={selectedChronicle} onBack={handleBackToStages}/> :
          <LevelMap
            unlockThrough={classroom.policy?.unlockThrough?.[selectedStage]}
            soundLibraryUnlocked={classroom.policy?.soundLibrary}
            learnerId={learnerId}
            stageId={selectedStage}
            initialView={mapEntry}
            completedCount={completedByStage[selectedStage] ?? 0}
            onBack={handleBackToStages}
            onSelectLevel={handleSelectLevel}
            onProgress={handleJourneyProgress}
            onActivityChange={setJourneyActivityOpen}
          />
        )}

        {currentScreen === "game" && (
          <GameLevel
            learnerId={learnerId}
            key={`${selectedStage}-${selectedLevel}`}
            stageId={selectedStage}
            levelId={selectedLevel}
            onBack={handleBackToLevelMap}
            onComplete={handleLevelComplete}
          />
        )}

        {currentScreen === "level-map" && stickerReward && !journeyActivityOpen && (
          <TrailRewardDialog reward={stickerReward} onClose={() => setStickerReward(null)} onBook={() => {
            setStickerReward(null);
            setCurrentScreen("sticker-book");
          }} />
        )}

        {stageComplete && !stickerReward && !journeyActivityOpen && (
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
          <WorldDestination kind="stickers" onBack={handleBackToStages}>{back=><StickerBook learnerId={learnerId} learnerName={learnerName} completedBooks={completedBooks} curriculumState={curriculumState.state} expandedKingdom onBack={back} completedByStage={rewardProgress} avatar={learnerAvatar} />}</WorldDestination>
        )}

        {currentScreen === "dashboard" && (
          <WorldDestination kind="progress" onBack={handleBackToStages}>{back=><ReadingProgressDashboard learnerId={learnerId} token={token} userName={learnerName||user?.name} state={curriculumState.state} completedBooks={completedBooks} onBack={back}/>}</WorldDestination>
        )}

        {currentScreen === "phoneme-bank" && (
          <WorldDestination kind="sounds" onBack={handleBackToStages}>{back=><CurriculumSoundLibrary learnerId={learnerId} completedBooks={completedBooks} onBack={back}/>}</WorldDestination>
        )}

        {currentScreen === "achievements" && (
          <CurriculumAchievements state={curriculumState.state} completedBooks={completedBooks} onBack={handleBackToStages}/>
        )}

        {currentScreen === "settings" && (
          <Settings
            onNavigate={handleNavigate}
            onAvatarUpdate={(avatar) => setLearnerAvatar(avatar)}
          />
        )}

        {currentScreen === "help" && (
          <Help onTutorial={() => {setCurrentScreen('stage-selection');setWorldTourOpen(true);}} />
        )}

        {currentScreen === "profile" && (
          <ProfilePage
            onBack={() => setCurrentScreen("stage-selection")}
            onAvatarUpdate={(avatar) => setLearnerAvatar(avatar)}
            onNameUpdate={(name) => setLearnerName(name)}
            curriculumState={curriculumState.state}
            completedBooks={completedBooks}
          />
        )}
      </div>
      {worldTourOpen&&currentScreen==='stage-selection'&&<ReadingWorldTour onFinish={finishWorldTour}/>}
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
