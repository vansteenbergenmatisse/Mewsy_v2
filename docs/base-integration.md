# Base → Mewsie integration — wiring guide

> Single source of truth for how Base (Omniboost main product) connects to Mewsie. If you were sent here because something doesn't work, the most common cause is the wrong URL — see "Endpoints" below. If you were sent here to wire up a new Base environment, work top to bottom.

## TL;DR — what changed

The URL Base was previously hitting (`https://998afrnq3y.eu-west-1.awsapprunner.com/webhook/mapping-agent-v2`) was never a real Mewsie route. It returns 404. The correct setup is:

1. **Embed**: drop a 2-line script into Base's frontend (delivers live context per user).
2. **Sync** (optional but recommended): Base's backend POSTs identity to Mewsie's `/api/sync-context` with a shared secret (persists context across sessions and powers analytics).

Two paths, both safe to run together. Path 1 alone is enough to make Mewsie "skip the integration question" — it doesn't need the DB.

## Endpoints

Production Mewsie is reachable at three URLs while migration finishes:

| URL | When | Status |
|---|---|---|
| `https://mewsie.omniboost.com` | Future canonical | DNS not yet live (waiting on Cloudflare CNAMEs) |
| `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws` | Today, canonical | Live ✓ |
| `https://998afrnq3y.eu-west-1.awsapprunner.com` | Legacy | Still answers but being decommissioned |

Until DNS is in, point everything at the ECS host. Switch to `mewsie.omniboost.com` once Bart's CNAMEs propagate.

## Path 1 — Iframe embed (the simple one)

Mewsie ships an embed loader at `/embed/mewsie-loader.js`. Drop two `<script>` tags into the Base page where you want the widget:

```html
<script src="https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/embed/mewsie-loader.js"></script>
<script>
  MewsieEmbed.init({
    baseUserId:         currentUser.id,            // required — your stable user identifier
    accountingSoftware: currentUser.tool,          // e.g. "Xero", "QuickBooks", "Exact Online", "DATEV"
    tier:               currentUser.tier,          // "bronze" | "silver" | "gold"
    companyName:        currentUser.company.name,
  });
</script>
```

What this does:

- The loader injects a floating chat button + iframe.
- The iframe URL carries `?baseUserId=…&as=…&tier=…&company=…`.
- Mewsie's frontend reads those params and forwards them on **every** `/webhook/chat` POST.
- The backend pre-fills the session context on the first message: Mewsie won't ask "which accounting tool do you use?" because Base already told it.

No backend work required. No secret needed. Works even when Supabase is down.

## Path 2 — Server-to-server sync (the secured one)

If Base wants to persist context across sessions (so analytics see the user even before they open the widget, and the next session pre-warms), Base's backend POSTs to `/api/sync-context`:

```
POST https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/api/sync-context
Content-Type: application/json
X-Mewsie-Sync-Token: <BASE_SYNC_SECRET>

{
  "baseUserId":         "abc-123",
  "accountingSoftware": "QuickBooks",
  "tier":               "silver",
  "companyName":        "Hotel Acme"
}
```

Requirements:

- **`X-Mewsie-Sync-Token`** must equal Mewsie's `BASE_SYNC_SECRET` env var. Compared in constant time. Missing or wrong → 401.
- Rate limited to 30 req/min/IP. Way above legitimate volume; well below abuse.
- Idempotent — calling it twice with the same `baseUserId` returns `isNew: false` and updates any fields that changed.
- Optional fields (`accountingSoftware`, `tier`, `companyName`) are skipped if absent — they don't overwrite previously-stored values.

Expected response:

```json
{ "ok": true, "isNew": true,  "userId": "uuid-here" }   // first sync
{ "ok": true, "isNew": false, "userId": "uuid-here" }   // subsequent sync
```

Error cases:

| Code | Body | Cause |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or wrong `X-Mewsie-Sync-Token` |
| 400 | `{ "error": "baseUserId is required..." }` | `baseUserId` missing or > 200 chars |
| 429 | `{ "error": "Too many sync requests" }` | Exceeded 30/min/IP |
| 500 | `{ "error": "Failed to sync context" }` | DB unreachable. Retry with exponential backoff. **This is now an honest error — previous versions returned 200 OK while silently writing nothing.** |

## Getting the secret

Whoever owns Mewsie's AWS account rotates `mewsie/base-sync-secret` in Secrets Manager and shares it with Base via a secure channel (1Password, Slack DM with auto-expire, etc. — not a PR description).

To generate a fresh value:
```bash
openssl rand -hex 32
```

To rotate (Mewsie side):
```bash
aws secretsmanager put-secret-value \
  --secret-id mewsie/base-sync-secret \
  --secret-string "$NEW_VALUE" \
  --region eu-west-1 --profile sandbox

aws ecs update-service \
  --cluster default --service mewsie \
  --force-new-deployment \
  --region eu-west-1 --profile sandbox
```

After rotation, Base must update its copy within the deploy window or sync calls 401.

## Migration checklist

Use this when wiring up a new Base environment:

- [ ] Confirm which Mewsie URL to target (custom domain once live, else ECS hostname)
- [ ] Add the embed loader to the Base page (Path 1) — should be live the same day
- [ ] Verify in browser devtools: the iframe URL contains `?baseUserId=…&as=…&tier=…&company=…`
- [ ] Test a chat — Mewsie should NOT ask "which accounting tool do you use" if `as=` was set
- [ ] (Optional) Add `/api/sync-context` call from Base backend with the secret header (Path 2)
- [ ] Verify the secret in Base's secret store matches Mewsie's `BASE_SYNC_SECRET`
- [ ] On Mewsie's side, confirm Base's origin is in `ALLOWED_ORIGINS` (or it won't pass CORS for the embed)
- [ ] Run an end-to-end test: open Base → open Mewsie → send a message → confirm `users` row exists in Supabase with the right `target_accounting_system`

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Iframe loads but Mewsie still asks "which tool?" | URL params not set, or fell back to a non-iframe load | Confirm `MewsieEmbed.init()` is called with all four fields; check browser URL bar inside iframe |
| `/api/sync-context` returns 401 | Wrong / missing `X-Mewsie-Sync-Token` | Verify Base's copy matches `BASE_SYNC_SECRET` exactly (no trailing newline, exact case) |
| `/api/sync-context` returns 500 | Mewsie can reach the route but DB write failed | Check `aws-deployment-log.md` item #14 — Supabase project may be unreachable; Mewsie team must rotate `mewsie/supabase-*` |
| `/api/sync-context` returns 200 with `userId: "error"` | **Should not happen anymore.** This was the silent-failure mode pre-2026-05-27 | Update Mewsie deploy to current `main` |
| CORS error in browser | Base's origin isn't in `ALLOWED_ORIGINS` | Mewsie owner adds the origin to the secret, redeploys |
| 404 on `/webhook/mapping-agent-v2` | You're hitting the legacy fabricated URL | Switch to `/api/sync-context` (this doc, Path 2) |

## Related docs

- `docs/aws-deployment-log.md` — Mewsie infra history (Railway → App Runner → ECS Express)
- `docs/post-deployment-todo.md` — open work, including DNS (#1) and Supabase rotation (#14)
- `backend/server.ts` — handler source
- `frontend/public/embed/mewsie-loader.js` — embed loader source
