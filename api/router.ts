import { authRouter } from "./auth-router";
import { atlasRouter } from "./atlas-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  atlas: atlasRouter,
});

export type AppRouter = typeof appRouter;
