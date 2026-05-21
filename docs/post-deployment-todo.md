# Mewsie — Post-Deployment Todo

> Open work that follows the AWS migration. Items are **independent** and **reorderable** — each block has Priority / Status / Owner / Effort fields you can edit freely. The suggested priority is opinion, not law.
>
> For the completed migration log, see `aws-deployment-log.md`.
>
> **Updated 2026-05-21:** Mewsie has been migrated from App Runner to ECS Express Mode. All commands and ARNs below have been retargeted at the ECS service. App Runner is still running in parallel pending decommission (Phase E in the deployment log). Where an item is still meaningful, it's been rewritten for ECS; where it's been superseded, the original is preserved with a strike-through and a note pointing at the new equivalent.

---

## Quick legend

| Field | Values |
|---|---|
| **Priority** | ★★★ critical · ★★ important · ★ nice-to-have |
| **Status** | Blocked · Ready · In progress · Optional · Done |
| **Effort** | Quick (< 1 h) · Medium (1–4 h) · Big (1+ day) |

---

## 1. Cloudflare DNS records → production domain live (Phase D)

- **Priority:** ★★★
- **Status:** Blocked (waiting on Bart)
- **Owner:** Bart (Cloudflare admin); Matisse to verify
- **Effort:** Quick

**What:** Add 2 CNAME records in Cloudflare for `omniboost.com` so `mewsie.omniboost.com` resolves to the ECS Express ALB and the SSL cert validates.

> **Updated 2026-05-21 for ECS Express.** Previously this item targeted App Runner with 3 records (1 site pointer + 2 cert validation CNAMEs). On ECS the shared ALB has its own host-header rule, so we only need 2 records.

**Why:** Without these records, the ACM cert stays `PENDING_VALIDATION` and Mewsie can only be reached on the raw ECS hostname `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws`. Both records must be **grey-cloud (DNS only)** — orange-cloud proxying breaks the TLS handshake against the ALB.

**Records to send Bart:**

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `_6b2e2a6f069fc9b98024660e83322cc3.mewsie.omniboost.com` | `_0656ec99024903dcff45521fb2dc593f.jkddzztszm.acm-validations.aws.` | DNS-only (grey) |
| CNAME | `mewsie.omniboost.com` | `ecs-express-gateway-alb-6cbde4d3-1287738133.eu-west-1.elb.amazonaws.com` | DNS-only (grey) |

**How:**
1. Send Bart the records above
2. Bart adds them in Cloudflare → both grey cloud
3. Once Bart confirms, poll for cert issuance:
   ```bash
   aws acm describe-certificate \
     --certificate-arn arn:aws:acm:eu-west-1:627626160248:certificate/5846ffd0-1dc3-4a2f-8d2e-e98ac0669373 \
     --region eu-west-1 --profile sandbox \
     --query 'Certificate.Status' --output text
   ```
4. When status flips from `PENDING_VALIDATION` to `ISSUED` (5–30 min after DNS propagates):
   ```bash
   # Attach cert to the shared ALB HTTPS:443 listener
   aws elbv2 add-listener-certificates \
     --listener-arn arn:aws:elasticloadbalancing:eu-west-1:627626160248:listener/app/ecs-express-gateway-alb-6cbde4d3/da03a5cf69d4b73d/e3c3eb3ca5ca2d37 \
     --certificates CertificateArn=arn:aws:acm:eu-west-1:627626160248:certificate/5846ffd0-1dc3-4a2f-8d2e-e98ac0669373 \
     --region eu-west-1 --profile sandbox

   # Add a host-header rule for mewsie.omniboost.com → Mewsie target group
   # (look up TargetGroupArn first via `aws elbv2 describe-rules --listener-arn <same>` to mirror the existing priority-1 rule)
   aws elbv2 create-rule \
     --listener-arn arn:aws:elasticloadbalancing:eu-west-1:627626160248:listener/app/ecs-express-gateway-alb-6cbde4d3/da03a5cf69d4b73d/e3c3eb3ca5ca2d37 \
     --priority 2 \
     --conditions Field=host-header,Values=mewsie.omniboost.com \
     --actions Type=forward,TargetGroupArn=<TG_ARN_HERE> \
     --region eu-west-1 --profile sandbox
   ```
