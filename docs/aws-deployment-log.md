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

---

# Migration to ECS Express Mode (2026-05-21)

> Second migration. App Runner went into AWS maintenance mode on 2026-04-30 — no new features, eventually sunsetting. We moved Mewsie to ECS Express Mode in the same account and region, with App Runner kept running in parallel as a rollback path. App Runner is scheduled for decommission after a 24–72 h soak on ECS.

## TL;DR

Mewsie now runs on **ECS Express Mode** at `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws`. End-to-end Anthropic call verified. App Runner remains active at the old URL pending decommission. The embed loader was swapped to point at ECS; CI workflow file was retargeted but is dormant until OIDC is wired. Phase D (custom domain `mewsie.omniboost.com` on the shared ALB) is blocked on Cloudflare DNS.

## Why ECS Express, not standard Fargate

ECS Express is the lightweight on-ramp to ECS Fargate: AWS auto-provisions the ALB, target groups, listener, security groups, and task networking. We keep all the benefits of standard ECS (per-task IAM, VPC routing, canary deploys, real CloudWatch metrics) without the YAML weight. If we ever outgrow Express, the same task definition runs on standard ECS unchanged.

## Phase A — Stand-up

### A1. Pre-flight (read-only)

Captured before any writes:
- AWS account `627626160248`, profile `sandbox`, region `eu-west-1`
- AWS CLI v2.34.50 — confirmed `aws ecs create-express-gateway-service` exists
- Latest ECR image digest `sha256:e54780d0…` (tags `c47775f` + `latest`)
- 8 Secrets Manager ARNs (with `-XXXXXX` suffixes) — none recreated
- Default VPC `vpc-06db824f3290acf5c` with 3 AZs (4091 free IPs each)
- App Runner cold-start measured at 40–60s from real deploy logs

### A2. IAM roles for ECS

Three roles created (tagged `Project=Mewsie`, `CreatedBy=ecs-express-migration`):

| Role | Trust | Permissions |
|---|---|---|
| `ecsTaskExecutionRole` | `ecs-tasks.amazonaws.com` | AWS-managed `AmazonECSTaskExecutionRolePolicy` + inline `MewsieSecretsRead` on `mewsie/*` |
| `ecsInfrastructureRoleForExpressServices` | `ecs.amazonaws.com` | AWS-managed `AmazonECSInfrastructureRoleforExpressGatewayServices` |
| `MewsieEcsTaskRole` | `ecs-tasks.amazonaws.com` | Inline `MewsieSecretsRead` only |

The `MewsieSecretsRead` policy doc was cloned from the existing `MewsieAppRunnerInstanceRole` to preserve identical secret-scoping (`mewsie/*` prefix only).

### A3. Service-linked roles (preemptive)

First `create-express-gateway-service` call failed with "Unable to assume the service linked role." The ECS account-level SLR (`AWSServiceRoleForECS`) was auto-creating at that moment and hadn't propagated. ELB and AutoScaling SLRs were also absent — this account had only ever used App Runner.

Preemptively created the missing SLRs to make the retry deterministic:
```bash
aws iam create-service-linked-role --aws-service-name elasticloadbalancing.amazonaws.com --profile sandbox
aws iam create-service-linked-role --aws-service-name ecs.application-autoscaling.amazonaws.com --profile sandbox
```

### A3. Express gateway service create

```bash
aws ecs create-express-gateway-service \
  --service-name mewsie \
  --task-definition-family mewsie \
  --primary-container file:///tmp/mewsie-primary-container.json \
  --task-iam-role-arn arn:aws:iam::627626160248:role/MewsieEcsTaskRole \
  --execution-role-arn arn:aws:iam::627626160248:role/ecsTaskExecutionRole \
  --infrastructure-role-arn arn:aws:iam::627626160248:role/ecsInfrastructureRoleForExpressServices \
  --cpu 1024 --memory 2048 \
  --scaling-policy minTaskCount=1,maxTaskCount=1 \
  --deployment-strategy CANARY \
  --region eu-west-1 --profile sandbox
```

