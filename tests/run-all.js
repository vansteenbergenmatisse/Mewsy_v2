#!/usr/bin/env node
/**
 * tests/run-all.js
 *
 * Pre-launch test suite for Mewsy v2.
 * Runs automatically before `npm run dev` via the predev hook.
 * Also runnable manually: node tests/run-all.js
 *
 * Tests are grouped into suites. Each suite runs independently.
 * A single failure in any suite blocks the server from starting.
 */

import 'dotenv/config';
import { checkEnv }      from './suites/check-env.js';
import { checkManifest } from './suites/check-manifest.js';
import { checkScraper }  from './suites/check-scraper.js';
import { checkRouting }  from './suites/check-routing.js';
import { checkChat }     from './suites/check-chat.js';
import { checkServer }   from './suites/check-server.js';

// ── Colours ───────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function pass(label) { console.log(`  ${GREEN}✓${RESET} ${label}`); }
function fail(label, err) { console.log(`  ${RED}✗${RESET} ${label}\n    ${RED}${err}${RESET}`); }
function skip(label, reason) { console.log(`  ${YELLOW}–${RESET} ${label} ${YELLOW}(${reason})${RESET}`); }

// ── Runner ────────────────────────────────────────────────────────────────────
async function runSuite(name, fn) {
  console.log(`\n${BOLD}${name}${RESET}`);
  const results = [];
  const reporter = { pass, fail, skip, results };
  try {
    await fn(reporter);
  } catch (err) {
    reporter.results.push({ ok: false });
    console.log(`  ${RED}✗ Suite crashed: ${err.message}${RESET}`);
  }
  return reporter.results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${BOLD}Mewsy v2 — Pre-launch tests${RESET}`);
  console.log('─'.repeat(40));

  const allResults = [];

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
    console.log(`\n${GREEN}${BOLD}All tests passed — starting Mewsy.${RESET}\n`);
    process.exit(0);
  }
})();
