# Mewsie — Docker quickstart

Everything to build, run, and ship Mewsie in a container. The only thing **you** need to do first is install Docker Desktop (see step 0). After that, it's three commands.

---

## 0. One-time setup — what you need to install

1. **Docker Desktop**
   - macOS / Windows: <https://www.docker.com/products/docker-desktop>
   - Linux: install `docker-engine` + `docker-compose-plugin` from your distro
2. **Open Docker Desktop** once after install so the daemon starts. Verify with:
   ```bash
   docker --version
   docker compose version
   ```
3. Make sure `.env` exists in the project root with at least:
   ```
   ANTHROPIC_API_KEY=...
   ALLOWED_ORIGINS=https://your.domain
   # plus SUPABASE_*, CONFLUENCE_*, FIRECRAWL_API_KEY as needed
   ```
   `.env` is gitignored and dockerignored — it is **not** baked into the image.

That's the entire manual setup. Everything below is automated.

---

## 1. Build the image

```bash
docker build -t mewsie .
```

What this does:
- Stage 1 installs backend + frontend dependencies and runs `npm run build:frontend`
- Stage 2 produces a slim Node 20 image containing backend source, built frontend, knowledge base, prompts, and dependencies
- Final tag: `mewsie:latest`

---

## 2. Run it locally

### With `docker run`
```bash
docker run -p 3005:3005 --env-file .env --name mewsie mewsie
```
Open <http://localhost:3005> and the chat widget appears.

### With Docker Compose (recommended for dev)
```bash
docker compose up --build
```
Same result, plus a configured healthcheck, restart policy, and a one-shot `scraper` service available via:
```bash
docker compose run --rm scraper
```
Stop with `docker compose down`.

---

## 3. Verify it works

```bash
curl http://localhost:3005/health
# → {"status":"ok"}

curl -X POST http://localhost:3005/webhook/chat \
  -H 'content-type: application/json' \
  -d '{"message":"hi","sessionId":"test-1"}'
```

If `/health` returns OK and a chat call returns a response, the image is good.

---

## 4. What's in each file

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: Node 20 base, builds frontend, ships backend + dist + knowledge |
| `.dockerignore` | Keeps secrets (`.env`), local `node_modules`, `.git`, `.planning`, etc. out of the image |
| `docker-compose.yml` | One-command local orchestration; defines `mewsie` service and optional `scraper` |

The image is **stateless** — sessions are still in-memory and lost on container restart. Persistence (Supabase) is reached over the network using credentials from the injected env vars.

---

## 5. Ship it to AWS (when ready)

1. Tag for ECR:
   ```bash
   docker tag mewsie:latest <account>.dkr.ecr.<region>.amazonaws.com/mewsie:latest
   ```
2. Login + push:
   ```bash
   aws ecr get-login-password --region <region> \
     | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker push <account>.dkr.ecr.<region>.amazonaws.com/mewsie:latest
   ```
3. Point App Runner / ECS Fargate at that image. Env vars come from Secrets Manager — see `docs/aws-deployment-brief.md`.

No Docker Hub account is needed. ECR auth uses AWS IAM credentials.

---

## 6. Common commands

```bash
# Rebuild after code change
docker compose build

# Tail logs
docker compose logs -f mewsie

# Shell into the running container
docker compose exec mewsie sh

# One-shot knowledge refresh
docker compose run --rm scraper

# Remove everything
docker compose down --rmi local
```