Service config:
- 1 vCPU / 2 GB
- Scaling pinned `min=max=1` (same reason as App Runner — in-memory sessions in `backend/pipeline/session.ts:39`)
- CANARY deploys with 3-min bake; `maximumPercent=200` so during a redeploy there are temporarily 2 tasks live and the ALB distributes between them. Sessions started mid-deploy may not survive.
- Container port 3005
- Container-level healthcheck NOT set in task def → `healthStatus` shows `UNKNOWN`. This is normal — ALB target-group health is the real gate.
- Primary container exposes 4 of the 8 secrets: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`. Confluence trio + Firecrawl were excluded — they're scraper-only (`npm run sync` still runs locally), the web service has no path that reads them.

### A4. First deploy lifecycle

| Time (UTC) | Event |
|---|---|
| 15:04:00 | Service create returned, deployment IN_PROGRESS |
| 15:05:17 | Task PROVISIONING |
| 15:05:34 | Task PENDING |
| 15:05:41 | `[server] listening on http://localhost:3005` in logs |
| 15:05:52 | Task RUNNING, deployment COMPLETED |

End-to-end ~100s. Well under the default 300s health-check grace.

## Phase B — Verification (ECS in isolation)

| Test | Result |
|---|---|
| `GET /health` | 200 in 401ms |
| `GET /` | 200 + React shell |
| `POST /webhook/chat` (with correct `chatInput` field) | 200 in 3.15s, real Anthropic answer + BUTTONS marker |
| Same POST against App Runner for parity | 200 in 3.40s, same shape — ECS slightly faster |

**Lesson:** The /webhook/chat endpoint takes `chatInput`, not `message`. The original plan document had the wrong field name — verified against `backend/server.ts:67-77`.

## Phase C — Cutover

### C1. Update CORS allowlist

`mewsie/allowed-origins` was updated to include the new ECS URL (exact match — the parser at `backend/server.ts:33` uses `.includes(origin)` so the legacy `https://*.awsapprunner.com` entry has always been dead code).

```bash
aws secretsmanager put-secret-value \
  --secret-id mewsie/allowed-origins \
  --secret-string 'https://mewsie.omniboost.com,https://*.awsapprunner.com,https://app.omniboost.io,https://base.development.omniboost.io,https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws,https://998afrnq3y.eu-west-1.awsapprunner.com' \
  --region eu-west-1 --profile sandbox
# Then force-new-deployment so the running task picks up the value
aws ecs update-service \
  --service arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie \
  --force-new-deployment --region eu-west-1 --profile sandbox
```

Canary deploy took ~9 min end-to-end. This was also the rehearsal for the redeploy mechanism.

### C2. Embed loader swap

`frontend/public/embed/mewsie-loader.js:27` was edited to point `DEFAULT_URL` at the ECS hostname (will be re-swapped to `mewsie.omniboost.com` in Phase D5).

```bash
# Build single-arch + no provenance (same as App Runner era)
docker build --platform linux/amd64 --provenance=false \
  -t 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest \
  -t 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:ecs-c2 .
aws ecr get-login-password --region eu-west-1 --profile sandbox \
  | docker login --username AWS --password-stdin 627626160248.dkr.ecr.eu-west-1.amazonaws.com
docker push 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest
docker push 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:ecs-c2
aws ecs update-service \
  --service arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie \
  --force-new-deployment --region eu-west-1 --profile sandbox
```

Confirmed pre-flight: `aws apprunner describe-service` showed `AutoDeploymentsEnabled: false`. Pushing `latest` is therefore safe — App Runner won't auto-roll.

Committed as `a24f034`. New ECR digest: `sha256:79c8d75df0e274b818abd5083e130f979ef7a9af806548c301f7684227f08ede`.

