## DO NOT DEPLOY THIS TO BASE YET

**Read this first. The rest of the document assumes you've read it.**

We are **not** asking you to wire Mewsie into Base in production. We are **not** asking you to merge anything to your main branch. We are **not** asking you to roll this out to real users.

What we want, right now, is one thing only: **confirm that a Base-side caller can successfully reach Mewsie and that the integration works end-to-end.** Once you've confirmed that, **stop**. We'll coordinate the actual rollout to Base separately, on a later date, when we've also fixed the remaining infra items on our side (DNS, Supabase).

So treat everything below as a verification script. Run it in a scratch page, a local file, or a dev environment. Do not put it in front of real users. Do not commit it to the Base production codebase. Just confirm that it works, send us the result, and tear the test setup down.

---

# Base ↔ Mewsie — verification guide

Audience: the person who controls how Base talks to external services.
Goal: a 15-minute test that proves the wiring works.
Outcome: a short message back to us saying "Path 1 works" and (optionally) "Path 2 works".

## 2 main paths

- **Path 1 — iframe embed.** Two `<script>` tags on a page. Base hands user context to Mewsie via URL params on the iframe. No secret, no backend work. This is the one that matters.
- **Path 2 — server-to-server sync.** Base's backend POSTs JSON to a Mewsie endpoint with a shared secret. Persists context across sessions. Optional for the test.

The previous URL Base was configured against — `https://998afrnq3y.eu-west-1.awsapprunner.com/webhook/mapping-agent-v2` — was wrong. That route never existed. The instructions below use the current canonical Mewsie host.

## What we need from you, exactly

Three things in this order:

1. Run **Step 1** (health check). Takes 30 seconds.
2. Run **Step 2** (Path 1 embed test) in a throwaway HTML file. Takes ~10 minutes.
3. Optionally run **Step 3** (Path 2 sync test) with curl. Takes ~5 minutes once we've sent you the secret.

Then send us the result. **Do not** proceed to Step 4 unless we explicitly tell you to — Step 4 is the eventual production wiring, and we're not ready for that yet.

---

## Step 1 — Confirm you can reach Mewsie at all

In a terminal:

```bash
curl -i https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/health
```

Expected: HTTP 200 with a small JSON body.

If you get a non-2xx response, stop here and tell us — the rest of the test depends on this host being reachable from wherever you're testing.

---

## Step 2 — Verify Path 1 (iframe embed) end-to-end

This is the test that matters. We want to confirm that when Base passes user context via the embed, Mewsie picks it up and stops asking "which accounting tool do you use?".

### 2a. Create a throwaway HTML file

Save the following as `mewsie-test.html` anywhere on your machine. Do not put it in the Base codebase.

```html
<!doctype html>
<html>
  <head><title>Mewsie integration test</title></head>
  <body>
    <h1>Mewsie integration test page</h1>
    <p>If you see a floating chat button bottom-right, the loader is working.</p>

    <script src="https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/embed/mewsie-loader.js"></script>
    <script>
      MewsieEmbed.init({
        baseUserId:         "test-user-001",
        accountingSoftware: "QuickBooks",
        tier:               "silver",
        companyName:        "Test Hotel Acme"
      });
    </script>
  </body>
</html>
```

### 2b. Open it in a browser

Open the file directly (`file://...`) or serve it with any local static server. You should see:

- The page renders.
- A floating chat button appears in the bottom-right corner (this is injected by `mewsie-loader.js`).

If the button doesn't appear, open the browser devtools Network tab, reload, and check whether `mewsie-loader.js` returned 200. If it didn't, tell us — that's a CORS or host issue we need to fix on our side before continuing.

### 2c. Inspect the iframe URL

Click the chat button to open the widget. Then, in devtools, find the `<iframe>` element that the loader injected. Its `src` attribute should contain all four params:

```
...?baseUserId=test-user-001&as=QuickBooks&tier=silver&company=Test%20Hotel%20Acme
```

If any of the four are missing, the `init()` call didn't pass them through. Double-check the script.

### 2d. Send a chat message and verify the pre-fill

Type any reasonable accounting question into the chat (e.g. *"How do I map a revenue account?"*) and hit send.

**Pass condition:** Mewsie answers the question directly. It should **not** open with "which accounting tool do you use?" — because Base already told it `QuickBooks` via the URL params.

**Fail condition:** Mewsie asks which accounting tool you use, or which tier, or which company. That means the URL params didn't make it from the iframe to the backend, and we need to debug.

### 2e. Send us the result

A two-line Slack message is fine:

> Step 1: 200 ✓ (or whatever you saw)
> Step 2: Mewsie answered directly without asking which tool ✓ (or "still asked which tool — here's a screenshot")

That alone is enough to declare success on the test. Stop here unless you also want to verify Path 2.

---

## Step 3 — (Optional) Verify Path 2 (server-to-server sync)

Skip this if Step 2 passed and you're short on time. We can verify Path 2 later when the actual integration is being wired.

