/**
 * Suite 4: Routing accuracy
 * Sends test queries to the routing agent and verifies the correct documents are selected.
 * Requires a live ANTHROPIC_API_KEY.
 */

import { join } from 'path';
import { readFileSync } from 'fs';

const ROOT = join(import.meta.dirname, '../..');

// Each test case: query → at least one of expectedDocIds must be in the result
const ROUTING_TESTS = [
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

export async function checkRouting({ pass, fail, skip, results }) {
  const { selectRelevantFiles } = await import(`${ROOT}/backend/pipeline/claude.js`);

  // Load manifest to get pages list
  let pages;
  try {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'knowledge-manifest.json'), 'utf8'));
    pages = Object.entries(manifest.pages ?? {}).map(([key, page]) => ({
      id:          key,
      label:       page.title ?? key,
      description: page.description ?? '',
      keywords:    page.keywords ?? [],
      path:        page.path,
    }));
  } catch (err) {
    fail('load manifest for routing tests', err.message);
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
      const { indices, confidence } = await selectRelevantFiles(pages, tc.query, []);
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
    } catch (err) {
      fail(`"${tc.description}"`, err.message);
      results.push({ ok: false });
    }
  }
}
