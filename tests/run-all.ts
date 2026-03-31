#!/usr/bin/env node
/**
 * tests/run-all.ts
 *
 * Pre-launch test suite for Mewsie v2.
 * Runs automatically before `npm run dev` via the predev hook.
 * Also runnable manually: tsx tests/run-all.ts
 *
 * Tests are grouped into suites. Each suite runs independently.
 * A single failure in any suite blocks the server from starting.
 */

import 'dotenv/config';
import { checkEnv }      from './suites/check-env.ts';
import { checkManifest } from './suites/check-manifest.ts';
import { checkScraper }  from './suites/check-scraper.ts';
import { checkRouting }  from './suites/check-routing.ts';
import { checkChat }     from './suites/check-chat.ts';
import { checkServer }   from './suites/check-server.ts';
import { checkSession }  from './suites/check-session.ts';
import { checkPipeline } from './suites/check-pipeline.ts';

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
  console.log(`\n${BOLD}Mewsie v2 — Pre-launch tests${RESET}`);
  console.log('─'.repeat(40));

  const allResults: TestResult[] = [];

  allResults.push(...(await runSuite('1. Environment variables', checkEnv)));
  allResults.push(...(await runSuite('2. Knowledge manifest',    checkManifest)));
  allResults.push(...(await runSuite('3. Scraper utilities',     checkScraper)));

  // Routing + chat require a live Anthropic API key — skip gracefully if missing
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (hasApiKey) {
    allResults.push(...(await runSuite('4. Routing accuracy',    checkRouting)));
    allResults.push(...(await runSuite('5. Chat integration',    checkChat)));
  } else {
    console.log(`\n${YELLOW}Skipping suites 4 & 5 — ANTHROPIC_API_KEY not set${RESET}`);
  }

  allResults.push(...(await runSuite('6. Server health',         checkServer)));
  allResults.push(...(await runSuite('7. Session management',    checkSession)));
  allResults.push(...(await runSuite('8. Pipeline behaviour',    checkPipeline)));

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
