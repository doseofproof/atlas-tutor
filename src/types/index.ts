// ---------- Domain types ----------

export interface Subject {
  id: string;          // 'spanish' | user-created
  name: string;
  description: string;
  source: 'seed' | 'llm';
}

export interface Topic {
  id: string;          // 'spanish.a1.greetings' etc.
  subjectId: string;
  label: string;
  level: string;       // 'A1', 'A2', ... or custom stage
  prereqIds: string[]; // knowledge-graph edges — unlock when prereqs mastered
  source: 'seed' | 'llm';
}

export interface Question {
  id: string;
  subjectId: string;
  topicId: string;
  kind: 'multiple-choice' | 'fill-in' | 'translation';
  prompt: string;
  choices: string[];       // empty for fill-in
  answer: string;          // canonical answer text (or choice text)
  answerIndex: number;     // for multiple-choice
  explanation: string;     // "explain my answer" — always shown after responding
  breakdown?: string;      // step-by-step reasoning for harder items
  source: 'seed' | 'llm';
  createdAt: number;
}

export interface Attempt {
  id?: number;
  questionId: string;
  topicId: string;
  subjectId: string;
  correct: boolean;
  timeMs: number;
  answeredAt: number;
}

// Spaced-repetition item: anything the tutor or a missed question teaches you.
export interface ReviewItem {
  id: string;
  subjectId: string;
  front: string;         // prompt side (e.g. English word / error you made)
  back: string;          // answer side (Spanish word / correction)
  note?: string;         // rule or context
  ease: number;          // SM-2 ease factor
  intervalDays: number;
  repetitions: number;
  dueAt: number;
  createdAt: number;
}

export interface ChatTurn {
  role: 'user' | 'tutor';
  text: string;
  correction?: string;   // tutor's error note attached to its reply
  reviewItems?: Array<{ front: string; back: string; note?: string }>;
}

export interface ActivityDay {
  day: string;           // YYYY-MM-DD
  activityCount: number;
}

export interface MasteryProfile {
  topicId: string;
  attempts: number;
  correct: number;
  successRate: number;   // 0..1, null-ish 0 when unseen
  mastery: number;       // 0..100
  mastered: boolean;     // mastery >= 90 (Alpha rule: advance only after mastery)
  unlocked: boolean;     // all prereqs mastered
}

export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

// ---------- Alpha / 2-Hour Learning design constants ----------
export const DAILY_GOAL = 25;
export const MASTERY_PASS = 90;    // advance only after >=90% demonstrated
export const SWEET_SPOT_LO = 0.80; // target success band (zone of proximal development)
export const SWEET_SPOT_HI = 0.85;
export const GAP_FILL_MIN = 2;     // correct streak needed to count toward mastery