5. Re-swap the embed loader to the custom domain (Phase D5):
   - Edit `frontend/public/embed/mewsie-loader.js:27` → `https://mewsie.omniboost.com`
   - Commit, docker build/push, `aws ecs update-service --force-new-deployment`
6. Verify:
   ```bash
   curl -sS https://mewsie.omniboost.com/health   # → {"status":"ok"}
   ```

---

## 2. Marion — verify Mewsie still works embedded in Base

- **Priority:** ★★★
- **Status:** Ready (can start before DNS is in — test against the raw ECS URL first)
- **Owner:** Marion (test); Matisse (coordinate)
- **Effort:** Quick

**What:** Confirm the Mewsie chat widget still works when embedded in the Base platform after the ECS migration. The widget hits `POST /webhook/chat` on the Mewsie backend; the embed loader URL was swapped to ECS in commit `a24f034`, so any cached old loader in Base needs a hard refresh.

> **Updated 2026-05-21 for ECS Express.** Previously this item validated against the App Runner default URL. ECS is now the default; App Runner still works but is the rollback path.

**Why:** The embed loader's `DEFAULT_URL` now points at the ECS host (`https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws`). Anything in Base that hard-loaded the old `mewsie-loader.js` is cached against the App Runner URL — still works, but not what users will hit after Phase D5 swaps the loader to `mewsie.omniboost.com`.

**How:**
1. Ask Marion to **hard-refresh** the page in Base that embeds Mewsie (Cmd+Shift+R)
2. He should:
   - Confirm the widget renders
   - Send a test message and confirm a reply comes back
   - Open browser devtools → Network tab → confirm the chat request goes to the ECS hostname (and later, once DNS is live, `https://mewsie.omniboost.com`) and returns 200
   - Check the console for any CORS errors
3. If the widget shows requests going to the old App Runner URL, Base is using a stale cached `mewsie-loader.js` — clear cache or wait for Base's CDN TTL to expire
4. If a CORS error appears, the embedding origin needs to be added to the `mewsie/allowed-origins` secret in AWS — let Matisse know which origin and he'll add it (the parser uses exact-match, see item #8)

**Message template for Marion (English):**
> Hey Marion — we just migrated Mewsie from App Runner to ECS Express Mode. Can you test that the Mewsie widget still works inside Base?
> 1. Hard-refresh (Cmd+Shift+R) the Base page where Mewsie is embedded
> 2. Send a test message in the widget and confirm you get a reply
> 3. Open devtools → Network tab → check the chat request goes to `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws` (later: `https://mewsie.omniboost.com`) and comes back 200
> 4. Let me know if anything's broken or still pointing at the old App Runner URL.

---

## 3. End-to-end functional test of the live deployment

- **Priority:** ★★★
- **Status:** Ready
- **Owner:** Matisse
- **Effort:** Medium

**What:** Walk the full Mewsie experience on the AWS deployment and confirm everything Mewsie was supposed to do still works.

**Why:** Migration tests `/health` and "the widget loads". Real users do much more: ask questions in multiple languages, hit clarify loops, trigger frustration tone, expect ticket creation, etc. Catching regressions now beats catching them in customer reports.

**How** — quick checklist (run on `https://998afrnq3y.eu-west-1.awsapprunner.com` or the live domain once DNS is up):

| Test | Pass criteria |
|---|---|
| Send a basic English question (e.g. "How do I set up Mews to Exact Online?") | Get a relevant answer drawn from `knowledge/website/` |
| Switch to Dutch via the flag dropdown | Subsequent answer is in Dutch |
| Ask something nonsensical | Mewsie falls into BASIC_MODE, says it can't help, asks for context |
| Ask something ambiguous | Mewsie enters CLARIFY_MODE, asks a targeted clarifying question with option buttons |
| Trigger the clarify loop 3+ times | Mewsie exits CLARIFY_MODE after `MAX_CLARIFY_ROUNDS` (3) and gives best-effort answer |
| Spam frustrated messages 3x in a row | Mewsie shifts tone, offers human-support escalation |
| Click "Yes, create a ticket" when offered | **Currently fails** — Salesforce integration is still a stub (see item 7) |
| Confirm the rate limiter (60/min) returns 429 if exceeded | 429 with friendly message |
| Confirm DB writes land in Supabase | Check `errors`, `sessions`, `events` tables for fresh rows |
| Reload the page | Session resets (sessions are in-memory; expected) |

