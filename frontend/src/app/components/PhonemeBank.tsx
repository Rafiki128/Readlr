import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  Lock,
  Mic,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { useAudioManager } from "../../hooks/useAudioManager";

interface PhonemeBankProps {
  onBack: () => void;
  completedByStage?: Record<number, number>;
}

interface SoundEntry {
  key: string;
  category: "vowels" | "blends" | "cvc";
  stageId: number;
  levelId: number;
  stage: string;
  title: string;
  sound: string;
  modelAudioPath: string;
  tint: string;
  color: string;
}

interface SavedRecording {
  key: string;
  blob: Blob;
  updatedAt: string;
}

const DB_NAME = "readlr_sound_library";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

const VOWEL_WORDS = [
  ["A", "Apple"],
  ["A", "Ant"],
  ["A", "Axe"],
  ["A", "Alligator"],
  ["A", "Astronaut"],
  ["A", "Anchor"],
  ["A", "Arrow"],
  ["A", "Acorn"],
  ["A", "Apron"],
  ["A", "Album"],
  ["E", "Egg"],
  ["E", "Elephant"],
  ["E", "Elbow"],
  ["E", "Engine"],
  ["E", "Envelope"],
  ["E", "Exit"],
  ["E", "Echo"],
  ["E", "Emerald"],
  ["E", "Eskimo"],
  ["E", "Exercise"],
  ["I", "Igloo"],
  ["I", "Insect"],
  ["I", "Ink"],
  ["I", "Island"],
  ["I", "Invitation"],
  ["I", "Iguana"],
  ["I", "Idea"],
  ["I", "Ice"],
  ["I", "Iron"],
  ["I", "Inside"],
  ["O", "Octopus"],
  ["O", "Orange"],
  ["O", "Ostrich"],
  ["O", "Otter"],
  ["O", "Owl"],
  ["O", "Ocean"],
  ["O", "Olive"],
  ["O", "Oven"],
  ["O", "Office"],
  ["O", "Orbit"],
  ["U", "Umbrella"],
  ["U", "Unicorn"],
  ["U", "Up"],
  ["U", "Under"],
  ["U", "Uniform"],
  ["U", "Ukulele"],
  ["U", "Uncle"],
  ["U", "Utensil"],
  ["U", "Urn"],
  ["U", "Us"],
] as const;

const VOWEL_GATE_WORDS = ["Apple", "Egg", "Igloo", "Octopus", "Umbrella"];

const BLEND_WORDS = [
  ["MA", "Mama"],
  ["BA", "Baba"],
  ["TA", "Tata"],
  ["SA", "Sasa"],
  ["LA", "Lala"],
  ["PA", "Papa"],
  ["NA", "Nana"],
  ["DA", "Dada"],
] as const;

const CVC_WORDS = ["CAT", "MAN", "HAT", "PIG", "DOG", "SUN", "BED", "CUP", "BUS", "TOP"] as const;

const categories = [
  { id: "vowels", name: "Vowels", tint: "#FFF7ED", color: "#F59E0B" },
  { id: "blends", name: "Blends", tint: "#EEF2FF", color: "#4F46E5" },
  { id: "cvc", name: "CVC Words", tint: "#D1FAE5", color: "#10B981" },
] as const;

function openRecordingsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecordings(): Promise<SavedRecording[]> {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as SavedRecording[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveRecording(recording: SavedRecording) {
  const db = await openRecordingsDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(recording);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function buildEntries(): SoundEntry[] {
  const vowelEntries: SoundEntry[] = VOWEL_WORDS.map(([sound, title], index) => {
    const levelId = index + 6;
    const gateLevelId = VOWEL_GATE_WORDS.indexOf(title) + 1;
    const resolvedLevelId = gateLevelId > 0 ? gateLevelId : levelId;
    return {
      key: `stage-1-level-${resolvedLevelId}`,
      category: "vowels",
      stageId: 1,
      levelId: resolvedLevelId,
      stage: "Valley of Vowels",
      title,
      sound,
      modelAudioPath: `/audio/stage1/${sound}.wav`,
      tint: "#FFF7ED",
      color: "#F59E0B",
    };
  });

  const blendEntries: SoundEntry[] = BLEND_WORDS.map(([sound, title], index) => ({
    key: `stage-2-level-${index + 1}`,
    category: "blends",
    stageId: 2,
    levelId: index + 1,
    stage: "Blending Bridges",
    title,
    sound,
    modelAudioPath: `/audio/stage2/${sound}.wav`,
    tint: "#EEF2FF",
    color: "#4F46E5",
  }));

  const cvcEntries: SoundEntry[] = CVC_WORDS.map((word, index) => ({
    key: `stage-3-level-${index + 1}`,
    category: "cvc",
    stageId: 3,
    levelId: index + 1,
    stage: "CVC Kingdom",
    title: word,
    sound: word,
    modelAudioPath: `/audio/stage3/${word}.wav`,
    tint: "#D1FAE5",
    color: "#10B981",
  }));

  return [...vowelEntries, ...blendEntries, ...cvcEntries];
}

function unlockedLimit(stageId: number, completedByStage: Record<number, number>) {
  const completed = completedByStage[stageId] ?? 0;
  if (stageId === 1) return Math.min(completed + 1, 20);
  if (stageId === 2 && (completedByStage[1] ?? 0) >= 20) return Math.min(completed + 1, 8);
  if (stageId === 3 && (completedByStage[2] ?? 0) >= 8) return Math.min(completed + 1, 10);
  return 0;
}

export function PhonemeBank({ onBack, completedByStage = {} }: PhonemeBankProps) {
  const [selectedCategory, setSelectedCategory] = useState<SoundEntry["category"]>("vowels");
  const [recordings, setRecordings] = useState<Record<string, { url: string; updatedAt: string }>>({});
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [statusByKey, setStatusByKey] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const { playAudio, stopAudio } = useAudioManager();

  const entries = useMemo(() => buildEntries(), []);
  const filtered = entries.filter((entry) => entry.category === selectedCategory);

  useEffect(() => {
    let activeUrls: string[] = [];

    getAllRecordings()
      .then((saved) => {
        const next: Record<string, { url: string; updatedAt: string }> = {};
        saved.forEach((recording) => {
          const url = URL.createObjectURL(recording.blob);
          activeUrls.push(url);
          next[recording.key] = { url, updatedAt: recording.updatedAt };
        });
        setRecordings(next);
      })
      .catch(() => {
        setStatusByKey((prev) => ({ ...prev, library: "Voice recordings could not be loaded." }));
      });

    return () => {
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const isUnlocked = (entry: SoundEntry) => entry.levelId <= unlockedLimit(entry.stageId, completedByStage);

  const updateStatus = (key: string, message: string) => {
    setStatusByKey((prev) => ({ ...prev, [key]: message }));
  };

  const stopUserAudio = () => {
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
      userAudioRef.current = null;
    }
  };

  const handlePlayModel = (entry: SoundEntry) => {
    if (!isUnlocked(entry)) return;
    stopUserAudio();
    stopAudio();
    playAudio(entry.modelAudioPath);
    updateStatus(entry.key, "Playing the model sound.");
  };

  const handlePlayRecording = (entry: SoundEntry) => {
    const recording = recordings[entry.key];
    if (!recording) return;
    stopAudio();
    stopUserAudio();
    const audio = new Audio(recording.url);
    userAudioRef.current = audio;
    audio.onended = () => {
      if (userAudioRef.current === audio) userAudioRef.current = null;
    };
    audio.play().catch(() => updateStatus(entry.key, "Your recording could not be played."));
    updateStatus(entry.key, "Playing your recording.");
  };

  const handleStartRecording = async (entry: SoundEntry) => {
    if (!isUnlocked(entry) || recordingKey) return;

    try {
      stopAudio();
      stopUserAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const updatedAt = new Date().toISOString();
        await saveRecording({ key: entry.key, blob, updatedAt });

        setRecordings((prev) => {
          if (prev[entry.key]) URL.revokeObjectURL(prev[entry.key].url);
          return {
            ...prev,
            [entry.key]: {
              url: URL.createObjectURL(blob),
              updatedAt,
            },
          };
        });

        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setRecordingKey(null);
        updateStatus(entry.key, "Saved. Listen back when you are ready.");
      };

      recorder.start();
      setRecordingKey(entry.key);
      updateStatus(entry.key, "Recording now.");
    } catch {
      setRecordingKey(null);
      updateStatus(entry.key, "Microphone permission is needed to record.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--hairline-strong)] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <BookOpen className="w-3.5 h-3.5" />
              Sound Library
            </span>
          </div>

          <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
            <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Practice shelf</p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">Sound Library</h1>
              <p className="text-[var(--ink-soft)] max-w-md">
                Listen to unlocked words, record your voice, then compare and rerecord.
              </p>
            </div>
          </motion.div>

          <div className="mb-8 inline-flex p-1 bg-card border border-[var(--hairline)] rounded-xl">
            {categories.map((category) => {
              const categoryEntries = entries.filter((entry) => entry.category === category.id);
              const unlockedCount = categoryEntries.filter(isUnlocked).length;
              const isActive = category.id === selectedCategory;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? "text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"
                  }`}
                  style={isActive ? { background: category.tint } : undefined}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-2"
                    style={{ background: isActive ? category.color : "#D1D5DB" }}
                  />
                  {category.name}
                  <span className="ml-2 text-xs text-[var(--ink-muted)]">
                    {unlockedCount}/{categoryEntries.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entry, index) => {
              const unlocked = isUnlocked(entry);
              const saved = recordings[entry.key];
              const isRecording = recordingKey === entry.key;
              const status = statusByKey[entry.key];

              return (
                <motion.div
                  key={entry.key}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.025 }}
                  className={`rounded-2xl p-5 border transition-colors ${
                    unlocked
                      ? "bg-card border-[var(--hairline)] hover:border-[var(--hairline-strong)]"
                      : "bg-[var(--paper-soft)] border-[#D8D2C8] grayscale-[0.35]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">{entry.stage}</p>
                      <p className="text-xs text-[var(--ink-muted)] mt-1">Level {entry.levelId}</p>
                    </div>
                    {!unlocked && <Lock className="w-4 h-4 text-[var(--ink-muted)]" />}
                  </div>

                  <div
                    className="rounded-xl p-6 mb-4 flex flex-col items-center justify-center min-h-[132px]"
                    style={{ background: unlocked ? entry.tint : "#E7E2DA" }}
                  >
                    <span className="text-4xl tracking-tight" style={{ color: unlocked ? entry.color : "#78716C" }}>
                      {entry.sound}
                    </span>
                    <span className="text-[var(--ink-soft)] mt-2">{entry.title}</span>
                  </div>

                  <div className="mb-2">
                    <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Compare</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePlayModel(entry)}
                        disabled={!unlocked}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--paper)] border border-[var(--hairline)] text-[var(--ink)] hover:border-[#4F46E5] hover:text-[#4F46E5] text-sm transition-colors disabled:cursor-not-allowed disabled:text-[var(--ink-muted)]"
                      >
                        <Volume2 className="w-4 h-4" />
                        Model
                      </button>

                      <button
                        onClick={() => handlePlayRecording(entry)}
                        disabled={!saved}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--hairline-strong)] text-sm transition-colors disabled:cursor-not-allowed disabled:text-[#A8A29E] disabled:bg-[var(--paper-soft)]"
                      >
                        <Play className="w-4 h-4" />
                        My voice
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {isRecording ? (
                      <button
                        onClick={handleStopRecording}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#EF4444] text-white text-sm transition-colors"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        Stop recording
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartRecording(entry)}
                        disabled={!unlocked || Boolean(recordingKey)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm transition-colors disabled:cursor-not-allowed disabled:bg-[#A8A29E]"
                        style={{ background: unlocked && !recordingKey ? entry.color : undefined }}
                      >
                        {saved ? <RotateCcw className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        {saved ? "Rerecord my voice" : "Record my voice"}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 min-h-5">
                    {unlocked ? (
                      <p className="text-xs text-[var(--ink-muted)]">
                        {status || (saved ? `Saved ${new Date(saved.updatedAt).toLocaleDateString()}` : "Listen first, then record your voice.")}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--ink-muted)]">Complete earlier levels to unlock this sound.</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
