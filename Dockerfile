# Atlas Tutor — full-stack production image (Hono + tRPC + Vite + MySQL)
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Vite build outputs to dist/ (per vite.config.ts outDir)
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
# GEMINI_API_KEY must be supplied at runtime (deployment env vars / docker run -e).
# It is intentionally NOT baked into the image — never commit secrets to the repo.
COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/contracts ./contracts
COPY --from=build /app/db ./db
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/tsconfig.server.json ./tsconfig.server.json
EXPOSE 3000
CMD ["node", "dist/boot.js"]
