# Mewsie AWS Deployment Log — What Was Done

> Chronological record of how Mewsie was moved from Railway to AWS App Runner. Every step here is already complete unless explicitly marked otherwise. For the open todo list, see `post-deployment-todo.md`.

---

## TL;DR

Mewsie is **running live on AWS App Runner**. The default URL works (`https://998afrnq3y.eu-west-1.awsapprunner.com`), `/health` returns 200, the React widget loads, the chat endpoint is reachable. The only remaining step is swapping in the production domain `mewsie.omniboost.com`, which is blocked on 3 Cloudflare DNS records (Bart's side).

---

## Starting state

Before this work began:
- App was running on Railway
- Local repo had a **port mismatch**: Dockerfile + docker-compose used port 3005, but `.env.example` and `docs/ship-to-aws.md` referenced port 4010
- No AWS account configured locally
- No ECR repo, no image, no secrets, no App Runner service
- Domain `mewsie.omniboost.com` existed in Cloudflare pointing at the marketing site

---

## Step 1 — Port reconciliation

**Goal:** make port 3005 the single source of truth across the repo (the Dockerfile already used it).

**Actions:**
1. Updated `.env.example` → `PORT=3005`
2. Updated `docs/ship-to-aws.md` → every reference to 4010 replaced with 3005
3. Verified `Dockerfile` and `docker-compose.yml` already used 3005
4. Committed as `a2da024` on `main`:
   > `chore(deploy): align .env.example and ship-to-aws.md with Dockerfile port 3005`

**Status of this commit:** local only. **Not yet pushed to GitHub.** Last pushed commit on `origin/main` is `5f6f01b`.

---

## Step 2 — AWS SSO setup

**Goal:** authenticate the local machine against the sandbox AWS account.

**Identifiers:**
- Account: `627626160248` ("Sandbox Matisse van Steenbergen OO")
- Region: `eu-west-1`
- SSO start URL: `https://omniboost.awsapps.com/start`
- SSO session label: `omniboost-sso`
- Local profile name: `sandbox`

**Actions:**
1. Ran `aws configure sso` to create the `sandbox` profile
2. Verified with `aws sts get-caller-identity --profile sandbox` → confirmed account `627626160248`, role `Sandbox`

**To re-auth at any time:**
```bash
aws sso login --profile sandbox
```

---

## Step 3 — Create the ECR repository

**Goal:** somewhere to store the Docker image inside AWS.

**Actions:**
1. Created repo `mewsie` in `eu-west-1` with image scanning enabled (`scanOnPush=true`)
2. Repo URI: `627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie`

---

## Step 4 — First image push (and the arch issue)

**What happened:**
1. First build + push succeeded with digest `sha256:f957c63b…`
2. App Runner failed to pull it cleanly. Investigation showed the cached image was a multi-arch **OCI image index** including `linux/arm64` and an `unknown/unknown` attestation entry (output of `docker buildx` on Apple Silicon)
3. **Rebuilt** with explicit single-arch + no provenance:
   ```bash
   docker build --platform linux/amd64 --provenance=false -t mewsie:amd64 .
   ```
4. Re-pushed under both `latest` and `a2da024` tags
5. New digest: `sha256:9c645049127b39e22dea78ec95bf5aa0cf8194b2aaf03ab6f774668f155f690c`

**Lesson worth keeping:** when building locally on Apple Silicon for App Runner, always use `--platform linux/amd64 --provenance=false`. The default `buildx` output trips up App Runner.

---

## Step 5 — Secrets Manager (8 entries)

**Goal:** App Runner reads runtime secrets from AWS, never from environment files.

All 8 secrets live under the `mewsie/*` prefix in region `eu-west-1`:

| Secret name | Source / value |
|---|---|
| `mewsie/anthropic-api-key` | from local `.env` |
| `mewsie/supabase-url` | from local `.env` |
| `mewsie/supabase-service-key` | from local `.env` |
| `mewsie/confluence-email` | from local `.env` |
| `mewsie/confluence-token` | from local `.env` |
| `mewsie/confluence-base-url` | from local `.env` |
| `mewsie/firecrawl-api-key` | from local `.env` |
| `mewsie/allowed-origins` | `https://mewsie.omniboost.com,https://*.awsapprunner.com` |

**To rotate a secret value:**
```bash
aws secretsmanager put-secret-value \
  --secret-id mewsie/<name> \
  --secret-string '<new-value>' \
  --region eu-west-1 --profile sandbox
```
After rotation, trigger a new deployment so the running container picks it up:
```bash
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
  --region eu-west-1 --profile sandbox
```

---

## Step 6 — IAM roles for App Runner

Two roles were created, each with a single, narrow job.

### Role A — ECR pull access

| Field | Value |
|---|---|
| Name | `MewsieAppRunnerECRAccessRole` |
| ARN | `arn:aws:iam::627626160248:role/MewsieAppRunnerECRAccessRole` |
| Trusted service | `build.apprunner.amazonaws.com` |
| Attached policy | AWS-managed `AWSAppRunnerServicePolicyForECRAccess` |
| Purpose | Lets App Runner pull the Mewsie image from the private ECR repo |

### Role B — Container instance role (secrets reader)

| Field | Value |
|---|---|
| Name | `MewsieAppRunnerInstanceRole` |
| ARN | `arn:aws:iam::627626160248:role/MewsieAppRunnerInstanceRole` |
| Trusted service | `tasks.apprunner.amazonaws.com` |
| Inline policy | `MewsieSecretsRead` — grants `secretsmanager:GetSecretValue` + `DescribeSecret` on `arn:aws:secretsmanager:eu-west-1:627626160248:secret:mewsie/*` |
| Purpose | Lets the running container read its 8 secrets, **nothing else** |

**Note:** the instance role is intentionally tighter than the broad `SecretsManagerReadWrite` policy that would normally be attached. It's scoped to the `mewsie/` prefix only — keep it that way.

---

## Step 7 — Auto-scaling configuration

| Field | Value |
|---|---|
| Name | `mewsie-single-instance` |
| ARN | `arn:aws:apprunner:eu-west-1:627626160248:autoscalingconfiguration/mewsie-single-instance/1/e646f83dc9b84713971e6cfc2b81387d` |
| MinSize | 1 |
| MaxSize | **1** |
| MaxConcurrency | 100 |

**Why min=max=1 (do not raise without warning):** Mewsie sessions live in an in-memory `Map` in `backend/pipeline/session.ts`. With 2 instances, roughly half of follow-up messages would land on the wrong instance and Mewsie would lose conversational context. Horizontal scaling requires moving sessions to an external store (ElastiCache / Redis) first.

---

## Step 8 — The App Runner service

This is the heart of the deployment.

| Field | Value |
|---|---|
| Service name | `mewsie` |
| Service ARN | `arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b` |
| Default URL | `https://998afrnq3y.eu-west-1.awsapprunner.com` |
| Status | `RUNNING` |
| CPU / Memory | `0.5 vCPU` / `1 GB` |
| Container port | `3005` |
| Image | `627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest` |
| Health check | HTTP `GET /health`, interval 10s, timeout 5s, healthy=1, unhealthy=5 |
| Public ingress | `true` |
| Auto-deployment from ECR | **disabled** (manual redeploy only — by design until CI/CD is wired) |
| ECR access role | `MewsieAppRunnerECRAccessRole` |
| Instance role | `MewsieAppRunnerInstanceRole` |
| Auto-scaling config | `mewsie-single-instance` |
| Plain env vars | `PORT=3005`, `NODE_ENV=production`, `ENABLE_DB_WRITES=true` |
| Secret env vars | All 8 above, mapped to `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`, `CONFLUENCE_EMAIL`, `CONFLUENCE_TOKEN`, `CONFLUENCE_BASE_URL`, `FIRECRAWL_API_KEY` |

**Verified post-deploy:**
- `GET /health` → `200 {"status":"ok"}` in ~400 ms
- `GET /` → React widget HTML
- Polling reached `RUNNING` after ~3 minutes from `create-service`

---

## Step 9 — Custom domain association (AWS side)

**Target domain:** `mewsie.omniboost.com`

The custom domain was associated with the App Runner service, which made AWS request an SSL certificate from ACM. AWS returned the validation records that must be added to DNS before the cert can be issued.

| Field | Value |
|---|---|
| Domain | `mewsie.omniboost.com` |
| Status (current) | `pending_certificate_dns_validation` |
| Target the domain CNAME should point to | `998afrnq3y.eu-west-1.awsapprunner.com` |
| Cert validation CNAME #1 — name | `_e39f5eac3988f285ca415af30dba860a.mewsie.omniboost.com` |
| Cert validation CNAME #1 — value | `_067f3ebd323ac486ad49327690fec75e.jkddzztszm.acm-validations.aws.` |
| Cert validation CNAME #2 — name | `_f4bb991e64efc6471272640ea225f86b.fi157n5swir537vnktcz7n3b104p8ic.mewsie.omniboost.com` |
| Cert validation CNAME #2 — value | `_be44418982f3e812a3fb74ff49225d46.jkddzztszm.acm-validations.aws.` |

AWS auto-polls these records every ~minute and flips the status to `active` once they resolve. **No App Runner restart is needed when validation completes** — domain attachment is a control-plane change, not a deployment.

---

## Step 10 — Discovered: omniboost.com is on Cloudflare

Quick `dig +short NS omniboost.com` returned `frank.ns.cloudflare.com` / `rose.ns.cloudflare.com`. The domain is **not** in Route 53 — Cloudflare is authoritative. That means whoever has Cloudflare admin (Bart) needs to add the 3 records (1 site pointer + 2 cert validation CNAMEs) for the production domain to go live.

This is the only remaining external dependency. See `post-deployment-todo.md` → "Cloudflare DNS records".

---

## Step 11 — A note on `.com` vs `.io`

An earlier deployment plan referenced `mewsie.omniboost.io`. The production domain is **`mewsie.omniboost.com`** (consistent with the existing Omniboost domain). The `.io` references in the old plan were stale; `.com` is what was actually configured in AWS and what Cloudflare needs records for.

---

## Quick-reference: identifiers, ARNs, commands

### Identifiers

| Field | Value |
|---|---|
| AWS account | `627626160248` |
| AWS region | `eu-west-1` |
| AWS profile (local) | `sandbox` |
| App Runner default URL | `https://998afrnq3y.eu-west-1.awsapprunner.com` |
| Production domain (planned) | `https://mewsie.omniboost.com` |
| Container port | `3005` |
| Health check path | `/health` |
| GitHub repo | `https://github.com/vansteenbergenmatisse/Mewsy_v2` |
| Last pushed commit | `5f6f01b` |
| Local HEAD (not yet pushed) | `a2da024` |

### ARNs

| Resource | ARN |
|---|---|
| ECR repo | `arn:aws:ecr:eu-west-1:627626160248:repository/mewsie` |
| ECR image URI | `627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest` |
| Current image digest | `sha256:9c645049127b39e22dea78ec95bf5aa0cf8194b2aaf03ab6f774668f155f690c` |
| App Runner service | `arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b` |
| Auto-scaling config | `arn:aws:apprunner:eu-west-1:627626160248:autoscalingconfiguration/mewsie-single-instance/1/e646f83dc9b84713971e6cfc2b81387d` |
| ECR access role | `arn:aws:iam::627626160248:role/MewsieAppRunnerECRAccessRole` |
| Instance role | `arn:aws:iam::627626160248:role/MewsieAppRunnerInstanceRole` |
| Secret ARN prefix | `arn:aws:secretsmanager:eu-west-1:627626160248:secret:mewsie/` |

### Useful commands

```bash
# Refresh SSO (always run first if commands fail with auth errors)
aws sso login --profile sandbox

# Health-check the running service
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
  --region eu-west-1 --profile sandbox \
  --query 'Service.{Status:Status,Url:ServiceUrl}' --output table

# Watch custom-domain validation status (run this the moment Bart says DNS is in)
aws apprunner describe-custom-domains \
  --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
  --region eu-west-1 --profile sandbox \
  --query 'CustomDomains[?DomainName==`mewsie.omniboost.com`].{Domain:DomainName,Status:Status}' \
  --output table

# Tail application logs
aws logs tail /aws/apprunner/mewsie/<service-id>/application \
  --follow --region eu-west-1 --profile sandbox

# Manual redeploy (after pushing a new image)
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
  --region eu-west-1 --profile sandbox

# Rebuild + push (manual deploy from local)
docker build --platform linux/amd64 --provenance=false -t mewsie:amd64 .
SHA=$(git rev-parse --short HEAD)
docker tag mewsie:amd64 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest
docker tag mewsie:amd64 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:$SHA
aws ecr get-login-password --region eu-west-1 --profile sandbox \
  | docker login --username AWS --password-stdin 627626160248.dkr.ecr.eu-west-1.amazonaws.com
docker push 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest
docker push 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:$SHA
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
  --region eu-west-1 --profile sandbox
```