> **Heads-up — `/api/sync-context` is POST-only.** If you paste the URL into a browser and click it, you will get **404 Not Found**. That is correct and expected: no GET handler exists for this route. The only valid way to call it is with `curl -X POST` (below) or from Base's backend. Do not interpret the browser 404 as the route being missing — verify with the curl instead. (Confirmed live as of this writing: GET returns 404, POST with empty body returns 400 with a `baseUserId is required` message, meaning the route is registered and parsing correctly.)

If you do want to test it now, ask us via secure channel (1Password share, Slack DM with auto-expire — **not** email or PR description) for the current value of `BASE_SYNC_SECRET`. Then run:

```bash
curl -i -X POST https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws/api/sync-context \
  -H "Content-Type: application/json" \
  -H "X-Mewsie-Sync-Token: <PASTE_SECRET_HERE>" \
  -d '{
    "baseUserId":         "test-user-001",
    "accountingSoftware": "QuickBooks",
    "tier":               "silver",
    "companyName":        "Test Hotel Acme"
  }'
```

Expected responses:

| Code | Meaning |
|---|---|
| `200` with `{ "ok": true, "isNew": true, "userId": "..." }` on first call, `"isNew": false` on repeat | ✓ Works |
| `401 Unauthorized` | The secret you used doesn't match. Re-request it and try again. |
| `400` with `baseUserId is required...` | The JSON body is malformed. |
| `429 Too many sync requests` | You exceeded 30/min from one IP. Wait a minute and retry. |
| `500 Failed to sync context` | Mewsie reached the handler but couldn't write to its DB. This is **expected today** because our Supabase project is currently offline. **Tell us — but it's not a Base-side problem; it's on our remediation list.** |

If you get 200 or 500, the wiring works. (500 means the route, auth, and rate limiter all work — only the DB write fails, which is on us.) If you get 401, the secret is wrong.

### Negative test — confirm the secret is enforced

For sanity, run the same curl **without** the `X-Mewsie-Sync-Token` header. You must get `401 Unauthorized`. If you get 200, tell us immediately — that would mean our auth is broken.

---

## Step 4 — (DO NOT DO THIS YET) Production wiring in Base

**Skip this section.** It exists for reference only, so you can see what the eventual rollout looks like. Do not execute any of it during the test.

When we tell you we're ready to actually integrate (separate ticket, separate day):

1. Add the loader to the real Base page where the widget should live. Use the same `<script>` tags as Step 2a, but with real user values:
   ```js
   MewsieEmbed.init({
     baseUserId:         currentUser.id,
     accountingSoftware: currentUser.tool,
     tier:               currentUser.tier,
     companyName:        currentUser.company.name,
   });
   ```
2. Switch the host from the ECS hostname to `https://mewsie.omniboost.com` once DNS is live.
3. Optionally call `/api/sync-context` from Base's backend on user login or tool-change, with the secret from your secret manager.
4. Add Base's production origin to our `ALLOWED_ORIGINS` (we handle this side).
5. Run an end-to-end test against a real Base user.

Again: **do not do any of this yet.** When we're ready, we'll send a separate message titled "Mewsie production rollout."

---

## What to send back

A short message like this is all we need:

> **Mewsie verification result**
> - Step 1 (health): 200 ✓
> - Step 2 (embed): button appeared, iframe URL had all 4 params, Mewsie answered without asking which tool ✓
> - Step 3 (sync): skipped / 200 / 500-with-DB-error / 401 (whichever happened)
> - Anything weird: (free text)

If anything fails or behaves oddly, screenshots + devtools network log are gold.

---

## Reference — endpoint inventory

For your records only. Don't action these.

| URL | Purpose | Auth | Notes |
|---|---|---|---|
| `https://me-fe213300d226440a9641c315defbd68f.ecs.eu-west-1.on.aws` | Current canonical Mewsie host (ECS) | n/a | Use this for the test |
| `https://mewsie.omniboost.com` | Future canonical (custom domain) | n/a | DNS not yet live |
| `https://998afrnq3y.eu-west-1.awsapprunner.com` | Legacy App Runner host | n/a | Being decommissioned; do **not** target |
| `/embed/mewsie-loader.js` | Embed loader script | none | Served from any of the above hosts |
| `/webhook/chat` | Chat message endpoint (the iframe calls this) | none, CORS-gated | Called by the iframe, not directly by Base |
| `/api/sync-context` | Server-to-server identity sync | `X-Mewsie-Sync-Token` shared secret, constant-time compare, 30 req/min/IP | Idempotent; safe to call repeatedly |
| `/webhook/mapping-agent-v2` | **DOES NOT EXIST** — never did | n/a | If anything in Base config still points here, that's the bug |
| `/health` | Liveness probe | none | Used in Step 1 |

---

## DO NOT DEPLOY THIS TO BASE YET — reminder

You've finished the test. Two final reminders:

1. **Tear down the test page.** Don't leave `mewsie-test.html` lying around in any shared location, and don't commit the snippet to the Base repo. The embed uses a test secret in dev and we haven't rotated production credentials yet.
2. **Don't merge anything Mewsie-related to Base's main branch.** The actual rollout will be a coordinated change once we've fixed our pending infra items (DNS, Supabase, secret rotation). We'll open a separate, explicit "ready to integrate" ticket when that day comes.

Until then: confirmation that the wiring works is enough. Thank you.
