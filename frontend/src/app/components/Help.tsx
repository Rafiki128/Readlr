import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Mic, Star, Trophy, HelpCircle, PlayCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface HelpProps {}

export function Help({}: HelpProps) {
  const [openTopic, setOpenTopic] = useState<number | null>(1);
  const [openQ, setOpenQ] = useState<string | null>(null);

  const helpTopics = [
    {
      id: 1,
      title: "Getting Started",
      icon: PlayCircle,
      tint: "#EEF2FF",
      color: "#4F46E5",
      sections: [
        { question: "How do I start playing?", answer: "Choose a stage from the main screen, then select a level to begin. Each level focuses on a specific sound or word." },
        { question: "What do I need to play?", answer: "A device with a microphone and speakers. Allow microphone access when prompted." },
        { question: "How do I navigate?", answer: "Use the menu at the top to access Progress, Sticker Book, and Settings." },
      ],
    },
    {
      id: 2,
      title: "Using Your Voice",
      icon: Mic,
      tint: "#FCE7F3",
      color: "#DB2777",
      sections: [
        { question: "How do I speak into the app?", answer: 'Tap the microphone button and say the sound or word clearly. Wait for the app to listen — you\'ll see "Listening…".' },
        { question: "What if it doesn't hear me?", answer: "Find a quiet place, speak clearly and not too fast. You can try as many times as you need." },
        { question: "Can I practice without playing?", answer: 'Yes — visit the Sound Library to practice any sound any time, no level required.' },
      ],
    },
    {
      id: 3,
      title: "Rewards & Progress",
      icon: Trophy,
      tint: "#FFF7ED",
      color: "#F59E0B",
      sections: [
        { question: "How do I earn stickers?", answer: "In the Valley of Vowels, every level gives you a new sticker friend. In Blending Bridges and CVC Kingdom, you earn a sticker every few steps. Finish a whole stage to unlock new frames for your picture!" },
        { question: "Where can I see my progress?", answer: "Open My Progress to see scores, accuracy, completed levels, and your learning streak." },
        { question: "What are achievements?", answer: "Special badges you earn for milestones — completing levels, learning streaks, and perfect scores." },
      ],
    },
    {
      id: 4,
      title: "Learning Tips",
      icon: Star,
      tint: "#D1FAE5",
      color: "#10B981",
      sections: [
        { question: "What if I make a mistake?", answer: "That's okay. The app shows you the correct way to say it and lets you try again." },
        { question: "Should I practice every day?", answer: "Yes — a little every day helps you learn faster. Aim for 10–15 minutes daily." },
        { question: "What order should I learn?", answer: "Start with Stage 1 (Vowels), then Stage 2 (Blends), then Stage 3 (Words). Each stage builds on the last." },
      ],
    },
  ];

  const tips = [
    { emoji: "🎯", title: "Speak clearly", body: "Say each sound slowly and clearly." },
    { emoji: "🔊", title: "Find a quiet spot", body: "Background noise can affect recognition." },
    { emoji: "⏰", title: "Practice daily", body: "Even 10 minutes a day makes a real difference." },
    { emoji: "💪", title: "Don't give up", body: "It's okay to try multiple times — that's how we learn." },
  ];

  return (
    <div className="size-full bg-[var(--paper)] overflow-auto">
      <div className="min-h-full px-6 md:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <HelpCircle className="w-3.5 h-3.5" />
              Help Center
            </span>
          </div>

          {/* Title */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">Support</p>
            <h1 className="text-4xl md:text-5xl text-[var(--ink)] tracking-tight">How can we help?</h1>
            <p className="text-[var(--ink-soft)] mt-2">
              Browse a topic to find quick answers, or check the daily tips below.
            </p>
          </motion.div>

          {/* Topic accordions */}
          <div className="space-y-3 mb-10">
            {helpTopics.map((topic, i) => {
              const Icon = topic.icon;
              const isOpen = openTopic === topic.id;
              return (
                <motion.div
                  key={topic.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-[var(--hairline)] overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setOpenTopic(isOpen ? null : topic.id);
                      setOpenQ(null);
                    }}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: topic.tint }}
                    >
                      <Icon className="w-5 h-5" style={{ color: topic.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--ink)]">{topic.title}</p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {topic.sections.length} answers
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--ink-muted)] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-2 border-t border-[var(--hairline)]">
                          {topic.sections.map((s, idx) => {
                            const key = `${topic.id}-${idx}`;
                            const qOpen = openQ === key;
                            return (
                              <div key={key} className="border-b border-[var(--hairline)] last:border-b-0">
                                <button
                                  onClick={() => setOpenQ(qOpen ? null : key)}
                                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                                >
                                  <span className="text-[var(--ink)] text-sm">{s.question}</span>
                                  <ChevronDown
                                    className={`w-4 h-4 text-[var(--ink-muted)] flex-shrink-0 transition-transform ${
                                      qOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                {qOpen && (
                                  <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pb-4 text-sm text-[var(--ink-soft)]"
                                  >
                                    {s.answer}
                                  </motion.p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Quick tips */}
          <motion.section
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl p-6 border border-[var(--hairline)] mb-6"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <div>
                <h2 className="text-lg text-[var(--ink)] leading-tight">Quick tips</h2>
                <p className="text-xs text-[var(--ink-muted)]">Small habits that make a big difference</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tips.map((t) => (
                <div key={t.title} className="flex gap-3 p-4 rounded-xl bg-[var(--paper)] border border-[var(--hairline)]">
                  <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                  <div>
                    <p className="text-[var(--ink)]">{t.title}</p>
                    <p className="text-xs text-[var(--ink-soft)] mt-0.5">{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Contact */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl p-6 border border-[var(--hairline)] text-center"
          >
            <p className="text-[var(--ink)] mb-1">Still need help?</p>
            <p className="text-sm text-[var(--ink-soft)]">
              Ask your teacher or a parent if you'd like more guidance.
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-3">
              Team 2526-sem2-it332-27 · Readlr Support
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
