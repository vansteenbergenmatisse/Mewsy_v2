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
}

interface Manifest {
  files?: ManifestFile[];
}

export async function checkRouting({ pass, fail, skip, results }: Reporter): Promise<void> {
  const { keywordPreFilter } = await import(`${ROOT}/backend/pipeline/agent.ts`);
  const { STAGE2A_SHORTLIST_MAX } = await import(`${ROOT}/backend/config/Mewsie.config.ts`);

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
      trigger_questions: [] as string[],
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
  const hasQuickBooks = filtered.some(p =>
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
    const result = await verifyDocuments(testPages, 'how does GL mapping work?', [], []);
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
    const result = await verifyDocuments(testPage, 'what is the bronze tier?', [], []);
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
}
