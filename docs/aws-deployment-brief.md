# Mewsie — AWS Deployment Brief

Hand-off doc for the AWS / cloud team. What the system is, how it's wired, and the cleanest path to put it on AWS.

---

## 1. What Mewsie is (one paragraph)

Mewsie is a Cache-Augmented Generation (CAG) support chatbot for the Mews × Omniboost hotel-accounting integration. It answers **only** from curated markdown in `knowledge/` (no RAG, no vector DB — the whole knowledge base is loaded into memory at boot). Backend is **Hono on Node.js 20 + TypeScript**, frontend is a **React 18 + Vite SPA** served as static files by the same backend, AI is **Anthropic Claude** (Sonnet 4.6 answers, Haiku 4.5 routes), persistence is **Supabase Postgres** (analytics-only, 8 tables, optional via `ENABLE_DB_WRITES`). Currently deployed on Railway; we want to move to AWS.

---

## 2. Components

### 2.1 Backend API (Node.js / Hono)

- **Entry:** `backend/server.ts`, started with `npm start` → `tsx backend/server.ts`
- **Runtime:** Node ≥ 20, TypeScript executed via `tsx` (no compile step needed for backend)
- **Port:** `PORT` env var, default `3005`
- **Framework:** [Hono](https://hono.dev) + `@hono/node-server`
- **Middleware:** CORS (origin whitelist via `ALLOWED_ORIGINS`), `hono-rate-limiter`, static file serving
- **Endpoints:**

  | Method | Path | Purpose |
  |---|---|---|
  | POST | `/webhook/chat` | Main chat — message in, answer out |
  | POST | `/api/feedback` | 👍/👎 + comment after each answer |
  | POST | `/api/help-open` | Telemetry: user opened help panel |
  | POST | `/api/sync-context` | Base → Mewsie identity/context sync |
  | POST | `/api/create-ticket` | Salesforce escalation (frustrated user) |
  | GET  | `/health` | Liveness probe — returns `{status:"ok"}` |

- **AI pipeline** (`backend/pipeline/`): every chat message routes through Stage 1 keyword gate → Stage 2A Haiku shortlist → Stage 2B verify → Sonnet answer. Prompt caching enabled (5-min Anthropic-side cache).
- **Sessions:** in-memory `Map` keyed by browser session ID, 30-min TTL, last 20 turn-pairs. **Lost on restart.** Means: single-instance deploy OR sticky sessions OR move sessions to Redis later (not needed yet).

### 2.2 Frontend (React SPA)

- **Path:** `frontend/`
- **Stack:** React 18 + Vite 5 + TypeScript
- **Build:** `npm run build:frontend` → `frontend/dist/` (static HTML/JS/CSS)
- **Served by:** the Hono backend via `serveStatic` — no separate web server needed
- **Embed:** can run standalone or inside a parent iframe (e.g. Omniboost Base). Three modes: hidden bubble, side-panel, fullscreen.
- **No business logic, no credentials, no Anthropic calls in the frontend** — it only talks to the backend over POST.

### 2.3 Knowledge base

- **Location:** `knowledge/website/<group>/<topic>.md` + `knowledge/knowledge-manifest.json`
- **Loaded once at server boot** into memory by `backend/fetch/loader.ts` (this is the "C" in CAG)
- **Help resources:** `knowledge/help-resources/` is frontend-only, not indexed
- **~few hundred markdown files**, all in repo — ships *with the container image*

### 2.4 Scraper (separate process)

- **Path:** `backend/scraper/`
- **Entry:** `tsx backend/scraper/index.ts` (long-running cron) or `npm run sync` (one-shot, `--force-sync`)
- **Schedule:** every 24h, from `knowledge/fetch_sources.json`
- **Sources:** Firecrawl (web), Confluence REST API (internal docs)
- **Output:** writes markdown into `knowledge/website/` and updates the manifest
- **Note:** scraper writing back into the repo is fine on Railway (ephemeral FS, content lives in git). On AWS we want this writing to **S3** or pushing a PR — see §4.

### 2.5 Database (Supabase / Postgres)

- **Vendor today:** Supabase (managed Postgres)
- **Toggle:** writes only happen when `ENABLE_DB_WRITES=true`
- **Tables (8):**

  | # | Table | Purpose |
  |---|---|---|
  | 1 | `users` | Browser-token identity + Base sync (`base_user_id`), tier, country |
  | 2 | `conversations` | One row per chat session |
  | 3 | `bundles` | One row per question (with full pipeline trace) |
  | 4 | `messages` | Individual user/assistant messages |
  | 5 | `llm_calls` | Per-Claude-call telemetry: model, tokens, cache, cost, latency |
  | 6 | `feedback` | Thumb votes + comments tied to a bundle |
  | 7 | `help_panel_opens` | UI telemetry |
  | 8 | `errors` | Server errors |

- **Schema:** `backend/db/schema.sql` + migrations in `backend/db/migrations/` (0001–0005)
- **Features used:** `uuid` PKs, `jsonb`, `GIN` indexes on jsonb, `timestamptz` — **vanilla Postgres 15+**, fully portable to RDS / Aurora.
- **No ORM** — `@supabase/supabase-js` only; swapping to `pg` for RDS is straightforward.

---

## 3. Environment variables

| Var | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Claude API |
| `PORT` | no | default 3005 |
| `ALLOWED_ORIGINS` | prod | comma-separated origins for CORS |
| `SUPABASE_URL` | if DB on | analytics DB endpoint |
| `SUPABASE_SERVICE_KEY` | if DB on | service-role key |
| `ENABLE_DB_WRITES` | no | `true` to persist analytics |
| `CONFLUENCE_EMAIL` / `CONFLUENCE_TOKEN` / `CONFLUENCE_BASE_URL` | scraper | Confluence ingest |
| `FIRECRAWL_API_KEY` | scraper | web scraper |

All belong in **AWS Secrets Manager** (or SSM Parameter Store, SecureString). Nothing belongs in the container image.

---

## 4. Recommended AWS deployment

### 4.1 Topology (recommended, cheapest-to-iterate)

```
                          Route53  ──►  CloudFront  ──►  AWS App Runner
                                                          │   (Hono + static SPA)
                                                          │
                                  ┌───────────────────────┤
                                  ▼                       ▼
                          Secrets Manager           RDS Postgres
                          (API keys, DB creds)      (Aurora Serverless v2)
                                                          ▲
                                                          │
                                  ▲                       │
                                  │                       │
                          EventBridge (cron 24h) ──► ECS Fargate scheduled task
                                                     (scraper, writes to S3 + RDS)
                                                          │
                                                          ▼
                                                     S3 bucket: mewsie-knowledge/
                                                     (markdown + manifest)
```

### 4.2 Compute — pick one

| Option | When | Pros | Cons |
|---|---|---|---|
| **AWS App Runner** *(recommended start)* | single container, autoscale to traffic, zero infra | simplest; native HTTPS; rolling deploys from ECR | $$ per running instance; no sticky sessions out of box → use 1 instance until we move sessions to Redis |
| **ECS Fargate + ALB** | want blue/green, multi-AZ, custom networking | full control; cheap at scale; ALB sticky sessions trivial | more YAML to write |
| **EC2 + PM2** | absolute lowest cost, low traffic | predictable bill | you babysit the box |
| ~~Lambda~~ | — | — | **bad fit**: in-memory sessions + 200KB knowledge load on cold start = high latency |

**Recommendation: start on App Runner, plan to move to ECS Fargate when we add a second instance.** When that happens, sessions must move to ElastiCache (Redis) — currently a `Map`, which doesn't survive multi-instance.

### 4.3 Container

No Dockerfile exists today (Railway uses Nixpacks). Author one:

```Dockerfile
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json frontend/
RUN npm ci && npm --prefix frontend ci
COPY . .
RUN npm run build:frontend

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3005
CMD ["npm", "start"]
```

Push to **ECR**. App Runner / ECS pulls from there.

### 4.4 Database

Two options:

1. **Keep Supabase.** Easiest. Cross-cloud network hop is small, latency fine for analytics writes. Drop in the existing URL + service key from Secrets Manager. Zero schema work.
2. **Migrate to RDS Postgres / Aurora Serverless v2.** Cleaner if everything lives in AWS. Run `backend/db/schema.sql` + migrations in order. Swap `@supabase/supabase-js` for `pg` (one file: `backend/db/supabase.ts`). Aurora Serverless v2 min ACU = 0.5 → ~$45/mo idle.

> All analytics is **write-only from the backend** — no public DB exposure. Place RDS in a private subnet; App Runner connects via VPC connector.

### 4.5 Knowledge files & scraper

The knowledge folder ships in the container today. Two paths:

- **A. Bake-in (simplest).** Container rebuilds when knowledge changes. Scraper runs as a scheduled ECS Fargate task → opens a PR → CI rebuilds the image. Knowledge is immutable per deploy.
- **B. Externalise to S3 (more flexible).** Scraper writes markdown + manifest to `s3://mewsie-knowledge/`. Backend loads from S3 at boot (or on SIGHUP). Updates without redeploy. Cost = pennies.

Recommend **B** once we want hourly knowledge refresh; **A** is fine for v1.

### 4.6 Frontend / CDN

The Hono backend already serves `frontend/dist/`. Put **CloudFront** in front for:
- TLS termination at edge
- static asset caching (JS/CSS bundles)
- WAF rules

Frontend bundle is a few hundred KB; this matters for the embed.

### 4.7 Secrets, logs, monitoring

- **Secrets Manager** for all env vars in §3. Inject at task-definition / App Runner config time.
- **CloudWatch Logs** — Hono `console.log` already goes to stdout, captured automatically.
- **CloudWatch Alarms** on `/health` 5xx rate, `errors` table row count delta, App Runner instance memory.
- **Anthropic cost** is the dominant runtime cost — already tracked in `llm_calls` table (input/output tokens, cache hits, cost_usd per call). Expose as a Grafana / QuickSight board off RDS.

### 4.8 CI/CD

GitHub Actions:
1. on push to `main` → `npm test` (pre-existing custom runner — 10 suites)
2. `npm run build:frontend && tsc --noEmit`
3. `docker build` + push to ECR with commit SHA tag
4. `aws apprunner update-service` (or `aws ecs update-service --force-new-deployment`)

---

## 5. Deployment checklist

- [ ] Create ECR repo `mewsie`
- [ ] Author `Dockerfile` (see §4.3), test locally
- [ ] Provision RDS Postgres / Aurora Serverless v2 in private subnet (or keep Supabase)
- [ ] Run `backend/db/schema.sql` + each migration in `backend/db/migrations/`
- [ ] Push secrets to Secrets Manager (8 vars in §3)
- [ ] Create App Runner service from ECR, mount secrets, set `PORT=3005`, healthcheck `/health`
- [ ] CloudFront distribution + ACM cert + Route53 record (`mewsie.omniboost.com`)
- [ ] Set `ALLOWED_ORIGINS` to the final hostname + Base host
- [ ] EventBridge rule → ECS scheduled task running the scraper (24h cron)
- [ ] CloudWatch alarms on health + 5xx + memory
- [ ] Smoke test: `POST /webhook/chat` from outside the VPC, verify a row in `bundles` + `llm_calls`

---

## 6. Open questions for the cloud team

1. **Multi-region?** Currently single-region is fine — Anthropic API is global.
2. **WAF rules?** Rate-limiting already in-app via `hono-rate-limiter`, but CloudFront WAF adds a second layer.
3. **VPC peering to Supabase?** Only relevant if we keep Supabase. Otherwise N/A.
4. **Embed CSP?** Mewsie is embedded in Base (parent iframe). Need CSP `frame-ancestors` to include Base's domain. Confirm domain list.

---

*Authored from the codebase as it stands on `main` (commit `1c1062f`).*
*Reach out: Hono backend + React frontend + Anthropic SDK + Supabase Postgres. Everything portable. Nothing locked to Railway except the `railway.toml`.*
