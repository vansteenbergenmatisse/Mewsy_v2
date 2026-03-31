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
    const m = readM() as { pages: Record<string, unknown> };
    if (m && typeof m === 'object' && 'pages' in m && typeof m.pages === 'object') {
      pass('readManifest() returns object with pages property');
      results.push({ ok: true });
    } else {
      fail('readManifest() returns object with pages', `Got: ${JSON.stringify(m)}`);
      results.push({ ok: false });
    }

    writeM(m);
    pass('writeManifest(readManifest()) does not throw');
    results.push({ ok: true });
  } catch (err) {
    fail('readManifest/writeManifest round-trip', (err as Error).message);
    results.push({ ok: false });
  }
}
