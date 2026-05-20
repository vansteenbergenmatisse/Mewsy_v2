# Mewsie — Post-Deployment Todo

> Open work that follows the AWS migration. Items are **independent** and **reorderable** — each block has Priority / Status / Owner / Effort fields you can edit freely. The suggested priority is opinion, not law.
>
> For the completed migration log, see `aws-deployment-log.md`.

---

## Quick legend

| Field | Values |
|---|---|
| **Priority** | ★★★ critical · ★★ important · ★ nice-to-have |
| **Status** | Blocked · Ready · In progress · Optional · Done |
| **Effort** | Quick (< 1 h) · Medium (1–4 h) · Big (1+ day) |

---

## 1. Cloudflare DNS records → production domain live

- **Priority:** ★★★
- **Status:** Blocked (waiting on Bart)
- **Owner:** Bart (Cloudflare admin); Matisse to verify
- **Effort:** Quick

**What:** Add 3 CNAME records in Cloudflare for `omniboost.com` so `mewsie.omniboost.com` resolves to App Runner and the SSL cert validates.

**Why:** Without these records, the domain stays `pending_certificate_dns_validation` and Mewsie can only be reached on the default `998afrnq3y.eu-west-1.awsapprunner.com` URL. All three must be **grey-cloud (DNS only)** — orange-cloud proxying breaks the cert handshake.

**How:**
1. Send Bart the records (already prepared in the Slack message you sent)
2. Bart adds them in Cloudflare → all grey cloud
3. Run from the repo root once Bart confirms:
   ```bash
   aws apprunner describe-custom-domains \
     --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
     --region eu-west-1 --profile sandbox \
     --query 'CustomDomains[?DomainName==`mewsie.omniboost.com`].Status' --output text
   ```
4. When status flips from `pending_certificate_dns_validation` to `active` (5–20 min after DNS propagates):
   ```bash
   curl -sS https://mewsie.omniboost.com/health
   ```
5. Expect `{"status":"ok"}`.

---

## 2. Marion — verify Mewsie still works embedded in Base

- **Priority:** ★★★
- **Status:** Ready (can start before DNS is in)
- **Owner:** Marion (test); Matisse (coordinate)
- **Effort:** Quick

**What:** Confirm the Mewsie chat widget still works when embedded in the Base platform after the AWS migration. The widget hits `POST /webhook/chat` on the Mewsie backend, so any URL change has to be reflected in Base, and the CORS allowlist on Mewsie's side has to permit Base's origin.

**Why:** The migration changed the backend host. Anything in Base that hard-codes the old Railway URL will silently break. Better to catch this before users hit it.

**How:**
1. Ask Marion to load the page in Base that embeds Mewsie
2. He should:
   - Confirm the widget renders
   - Send a test message and confirm a reply comes back
   - Open browser devtools → Network tab → confirm the request goes to `https://998afrnq3y.eu-west-1.awsapprunner.com` (or, once DNS is live, `https://mewsie.omniboost.com`) and returns 200
   - Check the console for any CORS errors
3. If the widget URL inside Base is still pointing at the old Railway host, that's the fix Marion (or whoever owns Base) needs to make on the Base side
4. If a CORS error appears, the embedding origin needs to be added to the `mewsie/allowed-origins` secret in AWS — let Matisse know which origin and he'll add it

