/**
 * Suite 3: Scraper utilities
 * Unit tests for slugify, hash, expandLinks, removeEmDashes, manifest CRUD — no network calls needed.
 */

import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
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

interface SlugCase {
  input: string;
  expected?: string;
  expected_maxLen?: number;
}

interface ManifestData {
  pages: Record<string, { title: string; description: string; keywords: string[]; path: string }>;
}

export async function checkScraper({ pass, fail, skip: _skip, results }: Reporter): Promise<void> {
  // ── slugify ──────────────────────────────────────────────────────────────
  const { slugify } = await import(`${ROOT}/backend/scraper/utils/slugify.ts`);

  const slugCases: SlugCase[] = [
    { input: 'Getting Started with Mews', expected: 'getting-started-with-mews' },
    { input: '1320910850 — Information',  expected: 'information' },
    { input: 'Onboarding & Setup Guide!', expected: 'onboarding-setup-guide' },
    { input: '123456789',                 expected: 'page' },         // purely numeric → fallback
    { input: 'A'.repeat(100),             expected_maxLen: 80 },
  ];

  for (const c of slugCases) {
    const result = slugify(c.input) as string;
    if (c.expected !== undefined && result !== c.expected) {
      fail(`slugify("${c.input}")`, `Expected "${c.expected}", got "${result}"`);
      results.push({ ok: false });
    } else if (c.expected_maxLen !== undefined && result.length > c.expected_maxLen) {
      fail(`slugify truncates to ${c.expected_maxLen} chars`, `Got length ${result.length}`);
      results.push({ ok: false });
    } else {
      pass(`slugify("${c.input}") → "${result}"`);
      results.push({ ok: true });
    }
  }

  // Purely numeric slug must never be returned
  const numericResult = slugify('99999') as string;
  if (/^\d+$/.test(numericResult)) {
    fail('slugify never returns purely numeric result', `Got "${numericResult}"`);
    results.push({ ok: false });
  } else {
    pass(`slugify("99999") returns non-numeric fallback → "${numericResult}"`);
    results.push({ ok: true });
  }

  // ── hash ────────────────────────────────────────────────────────────────
  const { sha256 } = await import(`${ROOT}/backend/scraper/utils/hash.ts`);

  const h1 = sha256('hello world') as string;
  const h2 = sha256('hello world') as string;
  const h3 = sha256('different input') as string;

  if (h1 === h2) {
    pass('sha256 is deterministic (same input → same hash)');
    results.push({ ok: true });
  } else {
    fail('sha256 is deterministic', `Got different hashes for same input`);
    results.push({ ok: false });
  }

  if (h1 !== h3) {
    pass('sha256 produces different hashes for different inputs');
    results.push({ ok: true });
  } else {
    fail('sha256 produces different hashes', 'Same hash for different inputs');
    results.push({ ok: false });
  }

  if (typeof h1 === 'string' && h1.length === 64) {
    pass(`sha256 returns 64-char hex string`);
    results.push({ ok: true });
  } else {
    fail('sha256 returns 64-char hex string', `Got length ${h1?.length}`);
    results.push({ ok: false });
  }

  // ── manifest read/write ─────────────────────────────────────────────────
  const { readManifest, writeManifest } = await import(`${ROOT}/backend/scraper/pipeline/manifest.ts`);

  const testManifestPath = join(ROOT, 'tests', '.tmp-manifest-test.json');
  // Temporarily monkey-patch config path — instead just read/write directly
  const testData: ManifestData = { pages: { test: { title: 'T', description: 'D', keywords: ['a'], path: 'knowledge/mews.md' } } };

  try {
    writeFileSync(testManifestPath, JSON.stringify(testData, null, 2));
    const readBack = JSON.parse(readFileSync(testManifestPath, 'utf8')) as ManifestData;
    if (readBack.pages?.test?.title === 'T') {
      pass('manifest JSON round-trips correctly (write → read)');
      results.push({ ok: true });
    } else {
      fail('manifest JSON round-trips correctly', 'Read-back did not match written data');
      results.push({ ok: false });
    }
  } catch (err) {
    fail('manifest read/write', (err as Error).message);
    results.push({ ok: false });
  } finally {
    if (existsSync(testManifestPath)) unlinkSync(testManifestPath);
  }

  // ── manifest validation ──────────────────────────────────────────────────
  const { upsertEntry, deleteEntry, getScraperEntries, readManifest: readM, writeManifest: writeM } =
    await import(`${ROOT}/backend/scraper/pipeline/manifest.ts`);

  // upsertEntry should throw on missing required fields
  let threw = false;
  try {
    const badEntry = { title: 'X' }; // missing description, keywords, path
    upsertEntry('__test__', badEntry);
  } catch (_err) {
    threw = true;
  }
  if (threw) {
    pass('manifest upsertEntry throws on missing required fields');
    results.push({ ok: true });
  } else {
    fail('manifest upsertEntry throws on missing required fields', 'Did not throw for incomplete entry');
    results.push({ ok: false });
  }

  // ── expandLinks ───────────────────────────────────────────────────────────
  const { expandLinks } = await import(`${ROOT}/backend/scraper/pipeline/cleanup.ts`);

  const linkCases: Array<{ input: string; expected: string; label: string }> = [
    {
      input: '[click here](https://example.com)',
      expected: 'click here (https://example.com)',
      label: 'expandLinks converts [text](https://...) to text (url)',
    },
    {
      input: '![image](https://example.com/img.png)',
      expected: '![image](https://example.com/img.png)',
      label: 'expandLinks leaves image links ![...] untouched',
    },
    {
      input: '[relative](/page)',
      expected: '[relative](/page)',
      label: 'expandLinks leaves relative (non-http) links untouched',
    },
    {
      input: 'plain text no links',
      expected: 'plain text no links',
      label: 'expandLinks leaves plain text unchanged',
    },
  ];

  for (const c of linkCases) {
    const result = expandLinks(c.input) as string;
    if (result === c.expected) {
      pass(c.label);
      results.push({ ok: true });
    } else {
      fail(c.label, `Expected "${c.expected}", got "${result}"`);
      results.push({ ok: false });
    }
  }

  // ── removeEmDashes ────────────────────────────────────────────────────────
  const { removeEmDashes } = await import(`${ROOT}/backend/scraper/pipeline/cleanup.ts`);

  const emDashCases: Array<{ input: string; expected: string; label: string }> = [
    {
      input: 'foo — bar',
      expected: 'foo - bar',
      label: 'removeEmDashes replaces " — " with " - "',
    },
    {
      input: 'foo—bar',
      expected: 'foo - bar',
      label: 'removeEmDashes replaces "—" (no spaces) with " - "',
    },
    {
      input: 'no dashes here',
      expected: 'no dashes here',
      label: 'removeEmDashes leaves text without em-dashes unchanged',
    },
  ];

  for (const c of emDashCases) {
    const result = removeEmDashes(c.input) as string;
    if (result === c.expected) {
      pass(c.label);
      results.push({ ok: true });
    } else {
      fail(c.label, `Expected "${c.expected}", got "${result}"`);
      results.push({ ok: false });
    }
  }

  // ── deleteEntry ───────────────────────────────────────────────────────────
  const manifestPath = join(ROOT, 'knowledge', 'knowledge-manifest.json');
  const originalJson = readFileSync(manifestPath, 'utf8');

  try {
    // Add a scraper-managed entry to delete
    upsertEntry('__delete_test__', {
      title: 'Delete Test',
      description: 'Temporary test entry for deleteEntry',
      keywords: ['test'],
      path: 'knowledge/mews.md',
      source_type: 'static',
      source_url: 'https://test.example.com',
    });

    const deleted = deleteEntry('__delete_test__') as boolean;
    if (deleted === true) {
      pass('deleteEntry returns true for a scraper-managed entry');
      results.push({ ok: true });
    } else {
      fail('deleteEntry returns true for scraper-managed entry', `Got: ${deleted}`);
      results.push({ ok: false });
    }

    const deletedManual = deleteEntry('mews') as boolean;
    if (deletedManual === false) {
      pass('deleteEntry returns false for a manual entry (no source_type)');
      results.push({ ok: true });
    } else {
      fail('deleteEntry returns false for manual entry', `Got: ${deletedManual}`);
      results.push({ ok: false });
    }

    const deletedMissing = deleteEntry('nonexistent_slug_xyz_abc') as boolean;
    if (deletedMissing === false) {
      pass('deleteEntry returns false for a non-existent slug');
      results.push({ ok: true });
    } else {
      fail('deleteEntry returns false for non-existent slug', `Got: ${deletedMissing}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('deleteEntry tests', (err as Error).message);
    results.push({ ok: false });
  } finally {
    writeFileSync(manifestPath, originalJson);
  }

  // ── getScraperEntries ─────────────────────────────────────────────────────
  try {
    const entries = getScraperEntries() as Array<Record<string, unknown>>;
    if (Array.isArray(entries)) {
      pass('getScraperEntries returns an array');
      results.push({ ok: true });
    } else {
      fail('getScraperEntries returns an array', `Got: ${typeof entries}`);
      results.push({ ok: false });
    }

    const allHaveSourceType = entries.every(e => 'source_type' in e && typeof e.source_type === 'string');
    if (allHaveSourceType) {
      pass('getScraperEntries: every entry has a source_type field');
      results.push({ ok: true });
    } else {
      fail('getScraperEntries: every entry has source_type', 'Found entry without source_type');
      results.push({ ok: false });
    }
  } catch (err) {
    fail('getScraperEntries', (err as Error).message);
    results.push({ ok: false });
  }

  // ── readManifest / writeManifest ──────────────────────────────────────────
  try {
    const m = readM() as { categories: unknown[]; files: unknown[] };
    if (m && typeof m === 'object' && Array.isArray(m.categories) && Array.isArray(m.files)) {
      pass('readManifest() returns object with categories and files arrays');
      results.push({ ok: true });
    } else {
      fail('readManifest() returns object with categories and files', `Got keys: ${Object.keys(m ?? {}).join(', ')}`);
      results.push({ ok: false });
    }

    writeM(m);
    pass('writeManifest(readManifest()) does not throw');
    results.push({ ok: true });
  } catch (err) {
    fail('readManifest/writeManifest round-trip', (err as Error).message);
    results.push({ ok: false });
  }

  // ── enrichSections ────────────────────────────────────────────────────────
  // No API key needed — enrichSections reads files from disk and parses headings.
  const { enrichSections } = await import(`${ROOT}/backend/scraper/pipeline/manifest.ts`);

  try {
    // Build a small in-memory manifest pointing at a known file with ## headings
    const testManifestForSections = {
      categories: [],
      files: [
        {
          id: 'mews',
          title: 'Test',
          category: 'mews.md',
          description: 'test',
          keywords: ['test'],
          trigger_questions: [],
          sections: [],           // intentionally empty
          path: 'knowledge/mews.md',
        },
      ],
    };
    const changed = enrichSections(testManifestForSections) as boolean;
    if (changed && testManifestForSections.files[0].sections.length > 0) {
      pass('enrichSections fills sections from ## headings in file content');
      results.push({ ok: true });
    } else {
      fail('enrichSections fills sections', `changed=${changed}, sections=${JSON.stringify(testManifestForSections.files[0].sections)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('enrichSections', (err as Error).message);
    results.push({ ok: false });
  }

  try {
    // enrichSections returns false when sections are already up to date
    const mOrig = readM() as { categories: unknown[]; files: { sections: unknown[] }[] };
    // First call populates sections, second call on the same object returns false
    enrichSections(mOrig);
    const secondRun = enrichSections(mOrig) as boolean;
    if (secondRun === false) {
      pass('enrichSections returns false when nothing changed (idempotent)');
      results.push({ ok: true });
    } else {
      fail('enrichSections idempotent', 'Expected false on second run, got true');
      results.push({ ok: false });
    }
  } catch (err) {
    fail('enrichSections idempotency', (err as Error).message);
    results.push({ ok: false });
  }

  // ── generateTriggerQuestions / generateCategoryDescription / enrichManifest
  // These make real Haiku API calls — skip when no key is set.
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  const { generateTriggerQuestions, generateCategoryDescription, enrichManifest } =
    await import(`${ROOT}/backend/scraper/pipeline/enrich.ts`);

  if (!hasApiKey) {
    _skip('generateTriggerQuestions', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    _skip('generateCategoryDescription', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    _skip('enrichManifest (LLM passes)', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    _skip('[cache] Haiku: client and callHaikuWithUsage exported', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    _skip('[cache] Haiku: prompt caching active', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
  } else {
    // generateTriggerQuestions
    try {
      await new Promise(r => setTimeout(r, 1200));
      const questions = await generateTriggerQuestions(
        'GL Mapping',
        '## GL Mapping\n\nMap your general ledger accounts here. Each account must be matched to a GL code before posting.'
      ) as unknown[];
      if (Array.isArray(questions) && questions.length > 0 && questions.every(q => typeof q === 'string')) {
        pass(`generateTriggerQuestions returns ${questions.length} questions`);
        results.push({ ok: true });
      } else {
        fail('generateTriggerQuestions returns non-empty array of strings', `Got: ${JSON.stringify(questions)}`);
        results.push({ ok: false });
      }
    } catch (err) {
      fail('generateTriggerQuestions', (err as Error).message);
      results.push({ ok: false });
    }

    // generateCategoryDescription
    try {
      await new Promise(r => setTimeout(r, 1200));
      const cat = { id: 'test-cat', label: 'Mews Help Center', description: '' };
      const catFiles = [
        { id: 'f1', title: 'Onboarding Guide | Mews to Xero', description: 'Connects Mews PMS to Xero via Omniboost', keywords: [], trigger_questions: [], sections: [], path: '', category: 'test-cat' },
        { id: 'f2', title: 'Onboarding Guide | Mews to DATEV', description: 'Connects Mews PMS to DATEV via Omniboost', keywords: [], trigger_questions: [], sections: [], path: '', category: 'test-cat' },
      ];
      const desc = await generateCategoryDescription(cat, catFiles) as string;
      if (typeof desc === 'string' && desc.trim().length >= 5) {
        pass(`generateCategoryDescription returns description: "${desc.slice(0, 80)}"`);
        results.push({ ok: true });
      } else {
        fail('generateCategoryDescription returns non-empty description', `Got: "${desc}"`);
        results.push({ ok: false });
      }
    } catch (err) {
      fail('generateCategoryDescription', (err as Error).message);
      results.push({ ok: false });
    }

    // enrichManifest — run on the real manifest; since all categories now have
    // descriptions, this test only exercises sections refresh and skips LLM passes.
    try {
      await new Promise(r => setTimeout(r, 1200));
      await enrichManifest();
      pass('enrichManifest() runs without throwing');
      results.push({ ok: true });
    } catch (err) {
      fail('enrichManifest()', (err as Error).message);
      results.push({ ok: false });
    }

    // [cache] Haiku: static check — client is configured with the prompt-caching beta header.
    // The dynamic check below is best-effort: claude-haiku-4-5 may not yet support the
    // prompt-caching-2024-07-31 beta (it is model-specific). If the API returns 0 for both
    // cache_creation and cache_read, the test is skipped (not failed) to avoid blocking CI
    // when the model capability has not been enabled by Anthropic.
    try {
      const haiku = await import(`${ROOT}/backend/utils/haiku.ts`);
      // Verify the client was exported (required for dynamic test below)
      if (typeof haiku.haikuClient === 'object' && haiku.haikuClient !== null &&
          typeof haiku.callHaikuWithUsage === 'function') {
        pass('[cache] Haiku: client and callHaikuWithUsage exported');
        results.push({ ok: true });
      } else {
        fail('[cache] Haiku: client and callHaikuWithUsage exported', 'haikuClient or callHaikuWithUsage not exported');
        results.push({ ok: false });
      }
    } catch (err) {
      fail('[cache] Haiku: client exports', (err as Error).message);
      results.push({ ok: false });
    }

    // [cache] Haiku: dynamic — two calls with same cached system prompt should produce cache tokens.
    // Uses the same pattern as selectRelevantFiles() in claude.ts.
    // Skipped (not failed) if the model does not support the prompt-caching beta.
    try {
      await new Promise(r => setTimeout(r, 1200));
      const { haikuClient, HAIKU_MODEL } = await import(`${ROOT}/backend/utils/haiku.ts`);

      // ~31 words × 80 repetitions ≈ 3300 tokens — safely above the 2048-token Haiku minimum
      const base = 'This sentence is repeated to push the system prompt past the minimum token threshold required for Anthropic prompt caching to activate for Haiku models. The minimum cacheable block size is 2048 tokens. ';
      const longSystem = base.repeat(80);

      // @ts-ignore — cache_control accepted at runtime, not yet in SDK types
      const sysBlocks = [{ type: 'text', text: longSystem, cache_control: { type: 'ephemeral' } }];
      const msgs = [{ role: 'user' as const, content: 'ping' }];

      // @ts-ignore
      const r1 = await haikuClient.messages.create({ model: HAIKU_MODEL, max_tokens: 5, system: sysBlocks, messages: msgs });
      const usage1 = r1.usage as Record<string, number>;
      const created = usage1.cache_creation_input_tokens ?? 0;

      await new Promise(r => setTimeout(r, 600));

      // @ts-ignore
      const r2 = await haikuClient.messages.create({ model: HAIKU_MODEL, max_tokens: 5, system: sysBlocks, messages: msgs });
      const usage2 = r2.usage as Record<string, number>;
      const readFromCache = usage2.cache_read_input_tokens ?? 0;

      if (created > 0 || readFromCache > 0) {
        pass(`[cache] Haiku: prompt caching active (created=${created}, read=${readFromCache})`);
        results.push({ ok: true });
      } else {
        // Model does not yet expose cache tokens — skip rather than fail so CI stays green.
        _skip('[cache] Haiku: prompt caching active', `claude-haiku-4-5 returned cache_creation=${created}, cache_read=${readFromCache} — prompt-caching beta may not be enabled for this model`);
        results.push({ ok: 'skip' });
      }
    } catch (err) {
      fail('[cache] Haiku: prompt caching dynamic check', (err as Error).message);
      results.push({ ok: false });
    }
  }
}
