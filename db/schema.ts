import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  double,
  boolean,
  json,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------- Atlas Tutor tables ----------------

export const subjects = mysqlTable("subjects", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  source: mysqlEnum("source", ["seed", "llm"]).default("seed").notNull(),
});

export const topics = mysqlTable(
  "topics",
  {
    id: varchar("id", { length: 190 }).primaryKey(),
    subjectId: varchar("subjectId", { length: 128 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    level: varchar("level", { length: 32 }).notNull(),
    prereqIds: json("prereqIds").$type<string[]>().notNull(),
    source: mysqlEnum("source", ["seed", "llm"]).default("seed").notNull(),
  },
  (t) => [uniqueIndex("topics_subject_idx").on(t.subjectId, t.id)],
);

export const questions = mysqlTable("questions", {
  id: varchar("id", { length: 190 }).primaryKey(),
  subjectId: varchar("subjectId", { length: 128 }).notNull(),
  topicId: varchar("topicId", { length: 190 }).notNull(),
  kind: mysqlEnum("kind", ["multiple-choice", "fill-in", "translation"]).notNull(),
  prompt: text("prompt").notNull(),
  choices: json("choices").$type<string[]>().notNull(),
  answer: text("answer").notNull(),
  answerIndex: int("answerIndex").notNull(),
  explanation: text("explanation").notNull(),
  breakdown: text("breakdown"),
  source: mysqlEnum("source", ["seed", "llm"]).default("seed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const attempts = mysqlTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    questionId: varchar("questionId", { length: 190 }).notNull(),
    topicId: varchar("topicId", { length: 190 }).notNull(),
    subjectId: varchar("subjectId", { length: 128 }).notNull(),
    correct: boolean("correct").notNull(),
    timeMs: int("timeMs").notNull(),
    answeredAt: timestamp("answeredAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("attempts_user_idx").on(t.userId, t.subjectId, t.answeredAt)],
);

export const reviewItems = mysqlTable("review_items", {
  id: varchar("id", { length: 190 }).primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  subjectId: varchar("subjectId", { length: 128 }).notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  note: text("note"),
  ease: double("ease").notNull().default(2.5),
  intervalDays: int("intervalDays").notNull().default(0),
  repetitions: int("repetitions").notNull().default(0),
  dueAt: timestamp("dueAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const activityDays = mysqlTable(
  "activity_days",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    day: varchar("day", { length: 10 }).notNull(), // YYYY-MM-DD
    activityCount: int("activityCount").notNull().default(0),
  },
  (t) => [uniqueIndex("activity_user_day").on(t.userId, t.day)],
);

export const profiles = mysqlTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    subjectId: varchar("subjectId", { length: 128 }).notNull(),
    learnerNote: text("learnerNote"),
  },
  (t) => [uniqueIndex("profiles_user_subject").on(t.userId, t.subjectId)],
);

export type SubjectRow = typeof subjects.$inferSelect;
export type TopicRow = typeof topics.$inferSelect;
export type QuestionRow = typeof questions.$inferSelect;
export type AttemptRow = typeof attempts.$inferSelect;
export type ReviewItemRow = typeof reviewItems.$inferSelect;
