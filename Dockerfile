# syntax=docker/dockerfile:1.7
# Mewsie — production container
# Multi-stage: build frontend, then ship backend + built frontend + knowledge base

# ───────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder: install deps and build the frontend
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install backend dependencies (uses package-lock.json for reproducibility)
COPY package.json package-lock.json ./
RUN npm ci

# Install frontend dependencies separately so they can be cached independently
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci

# Copy the rest of the source tree
COPY . .

# Build the React/Vite frontend → frontend/dist/
RUN npm run build:frontend

# ───────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime: minimal image with only what the server needs at runtime
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3005

# Bring over installed deps (tsx is in devDeps but required by `npm start`)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/tsconfig.json ./

# Application source
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/prompts ./prompts

# Knowledge base — loaded into memory at boot (CAG)
COPY --from=builder /app/knowledge ./knowledge

# Built frontend served statically by Hono
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3005

# Liveness probe — hits the same /health endpoint Hono exposes
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3005)+'/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# `npm start` → `tsx backend/server.ts`
CMD ["npm", "start"]
