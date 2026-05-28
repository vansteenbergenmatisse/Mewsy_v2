# Mewsie — Needs Attention

> A single, candid inventory of everything that is half-done, stale, broken, deferred, or otherwise demands future attention. Companion to `post-deployment-todo.md` (which is the operational todo list) — this doc is the wider, more candid picture, including things that aren't formally tracked as tickets yet.
>
> Generated on the date of this commit. If you read this six months from now, **verify each item before acting on it** — half of these will already be fixed and the doc may not reflect that.

---

## TL;DR

The biggest single thing blocking us from declaring "Mewsie is live and integrated" is that **the latest security and integration fixes for the Base→Mewsie sync endpoint have not been deployed** — local `main` has commits that the live ECS image does not. Beyond that: Supabase is dead (no persistence in prod), the custom domain isn't live (DNS blocked on Cloudflare), and there are a handful of low-grade bugs and stub modules that should be cleaned up before this becomes someone else's problem.

---

## CRITICAL — production-affecting, fix before involving Base

### C1. Live ECS image is stale — security fixes not deployed

- **Symptom:** A POST to `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/api/sync-context` with **no** auth header returns `200 {"ok":true,"isNew":false,"userId":"error"}`. It should return `401 Unauthorized`.
- **Cause:** Commits `b406211` (secure sync endpoint) and `bcccaf4` (post-fix adversarial review fixes) sit in local `main` but were never pushed to a remote that triggers CI/CD.
- **Impact:** The Base sync endpoint is currently *unauthenticated* and silently fails (returns the legacy `userId:"error"` sentinel) instead of throwing. Anyone who knows the URL can hit it; nothing is persisted.
- **Fix:** Push `main` to whichever remote drives CI/CD (after this audit lands, the canonical remote is `github.com/omniboost/Mewsy`). Once GitHub Actions secrets are configured on that remote (see C4), the workflow auto-deploys. Verify by re-running:
  ```bash
  curl -i -X POST -H 'Content-Type: application/json' -d '{"baseUserId":"x"}' \
    https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/api/sync-context
  ```
  Should return `401`, not `200`.

### C2. Supabase is offline in production

- **Symptom:** DNS lookup of `cxximiovljspbpfclgfr.supabase.co` returns **NXDOMAIN**. No data is being persisted.
- **Cause:** Either the project was paused/deleted, or the URL in the AWS Secrets Manager entry `mewsie/supabase-url` is stale.
- **Impact:**
  - `/api/sync-context` cannot write `users` rows even when auth is enforced (will return 500).
  - DB-side context pre-fill is dead — Mewsie falls back to URL-param pre-fill only.
  - 9 tests skip because they cannot reach the DB.
  - Analytics / cross-session memory are entirely non-functional.
