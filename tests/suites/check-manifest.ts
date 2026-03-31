/**
 * Suite 2: Knowledge manifest
 * Validates knowledge-manifest.json structure and that all referenced files exist.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT          = join(__dirname, '../..');
const MANIFEST_PATH = join(ROOT, 'knowledge', 'knowledge-manifest.json');

interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

interface ManifestPage {
  title?: string;
  description?: string;
  path?: string;
  keywords?: unknown;
  source_url?: string;
  source_type?: string;
}

interface Manifest {
  pages?: Record<string, ManifestPage>;
}

export async function checkManifest({ pass, fail, skip, results }: Reporter): Promise<void> {
  // 1. File exists
  if (!existsSync(MANIFEST_PATH)) {
    fail('knowledge-manifest.json exists', 'File not found at knowledge/knowledge-manifest.json');
    results.push({ ok: false });
    return;
  }
  pass('knowledge-manifest.json exists');
  results.push({ ok: true });

  // 2. Valid JSON
  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    pass('knowledge-manifest.json is valid JSON');
    results.push({ ok: true });
  } catch (err) {
    fail('knowledge-manifest.json is valid JSON', (err as Error).message);
    results.push({ ok: false });
    return;
  }

  // 3. Has pages object
  if (!manifest.pages || typeof manifest.pages !== 'object') {
    fail('manifest has pages object', 'Missing or invalid "pages" key');
    results.push({ ok: false });
    return;
  }
  pass('manifest has pages object');
  results.push({ ok: true });

  const entries = Object.entries(manifest.pages);

  // 4. At least one entry
  if (entries.length === 0) {
    fail('manifest has at least one entry', 'pages object is empty');
    results.push({ ok: false });
    return;
  }
  pass(`manifest has ${entries.length} entries`);
  results.push({ ok: true });

  // 5. Each entry has required fields and its file exists on disk
  let schemaOk = true;
  let filesOk = true;

  for (const [key, page] of entries) {
    const required = ['title', 'description', 'path'] as const;
    for (const field of required) {
      if (!page[field]) {
        fail(`entry "${key}" has required field: ${field}`, `Missing "${field}"`);
        results.push({ ok: false });
        schemaOk = false;
      }
    }
    if (page.path) {
      const filePath = join(ROOT, page.path);
      if (!existsSync(filePath)) {
        fail(`entry "${key}" file exists on disk`, `File not found: ${page.path}`);
        results.push({ ok: false });
        filesOk = false;
      }
    }
  }

  if (schemaOk) {
    pass('all entries have required fields (title, description, path)');
    results.push({ ok: true });
  }
  if (filesOk) {
    pass('all referenced knowledge files exist on disk');
    results.push({ ok: true });
  }

  // 6. keywords field validation
  // These are the source_type values set by the scrapers (not the fetch_sources.json type field)
  const VALID_SOURCE_TYPES = ['website_single', 'website_multi', 'website_split', 'confluence'];
  let keywordsOk = true;
  let sourceTypeOk = true;

  for (const [key, page] of entries) {
    // keywords must be an array with 1–20 items
    if (!Array.isArray(page.keywords) || (page.keywords as unknown[]).length < 1 || (page.keywords as unknown[]).length > 20) {
      fail(`entry "${key}" has valid keywords array (1–20 items)`, `Got: ${JSON.stringify(page.keywords)}`);
      results.push({ ok: false });
      keywordsOk = false;
    }
    // scraped entries must have a valid source_type
    if (page.source_url && (!page.source_type || !VALID_SOURCE_TYPES.includes(page.source_type))) {
      fail(`entry "${key}" has valid source_type`, `Got: "${page.source_type}"`);
      results.push({ ok: false });
      sourceTypeOk = false;
    }
  }

  if (keywordsOk) {
    pass('all entries have a valid keywords array (1–20 items)');
    results.push({ ok: true });
  }
  if (sourceTypeOk) {
    pass('all scraped entries have a valid source_type');
    results.push({ ok: true });
  }

  // 7. Orphan file detection — .md files on disk that have no manifest entry
  function walkMd(dir: string): string[] {
    const results: string[] = [];
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return results; }
    for (const name of entries) {
      const full = join(dir, name);
      try {
        if (statSync(full).isDirectory()) {
          results.push(...walkMd(full));
        } else if (name.endsWith('.md') && name !== 'README.md') {
          results.push(full);
        }
      } catch { /* skip unreadable entries */ }
    }
    return results;
  }

  const manifestPaths = new Set(
    entries.map(([, page]) => page.path ? join(ROOT, page.path) : '').filter(Boolean)
  );
  const knowledgeDir = join(ROOT, 'knowledge');
  const allMdFiles = walkMd(knowledgeDir);
  let orphanFound = false;
  for (const mdFile of allMdFiles) {
    if (!manifestPaths.has(mdFile)) {
      fail(`orphan .md file has no manifest entry`, mdFile.replace(ROOT + '/', ''));
      results.push({ ok: false });
      orphanFound = true;
    }
  }
  if (!orphanFound) {
    pass('no orphaned .md files found under knowledge/');
    results.push({ ok: true });
  }

  // 8. fetch_sources.json exists and is valid JSON
  const fetchSourcesPath = join(ROOT, 'knowledge', 'fetch_sources.json');
  if (!existsSync(fetchSourcesPath)) {
    skip('fetch_sources.json exists', 'file not found — scraper will not run');
    results.push({ ok: 'skip' });
  } else {
    try {
      JSON.parse(readFileSync(fetchSourcesPath, 'utf8'));
      pass('fetch_sources.json is valid JSON');
      results.push({ ok: true });
    } catch (err) {
      fail('fetch_sources.json is valid JSON', (err as Error).message);
      results.push({ ok: false });
    }
  }
}
