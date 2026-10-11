import { z } from "zod";
import { and, eq, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { activityDays, attempts, profiles, questions, reviewItems, subjects, topics } from "@db/schema";
import { generateCurriculum, generateQuestions, tutorChat } from "./atlas-ai";
import { SEED_SUBJECTS, SEED_TOPICS } from "../src/data/curriculum";
import { SEED_QUESTIONS } from "../src/data/seedContent";
import { ARK_RE, ARK_RE_TOPICS } from "../src/data/arkansasRe";
import { SEED_ARK_RE } from "../src/data/seedArkRe";

/**
 * Atlas Tutor router: all learning state is per-user in MySQL.
 * Seeding is idempotent — seed rows exist once for all users.
 */

const GAP_FILL_MIN = 2;
const MASTERY_PASS = 90;
const DECAY_DAYS = 14;

async function ensureSeeded() {
  const db = getDb();
  const existing = await db.select({ id: subjects.id }).from(subjects).limit(1);
  if (existing.length > 0) return;
  await db.insert(subjects).values([...SEED_SUBJECTS, ARK_RE]);
  await db.insert(topics).values([...SEED_TOPICS, ...ARK_RE_TOPICS]);
  await db.insert(questions).values(
    [...SEED_QUESTIONS, ...SEED_ARK_RE].map((q) => ({
      id: q.id,
      subjectId: q.subjectId,
      topicId: q.topicId,
      kind: q.kind,
      prompt: q.prompt,
      choices: q.choices,
      answer: q.answer,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      breakdown: q.breakdown ?? null,
      source: q.source,
      createdAt: new Date(q.createdAt || Date.now()),
    })),
  );
}

interface TopicLite {
  id: string;
  subjectId: string;
  label: string;
  level: string;
  prereqIds: string[];
}

function computeMastery(topicsList: TopicLite[], userAttempts: Array<{ topicId: string; correct: boolean; answeredAt: Date }>, now = Date.now()) {
  const byTopic = new Map<string, Array<{ correct: boolean; answeredAt: Date }>>();
  for (const a of userAttempts) {
    const l = byTopic.get(a.topicId) ?? [];
    l.push(a);
    byTopic.set(a.topicId, l);
  }
  const profilesOut = new Map<string, { topicId: string; attempts: number; correct: number; successRate: number; mastery: number; mastered: boolean; unlocked: boolean }>();
  const get = (topic: TopicLite) => {
    const cached = profilesOut.get(topic.id);
    if (cached) return cached;
    const list = (byTopic.get(topic.id) ?? []).sort((x, y) => x.answeredAt.getTime() - y.answeredAt.getTime());
    const n = list.length;
    const correct = list.filter((a) => a.correct).length;
    const successRate = n === 0 ? 0 : correct / n;
    let streak = 0;
    for (let i = list.length - 1; i >= 0 && list[i].correct; i--) streak++;
    let mastery = n === 0 ? 0 : successRate * 100;
    if (streak < GAP_FILL_MIN) mastery = Math.min(mastery, 55);
    const lastAt = n ? list[n - 1].answeredAt.getTime() : 0;
    if (lastAt) {
      const daysIdle = (now - lastAt) / 86_400_000;
      if (daysIdle > DECAY_DAYS) mastery -= Math.min(25, (daysIdle - DECAY_DAYS) * 1.5);
    }
    mastery = Math.max(0, Math.min(100, Math.round(mastery)));
    const p = {
      topicId: topic.id,
      attempts: n,
      correct,
      successRate,
      mastery,
      mastered: mastery >= MASTERY_PASS,
      unlocked: true,
    };
    profilesOut.set(topic.id, p);
    p.unlocked = topic.prereqIds.every((pre) => {
      const preTopic = topicsList.find((t) => t.id === pre);
      if (!preTopic) return false;
      return get(preTopic).mastered;
    });
    return p;
  };
  return topicsList.map((t) => get(t));
}

export const atlasRouter = createRouter({
  bootstrap: authedQuery.query(async ({ ctx }) => {
    await ensureSeeded();
    const db = getDb();
    const subjectList = await db.select().from(subjects);
    return { subjects: subjectList, user: { id: ctx.user.id, name: ctx.user.name, role: ctx.user.role } };
  }),

  subjectState: authedQuery
    .input(z.object({ subjectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await ensureSeeded();
      const db = getDb();
      const uid = ctx.user.id;
      const [topicList, userAttempts, reviewDue, activityRows, profileRow] = await Promise.all([
        db.select().from(topics).where(eq(topics.subjectId, input.subjectId)),
        db
          .select({ topicId: attempts.topicId, correct: attempts.correct, answeredAt: attempts.answeredAt })
          .from(attempts)
          .where(and(eq(attempts.userId, uid), eq(attempts.subjectId, input.subjectId))),
        db
          .select()
          .from(reviewItems)
          .where(and(eq(reviewItems.userId, uid), eq(reviewItems.subjectId, input.subjectId), lte(reviewItems.dueAt, new Date()))),
        db.select().from(activityDays).where(eq(activityDays.userId, uid)),
        db.select().from(profiles).where(and(eq(profiles.userId, uid), eq(profiles.subjectId, input.subjectId))),
      ]);
      const masteryProfiles = computeMastery(topicList, userAttempts);
      const days = new Set(activityRows.map((a) => a.day));
      const today = new Date().toISOString().slice(0, 10);
      let streak = 0;
      if (days.has(today)) {
        const d = new Date();
        for (;;) {
          const key = d.toISOString().slice(0, 10);
          if (days.has(key)) {
            streak++;
            d.setDate(d.getDate() - 1);
          } else break;
        }
      }
      return {
        topics: topicList,
        attempts: userAttempts,
        masteryProfiles,
        dueCount: reviewDue.length,
        streak,
        learnerNote: profileRow[0]?.learnerNote ?? null,
      };
    }),

  logAttempt: authedQuery
    .input(
      z.object({
        questionId: z.string(),
        topicId: z.string(),
        subjectId: z.string(),
        correct: z.boolean(),
        timeMs: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const uid = ctx.user.id;
      await db.insert(attempts).values({ ...input, userId: uid, answeredAt: new Date() });
      const day = new Date().toISOString().slice(0, 10);
      const existing = await db
        .select()
        .from(activityDays)
        .where(and(eq(activityDays.userId, uid), eq(activityDays.day, day)));
      if (existing.length > 0) {
        await db
          .update(activityDays)
          .set({ activityCount: existing[0].activityCount + 1 })
          .where(eq(activityDays.id, existing[0].id));
      } else {
        await db.insert(activityDays).values({ userId: uid, day, activityCount: 1 });
      }
      return { ok: true };
    }),

  reviewDeck: authedQuery
    .input(z.object({ subjectId: z.string() }))
    .query(({ ctx, input }) =>
      getDb()
        .select()
        .from(reviewItems)
        .where(and(eq(reviewItems.userId, ctx.user.id), eq(reviewItems.subjectId, input.subjectId), lte(reviewItems.dueAt, new Date())))
        .orderBy(reviewItems.dueAt),
    ),

  saveReviewItem: authedQuery
    .input(
      z.object({
        id: z.string(),
        subjectId: z.string(),
        front: z.string(),
        back: z.string(),
        note: z.string().optional(),
        ease: z.number(),
        intervalDays: z.number(),
        repetitions: z.number(),
        dueAt: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(reviewItems)
        .values({ ...input, userId: ctx.user.id })
        .onDuplicateKeyUpdate({
          set: {
            ease: input.ease,
            intervalDays: input.intervalDays,
            repetitions: input.repetitions,
            dueAt: input.dueAt,
            front: input.front,
            back: input.back,
            note: input.note,
          },
        });
      return { ok: true };
    }),

  questionsForTopics: authedQuery
    .input(z.object({ topicIds: z.array(z.string()), count: z.number().min(1).max(20) }))
    .query(async ({ input }) => {
      await ensureSeeded();
      const db = getDb();
      const out: Array<typeof questions.$inferSelect> = [];
      for (const tid of input.topicIds) {
        const rows = await db.select().from(questions).where(eq(questions.topicId, tid)).limit(4);
        for (const r of rows) if (out.length < input.count) out.push(r);
        if (out.length >= input.count) break;
      }
      if (out.length < input.count) {
        const more = await db.select().from(questions).limit(input.count * 2);
        for (const r of more) {
          if (out.length >= input.count) break;
          if (!out.some((o) => o.id === r.id)) out.push(r);
        }
      }
      return out.slice(0, input.count);
    }),

  generateLesson: authedQuery
    .input(
      z.object({
        subjectName: z.string(),
        topicId: z.string(),
        topicLabel: z.string(),
        level: z.string(),
        attempts: z.number(),
        successRate: z.number(),
        mastery: z.number(),
        count: z.number().min(1).max(10),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureSeeded();
      const generated = await generateQuestions(input);
      const db = getDb();
      const subjectId = input.topicId.split(".").slice(0, 1)[0] === "ar-re" ? "arkansas-re" : input.topicId.split(".").slice(0, -2).join(".") || "custom";
      const rows = generated.map((q, i) => ({
        id: `llm-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        subjectId,
        topicId: input.topicId,
        kind: q.kind,
        prompt: q.prompt,
        choices: q.choices,
        answer: q.answer,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
        breakdown: q.breakdown ?? null,
        source: "llm" as const,
        createdAt: new Date(),
      }));
      try {
        await db.insert(questions).values(rows);
      } catch {
        /* duplicate ids — ignore */
      }
      return rows;
    }),

  tutorChat: authedQuery
    .input(
      z.object({
        subjectName: z.string(),
        topicLabel: z.string().optional(),
        level: z.string().optional(),
        learnerNote: z.string().optional(),
        history: z.array(z.object({ role: z.string(), text: z.string() })),
        message: z.string(),
      }),
    )
    .mutation(({ input }) => tutorChat(input)),

  createSubject: authedQuery
    .input(z.object({ name: z.string().min(2) }))
    .mutation(async ({ input }) => {
      const generated = await generateCurriculum(input.name);
      const db = getDb();
      const subjectId = `custom-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
      await db.insert(subjects).values({ id: subjectId, name: input.name, description: generated.description, source: "llm" });
      const topicRows = generated.topics.map((t) => ({
        id: `${subjectId}.${t.key}`,
        subjectId,
        label: t.label,
        level: t.stage,
        prereqIds: (t.prereqs ?? []).map((p) => `${subjectId}.${p}`),
        source: "llm" as const,
      }));
      await db.insert(topics).values(topicRows);
      return { subjectId };
    }),

  saveLearnerNote: authedQuery
    .input(z.object({ subjectId: z.string(), note: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.userId, ctx.user.id), eq(profiles.subjectId, input.subjectId)));
      if (existing.length > 0) {
        await db.update(profiles).set({ learnerNote: input.note }).where(eq(profiles.id, existing[0].id));
      } else {
        await db.insert(profiles).values({ userId: ctx.user.id, subjectId: input.subjectId, learnerNote: input.note });
      }
      return { ok: true };
    }),
});
