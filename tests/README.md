# Mewsie Test Suite

Tests run automatically on every `npm run dev` via the `predev` script.
A test failure blocks the dev server from starting.

## Run manually

```
npx tsx tests/run-all.ts
```

Or via npm:

```
npm test
```

---

## Suites

| # | File | What it tests | Needs API key | Needs network |
|---|------|---------------|:---:|:---:|
| 1 | [check-env.ts](suites/check-env.ts) | All required `.env` variables are present and correctly formatted (e.g. `ANTHROPIC_API_KEY` starts with `sk-ant-`) | — | — |
| 2 | [check-manifest.ts](suites/check-manifest.ts) | `knowledge-manifest.json` structure, every entry has `title`/`description`/`path`/`keywords`, all files exist on disk, no orphaned `.md` files, scraped entries have valid `source_type` | — | — |
| 3 | [check-scraper.ts](suites/check-scraper.ts) | `slugify`, `sha256`, `expandLinks`, `removeEmDashes`, `readManifest`, `writeManifest`, `upsertEntry`, `deleteEntry`, `getScraperEntries` | — | — |
| 4 | [check-routing.ts](suites/check-routing.ts) | Claude router selects correct docs for 6 in-scope queries, confidence always in `[0, 1]`, out-of-scope query returns 0 docs or low confidence | yes | yes |
| 5 | [check-pipeline.ts](suites/check-pipeline.ts) | `handlePipelineError` returns standard user message, `loadAllDocuments` does not throw, 13 config constant range checks, BASIC_MODE no hallucination, language injection, multi-turn context | partial | partial |
| 6 | [check-session.ts](suites/check-session.ts) | Session creation, history append and retrieval, history trimming to max pairs, context update, non-destructive patch, TTL expiry via `cleanSessions` | — | — |
| 7 | [check-server.ts](suites/check-server.ts) | Server starts, `GET /health` → 200, `POST /webhook/chat` 400 validations (missing fields, oversized input), CORS allow/reject, valid POST → 200 `{ output: string }`, wrong method → 404 | partial | yes (local) |
| 8 | [check-chat.ts](suites/check-chat.ts) | Full `handleMessage()` E2E: tiers, omniboost overview, GL mapping, out-of-scope (no hallucination), hello, multi-turn silver follow-up, em-dash absent from responses | yes | yes |
| 9 | [check-frontend.ts](suites/check-frontend.ts) | `formatBotText` (bold, italic, links, headings, lists), `splitResponseIntoMessages` (empty, single, two paragraphs, list grouping), `detectOptionButtons` (`[BUTTONS:]` syntax, no-question guard, plain text), `uiStr` (en/de/fallback/unknown key/null), `getThinkingMessages` (en/de/null/de-at subtag), `getSessionId` (create + stable) | — | — |

---

## Toggle individual suites

In [run-all.ts](run-all.ts), set `enabled: false` for any suite you want to skip:

```typescript
const SUITES = {
  env:      { enabled: true  },
  manifest: { enabled: true  },
  scraper:  { enabled: true  },
  routing:  { enabled: false }, // ← skip routing
  pipeline: { enabled: true  },
  session:  { enabled: true  },
  server:   { enabled: true  },
  chat:     { enabled: false }, // ← skip chat
  frontend: { enabled: true  },
};
```

Suites 4 (routing) and 8 (chat) are also auto-skipped if `ANTHROPIC_API_KEY` is not set, regardless of the `enabled` flag.

---

## Adding a new suite

1. Create `tests/suites/check-<scope>.ts` exporting one function:
   ```typescript
   export async function check<Scope>(reporter: Reporter): Promise<void>
   ```
2. Add it to the `SUITES` object in [run-all.ts](run-all.ts) with `enabled: true`.
3. Call it in the correct position in the `(async () => {})()` block.
4. Add a row to the table above.

---

## Maintenance rules

1. **Every logical unit has at least one test.** Routes, pipeline functions, scraper types, env vars, frontend utils — all covered.
2. **A task is not done until** `npx tsx tests/run-all.ts` exits 0.
3. **New feature** → add test cases in the same task, before marking done.
4. **Changed feature** → update test cases in the same task.
5. **Deleted feature** → remove its test cases in the same task.
6. **New required env var** → update `check-env.ts` in the same task.
7. **Suite added, removed, or changed** → update this README in the same task.
8. **No mocks.** No Jest, Vitest, Mocha, or any external test framework. Real implementations only.
9. `check-env.ts` always runs first. If it fails, the entire suite exits immediately.
10. This README is the source of truth for what is tested. It must never be out of date.