- **Fix:** Find the real current Supabase project for Mewsie (check whatever password manager or AWS console it's bookmarked in). Rotate `mewsie/supabase-url` and `mewsie/supabase-service-key` in AWS Secrets Manager. Trigger `aws ecs update-service --force-new-deployment` to pick up the new env. Then run the test sync-context call and confirm a row lands in `users`.

### C3. `BASE_SYNC_SECRET` not rotated to a production value

- **Symptom:** `.env` carries the placeholder `dev-base-sync-secret-rotate-me`. The ECS task definition's `secrets` block reference to `mewsie/base-sync-secret` may or may not be wired up — needs verification.
- **Impact:** Two failure modes depending on how the task def is configured:
  - If the secret is **not** in the task env, the new code (once deployed, see C1) will refuse every sync call as `401`. Base is locked out completely.
  - If the secret **is** in the task env but is the placeholder, anyone who reads this codebase can hit the sync endpoint.
- **Fix:**
  1. Generate a real value: `openssl rand -hex 32`.
  2. Push to AWS Secrets Manager:
     ```bash
     aws secretsmanager put-secret-value \
       --secret-id mewsie/base-sync-secret \
       --secret-string "$NEW_VALUE" \
       --region eu-west-1 --profile sandbox
     ```
  3. Verify the ECS task definition references it under `secrets`:
     ```bash
     aws ecs describe-task-definition --task-definition mewsie \
       --region eu-west-1 --profile sandbox \
       --query 'taskDefinition.containerDefinitions[0].secrets'
     ```
     If `BASE_SYNC_SECRET` is missing from that list, register a new task def revision that includes it.
  4. Share the value with Base via 1Password share or auto-expiring Slack DM — **not** email, **not** PR description.

### C4. GitHub Actions secrets must be re-created on the new repo

- **Cause:** The deploy workflow at `.github/workflows/deploy.yml` references three repo-scoped secrets that do not yet exist on `github.com/omniboost/Mewsy`:
  - `AWS_DEPLOY_ROLE_ARN` — IAM role ARN for OIDC-assumed AWS auth
  - `ECS_SERVICE_ARN` — full ARN of the ECS service to redeploy
  - `ANTHROPIC_API_KEY` — for the test suite gate in the workflow
- **Impact:** Pushing to the new repo will trigger the workflow but it will fail at the AWS auth step until these are populated. CI/CD silently no-ops on every push until set.
- **Fix:** GitHub UI → Settings → Secrets and variables → Actions → New repository secret. Copy values from the old repo (`vansteenbergenmatisse/Mewsy_v2`) or from AWS console.

---

## HIGH — security/correctness, not blocking but should be soon

### H1. CORS allowlist wildcard has never matched

- **Where:** `backend/server.ts:34` — the origin check uses exact-match `Array.includes(origin)` against `ALLOWED_ORIGINS`.
- **Problem:** Patterns like `https://*.awsapprunner.com` in the allowlist are stored as literal strings and never match any real origin. The wildcard is dead.
- **Impact:** If the allowlist contains a wildcard, it provides no security but creates a false sense that the App Runner family is covered. Today the actual production hosts are listed verbatim, so functionally CORS works — but the next time someone adds a wildcard expecting it to do something, it won't.
- **Fix:** Replace `.includes(origin)` with a minimatch / glob comparison, or strip wildcards from the allowlist and document that exact-match is the contract.

### H2. Legacy App Runner host still alive

- **Where:** `https://998afrnq3y.eu-west-1.awsapprunner.com` — still answers `200` on `/health`.
- **Problem:** Any cached embed loader that pre-dates the ECS migration will continue working silently against an unmaintained host. New security fixes pushed to ECS won't apply there. If Base's config still points there, they bypass the new fixes.
- **Fix:** Decommission per `aws-deployment-log.md` Phase E:
  ```bash
  aws apprunner pause-service --service-arn <ARN> --region eu-west-1 --profile sandbox
  # observe for one week
  aws apprunner delete-service --service-arn <ARN> --region eu-west-1 --profile sandbox
  ```
  Coordinate with whoever is wiring Base — they must confirm they're on the ECS host first.

### H3. Pre-fix legacy code path still exposed by stale image

- **Cause:** Same as C1, but worth listing separately because the *symptom* matters: even if you fix C2 (Supabase) before C1 (deploy), the legacy image will keep returning `userId:"error"` sentinels and writes will appear "successful" to callers while doing nothing. The handover's Decision D4 explicitly killed this pattern; until deploy lands, the kill is theoretical.
- **Fix:** Subsumed by C1.

---

## MEDIUM — known footguns, document or fix at leisure

### M1. Stale `.io` references should be `.com`

- **Where:**
  - `frontend/public/embed/mewsie-loader.js:9` (doc comment)
  - `tests/verify-deployment.ts:15,132`
- **Problem:** Both reference `mewsie.omniboost.io`, but per `docs/aws-deployment-log.md:221` the actual planned domain is `mewsie.omniboost.com`. The `.io` TLD was never deployed.
- **Fix:** Single grep-and-replace once we're confident the `.com` choice is final.

### M2. PORT duplication in `.env`

- **Where:** `.env` carries both `PORT=4010` (stale) and `PORT=3005` (current). Backend uses `PORT=3005`. Documented in `post-deployment-todo.md` item #13.3.
- **Risk:** Whichever line dotenv reads last wins — order-dependent. A reviewer could "fix" what they think is a duplicate and silently move the backend to a different port.
- **Fix:** Remove the `PORT=4010` line. Same for any other duplicate keys in `.env`.

### M3. `frontend/public/embed/mewsie-loader.js:9` comment is stale

- Comment references the old `.io` domain and predates the ECS migration. Worth updating along with M1.

### M4. Stub: `backend/integrations/salesforce/index.ts`

- **State:** `createTicket()` is a no-op stub. Not called from any active code path today.
- **Decision needed:** Either implement properly (and wire in error handler) or delete the stub. Stubs that "look like they work" are worse than missing modules.
- **Owner:** Open.

### M5. Stub: `backend/errors/alerts.ts`

- **State:** Production alerting is unwired. No Sentry, no Datadog, no Slack webhook. Errors are logged to stdout (visible only via `aws logs tail`).
- **Risk:** A silent failure in production today is genuinely silent — no on-call signal.
- **Fix:** Pick an alerting destination (Slack webhook is the cheapest path); wire `errorHandler.ts` into it for any 5xx response and any thrown `FFmpegError`-equivalent in the pipeline.

### M6. Recurring bug pattern — partial-guard config constants

- **Where:** Documented in project `CLAUDE.md` under "Pipeline guard invariants".
- **Pattern:** A config constant is added to `mewsie.config.ts` or `session.ts` but only wired to **one** of the code paths that should respect it. The most recent example was `FRUSTRATION_THRESHOLD` (never read).
- **Mitigation:** Before adding any counter / flag / threshold, search the codebase for ALL paths that should respect it and wire them in the same commit. Don't add dead constants — delete or wire immediately.

### M7. 9 tests skip due to DB unreachable

- **Cause:** Supabase is dead (C2). DB-dependent integration tests have been refactored to *skip* rather than fail when the DB is unreachable, so the suite stays green during the outage.
- **Risk:** Skipped tests aren't tests. If a regression lands during the outage that breaks DB code, no one will see it until Supabase is back.
- **Fix:** Subsumed by C2.

---

## LOW — cleanup, polish, nice-to-have

### L1. `docs/aws-deployment-log.md` has legacy App Runner references

- Some sections still describe the App Runner host as "default URL" even though the canonical is now ECS. Retargeted in 2026-05-21 but not exhaustively.
- Pass through once App Runner is decommissioned (H2) and strike the legacy block entirely.

### L2. `knowledge/help-resources/` is frontend-only but undocumented

- These markdown files render in the frontend help panel but are deliberately excluded from `knowledge-manifest.json`. If a user asks Mewsie about a topic that exists only in help-resources, Mewsie won't answer it.
- **Decision needed:** Either index help-resources into the manifest (so the chatbot can use them) or document the split clearly in `CLAUDE.md`. Status quo invites confusion.

### L3. `package-lock.json` audit

- Not reviewed this session. Worth running `npm audit` periodically and bumping anything `high` or `critical`. Bigger concern: lockfile drift between `package.json` and what's actually in `node_modules` on developer machines.

### L4. Embed loader version pinning

- `frontend/public/embed/mewsie-loader.js` is served as a static asset with no version string. If we ever change its interface, all Base pages that have already loaded the old version will break silently. Worth adopting `mewsie-loader.v1.js` or query-string versioning before Base starts depending on it.

---

## EXTERNAL — blocked on other teams or vendors

### E1. Cloudflare DNS records (Bart)

- See `post-deployment-todo.md` item #1.
- Two CNAME records pending in Cloudflare for `mewsie.omniboost.com`. Once Bart adds them, ACM cert flips to ISSUED and we can attach to the ALB.

### E2. Base team — drop legacy URL

- Base's integration was configured against `/webhook/mapping-agent-v2` (a fabricated path that never existed). Their config must be updated to point at `/api/sync-context` (server-to-server) and the embed loader (client-side). Until they confirm the swap, our work doesn't reach them.
- Send them `docs/base-integration.md` (the verification guide) once C1 and C3 are done.

### E3. Base team — verify integration via the test guide

- See `docs/base-integration.md`. Pending until C1/C3 are deployed.

### E4. Marion — verify embedded experience inside Base

- See `post-deployment-todo.md` item #2.

---

## Conventions and traps to remember

These aren't bugs, they're things future-you needs to know to not introduce bugs:

1. **All FFmpeg-style external work goes through one wrapper.** Mewsie has no FFmpeg, but the same principle applies to Anthropic calls: every Sonnet/Haiku call must go through `backend/pipeline/claude.ts`. Don't import `@anthropic-ai/sdk` anywhere else.
2. **CLARIFY counter is global.** Every CLARIFY reply (Stage 1 and Stage 2B alike) must increment `clarifyRoundCounter`. Per project CLAUDE.md.
3. **Don't create users from chat-side state.** Only `/api/sync-context` (secret-gated) may insert into `users`. `/webhook/chat` only links to existing rows. Decision D2 from the integration fix.
4. **Prefer live URL params over DB context.** Pre-fill from URL params is unguarded; pre-fill from DB requires `userId !== 'noop'`. Decision D3.
5. **No new global dicts in routers.** Session state goes through `backend/pipeline/session.ts`; persistence through `backend/db/`.
6. **Tests first, no mocks.** A task is not done until `npm test` exits 0. Mocking the DB is banned (it masked migration failures historically).
7. **One topic per markdown file.** Knowledge base discipline: a page covering N integrations becomes N files. Never combined.
8. **Ask before touching `prompts/system.ts`, signal grammar, tier syntax, or migrations.** Per project CLAUDE.md.

---

## How to use this document

- **When opening a session:** scan the CRITICAL block first. If any item there has changed (e.g. you pushed and CI ran), update or remove the entry in the same commit.
- **When closing a session:** if you discovered new debt, add it here. Entries do not need to be elegant — terse, factual, with a file path and a fix idea, is enough.
- **When something breaks in production:** start here before you start guessing. Half of the inventory is "things that look fine but aren't actually wired."