Anything that fails goes into a new item in this file.

---

## 4. Push the local commit to GitHub

- **Priority:** ★★
- **Status:** **Done 2026-05-21** — `origin/main` is at `799dff5` (commits `a2da024`, `3819832`, `c47775f`, `a24f034`, `799dff5`, `a3895ed` all pushed)
- **Owner:** Matisse
- **Effort:** Quick

**What:** Push pending commits from local `main` to `origin/main`.

**How (already executed):**
```bash
git push origin main
```

**Note on the `mewsy` remote (`https://github.com/matissevs2000-creator/Mewsy.git`):** the upstream repo currently returns 404 — either deleted or renamed. Push there fails. Either fix the URL or `git remote remove mewsy`; not blocking anything.

---

## 5. Decide what to do with the unfinished Salesforce ticket integration

- **Priority:** ★★ (★★★ if customer support relies on it)
- **Status:** In progress (stubbed, never finished)
- **Owner:** Matisse + whoever owns Salesforce credentials
- **Effort:** Medium

**What:** `backend/integrations/salesforce/index.ts` is a stub. `createTicket()` always returns `{ success: false, ticketId: null, error: 'Not implemented yet' }`. The frustration-escalation flow offers ticket creation but the offer cannot succeed.

**Why:** When Mewsie can't help, the only escape hatch for a frustrated user is "create a ticket". If that quietly fails, the user is stuck. Either finish the integration or stop offering the option.

**How** — two paths, pick one:

**Path A — Finish the integration:**
1. Get Salesforce REST API credentials (instance URL, client ID, client secret)
2. Add 3 new secrets to AWS Secrets Manager: `mewsie/salesforce-instance-url`, `mewsie/salesforce-client-id`, `mewsie/salesforce-client-secret`
3. Wire them into the App Runner service env vars
4. Implement OAuth client-credentials flow + the `POST /services/data/vXX.X/sobjects/Case` call in `createTicket()`
5. Test against a Salesforce sandbox first

**Path B — Remove the offer:**
1. Strip the "create a ticket" branch from the frustration flow in `backend/pipeline/agent.ts`
2. Replace with "please email support@..." or similar static message
3. Delete `backend/integrations/salesforce/` if not coming back

---

## 6. Decide what to do with the unfinished error alerts

- **Priority:** ★★
- **Status:** In progress (stubbed)
- **Owner:** Matisse
- **Effort:** Quick (each path)

**What:** `backend/errors/alerts.ts` has two stubs: `sendSlackAlert()` and `sendEmailAlert()`. Both are empty function bodies. So when Mewsie errors in production, nothing alerts anyone.

**Why:** Right now if Anthropic 5xx's or Supabase goes down, errors land in CloudWatch logs and nowhere else. Nobody knows unless they look. Even a basic Slack webhook is better than silence.

**How** — minimum viable alerting:
1. Create a Slack incoming webhook in the Omniboost Slack workspace
2. Add it as a new AWS secret: `mewsie/slack-webhook-url`
3. Map it to env var `SLACK_WEBHOOK_URL` in the App Runner service
4. Implement `sendSlackAlert()` — single `fetch(POST)` with JSON body `{ text: JSON.stringify(logEntry) }`
5. Email alerts are lower priority — can be left as stub or removed

---

## 7. GitHub Actions CI/CD — auto-deploy on push to `main`

- **Priority:** ★★
- **Status:** Ready — workflow file is already retargeted at ECS (commit `799dff5`); needs OIDC role + 3 repo secrets to come alive
- **Owner:** Matisse
- **Effort:** Medium

**What:** Activate the existing CI/CD pipeline so every push to `main` runs tests, builds the image, pushes to ECR, and triggers an ECS redeploy.

> **Updated 2026-05-21 for ECS Express.** The deploy step now calls `aws ecs update-service --force-new-deployment` instead of `aws apprunner start-deployment`. The repo secret is now `ECS_SERVICE_ARN` (not `APP_RUNNER_SERVICE_ARN`).

**Why:** Today the only way to deploy is the manual `docker build && push && update-service` sequence. That's fine for now but slow + error-prone. CI/CD removes the manual step and gives every deploy a build log.

