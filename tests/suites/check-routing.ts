/**
 * Suite 4: Routing accuracy
 * Sends test queries to the routing agent and verifies the correct documents are selected.
 * Requires a live ANTHROPIC_API_KEY.
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

interface RoutingTest {
  query: string;
  expectedDocIds: string[];
  description: string;
}

interface ManifestPage {
  title?: string;
  description?: string;
  path: string;
  keywords?: string[];
}

interface Manifest {
  pages?: Record<string, ManifestPage>;
}

// Each test case: query → at least one of expectedDocIds must be in the result
const ROUTING_TESTS: RoutingTest[] = [
  {
    query:          'what are the integration tiers?',
    expectedDocIds: ['mews'],
    description:    'Tier question → mews.md',
  },
  {
    query:          'what is the bronze tier?',
    expectedDocIds: ['mews'],
    description:    'Bronze tier → mews.md',
  },
  {
    query:          'what is omniboost?',
    expectedDocIds: ['omniboost'],
    description:    'Omniboost overview → omniboost.md',
  },
  {
    query:          'how does GL mapping work?',
    expectedDocIds: ['mews'],
    description:    'GL mapping → mews.md',
  },
  {
    query:          'what accounting flows are available in mews?',
    expectedDocIds: ['mews'],
    description:    'Accounting flows → mews.md',
  },
  {
    query:          'what products does omniboost offer?',
    expectedDocIds: ['omniboost'],
    description:    'Omniboost products → omniboost.md',
  },
];

export async function checkRouting({ pass, fail, skip, results }: Reporter): Promise<void> {
  const { selectRelevantFiles } = await import(`${ROOT}/backend/pipeline/claude.ts`);

  // Load manifest to get pages list
  let pages: { id: string; label: string; description: string; keywords: string[]; path: string }[];
  try {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'knowledge-manifest.json'), 'utf8')) as Manifest;
    pages = Object.entries(manifest.pages ?? {}).map(([key, page]) => ({
      id:          key,
      label:       page.title ?? key,
      description: page.description ?? '',
      keywords:    page.keywords ?? [],
      path:        page.path,
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

  for (const tc of ROUTING_TESTS) {
    try {
      await new Promise(r => setTimeout(r, 1200));
      const { indices, confidence } = await selectRelevantFiles(pages, tc.query, []) as { indices: number[]; confidence: number };
      const selectedIds = indices.map(i => pages[i]?.id).filter(Boolean);
      const matched = tc.expectedDocIds.some(id => selectedIds.includes(id));

      if (matched) {
        pass(`"${tc.description}" → [${selectedIds.join(', ')}] (conf: ${confidence.toFixed(2)})`);
        results.push({ ok: true });
      } else {
        fail(
          `"${tc.description}"`,
          `Expected one of [${tc.expectedDocIds.join(', ')}], got [${selectedIds.join(', ')}] (conf: ${confidence.toFixed(2)})`
        );
        results.push({ ok: false });
      }

      // Confidence must always be in [0, 1]
      if (confidence >= 0 && confidence <= 1) {
        pass(`"${tc.description}" confidence ${confidence.toFixed(2)} is in [0, 1]`);
        results.push({ ok: true });
      } else {
        fail(`"${tc.description}" confidence in range [0, 1]`, `Got ${confidence}`);
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`"${tc.description}"`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // Negative test: out-of-scope query should select 0 docs or return low confidence
  try {
    await new Promise(r => setTimeout(r, 1200));
    const { indices, confidence } = await selectRelevantFiles(pages, 'what is the capital of France?', []) as { indices: number[]; confidence: number };
    if (indices.length === 0 || confidence < 0.5) {
      pass(`out-of-scope query returns 0 docs or low confidence (got ${indices.length} docs, conf: ${confidence.toFixed(2)})`);
      results.push({ ok: true });
    } else {
      fail(
        'out-of-scope query returns 0 docs or low confidence',
        `Got ${indices.length} doc(s) with confidence ${confidence.toFixed(2)}`
      );
      results.push({ ok: false });
    }
  } catch (err) {
    fail('out-of-scope negative routing test', (err as Error).message);
    results.push({ ok: false });
  }
}
