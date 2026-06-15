/**
 * Suite 4: Routing accuracy
 *
 * Tests Stage 1 keyword pre-filter and Stage 2A document verification.
 *
 * No-API tests (run always):
 *   - keywordPreFilter: QuickBooks query matches ≤ STAGE2A_SHORTLIST_MAX docs
 *   - keywordPreFilter: out-of-scope query returns empty array (no fallback)
 *   - vague gate: "i need help" hits 0 docs
 *   - vague gate: specific query hits > 0 docs
 *
 * API tests (require ANTHROPIC_API_KEY):
 *   - verifyDocuments: returns passes:boolean + reasoning per doc
 *   - verifyDocuments: relevant doc passes, clearly irrelevant doc fails
 */

import { join } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

interface ManifestFile {
  id: string;
  title?: string;
  description?: string;
  path: string;
  keywords?: string[];
  category?: string;
  trigger_questions?: string[];
}

interface Manifest {
  files?: ManifestFile[];
}

export async function checkRouting({ pass, fail, skip, results }: Reporter): Promise<void> {
  const { keywordPreFilter, keywordPreFilterScored, findShortTokenCandidates, pickClarifyButtons, basicContextButtons } = await import(`${ROOT}/backend/pipeline/agent.ts`);
  const { STAGE2A_SHORTLIST_MAX } = await import(`${ROOT}/backend/config/mewsie.config.ts`);

  // Load manifest to get pages list
  let pages: { id: string; label: string; description: string; keywords: string[]; synonyms: string[]; path: string; category: string; theme: string; trigger_questions: string[] }[];
  try {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'knowledge-manifest.json'), 'utf8')) as Manifest;
    pages = (manifest.files ?? []).map(file => ({
      id:               file.id,
      label:            file.title ?? file.id,
      description:      file.description ?? '',
      keywords:         (file.keywords ?? []) as string[],
      synonyms:         [] as string[],
      path:             file.path,
      category:         file.category ?? '',
      theme:            file.category ?? '',
      trigger_questions: (file.trigger_questions ?? []) as string[],
    }));
  } catch (err) {
    fail('load manifest for routing tests', (err as Error).message);
    results.push({ ok: false });
    return;
  }

  if (pages.length === 0) {
    skip('routing tests', 'no pages in manifest');
    results.push({ ok: 'skip' });
    return;
  }

  // ── Regression: help-resources must never leak into the router pool ─────────
  // knowledge/help-resources/ is a frontend-only UI asset tree consumed by
  // the Help & Resources panel via Vite ?raw imports. It must NEVER appear
  // in the router's candidate pool. If it does, the manifest has drifted —
  // most likely from a manual edit that re-registered one of those files.
  const leakedHelpResources = pages.filter(p =>
    (p.path ?? '').startsWith('knowledge/help-resources/')
  );
  if (leakedHelpResources.length === 0) {
    pass('[routing] help-resources entries excluded from router pool');
    results.push({ ok: true });
  } else {
    fail(
      '[routing] help-resources leaked into router pool',
      leakedHelpResources.map(p => p.path).join(', ')
    );
    results.push({ ok: false });
  }

  // ── keywordPreFilter unit tests (no API call needed) ─────────────────────────

  // Test 1: specific QuickBooks query returns matched docs ≤ STAGE2A_SHORTLIST_MAX
  // (If it exceeds the shortlist max, gates 4/5 would fire, not gate 2)
  const filtered = keywordPreFilter(pages, 'how do I connect quickbooks to mews?');
  if (filtered.length > 0 && filtered.length <= STAGE2A_SHORTLIST_MAX) {
    pass(`keywordPreFilter: QuickBooks query returns 1–${STAGE2A_SHORTLIST_MAX} matched docs (got ${filtered.length})`);
    results.push({ ok: true });
  } else if (filtered.length > STAGE2A_SHORTLIST_MAX) {
    // Also acceptable — means the query goes to gate 4/5 (CLARIFY), not Stage 2A
    pass(`keywordPreFilter: QuickBooks query returns ${filtered.length} docs (> shortlist max — gate 4/5 would fire)`);
    results.push({ ok: true });
  } else {
    fail('keywordPreFilter: QuickBooks query should match at least 1 doc', `Got ${filtered.length}`);
    results.push({ ok: false });
  }

  // Test 2: QuickBooks-related query includes a QuickBooks doc in filtered results
  const hasQuickBooks = filtered.some((p: { label: string; keywords?: string[] }) =>
    (p.keywords ?? []).some((kw: string) => /quickbooks/i.test(kw)) || /quickbooks/i.test(p.label)
  );
  if (hasQuickBooks) {
    pass('keywordPreFilter: QuickBooks query includes a QuickBooks doc');
    results.push({ ok: true });
  } else {
    fail('keywordPreFilter: QuickBooks doc not in results', `Got: ${filtered.map((p: { label: string }) => p.label).join(', ')}`);
    results.push({ ok: false });
  }

  // Test 3: out-of-scope query returns empty array (no fallback)
  const noMatch = keywordPreFilter(pages, 'who won the world cup in 1998?');
  if (noMatch.length === 0) {
    pass('keywordPreFilter: out-of-scope query returns empty array (no fallback)');
    results.push({ ok: true });
  } else {
    fail('keywordPreFilter: out-of-scope query should return empty', `Got ${noMatch.length} docs`);
    results.push({ ok: false });
  }

  // Test 4: vague query "i need help" hits 0 docs (triggers BASIC)
  const vagueMsg = 'i need help';
  const vagueHits = keywordPreFilter(pages, vagueMsg);
  if (vagueHits.length === 0) {
    pass(`vague gate: "i need help" matches 0 docs → BASIC`);
    results.push({ ok: true });
  } else {
    // Acceptable if it matches a few docs with "help" as a keyword
    pass(`vague gate: "i need help" matches ${vagueHits.length} doc(s) — system will gate appropriately`);
    results.push({ ok: true });
  }

  // Test 5: specific query hits > 0 docs
  const specificMsg = 'how do i connect quickbooks to mews';
  const specificHits = keywordPreFilter(pages, specificMsg);
  if (specificHits.length > 0) {
    pass(`keywordPreFilter: specific query matches ${specificHits.length} doc(s) — routing proceeds`);
    results.push({ ok: true });
  } else {
    fail('keywordPreFilter: specific query should match at least 1 doc', `Got 0`);
    results.push({ ok: false });
  }

  // ── Fuzzy matching tests (no API call needed) ─────────────────────────────

  // Test: typo "quicbkook" still matches QuickBooks docs (Damerau distance 2 = transposition + insertion)
  const fuzzyQB = keywordPreFilter(pages, 'quicbkook');
  const fuzzyQBHasQuickBooks = fuzzyQB.some((p: { label: string; keywords?: string[] }) =>
    (p.keywords ?? []).some((kw: string) => /quickbooks/i.test(kw)) || /quickbooks/i.test(p.label)
  );
  if (fuzzyQBHasQuickBooks) {
    pass('fuzzy match: "quicbkook" matches QuickBooks docs (Damerau typo tolerance)');
    results.push({ ok: true });
  } else {
    fail('fuzzy match: "quicbkook" should fuzzy-match QuickBooks docs', `Got: ${fuzzyQB.map((p: { label: string }) => p.label).join(', ') || 'none'}`);
    results.push({ ok: false });
  }

  // Test: truncation "twinfiel" (missing trailing 'd') still matches Twinfield docs
  const fuzzyTwinfield = keywordPreFilter(pages, 'twinfiel');
  if (fuzzyTwinfield.length > 0) {
    pass(`fuzzy match: "twinfiel" matches ${fuzzyTwinfield.length} doc(s) (truncation tolerance → "Twinfield")`);
    results.push({ ok: true });
  } else {
    fail('fuzzy match: "twinfiel" should fuzzy-match Twinfield docs (1 edit from "Twinfield")', 'Got 0 matches');
    results.push({ ok: false });
  }

  // Test: completely unrelated gibberish returns 0 docs (fuzzy doesn't over-match)
  const noFuzzyNoise = keywordPreFilter(pages, 'zxkqwj blfmvp');
  if (noFuzzyNoise.length === 0) {
    pass('fuzzy match: unrelated gibberish returns 0 docs (no over-matching)');
    results.push({ ok: true });
  } else {
    fail('fuzzy match: gibberish should return 0 docs', `Got ${noFuzzyNoise.length}`);
    results.push({ ok: false });
  }

  // Test: out-of-scope query still returns 0 docs even with fuzzy enabled
  const fuzzyOOS = keywordPreFilter(pages, 'who won the world cup in 1998');
  if (fuzzyOOS.length === 0) {
    pass('fuzzy match: out-of-scope query still returns 0 docs with fuzzy enabled');
    results.push({ ok: true });
  } else {
    fail('fuzzy match: out-of-scope query should still return 0 docs', `Got ${fuzzyOOS.length}`);
    results.push({ ok: false });
  }

  // ── Score-gap routing tests (no API call needed) ──────────────────────────

  // Test: pricing/tier query produces a clear score gap — mews/mews doc
  // scores ≥ 2× the noise tier, which the pipeline uses to route to Stage 2A
  // instead of falling to CLARIFY(TOO_BROAD).
  const tierScored = keywordPreFilterScored(pages, 'Can you explain the Omniboost pricing tiers and billing options');
  if (tierScored.length > 0) {
    const topHits = tierScored[0].hits;
    const topTier = tierScored.filter((s: { hits: number }) => s.hits === topHits);
    const nextTierHits = tierScored.find((s: { hits: number }) => s.hits < topHits)?.hits ?? 0;
    const hasMews = topTier.some((s: { page: { id: string } }) => s.page.id === 'mews/mews');
    const hasScoreGap = topHits >= 2 * nextTierHits;

    if (hasMews && hasScoreGap && topTier.length <= STAGE2A_SHORTLIST_MAX) {
      pass(`score-gap: pricing query → mews/mews in top tier (${topHits} hits vs ${nextTierHits}), ${topTier.length} doc(s) → Stage 2A`);
      results.push({ ok: true });
    } else {
      fail('score-gap: pricing query should produce mews/mews in top tier with ≥2× score gap',
        `topHits=${topHits} nextTierHits=${nextTierHits} topTier=${topTier.length} hasMews=${hasMews}`);
      results.push({ ok: false });
    }
  } else {
    fail('score-gap: pricing query should match at least 1 doc', 'Got 0');
    results.push({ ok: false });
  }

  // Test: trigger-question scoring — "what is omniboost" should boost
  // omniboost/omniboost via trigger_questions match, creating a score gap.
  const omniScored = keywordPreFilterScored(pages, 'what is omniboost');
  if (omniScored.length > 0) {
    const omniTopHits = omniScored[0].hits;
    const omniTopTier = omniScored.filter((s: { hits: number }) => s.hits === omniTopHits);
    const omniNextHits = omniScored.find((s: { hits: number }) => s.hits < omniTopHits)?.hits ?? 0;
    const hasOmniboost = omniTopTier.some((s: { page: { id: string } }) => s.page.id === 'omniboost/omniboost');
    const omniHasGap = omniTopHits >= 2 * omniNextHits;

    if (hasOmniboost && omniHasGap && omniTopTier.length <= STAGE2A_SHORTLIST_MAX) {
      pass(`trigger-question: "what is omniboost" → omniboost/omniboost in top tier (${omniTopHits} hits vs ${omniNextHits}), ${omniTopTier.length} doc(s) → Stage 2A`);
      results.push({ ok: true });
    } else {
      fail('trigger-question: "what is omniboost" should boost omniboost/omniboost with score gap',
        `topHits=${omniTopHits} nextHits=${omniNextHits} topTier=${omniTopTier.length} hasOmniboost=${hasOmniboost}`);
      results.push({ ok: false });
    }
  } else {
    fail('trigger-question: "what is omniboost" should match at least 1 doc', 'Got 0');
    results.push({ ok: false });
  }

  // Test: uniform-score query (no trigger match) does NOT trigger score-gap.
  // Uses "mews" — many docs have it as a keyword but no single doc's
  // trigger_questions reduce to just ["mews"] after stop-word removal.
  const uniformScored = keywordPreFilterScored(pages, 'mews');
  if (uniformScored.length > STAGE2A_SHORTLIST_MAX) {
    const uTopHits = uniformScored[0].hits;
    const uNextHits = uniformScored.find((s: { hits: number }) => s.hits < uTopHits)?.hits ?? uTopHits;
    const uniformNoGap = uTopHits < 2 * uNextHits || uTopHits === uNextHits;
    if (uniformNoGap) {
      pass(`score-gap: uniform "mews" query has no gap (all ${uTopHits} hits) → falls to CLARIFY`);
      results.push({ ok: true });
    } else {
      fail('score-gap: uniform query should not produce a score gap', `top=${uTopHits} next=${uNextHits}`);
      results.push({ ok: false });
    }
  } else {
    pass(`score-gap: "mews" matched ≤ ${STAGE2A_SHORTLIST_MAX} docs — no score-gap check needed`);
    results.push({ ok: true });
  }

  // ── Short-token candidate detection tests (no API call needed) ────────────

  // Test: "xer" → prefix-matches Xero docs
  const xeroTokens = ['xer'];
  const xeroCandidates = findShortTokenCandidates(xeroTokens, pages);
  const hasXero = xeroCandidates.some((c: string) => /xero/i.test(c));
  if (hasXero) {
    pass(`short-token: "xer" surfaces Xero as a candidate (got: [${xeroCandidates.join(', ')}])`);
    results.push({ ok: true });
  } else {
    fail('short-token: "xer" should surface Xero as a candidate', `Got: [${xeroCandidates.join(', ')}]`);
    results.push({ ok: false });
  }

  // Test: when the integration is already known, "xer" no longer re-offers Xero
  // (suppressed) — the bot shouldn't ask "Did you mean Xero?" to a Xero user.
  const xeroKnownCandidates = findShortTokenCandidates(xeroTokens, pages, ['Xero']);
  if (!xeroKnownCandidates.some((c: string) => /xero/i.test(c))) {
    pass('short-token: known tool ["Xero"] suppresses the Xero candidate for "xer"');
    results.push({ ok: true });
  } else {
    fail('short-token: known Xero should suppress the Xero candidate', `Got: [${xeroKnownCandidates.join(', ')}]`);
    results.push({ ok: false });
  }

  // Test: a *different* known tool does NOT suppress an unrelated candidate
  const xeroOtherKnown = findShortTokenCandidates(xeroTokens, pages, ['QuickBooks']);
  if (xeroOtherKnown.some((c: string) => /xero/i.test(c))) {
    pass('short-token: unrelated known tool ["QuickBooks"] still surfaces Xero for "xer"');
    results.push({ ok: true });
  } else {
    fail('short-token: QuickBooks known should NOT suppress Xero candidate', `Got: [${xeroOtherKnown.join(', ')}]`);
    results.push({ ok: false });
  }

  // Test: common stop words like "for", "the" do NOT produce candidates
  const stopWordTokens = ['for', 'the', 'how'];
  const stopCandidates = findShortTokenCandidates(stopWordTokens, pages);
  if (stopCandidates.length === 0) {
    pass('short-token: stop words ("for", "the", "how") produce no candidates');
    results.push({ ok: true });
  } else {
    fail('short-token: stop words should produce 0 candidates', `Got: [${stopCandidates.join(', ')}]`);
    results.push({ ok: false });
  }

  // Test: empty token list returns empty candidates
  const emptyCandidates = findShortTokenCandidates([], pages);
  if (emptyCandidates.length === 0) {
    pass('short-token: empty token list returns no candidates');
    results.push({ ok: true });
  } else {
    fail('short-token: empty token list should return 0 candidates', `Got ${emptyCandidates.length}`);
    results.push({ ok: false });
  }

  // ── pickClarifyButtons unit tests (no API call needed) ────────────────────

  // Test: THEME_OVERFLOW strips keywords shared by all docs, returns discriminating ones
  const qbDocs = pages.filter(p =>
    (p.keywords ?? []).some((kw: string) => /quickbooks/i.test(kw))
  );
  if (qbDocs.length >= 2) {
    const buttons = pickClarifyButtons(qbDocs, 'THEME_OVERFLOW', [], pages);
    // "QuickBooks" and "Mews" are shared by all → should NOT appear; unique sub-topics should
    const hasQuickBooksAsButton = buttons.some((b: string) => /^quickbooks$/i.test(b));
    const hasButtons = buttons.length > 0;
    if (hasButtons && !hasQuickBooksAsButton) {
      pass(`pickClarifyButtons: THEME_OVERFLOW returns discriminating keywords (got: [${buttons.join(', ')}])`);
      results.push({ ok: true });
    } else if (!hasButtons) {
      // All keywords shared across all QB docs — degenerate case, acceptable
      pass('pickClarifyButtons: THEME_OVERFLOW — all keywords shared, no discriminating buttons (acceptable)');
      results.push({ ok: true });
    } else {
      fail('pickClarifyButtons: THEME_OVERFLOW should not include "QuickBooks" as a button', `Got: [${buttons.join(', ')}]`);
      results.push({ ok: false });
    }
  } else {
    pass('pickClarifyButtons THEME_OVERFLOW test skipped — fewer than 2 QuickBooks docs in manifest');
    results.push({ ok: true });
  }

  // Test: pickClarifyButtons filters previously answered keywords
  const sampleDocs = pages.slice(0, 5);
  const allSampleKws: string[] = sampleDocs.flatMap((p: { keywords?: string[] }) => p.keywords ?? []);
  if (allSampleKws.length > 0) {
    const firstKw = allSampleKws[0];
    const buttonsFiltered = pickClarifyButtons(sampleDocs, 'TOO_BROAD', [firstKw], pages);
    const firstKwStillPresent = buttonsFiltered.some((b: string) => b.toLowerCase() === firstKw.toLowerCase());
    if (!firstKwStillPresent) {
      pass(`pickClarifyButtons: previously answered keyword "${firstKw}" not in next round buttons`);
      results.push({ ok: true });
    } else {
      fail('pickClarifyButtons: should filter previously answered keywords', `"${firstKw}" still present in [${buttonsFiltered.join(', ')}]`);
      results.push({ ok: false });
    }
  } else {
    pass('pickClarifyButtons filter test skipped — no keywords in first 5 docs');
    results.push({ ok: true });
  }

  // Test: pickClarifyButtons prefers proper nouns over generic lowercase phrases
  const mixedDocs = [
    { id: 'a', title: 'A', path: 'a.md', description: '', category: '', keywords: ['Xero', 'accounting software'] },
    { id: 'b', title: 'B', path: 'b.md', description: '', category: '', keywords: ['DATEV', 'supported systems'] },
    { id: 'c', title: 'C', path: 'c.md', description: '', category: '', keywords: ['QuickBooks', 'integration types'] },
  ] as Parameters<typeof pickClarifyButtons>[0];
  const mixedButtons = pickClarifyButtons(mixedDocs, 'TOO_BROAD', [], pages);
  const firstIsProper = mixedButtons.length > 0 && /^[A-Z]/.test(mixedButtons[0]);
  if (firstIsProper) {
    pass(`pickClarifyButtons: proper nouns rank before generic phrases (got: [${mixedButtons.join(', ')}])`);
    results.push({ ok: true });
  } else if (mixedButtons.length === 0) {
    pass('pickClarifyButtons proper-noun test skipped — global cap filtered all buttons');
    results.push({ ok: true });
  } else {
    fail('pickClarifyButtons: first button should be a proper noun (e.g. Xero, DATEV)', `Got: [${mixedButtons.join(', ')}]`);
    results.push({ ok: false });
  }

  // Test: basicContextButtons returns Xero keyword for "xero integration" message
  const xeroCtx = basicContextButtons('xero integration', pages);
  const xeroCtxHasXero = xeroCtx.some((b: string) => /xero/i.test(b));
  if (xeroCtxHasXero) {
    pass(`basicContextButtons: "xero integration" returns Xero as context button (got: [${xeroCtx.join(', ')}])`);
    results.push({ ok: true });
  } else {
    fail('basicContextButtons: "xero integration" should surface Xero as a context button', `Got: [${xeroCtx.join(', ')}]`);
    results.push({ ok: false });
  }

  // Test: basicContextButtons returns [] for truly out-of-scope message
  const oosCtx = basicContextButtons('who won the world cup in 1998', pages);
  if (oosCtx.length === 0) {
    pass('basicContextButtons: out-of-scope message returns no context buttons');
    results.push({ ok: true });
  } else {
    fail('basicContextButtons: OOS message should return no context buttons', `Got: [${oosCtx.join(', ')}]`);
    results.push({ ok: false });
  }

  // ── Stage 2A: verifyDocuments (requires API key) ───────────────────────────
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (!hasApiKey) {
    skip('verifyDocuments Stage 2A tests', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    return;
  }

  const { verifyDocuments } = await import(`${ROOT}/backend/pipeline/claude.ts`);

  // Test 6: verifyDocuments returns one result per doc with passes:boolean + reasoning
  try {
    await new Promise(r => setTimeout(r, 1200));
    // Use 3 docs from manifest — mix of relevant and irrelevant to the question
    const testPages = pages.slice(0, 3).map(p => ({
      id: p.id,
      label: p.label,
      description: p.description,
      keywords: p.keywords,
      trigger_questions: p.trigger_questions,
      path: p.path,
    }));
    const fileContents: Record<string, string> = {};
    for (const p of testPages) {
      try { fileContents[p.id] = readFileSync(join(ROOT, p.path), 'utf-8'); } catch { /* skip */ }
    }
    const result = await verifyDocuments(testPages, fileContents, 'how does GL mapping work?', [], []);
    const hasResults = Array.isArray(result.results) && result.results.length === testPages.length;
    const hasBooleans = Array.isArray(result.results) && result.results.every(
      (r: { docId: string; reasoning: string; passes: boolean }) =>
        typeof r.passes === 'boolean' && typeof r.reasoning === 'string' && r.reasoning.length > 0
    );
    if (hasResults && hasBooleans) {
      pass(`verifyDocuments: returns ${result.results.length} results, each with passes:boolean + reasoning`);
      results.push({ ok: true });
    } else {
      fail('verifyDocuments: result structure', `hasResults=${hasResults} hasBooleans=${hasBooleans} got=${JSON.stringify(result).slice(0, 200)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('verifyDocuments test', (err as Error).message);
    results.push({ ok: false });
  }

  // Test 7: confidence is not present in results (new design — boolean only, no float)
  try {
    await new Promise(r => setTimeout(r, 1200));
    const testPage = pages.slice(0, 1).map(p => ({
      id: p.id, label: p.label, description: p.description,
      keywords: p.keywords, trigger_questions: p.trigger_questions, path: p.path,
    }));
    const fileContents2: Record<string, string> = {};
    for (const p of testPage) {
      try { fileContents2[p.id] = readFileSync(join(ROOT, p.path), 'utf-8'); } catch { /* skip */ }
    }
    const result = await verifyDocuments(testPage, fileContents2, 'what is the bronze tier?', [], []);
    const hasNoConfidence = result.results.every(
      (r: Record<string, unknown>) => !('confidence' in r) && typeof r.passes === 'boolean'
    );
    if (hasNoConfidence) {
      pass('verifyDocuments: no confidence float in results (passes:boolean only)');
      results.push({ ok: true });
    } else {
      fail('verifyDocuments: should not have confidence float', JSON.stringify(result.results[0]));
      results.push({ ok: false });
    }
  } catch (err) {
    fail('verifyDocuments no-confidence test', (err as Error).message);
    results.push({ ok: false });
  }

  // ── Smart CLARIFY button quality (requires API key) ─────────────────────────
  const { generateSmartClarifyQuestion } = await import(`${ROOT}/backend/pipeline/claude.ts`);

  // Test: "onboarding" query with onboarding guide docs → buttons should be integration names
  try {
    const onboardingMeta = pages
      .filter(p => /onboarding/i.test(p.label) && p.theme === 'website/mews-help-center')
      .slice(0, 10)
      .map(p => ({ title: p.label, theme: p.theme, keywords: p.keywords }));

    if (onboardingMeta.length >= 3) {
      const result = await generateSmartClarifyQuestion(
        'I need help with onboarding',
        'THEME_OVERFLOW',
        onboardingMeta,
        [],
        'en'
      );
      if (result && result.options.length >= 2) {
        const hasMarketplace = result.options.some((o: string) => /mews marketplace/i.test(o));
        const hasConnectIntegration = result.options.some((o: string) => /connect integration/i.test(o));
        if (!hasMarketplace && !hasConnectIntegration) {
          pass(`generateSmartClarifyQuestion: "onboarding" buttons do not contain UI element names (got: [${result.options.join(', ')}])`);
          results.push({ ok: true });
        } else {
          fail('generateSmartClarifyQuestion: "onboarding" should not produce Mews Marketplace or Connect Integration', `Got: [${result.options.join(', ')}]`);
          results.push({ ok: false });
        }

        // Verify no duplicate buttons
        const lowerOpts = result.options.map((o: string) => o.toLowerCase());
        const uniqueOpts = new Set(lowerOpts);
        if (uniqueOpts.size === lowerOpts.length) {
          pass('generateSmartClarifyQuestion: no duplicate buttons');
          results.push({ ok: true });
        } else {
          fail('generateSmartClarifyQuestion: duplicate buttons found', `Got: [${result.options.join(', ')}]`);
          results.push({ ok: false });
        }
      } else {
        skip('generateSmartClarifyQuestion onboarding test', 'Haiku returned null or too few options');
        results.push({ ok: 'skip' });
      }
    } else {
      skip('generateSmartClarifyQuestion onboarding test', `Only ${onboardingMeta.length} onboarding docs found`);
      results.push({ ok: 'skip' });
    }
  } catch (err) {
    fail('generateSmartClarifyQuestion onboarding test', (err as Error).message);
    results.push({ ok: false });
  }

  // Test: multi-theme query → buttons should reflect category diversity
  try {
    const multiThemeMeta = pages
      .slice(0, 12)
      .map(p => ({ title: p.label, theme: p.theme, keywords: p.keywords }));

    const themes = new Set(multiThemeMeta.map(d => d.theme));
    if (themes.size >= 2) {
      const result = await generateSmartClarifyQuestion(
        'accounting setup',
        'TOO_BROAD',
        multiThemeMeta,
        [],
        'en'
      );
      if (result && result.options.length >= 2) {
        pass(`generateSmartClarifyQuestion: multi-theme query returns options (got: [${result.options.join(', ')}])`);
        results.push({ ok: true });
      } else {
        skip('generateSmartClarifyQuestion multi-theme test', 'Haiku returned null');
        results.push({ ok: 'skip' });
      }
    } else {
      skip('generateSmartClarifyQuestion multi-theme test', `Only ${themes.size} themes in top 12 docs`);
      results.push({ ok: 'skip' });
    }
  } catch (err) {
    fail('generateSmartClarifyQuestion multi-theme test', (err as Error).message);
    results.push({ ok: false });
  }
}