**How:**
1. Create a GitHub OIDC provider in AWS (one-time per account):
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
     --profile sandbox
   ```
2. Create an IAM role `GitHubActions-mewsie-deploy` that trusts the OIDC provider scoped to `repo:vansteenbergenmatisse/Mewsy_v2:*`. Attach a policy allowing:
   - `ecr:GetAuthorizationToken` on `*`
   - `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage` on `arn:aws:ecr:eu-west-1:627626160248:repository/mewsie`
   - `ecs:UpdateService`, `ecs:DescribeServices` on `arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie`
   - `iam:PassRole` on `arn:aws:iam::627626160248:role/ecsTaskExecutionRole` and `arn:aws:iam::627626160248:role/MewsieEcsTaskRole`
3. Add 3 GitHub repository secrets under Settings → Secrets and variables → Actions:
   - `AWS_DEPLOY_ROLE_ARN` — the role ARN from step 2
   - `ECS_SERVICE_ARN` — `arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie`
   - `ANTHROPIC_API_KEY` — needed because `npm test` makes a real API call
4. Push a tiny commit to `main` and watch the Actions tab — pipeline should run end to end

---

## 8. Tighten `ALLOWED_ORIGINS` after the production domain is live

- **Priority:** ★★
- **Status:** Blocked (waits for item 1 + item 2)
- **Owner:** Matisse
- **Effort:** Quick

**What:** Today the secret `mewsie/allowed-origins` contains both ECS and App Runner default URLs plus a legacy `https://*.awsapprunner.com` wildcard. After Phase E, drop the App Runner entries.

> **Updated 2026-05-21 for ECS Express.** Also flags a real bug: `backend/server.ts:33` uses `.includes(origin)` (exact-match). The `*` wildcard syntax has never actually matched anything — `https://*.awsapprunner.com` was dead code from day one. Worth fixing the parser as a separate small item, or accepting that the allowlist is exact-match only.

**Why:** Once App Runner is decommissioned (Phase E), the App Runner default URL stops resolving, so allowing it does nothing useful. Also tightens the allowlist to the surfaces we actually serve.