**Message template for Marion (English):**
> Hey Marion — we just migrated Mewsie from Railway to AWS. Can you test that the Mewsie widget still works inside Base?
> 1. Open the Base page where Mewsie is embedded
> 2. Send a test message in the widget and confirm you get a reply
> 3. Open devtools → Network tab → check the chat request goes to `https://998afrnq3y.eu-west-1.awsapprunner.com` (later: `https://mewsie.omniboost.com`) and comes back 200
> 4. Let me know if anything's broken or pointing at the old Railway URL.

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
- **Status:** Ready (needs Matisse's explicit OK to push)
- **Owner:** Matisse
- **Effort:** Quick

**What:** Push commit `a2da024` (`chore(deploy): align .env.example and ship-to-aws.md with Dockerfile port 3005`) from local `main` to `origin/main`.

**Why:** GitHub doesn't yet know about the port fix. Anyone else cloning the repo gets stale config. Also, GitHub Actions auto-deploy (item 8) won't run on commits that aren't on origin.

**How:**
```bash
git push origin main
```
That's it. No force, no rebase — straight push of one commit ahead.

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
- **Status:** Ready (dormant workflow already exists at `.github/workflows/deploy.yml`)
- **Owner:** Matisse
- **Effort:** Medium

**What:** Activate the existing CI/CD pipeline so every push to `main` runs tests, builds the image, pushes to ECR, and triggers an App Runner redeploy.

**Why:** Today the only way to deploy is the manual `docker build && push && start-deployment` sequence. That's fine for now but slow + error-prone. CI/CD removes the manual step.

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
   - `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage` on `*`
   - `apprunner:StartDeployment` on the Mewsie service ARN
3. Add 3 GitHub repository secrets under Settings → Secrets and variables → Actions:
   - `AWS_DEPLOY_ROLE_ARN` — the role ARN from step 2
   - `APP_RUNNER_SERVICE_ARN` — `arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b`
   - `ANTHROPIC_API_KEY` — needed because `npm test` makes a real API call
4. Push a tiny commit to `main` and watch the Actions tab — pipeline should run end to end

---

## 8. Tighten `ALLOWED_ORIGINS` after the production domain is live

- **Priority:** ★★
- **Status:** Blocked (waits for item 1 + item 2)
- **Owner:** Matisse
- **Effort:** Quick

**What:** Today the secret `mewsie/allowed-origins` is `https://mewsie.omniboost.com,https://*.awsapprunner.com`. The wildcard was a safety net during migration. Drop it once we're sure Base + any other embedders point at the production domain.

**Why:** The `*.awsapprunner.com` wildcard would let any other App Runner service in any account talk to the Mewsie backend. Low risk because nobody's using it, but trivial to tighten.

**How:**
1. Confirm Base no longer points at the App Runner default URL (depends on item 2)
2. Confirm no other embeds rely on it
3. Update the secret to the production domain + any partner domains:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id mewsie/allowed-origins \
     --secret-string 'https://mewsie.omniboost.com,https://<base-domain>' \
     --region eu-west-1 --profile sandbox
   ```
4. Redeploy:
   ```bash
   aws apprunner start-deployment \
     --service-arn arn:aws:apprunner:eu-west-1:627626160248:service/mewsie/6ca9af68b42546189a0894d11715f74b \
     --region eu-west-1 --profile sandbox
   ```

---

## 9. CloudWatch alarms — minimum production observability

- **Priority:** ★★
- **Status:** Optional but recommended before public launch
- **Owner:** Matisse
- **Effort:** Medium

**What:** Set up basic alarms so we hear about problems instead of finding them in users' faces.

**Why:** Currently there are no alarms at all. A spike in 5xx errors or memory exhaustion would only surface in logs.

**How** — suggested initial set:
1. App Runner `5xxStatusResponses` > 5 in 5 min → SNS → email
2. App Runner `MemoryUtilization` > 80% for 10 min → SNS → email
3. App Runner `CPUUtilization` > 90% for 10 min → SNS → email
4. (Stretch) Lambda that polls Supabase `errors` table delta — Supabase doesn't expose CloudWatch metrics directly

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
- **Status:** Optional
- **Owner:** Matisse
- **Effort:** Quick

**What:** Tidy-up jobs that don't affect functionality but reduce confusion later.

**How:**
1. Delete `railway.toml` from the repo root — Mewsie is no longer on Railway
2. Delete or repoint `tests/verify-deployment.ts` — it likely points at the old Railway URL
3. De-dupe the `PORT=` line in local `.env` — there's a `PORT=3005` and a `PORT=4010`, the second wins for local `npm start` (does not affect Docker or AWS)
4. Optionally delete the old image digest `sha256:f957c63b…` from ECR with `aws ecr batch-delete-image`

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
