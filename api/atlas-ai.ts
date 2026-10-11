import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import { classifyAiError, listModels, AiTransient } from "./ai-client";
import { env } from "./lib/env";

/** Provider-aware error mapping: Gemini wire errors differ from the gateway's. */
function mapError(e: unknown): Error {
  if (geminiConfigured()) {
    const anyErr = e as { status?: number; statusCode?: number; message?: string };
    const status = anyErr?.status ?? anyErr?.statusCode;
    if (typeof status === "number" && (status === 429 || status >= 500)) {
      return new AiTransient(anyErr?.message || "Gemini is rate-limiting or briefly unavailable — retry shortly");
    }
  }
  return classifyAiError(e);
}

/**
 * Server-side tutor: API credentials never reach the browser.
 *
 * Provider selection:
 *  1. GEMINI_API_KEY set → Google Gemini via its OpenAI-compatible endpoint
 *     (model: gemini-2.5-flash, override with GEMINI_MODEL).
 *  2. Otherwise → the platform AI gateway (KIMI_AGENTGW_*), zero-config,
 *     billed to the site owner through the platform.
 *
 * Three entry points (chat / question gen / curriculum gen), typed errors
 * per the website-ai degradation contract either way.
 */

const geminiConfigured = () => !!env.geminiApiKey;

const gw = () => {
  if (geminiConfigured()) {
    return createOpenAICompatible({
      name: "gemini",
      baseURL: env.geminiBaseUrl,
      apiKey: env.geminiApiKey,
      includeUsage: true,
      supportsStructuredOutputs: true,
    });
  }
  return createOpenAICompatible({
    name: "kimi-gw",
    baseURL: process.env.KIMI_AGENTGW_BASE_URL!,
    apiKey: process.env.KIMI_AGENTGW_API_KEY!,
    includeUsage: true,
    supportsStructuredOutputs: true,
  });
};

async function modelId() {
  if (geminiConfigured()) return env.geminiModel;
  const { defaultModelId } = await listModels();
  return defaultModelId;
}

const tutorSystem = `You are Atlas, the Alpha Tutor Mastery Engine — a Pearson VUE Arkansas Real Estate exam coach (also a general mastery tutor for any other subject the learner names).

CORE PROTOCOL:
- Goal: 100% mastery (90% floor). Never let a wrong answer pass with only an explanation — issue an immediate Proof-of-Mastery Rep: a brand-new, numerically parallel drill on the exact missed sub-concept that the student must solve correctly before resuming.
- Zone of Proximal Development: target 80–85% accuracy. Above 90% correct → elevate to multi-layered analysis, scenario edge cases, or multi-step math. Below 75% → Socratic scaffolded hints, root-concept breakdown, or a memory anchor before re-testing.
- Socratic micro-dosing: cap non-interactive explanations at 3–4 concise sentences. Teach through dialogue, targeted questions, active recall. On partial/lazy answers nudge: "You've got 70% of it. What is the exact statutory requirement for [X]?"
- Waste Meter: if the student guesses, skips calculations, or asks for direct answers, intervene: "At Alpha, we optimize for efficiency. Guessing doubles your study time. Let's break this into a 30-second formula. What is the first variable?"
- Teach the RULE or mental model. Mastery framing: "you haven't learned it YET."

ARKANSAS REAL ESTATE — four modes, chosen by the learner's message or accuracy state:
1. SOCRATIC DRILL — single 4-option item (A–D), weighted toward Contracts/Agency (16 items) and AR Statutory Licensee Activities (14). Withhold the answer until the learner responds; then a full legal/computational breakdown of every option.
2. SCENARIO ANALYSIS — multi-variable scenarios (trust account disputes, dual agency conflicts, undisclosed defects); learner names the violation, liability, or settlement entry.
3. MATH MASTERCLASS — step-by-step pipelines: AR transfer tax $3.30 per $1,000 split 50/50 ($1.65 each), discount points ON THE LOAN AMOUNT, net-to-seller, 360/365-day prorations.
4. DIAGNOSTIC SIM — 10-question modules at blueprint domain weightings with a domain-weakness report.

STATUTORY GROUND TRUTH (never violate):
- AREC: 5 members (4 brokers with 5+ yrs, 1 public consumer). Fines up to $1,000/violation; NO power to award civil damages.
- Recovery Fund: $25,000 per violation / $75,000 aggregate per licensee; $25 fee on original applicants; payment only after formal disciplinary hearing; license auto-suspended until reimbursed with interest.
- Trust accounts: salesperson delivers to principal broker immediately; broker deposits by close of next business day or within 3 working days of acceptance; no commingling.
- Records: 3-year retention (last principal broker personally liable after closure); 7-day written termination notice + return pocket card.
- Rescissions: 5-day time-share (refund within 30 days); 3-day late property-disclosure (from receipt). Both beat caveat emptor.
- Timelines: 90-day post-exam filing (results void after), 6-month partial pass, 12-month eligibility, 7 hrs annual CE incl. 1 hr risk management/safety, 18 hrs PLE in 6–12 months, licenses expire Dec 31, renewal $60/$80 by Sept 30.
- Exam: 110 scored (80 national + 30 state) + 15 unscored pre-test items (5/10); pass 70 scaled on EACH section; 240 minutes.
- Math: transfer tax $3.30/$1,000 of price, split 50/50 ($1.65 each); 1 point = 1% of LOAN amount; I = V × R; prorations per the stated year (360 or 365), seller owns closing day unless stated.

If the subject is NOT Arkansas real estate, apply the same mastery protocol to whatever subject/topic the learner gives you.`;