**How (post-Phase E):**
1. Confirm Base + any other embedders point at the production domain (depends on item 2)
2. Update the secret to the production domain + partner domains only:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id mewsie/allowed-origins \
     --secret-string 'https://mewsie.omniboost.com,https://app.omniboost.io,https://base.development.omniboost.io' \
     --region eu-west-1 --profile sandbox
   ```
3. Redeploy so the running ECS task picks up the new value:
   ```bash
   aws ecs update-service \
     --service arn:aws:ecs:eu-west-1:627626160248:service/default/mewsie \
     --force-new-deployment --region eu-west-1 --profile sandbox
   ```

**Separate sub-item — fix the wildcard parser:** in `backend/server.ts:33`, swap the `.includes(origin)` check for a small helper that interprets `*.foo.com` as a glob (match any subdomain) but rejects `foo.*` (no domain-prefix wildcards). Add 2 tests in `tests/suites/check-cors.ts`. Out of migration scope; defer.

---

## 9. CloudWatch alarms — minimum production observability

- **Priority:** ★★
- **Status:** Optional but recommended before public launch — App Runner had basic built-in monitoring; ECS Express has zero alarms by default
- **Owner:** Matisse
- **Effort:** Medium

**What:** Set up basic alarms so we hear about problems instead of finding them in users' faces.

> **Updated 2026-05-21 for ECS Express.** Metric namespaces have changed: App Runner metrics (`AWS/AppRunner`) no longer apply once Phase E removes that service. ECS metrics live in `AWS/ECS` (task-level) and `AWS/ApplicationELB` (request-level via the shared ALB).

**Why:** Currently there are no alarms at all. A task crash or a spike in 5xx errors only surfaces in CloudWatch logs — no proactive notification.

**How** — suggested initial set (one SNS topic with email subscription, all alarms target it):

| Metric (namespace / name) | Dimensions | Threshold | Why |
|---|---|---|---|
| `AWS/ECS / RunningTaskCount` | ClusterName=default, ServiceName=mewsie | `< 1` for 2 min | Task crashed and isn't being replaced — Mewsie is down |
| `AWS/ECS / CPUUtilization` | same | `> 90%` for 10 min | Service is hot, may need a vCPU bump |
| `AWS/ECS / MemoryUtilization` | same | `> 80%` for 10 min | Memory pressure — OOM imminent |
| `AWS/ApplicationELB / HTTPCode_Target_5XX_Count` | LoadBalancer=app/ecs-express-gateway-alb-6cbde4d3/... | `> 5` in 5 min | Mewsie is throwing 5xx — investigate |
| `AWS/ApplicationELB / TargetResponseTime` | same, TargetGroup=Mewsie's | `> 8s` p95 for 10 min | Anthropic latency or container saturation |
| (Stretch) Lambda → Supabase `errors` table delta | n/a | configurable | Supabase doesn't expose CloudWatch metrics directly |

---

## 10. Scheduled scraper task on ECS Fargate

- **Priority:** ★
- **Status:** Optional (knowledge currently baked into the image)
- **Owner:** Matisse
- **Effort:** Big

**What:** Run `backend/scraper/` automatically every 24 hours instead of manually.

**Why:** Today the knowledge base is frozen at image-build time. Updating means rebuilding + redeploying. The scraper already exists (`npm run sync`) and would refresh `knowledge/` daily if scheduled.

**How:**
1. Create EventBridge cron rule `cron(0 3 * * ? *)` (3 AM UTC daily)
2. Target an ECS Fargate scheduled task using the same `mewsie:latest` image with command override `["npm","run","sync"]`
3. Persistence options for the updated `knowledge/` files (pick one):
   - **(a)** PR back to GitHub → next deploy picks them up
   - **(b)** Write to S3 + hydrate the in-memory KB at container boot
4. Until then, knowledge updates require an image rebuild + redeploy

---

## 11. Version management

- **Priority:** ★
- **Status:** Not started
- **Owner:** Matisse
- **Effort:** Medium

**What:** A real release / version-tagging strategy for Mewsie. Today: untagged commits, the only "version" is the git SHA on the ECR image.

**Why:** Once auto-deploy is on (item 7) and Mewsie is on the production domain, knowing exactly what's running becomes operationally important. "It broke today" is hard to debug without a version trail.

**How** — pick a level, all stack:
1. **Minimum:** make sure CI/CD tags every ECR image with the short git SHA (the manual deploy already does — formalize it)
2. **Better:** semantic versioning (`v1.2.0`) via git tags + a `CHANGELOG.md`. Tag every deploy.
3. **Best:** GitHub Releases generated from commit messages (Conventional Commits → release-please or similar)

Lowest-priority of the open items — fine to defer until the rest is stable.

---

## 12. New GitHub setup / pushing everything live for team testing

- **Priority:** ★★
- **Status:** Needs clarification before action
- **Owner:** Matisse
- **Effort:** TBD (depends on what "new GitHub" means)

**What:** Open question — what does "new GitHub" cover?
- Option A — **Just push pending commits** (item 4 covers this)
- Option B — **Activate CI/CD** so others can push and have it deploy (item 7 covers this)
- Option C — **Move the repo** to an Omniboost-org GitHub account (today it's on `vansteenbergenmatisse`)
- Option D — **Open the repo up** for teammate access (invite collaborators)

The first three are already separate items. Option C and D are mainly process: transfer ownership in GitHub, then update any CI/CD references to the new repo path. Decide which of these you actually want and we'll create a clear sub-item.

---

## 13. Cleanup

- **Priority:** ★
- **Status:** Partly done — `.gitignore` updated 2026-05-21 to exclude `.compact-ultra/`
- **Owner:** Matisse
- **Effort:** Quick

**What:** Tidy-up jobs that don't affect functionality but reduce confusion later.

**How:**
1. Delete `railway.toml` from the repo root — Mewsie is no longer on Railway
2. Delete or repoint `tests/verify-deployment.ts` — it likely points at the old Railway URL (and now also predates ECS)
3. De-dupe the `PORT=` line in local `.env` — there's a `PORT=3005` and a `PORT=4010`, the second wins for local `npm start` (does not affect Docker or AWS)
4. Optionally delete obsolete ECR image digests with `aws ecr batch-delete-image` (current good digest: `sha256:79c8d75df0e274b818abd5083e130f979ef7a9af806548c301f7684227f08ede`)
5. Remove the `HEALTHCHECK` line from the Dockerfile — ECS ignores container-level healthchecks and gates routing on ALB target group health instead. Keeping it is harmless but misleading.

---

## 14. Find the live Supabase project (current URL returns NXDOMAIN)

- **Priority:** ★★★
- **Status:** Blocked (need to identify the correct Supabase project)
- **Owner:** Matisse
- **Effort:** Medium

**What:** The `SUPABASE_URL` in local `.env` (and in the AWS secret `mewsie/supabase-url` copied from it) points to `https://cxximiovljspbpfclgfr.supabase.co`, which **fails DNS resolution (NXDOMAIN)**. The project at that ref no longer exists — it was either deleted, renamed, or moved.

