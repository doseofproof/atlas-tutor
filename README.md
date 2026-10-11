# Atlas Tutor

A personalized, adaptive AI tutoring platform. Flagship subject: Arkansas Real Estate Exam prep (Pearson VUE blueprint), plus learn-anything subjects (e.g., Spanish CEFR A1-B2).

Built with React 19 + TypeScript + Vite, Tailwind + shadcn/ui, tRPC + Hono + Drizzle ORM + MySQL, Kimi OAuth. AI tutor calls run server-side only via an OpenAI-compatible provider (platform gateway, or Gemini when `GEMINI_API_KEY` is set at runtime).

## Getting started

```bash
npm install
npm run db:push
npm run dev        # http://localhost:3000
```

## Environment

`.env` is gitignored. Required at runtime: database URL, Kimi OAuth credentials, and optionally `GEMINI_API_KEY` / `GEMINI_MODEL`.

## Deploy

Dockerfile included. Never commit secrets; supply keys as runtime env vars.
