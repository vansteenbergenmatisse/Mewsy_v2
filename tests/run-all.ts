#!/usr/bin/env node
/**
 * MEWSIE TEST SUITE — run-all.ts
 *
 * Runs automatically via `npm run dev` (predev hook).
 * Blocks dev server startup on any failure.
 * Run manually: tsx tests/run-all.ts
 *
 * ── Toggle suites ────────────────────────────────────────────────────────────
 * Set `enabled: false` in the SUITES object below to skip any suite entirely.
 *
 * Suite order (non-negotiable):
 *   1. check-env       — validates .env; exits entire suite on failure
 *   2. check-manifest  — knowledge-manifest.json integrity
 *   3. check-scraper   — scraper utilities (slugify, hash, expandLinks, etc.)
 *   4. check-routing   — router selects correct docs (requires ANTHROPIC_API_KEY)
 *   5. check-pipeline  — config bounds + pipeline behavior (requires ANTHROPIC_API_KEY)
 *   6. check-session   — in-memory session store operations
 *   7. check-server    — HTTP routes, input validation (real Hono server)
 *   8. check-chat      — end-to-end with real Claude API calls (requires ANTHROPIC_API_KEY)
 *   9. check-frontend  — frontend utility functions (pure functions, no browser)
 *   [new suites append here]
 *
 * MAINTENANCE RULES — apply to every task, no exceptions:
 *   - Tests exist for every logical unit (route, pipeline fn, scraper type, env var, util)
 *   - New feature    = new test cases, same task, before marking done
 *   - Changed feature = updated test cases, same task, before marking done
 *   - Deleted feature = removed test cases, same task, before marking done
 *   - New required env var = updated check-env.ts, same task
 *   - Suite added/removed/changed scope = updated tests/README.md, same task
 *   - No mocks. No external test frameworks. Real implementations only.
 *   - `npx tsx tests/run-all.ts` must exit 0 before any task is considered complete.
 */

import 'dotenv/config';
import { checkEnv }      from './suites/check-env.ts';
import { checkManifest } from './suites/check-manifest.ts';
import { checkScraper }  from './suites/check-scraper.ts';
import { checkRouting }  from './suites/check-routing.ts';
import { checkPipeline } from './suites/check-pipeline.ts';
import { checkSession }  from './suites/check-session.ts';
import { checkServer }   from './suites/check-server.ts';
import { checkChat }     from './suites/check-chat.ts';
import { checkFrontend } from './suites/check-frontend.ts';

// ── Suite toggles ─────────────────────────────────────────────────────────────
// Set `enabled: false` to skip a suite without deleting it.
const SUITES = {
  env:      { enabled: true },
  manifest: { enabled: true },
  scraper:  { enabled: true },
  routing:  { enabled: true },
  pipeline: { enabled: true },
  session:  { enabled: true },
  server:   { enabled: true },
  chat:     { enabled: true },
  frontend: { enabled: true },
};

// ── Colours ───────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function pass(label: string): void { console.log(`  ${GREEN}✓${RESET} ${label}`); }
function fail(label: string, err: string): void { console.log(`  ${RED}✗${RESET} ${label}\n    ${RED}${err}${RESET}`); }
function skip(label: string, reason: string): void { console.log(`  ${YELLOW}–${RESET} ${label} ${YELLOW}(${reason})${RESET}`); }

// ── Reporter type ─────────────────────────────────────────────────────────────
interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runSuite(name: string, fn: (r: Reporter) => Promise<void>): Promise<TestResult[]> {
  console.log(`\n${BOLD}${name}${RESET}`);
  const results: TestResult[] = [];
  const reporter: Reporter = { pass, fail, skip, results };
  try {
    await fn(reporter);
  } catch (err) {
    reporter.results.push({ ok: false });
    console.log(`  ${RED}✗ Suite crashed: ${(err as Error).message}${RESET}`);
  }
  return reporter.results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${BOLD}Mewsie — Pre-launch tests${RESET}`);
  console.log('─'.repeat(40));

  const allResults: TestResult[] = [];
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  // 1. env — always runs first; env failures block everything else
  if (SUITES.env.enabled) {
    const envResults = await runSuite('1. Environment variables', checkEnv);
    allResults.push(...envResults);
    if (envResults.some(r => r.ok === false)) {
      console.log(`\n${RED}${BOLD}Environment check failed — fix .env before proceeding.${RESET}\n`);
      process.exit(1);
    }
  }

  // 2. manifest
  if (SUITES.manifest.enabled)
    allResults.push(...(await runSuite('2. Knowledge manifest', checkManifest)));

  // 3. scraper utilities
  if (SUITES.scraper.enabled)
    allResults.push(...(await runSuite('3. Scraper utilities', checkScraper)));

  // 4. routing — requires API key
  if (SUITES.routing.enabled) {
    if (hasApiKey) {
      allResults.push(...(await runSuite('4. Routing accuracy', checkRouting)));
    } else {
      console.log(`\n${YELLOW}Skipping suite 4 (routing) — ANTHROPIC_API_KEY not set${RESET}`);
    }
  }

  // 5. pipeline — config sanity runs without API key; behaviours need it
  if (SUITES.pipeline.enabled)
    allResults.push(...(await runSuite('5. Pipeline behaviour', checkPipeline)));

  // 6. session
  if (SUITES.session.enabled)
    allResults.push(...(await runSuite('6. Session management', checkSession)));

  // 7. server
  if (SUITES.server.enabled)
    allResults.push(...(await runSuite('7. Server health', checkServer)));

  // 8. chat — requires API key
  if (SUITES.chat.enabled) {
    if (hasApiKey) {
      allResults.push(...(await runSuite('8. Chat integration', checkChat)));
    } else {
      console.log(`\n${YELLOW}Skipping suite 8 (chat) — ANTHROPIC_API_KEY not set${RESET}`);
    }
  }

  // 9. frontend utilities
  if (SUITES.frontend.enabled)
    allResults.push(...(await runSuite('9. Frontend utilities', checkFrontend)));

  // ── Summary ───────────────────────────────────────────────────────────────
  const total   = allResults.length;
  const passed  = allResults.filter(r => r.ok === true).length;
  const skipped = allResults.filter(r => r.ok === 'skip').length;
  const failed  = allResults.filter(r => r.ok === false).length;

  console.log('\n' + '─'.repeat(40));
  console.log(`${BOLD}Results: ${passed} passed, ${failed} failed, ${skipped} skipped / ${total} total${RESET}`);

  if (failed > 0) {
    console.log(`\n${RED}${BOLD}Pre-launch tests failed — fix the issues above before starting the server.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}All tests passed — starting Mewsie.${RESET}\n`);
    process.exit(0);
  }
})();