**Consequences right now:**
- Every DB write in production is silently failing (`fetch failed`)
- The 8 analytics tables (`users`, `conversations`, `bundles`, `messages`, `llm_calls`, `feedback`, `help_panel_opens`, `errors`) are not receiving rows
- The Base ↔ Mewsie identity sync (`POST /api/sync-context`) cannot persist the link, even if Base sends the call correctly
- `npm test` passes anyway because the DB tests treat fetch errors as a "skip" rather than a "fail" — this is a real testing-coverage gap (see notes below)

**Why this is a ★★★ blocker:** Mewsie still answers questions, so users don't notice. But all the analytics that make the product improvable — feedback votes, error tracking, tier-aware behavior, LLM cost tracking, Base user matching — are dead. This must be fixed before Mewsie is used by real customers from Base or we lose every signal we should be capturing.

**How:**
1. Log into the Omniboost Supabase organization and find the actual current Mewsie project — confirm its project ref + URL
2. Verify the schema is up to date by running each migration in order in the Supabase SQL Editor:
   ```
   backend/db/migrations/0001_add_base_user_id.sql      ← obsolete after 0002, only run on a virgin DB
   backend/db/migrations/0002_merge_users_customers.sql
   backend/db/migrations/0003_add_tier_to_users.sql
   backend/db/migrations/0004_enrich_feedback.sql
   backend/db/migrations/0005_help_opens_nullable_conversation.sql
   ```
   (Or, on a virgin DB, just run `backend/db/schema.sql` which is already the post-migration state.)
3. Update local `.env`: set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to the new project's values
4. Update the AWS secrets:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id mewsie/supabase-url \
     --secret-string '<new-supabase-url>' \
     --region eu-west-1 --profile sandbox
   aws secretsmanager put-secret-value \
     --secret-id mewsie/supabase-service-key \
     --secret-string '<new-service-key>' \
     --region eu-west-1 --profile sandbox
   ```
5. Trigger a redeploy so the running container picks up the new secret values:
   ```bash
   aws apprunner start-deployment \
     --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
     --region eu-west-1 --profile sandbox
   ```
6. Send a test message via the deployed widget and confirm a row lands in `users` (and downstream `conversations`, `bundles`, `messages`)

**Test-suite gap to fix afterwards:** `tests/suites/check-db.ts` skips DB tests when the response error contains `'base_user_id'` or `'schema cache'`. It should instead **fail loudly** when the Supabase host can't be reached at all — that's a different problem from a missing column and should not be silenced. Worth a small follow-up to that suite once the DB is live again.

---

## Suggested order at a glance (re-order freely)

| Step | Item |
|---|---|
| 1 | **Cloudflare DNS records** (item 1) — unblock the production domain |
| 2 | **Find the live Supabase project** (item 14) — restore production analytics + Base sync |
| 3 | **Marion → Base test** (item 2) — confirm the embed still works |
| 4 | **End-to-end test** (item 3) — confirm the deployment behaves |
| 5 | **Push local commit** (item 4) — get GitHub in sync |
| 6 | **Decide Salesforce path** (item 5) — close the half-finished escape hatch |
| 7 | **Slack alerts** (item 6) — minimum observability |
| 8 | **GitHub Actions CI/CD** (item 7) — auto-deploy on push |
| 9 | **Tighten ALLOWED_ORIGINS** (item 8) — after items 1 + 3 confirm |
| 10 | **CloudWatch alarms** (item 9) |
| 11 | **Scheduled scraper** (item 10) |
| 12 | **Version management** (item 11) |
| 13 | **Clarify "new GitHub"** (item 12) |
| 14 | **Cleanup** (item 13) |
