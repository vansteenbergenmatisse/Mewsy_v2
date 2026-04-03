/**
 * Suite 2: Knowledge manifest
 * Validates knowledge-manifest.json structure and that all referenced files exist.
 * Supports the new { categories, files } format.
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

interface ManifestFile {
  id?: string;
  title?: string;
  description?: string;
  path?: string;
  category?: string;
  keywords?: unknown;
  trigger_questions?: unknown;
  sections?: unknown;
  source_url?: string;
  source_type?: string;
}

interface ManifestCategory {
  id?: string;
  label?: string;
  description?: string;
}

interface Manifest {
  categories?: ManifestCategory[];
  files?: ManifestFile[];
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

  // 3. Has categories array and files array (new format)
  if (!Array.isArray(manifest.categories)) {
    fail('manifest has categories array', 'Missing or invalid "categories" key');
    results.push({ ok: false });
    return;
  }
  if (!Array.isArray(manifest.files)) {
    fail('manifest has files array', 'Missing or invalid "files" key');
    results.push({ ok: false });
    return;
  }
  pass('manifest has categories and files arrays');
  results.push({ ok: true });

  const files = manifest.files;

  // 4. At least one entry
  if (files.length === 0) {
    fail('manifest has at least one file entry', 'files array is empty');
    results.push({ ok: false });
    return;
  }
  pass(`manifest has ${files.length} file entries and ${manifest.categories.length} categories`);
  results.push({ ok: true });

  // 5. Each entry has required fields and its file exists on disk
  let schemaOk = true;
  let filesOk = true;

  for (const file of files) {
    const key = file.id ?? '(no id)';
    const required = ['id', 'title', 'description', 'path', 'category'] as const;
    for (const field of required) {
      if (!file[field]) {
        fail(`entry "${key}" has required field: ${field}`, `Missing "${field}"`);
        results.push({ ok: false });
        schemaOk = false;
      }
    }
    if (file.path) {
      const filePath = join(ROOT, file.path);
      if (!existsSync(filePath)) {
        fail(`entry "${key}" file exists on disk`, `File not found: ${file.path}`);
        results.push({ ok: false });
        filesOk = false;
      }
    }
  }

  if (schemaOk) {
    pass('all entries have required fields (id, title, description, path, category)');
    results.push({ ok: true });
  }
  if (filesOk) {
    pass('all referenced knowledge files exist on disk');
    results.push({ ok: true });
  }

  // 6. keywords field validation + source_type validation
  const VALID_SOURCE_TYPES = ['website_single', 'website_multi', 'website_split', 'confluence'];
  let keywordsOk = true;
  let sourceTypeOk = true;

  for (const file of files) {
    const key = file.id ?? '(no id)';
    // keywords must be an array with 1–20 items
    if (!Array.isArray(file.keywords) || (file.keywords as unknown[]).length < 1 || (file.keywords as unknown[]).length > 20) {
      fail(`entry "${key}" has valid keywords array (1–20 items)`, `Got: ${JSON.stringify(file.keywords)}`);
      results.push({ ok: false });
      keywordsOk = false;
    }
    // scraped entries must have a valid source_type
    if (file.source_url && (!file.source_type || !VALID_SOURCE_TYPES.includes(file.source_type))) {
      fail(`entry "${key}" has valid source_type`, `Got: "${file.source_type}"`);
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

  // 7. trigger_questions and sections fields exist (new fields — can be empty arrays)
  let newFieldsOk = true;
  for (const file of files) {
    const key = file.id ?? '(no id)';
    if (!Array.isArray(file.trigger_questions)) {
      fail(`entry "${key}" has trigger_questions array`, `Got: ${JSON.stringify(file.trigger_questions)}`);
      results.push({ ok: false });
      newFieldsOk = false;
    }
    if (!Array.isArray(file.sections)) {
      fail(`entry "${key}" has sections array`, `Got: ${JSON.stringify(file.sections)}`);
      results.push({ ok: false });
      newFieldsOk = false;
    }
  }
  if (newFieldsOk) {
    pass('all entries have trigger_questions and sections arrays');
    results.push({ ok: true });
  }

  // 8. Orphan file detection — .md files on disk that have no manifest entry
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
    files.map(f => f.path ? join(ROOT, f.path) : '').filter(Boolean)
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

  // 9. fetch_sources.json exists and is valid JSON
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

  // 10. All categories have non-empty descriptions
  //     These are required for Stage 1 routing to work. Fill them in manually or
  //     run `npm run sync` to auto-generate them.
  let allCatsDescribed = true;
  for (const cat of (manifest.categories ?? [])) {
    const catKey = cat.id ?? '(no id)';
    if (!cat.description || !cat.description.trim()) {
      fail(`category "${catKey}" has a non-empty description`, 'description is empty — add one manually or run npm run sync');
      results.push({ ok: false });
      allCatsDescribed = false;
    }
  }
  if (allCatsDescribed && (manifest.categories ?? []).length > 0) {
    pass(`all ${manifest.categories!.length} categories have non-empty descriptions`);
    results.push({ ok: true });
  }

  // 11. Sections are populated for files that have ## headings
  //     enrichSections is called inline so this test always reflects current file content.
  //     It also writes the updated sections back so the manifest stays in sync.
  try {
    const { enrichSections } = await import(`${ROOT}/backend/scraper/pipeline/manifest.ts`);
    const { writeManifest: wm } = await import(`${ROOT}/backend/scraper/pipeline/manifest.ts`);
    const sectionsChanged = enrichSections(manifest) as boolean;
    if (sectionsChanged) {
      wm(manifest);
    }

    let sectionsMissing = false;
    for (const file of files) {
      const key = file.id ?? '(no id)';
      if (!file.path) continue;
      // Check if the current file content has any ## headings
      const fullPath = join(ROOT, file.path as string);
      if (!existsSync(fullPath)) continue;
      const content = readFileSync(fullPath, 'utf8');
      const hasHeadings = /^## .+/m.test(content);
      // After enrichSections the in-memory manifest is updated — check updated entry
      const updated = manifest.files.find(f => f.id === key);
      if (hasHeadings && (!updated?.sections || (updated.sections as unknown[]).length === 0)) {
        fail(`entry "${key}" sections populated`, 'file has ## headings but sections array is empty');
        results.push({ ok: false });
        sectionsMissing = true;
      }
    }
    if (!sectionsMissing) {
      pass('all files with ## headings have non-empty sections arrays');
      results.push({ ok: true });
    }
  } catch (err) {
    fail('sections enrichment check', (err as Error).message);
    results.push({ ok: false });
  }
}