const questionSchema = z.object({
  questions: z.array(
    z.object({
      kind: z.enum(["multiple-choice", "fill-in", "translation"]),
      prompt: z.string(),
      choices: z.array(z.string()),
      answerIndex: z.number(),
      answer: z.string(),
      explanation: z.string(),
      breakdown: z.string().optional(),
    }),
  ),
});

const chatSchema = z.object({
  reply: z.string(),
  reviewItems: z.array(
    z.object({ front: z.string(), back: z.string(), note: z.string().optional() }),
  ),
});

const curriculumSchema = z.object({
  description: z.string(),
  topics: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      stage: z.string(),
      prereqs: z.array(z.string()),
    }),
  ),
});

export async function tutorChat(opts: {
  subjectName: string;
  topicLabel?: string;
  level?: string;
  learnerNote?: string;
  history: Array<{ role: string; text: string }>;
  message: string;
}): Promise<{ reply: string; reviewItems: Array<{ front: string; back: string; note?: string }> }> {
  const user = [
    `Subject: ${opts.subjectName}`,
    opts.topicLabel ? `Current topic: ${opts.topicLabel} (${opts.level ?? ""})` : "",
    opts.learnerNote ? `Learner context: ${opts.learnerNote}` : "",
    "",
    "Recent conversation:",
    ...opts.history.slice(-10).map((h) => `${h.role === "user" ? "Learner" : "Atlas"}: ${h.text}`),
    `Learner: ${opts.message}`,
    "",
    "Respond with the JSON contract.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: gw()(await modelId()),
      system: tutorSystem,
      prompt: user,
      schema: chatSchema,
    });
    return object;
  } catch (e) {
    throw mapError(e);
  }
}

export async function generateQuestions(opts: {
  subjectName: string;
  topicLabel: string;
  level: string;
  attempts: number;
  successRate: number;
  mastery: number;
  count: number;
}): Promise<z.infer<typeof questionSchema>["questions"]> {
  const difficulty =
    opts.attempts === 0 || opts.successRate >= 0.85
      ? "slightly harder than current level — push the edge"
      : opts.successRate < 0.6
        ? "foundational and explicit — rebuild the missing prerequisite concept first"
        : "exact level — the productive 80–85% sweet spot";

  try {
    const { object } = await generateObject({
      model: gw()(await modelId()),
      system: `${tutorSystem}

QUESTION GENERATION CONTRACT — respond with the JSON contract only. Distractors must reflect REAL learner misconceptions (points on price vs loan, transfer-tax split forgotten, adjacent statutory numbers, ser/estar confusion, false cognates); no trick questions; explanations teach the rule.`,
      prompt: `Subject: ${opts.subjectName}
Topic: ${opts.topicLabel} (level ${opts.level})
Student stats: ${opts.attempts} attempts, ${(opts.successRate * 100).toFixed(0)}% correct, mastery ${opts.mastery}/100.
Generate exactly ${opts.count} questions. Calibrate difficulty: ${difficulty}.`,
      schema: questionSchema,
    });
    return object.questions;
  } catch (e) {
    throw mapError(e);
  }
}

export async function generateCurriculum(name: string): Promise<z.infer<typeof curriculumSchema>> {
  try {
    const { object } = await generateObject({
      model: gw()(await modelId()),
      system: `${tutorSystem}

CURRICULUM DESIGN CONTRACT — 8–20 topics, every prereq references another key in the list, early stages are foundations, slugs lowercase-hyphenated.`,
      prompt: `Design a mastery-based curriculum for: ${name}. Assume an adult self-learner. Order topics so each builds on its prereqs.`,
      schema: curriculumSchema,
    });
    return object;
  } catch (e) {
    throw mapError(e);
  }
}
