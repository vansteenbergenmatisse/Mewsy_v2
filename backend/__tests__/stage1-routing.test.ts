import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ManifestCategory } from '../types/manifest.ts';

// vi.hoisted ensures the variable is available when vi.mock factory runs (hoisted to top)
const mockCallHaiku = vi.hoisted(() => vi.fn());
vi.mock('../utils/haiku.ts', () => ({ callHaiku: mockCallHaiku }));

import { selectRelevantCategories, formatManifestEntry } from '../pipeline/claude.ts';

const SAMPLE_CATEGORIES: ManifestCategory[] = [
  { id: 'confluence/onboarding', label: 'Onboarding', description: 'Step-by-step setup, activation, first sync' },
  { id: 'confluence/features', label: 'Features', description: 'Product capabilities, configuration options' },
  { id: 'website/help', label: 'Help', description: 'Troubleshooting, error messages, common issues' },
];

describe('selectRelevantCategories', () => {

  beforeEach(() => {
    mockCallHaiku.mockReset();
  });

  it('returns empty array when categories list is empty', async () => {
    const result = await selectRelevantCategories('How do I set up Mews?', []);
    expect(result).toEqual([]);
    expect(mockCallHaiku).not.toHaveBeenCalled();
  });

  it('returns matching category IDs from Haiku response', async () => {
    mockCallHaiku.mockResolvedValue(JSON.stringify({ matches: [0], confidence: 0.95 }));

    const result = await selectRelevantCategories('How do I complete onboarding?', SAMPLE_CATEGORIES);

    expect(result).toEqual(['confluence/onboarding']);
  });

  it('returns multiple category IDs when question spans two categories', async () => {
    mockCallHaiku.mockResolvedValue(JSON.stringify({ matches: [0, 1], confidence: 0.88 }));

    const result = await selectRelevantCategories(
      'During onboarding, how do I configure the GL mapping feature?',
      SAMPLE_CATEGORIES
    );

    expect(result).toEqual(['confluence/onboarding', 'confluence/features']);
  });

  it('returns empty array when Haiku returns no matches', async () => {
    mockCallHaiku.mockResolvedValue(JSON.stringify({ matches: [], confidence: 0.1 }));

    const result = await selectRelevantCategories('What is the weather today?', SAMPLE_CATEGORIES);

    expect(result).toEqual([]);
  });

  it('returns empty array and does not throw when Haiku returns invalid JSON', async () => {
    mockCallHaiku.mockResolvedValue('not valid json at all');

    const result = await selectRelevantCategories('Some question', SAMPLE_CATEGORIES);

    expect(result).toEqual([]);
  });

  it('returns empty array and does not throw when Haiku call throws an error', async () => {
    mockCallHaiku.mockRejectedValue(new Error('Network error'));

    const result = await selectRelevantCategories('Some question', SAMPLE_CATEGORIES);

    expect(result).toEqual([]);
  });

  it('filters out invalid index numbers from Haiku response', async () => {
    mockCallHaiku.mockResolvedValue(JSON.stringify({ matches: [0, 999], confidence: 0.8 }));

    const result = await selectRelevantCategories('Some question', SAMPLE_CATEGORIES);

    expect(result).toEqual(['confluence/onboarding']);
    expect(result).not.toContain(undefined);
  });
});

// ─── Stage 2 formatted list includes trigger_questions ───────────────────────

describe('formatManifestEntry', () => {
  it('includes trigger_questions in the formatted entry when present', () => {
    const file = {
      id: 'test-file',
      title: 'GL Mapping Guide',
      category: 'confluence/onboarding',
      description: 'GL account mapping, cost centers, posting rules',
      keywords: ['gl mapping', 'cost center'],
      trigger_questions: [
        'How do I map GL accounts?',
        'Set up GL mapping',
        'Postings going to wrong account',
        'gl accounts cost center chart'
      ],
      path: 'knowledge/confluence/onboarding/gl-mapping.md'
    };

    const formatted = formatManifestEntry(file, 0);

    expect(formatted).toContain('GL Mapping Guide');
    expect(formatted).toContain('GL account mapping');
    expect(formatted).toContain('gl mapping');
    expect(formatted).toContain('How do I map GL accounts?');
    expect(formatted).toContain('Set up GL mapping');
  });

  it('does not crash when trigger_questions is empty', () => {
    const file = {
      id: 'test-file',
      title: 'Some doc',
      category: 'confluence/onboarding',
      description: 'Some description',
      keywords: ['keyword'],
      trigger_questions: [],
      path: 'knowledge/confluence/onboarding/some.md'
    };

    expect(() => formatManifestEntry(file, 0)).not.toThrow();
  });

  it('does not crash when trigger_questions is undefined', () => {
    const file = {
      id: 'test-file',
      title: 'Some doc',
      description: 'Some description',
      keywords: ['keyword'],
      path: 'knowledge/some.md'
    };

    expect(() => formatManifestEntry(file as Parameters<typeof formatManifestEntry>[0], 0)).not.toThrow();
  });
});