Post-deploy verification: curl /embed/mewsie-loader.js on both hosts showed ECS serving the new DEFAULT_URL, App Runner still serving the old one — true parallel state preserved.

### C3. GitHub Actions workflow retarget

`.github/workflows/deploy.yml` was rewritten to call `aws ecs update-service --force-new-deployment` instead of `aws apprunner start-deployment`. The repo secret name in the workflow changed from `APP_RUNNER_SERVICE_ARN` to `ECS_SERVICE_ARN`.

The workflow remains dormant — there is no OIDC IAM role wired in AWS yet, no `AWS_DEPLOY_ROLE_ARN` / `ECS_SERVICE_ARN` secrets in the GitHub repo. Activating it is a separate task (see post-deployment-todo.md item #7).

Committed as `799dff5`.

## Quick reference — new ECS state of record

### Identifiers

| Field | Value |
|---|---|
| ECS service ARN | `arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie` |
| ECS service URL | `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws` |
| CloudWatch log group | `/aws/ecs/default/mewsie-d40c` |
| Task SG | `sg-0c5e03ef397fedbdb` (port 3005 from ALB SG only) |
| ALB SG | `sg-0e65fd23bdd14c648` (80/443 open to world) |
| Latest ECR digest | `sha256:79c8d75df0e274b818abd5083e130f979ef7a9af806548c301f7684227f08ede` (tags `latest` + `ecs-c2`) |

### Shared ALB (multi-tenant across all Express services in account)

| Field | Value |
|---|---|
| Name | `ecs-express-gateway-alb-6cbde4d3` |
| DNS | `ecs-express-gateway-alb-6cbde4d3-1287738133.eu-west-1.elb.amazonaws.com` |
| ARN | `arn:aws:elasticloadbalancing:eu-west-1:627626160248:loadbalancer/app/ecs-express-gateway-alb-6cbde4d3/da03a5cf69d4b73d` |
| HTTPS:443 listener | `arn:aws:elasticloadbalancing:eu-west-1:627626160248:listener/app/ecs-express-gateway-alb-6cbde4d3/da03a5cf69d4b73d/e3c3eb3ca5ca2d37` |
| TLS cert | AWS-managed (auto-issued by ECS Express) |
| Host-header rule for Mewsie | Priority 1, matches the AWS-issued hostname above |

### IAM roles created this migration

| Role | ARN |
|---|---|
| `ecsTaskExecutionRole` | `arn:aws:iam::627626160248:role/ecsTaskExecutionRole` |
| `ecsInfrastructureRoleForExpressServices` | `arn:aws:iam::627626160248:role/ecsInfrastructureRoleForExpressServices` |
| `MewsieEcsTaskRole` | `arn:aws:iam::627626160248:role/MewsieEcsTaskRole` |

### Service-linked roles created this migration

- `AWSServiceRoleForECS`
- `AWSServiceRoleForElasticLoadBalancing`
- `AWSServiceRoleForApplicationAutoScaling_ECSService`

### Useful commands (ECS era)

```bash
# Service health snapshot
aws ecs describe-services --cluster default --services mewsie \
  --region eu-west-1 --profile sandbox \
  --query 'services[0].{Status:status,Running:runningCount,Deploy:deployments[0].rolloutState}' \
  --output table

# Tail application logs
aws logs tail /aws/ecs/default/mewsie-d40c --follow --region eu-west-1 --profile sandbox

# Rebuild + push + redeploy
docker build --platform linux/amd64 --provenance=false \
  -t 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest .
aws ecr get-login-password --region eu-west-1 --profile sandbox \
  | docker login --username AWS --password-stdin 627626160248.dkr.ecr.eu-west-1.amazonaws.com
docker push 627626160248.dkr.ecr.eu-west-1.amazonaws.com/mewsie:latest
aws ecs update-service \
  --service arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie \
  --force-new-deployment --region eu-west-1 --profile sandbox

# Rotate a secret + redeploy so the running task sees the new value
aws secretsmanager put-secret-value \
  --secret-id mewsie/<name> --secret-string '<new-value>' \
  --region eu-west-1 --profile sandbox
aws ecs update-service \
  --service arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie \
  --force-new-deployment --region eu-west-1 --profile sandbox
```

## CI/CD activation (2026-05-21)

GitHub Actions OIDC federation set up so every push to `main` runs the test suite, builds the image, pushes to ECR, and triggers an ECS redeploy. Previously every deploy was a manual `docker build / push / update-service` sequence.

### AWS-side artifacts

| Resource | Value |
|---|---|
| OIDC provider | `arn:aws:iam::627626160248:oidc-provider/token.actions.githubusercontent.com` |
| Deploy role | `arn:aws:iam::627626160248:role/GitHubActions-mewsie-deploy` |
| Inline policy | `MewsieEcrEcsDeploy` (ECR push to `mewsie` repo, ECS UpdateService/DescribeServices on `mewsie` service, iam:PassRole on `ecsTaskExecutionRole` + `MewsieEcsTaskRole`) |
| Trust condition | `repo:vansteenbergenmatisse/Mewsy_v2:*` |

### GitHub-side artifacts

Repo secrets set via `gh secret set` on `vansteenbergenmatisse/Mewsy_v2`:

| Secret | Value | Set by |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::627626160248:role/GitHubActions-mewsie-deploy` | tooling, automated |
| `ECS_SERVICE_ARN` | `arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie` | tooling, automated |
| `ANTHROPIC_API_KEY` | (manual) | **Matisse — required for `npm test` in the workflow's first job** |

### Activation test

After `ANTHROPIC_API_KEY` is added by Matisse, push any small commit to `main`. Watch GitHub Actions → `build-and-deploy`. Expected sequence: `test` job ~1 min → `build-and-push` job ~3 min (image to ECR) → `update-service --force-new-deployment` → canary deploy ~6–9 min → green.

---

## Phase D — Custom domain (in progress)

ACM cert `arn:aws:acm:eu-west-1:627626160248:certificate/5846ffd0-1dc3-4a2f-8d2e-e98ac0669373` requested 2026-05-21. Awaiting Bart to publish 2 CNAMEs in Cloudflare (validation + traffic). When `Status` flips to `ISSUED`:

1. `aws elbv2 add-listener-certificates` to attach cert to the HTTPS:443 listener
2. `aws elbv2 create-rule` with `Field=host-header,Values=mewsie.omniboost.com` → forward to the Mewsie target group
3. Re-edit `frontend/public/embed/mewsie-loader.js:27` to `https://mewsie.omniboost.com`, docker build + push + redeploy
4. Verify `curl https://mewsie.omniboost.com/health` returns 200

## Phase E — App Runner decommission (planned)

After 24–72 h of stable ECS operation on the custom domain:

```bash
# Delete the App Runner service
aws apprunner delete-service \
  --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
  --region eu-west-1 --profile sandbox

# Delete the obsolete App Runner IAM roles
aws iam delete-role --role-name MewsieAppRunnerInstanceRole --profile sandbox
aws iam delete-role --role-name MewsieAppRunnerECRAccessRole --profile sandbox

# Drop the dead *.awsapprunner.com + ECS-default-URL entries from the CORS allowlist
aws secretsmanager put-secret-value \
  --secret-id mewsie/allowed-origins \
  --secret-string 'https://mewsie.omniboost.com,https://app.omniboost.io,https://base.development.omniboost.io' \
  --region eu-west-1 --profile sandbox
aws ecs update-service \
  --service arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie \
  --force-new-deployment --region eu-west-1 --profile sandbox
```

The App Runner auto-scaling configuration `mewsie-single-instance` can also be deleted at this point; no other service references it.
