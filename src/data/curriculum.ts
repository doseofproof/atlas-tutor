import type { Subject, Topic } from '@/types';

/**
 * Seeded curriculum. Spanish ships with a CEFR-aligned knowledge graph —
 * each topic lists its prerequisites, so the mastery engine can walk
 * backward and fill hidden gaps before advancing (the Alpha rule:
 * never advance past a hole).
 */

export const SPANISH: Subject = {
  id: 'spanish',
  name: 'Spanish',
  description: 'CEFR-aligned path A1 → B2: conversation-first, grammar as the rules of the game.',
  source: 'seed',
};

const t = (
  id: string, label: string, level: string, prereqIds: string[] = []
): Topic => ({ id, subjectId: 'spanish', label, level, prereqIds, source: 'seed' });

export const SPANISH_TOPICS: Topic[] = [
  // --- A1 ---
  t('spanish.a1.greetings', 'Greetings & Introductions', 'A1'),
  t('spanish.a1.alphabet-pronunciation', 'Alphabet & Pronunciation', 'A1'),
  t('spanish.a1.numbers-time', 'Numbers, Dates & Time', 'A1', ['spanish.a1.alphabet-pronunciation']),
  t('spanish.a1.gender-articles', 'Gender & Articles (el/la/los/las)', 'A1', ['spanish.a1.greetings']),
  t('spanish.a1.ser-estar', 'Ser vs. Estar', 'A1', ['spanish.a1.gender-articles']),
  t('spanish.a1.present-regular', 'Present Tense: Regular Verbs', 'A1', ['spanish.a1.ser-estar']),
  t('spanish.a1.tener-irregular', 'Key Irregulars: tener, ir, hacer, querer', 'A1', ['spanish.a1.present-regular']),
  t('spanish.a1.basic-vocab', 'Core Vocabulary: People, Home, Food', 'A1', ['spanish.a1.gender-articles']),
  t('spanish.a1.questions-negation', 'Questions & Negation', 'A1', ['spanish.a1.present-regular']),
  // --- A2 ---
  t('spanish.a2.preterite', 'Past Tense: Pretérito', 'A2', ['spanish.a1.present-regular']),
  t('spanish.a2.reflexives', 'Reflexive Verbs & Daily Routine', 'A2', ['spanish.a1.present-regular']),
  t('spanish.a2.object-pronouns', 'Direct & Indirect Object Pronouns', 'A2', ['spanish.a2.reflexives']),
  t('spanish.a2.por-para', 'Por vs. Para', 'A2', ['spanish.a2.object-pronouns']),
  t('spanish.a2.future-ir-a', 'Near Future: ir a + infinitive', 'A2', ['spanish.a1.tener-irregular']),
  t('spanish.a2.adjectives-agreement', 'Adjectives & Agreement', 'A2', ['spanish.a1.gender-articles']),
  t('spanish.a2.present-progressive', 'Present Progressive (estar + -ando/-iendo)', 'A2', ['spanish.a1.present-regular']),
  // --- B1 ---
  t('spanish.b1.imperfect', 'Imperfect Tense', 'B1', ['spanish.a2.preterite']),
  t('spanish.b1.imperfect-vs-preterite', 'Imperfect vs. Pretérito', 'B1', ['spanish.b1.imperfect']),
  t('spanish.b1.present-subjunctive', 'Present Subjunctive', 'B1', ['spanish.b1.imperfect-vs-preterite']),
  t('spanish.b1.conditional', 'Conditional Tense', 'B1', ['spanish.b1.imperfect']),
  t('spanish.b1.commands', 'Commands (Ud./Uds./tú)', 'B1', ['spanish.b1.present-subjunctive']),
  t('spanish.b1.relative-clauses', 'Relative Clauses & Connectors', 'B1', ['spanish.a2.por-para']),
  // --- B2 ---
  t('spanish.b2.subjunctive-moods', 'Subjunctive in Adverbial Clauses', 'B2', ['spanish.b1.present-subjunctive']),
  t('spanish.b2.passive-se', 'Impersonal & Passive se', 'B2', ['spanish.b2.subjunctive-moods']),
  t('spanish.b2.idioms-register', 'Idioms & Register (formal/informal)', 'B2', ['spanish.b1.relative-clauses']),
  t('spanish.b2.conditional-perfect', 'Conditional Perfect & Past Perfect', 'B2', ['spanish.b1.conditional']),
];

export const SEED_SUBJECTS: Subject[] = [SPANISH];
export const SEED_TOPICS: Topic[] = SPANISH_TOPICS;
