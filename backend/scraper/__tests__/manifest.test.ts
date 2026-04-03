import { describe, it, expect } from 'vitest';
import { parseSections, ensureCategoryExists } from '../pipeline/manifest.ts';
import type { Manifest } from '../../types/manifest.ts';

// ─── parseSections ────────────────────────────────────────────────────────────

describe('parseSections', () => {

  it('returns empty array when there are no ## headings', () => {
    const content = `# Title\n\nSome paragraph text.\n\nMore text.`;
    expect(parseSections(content)).toEqual([]);
  });

  it('returns empty array when there are only # and ### headings', () => {
    const content = `# H1 heading\n\n### H3 heading\n\nText.`;
    expect(parseSections(content)).toEqual([]);
  });

  it('parses a single ## heading', () => {
    const content = `# Title\n\n## Getting started\n\nSome text.`;
    const result = parseSections(content);
    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe('Getting started');
    expect(result[0].id).toBe('getting-started');
    expect(result[0].line_start).toBe(3); // line 3 (1-indexed)
  });

  it('parses multiple ## headings with correct line numbers', () => {
    const content = [
      '# Title',           // line 1
      '',                  // line 2
      '## First section',  // line 3
      'Content here.',     // line 4
      '',                  // line 5
      '## Second section', // line 6
      'More content.',     // line 7
      '',                  // line 8
      '## Third section',  // line 9
    ].join('\n');

    const result = parseSections(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'first-section', heading: 'First section', line_start: 3 });
    expect(result[1]).toEqual({ id: 'second-section', heading: 'Second section', line_start: 6 });
    expect(result[2]).toEqual({ id: 'third-section', heading: 'Third section', line_start: 9 });
  });

  it('converts heading text to a valid id (lowercase, hyphens, no special chars)', () => {
    const content = `## GL Account Mapping & Setup!\n\nText.`;
    const result = parseSections(content);
    expect(result[0].id).toBe('gl-account-mapping-setup');
    expect(result[0].heading).toBe('GL Account Mapping & Setup!'); // original preserved
  });

  it('strips leading and trailing hyphens from the generated id', () => {
    const content = `## -- Strange heading --\n\nText.`;
    const result = parseSections(content);
    expect(result[0].id).not.toMatch(/^-|-$/);
  });

  it('handles empty string input', () => {
    expect(parseSections('')).toEqual([]);
  });
});

// ─── ensureCategoryExists ─────────────────────────────────────────────────────

describe('ensureCategoryExists', () => {

  function makeManifest(categories: Manifest['categories'] = []): Manifest {
    return { categories, files: [] };
  }

  it('adds a new category when it does not exist', () => {
    const manifest = makeManifest();
    ensureCategoryExists(manifest, 'confluence/onboarding');
    expect(manifest.categories).toHaveLength(1);
    expect(manifest.categories[0].id).toBe('confluence/onboarding');
  });

  it('does NOT add a duplicate when category already exists', () => {
    const manifest = makeManifest([
      { id: 'confluence/onboarding', label: 'Onboarding', description: 'Existing' }
    ]);
    ensureCategoryExists(manifest, 'confluence/onboarding');
    expect(manifest.categories).toHaveLength(1); // still just one
  });

  it('generates a readable label from the folder path', () => {
    const manifest = makeManifest();
    ensureCategoryExists(manifest, 'confluence/onboarding');
    expect(manifest.categories[0].label).toBe('Onboarding');
  });

  it('generates a readable label for hyphenated folder names', () => {
    const manifest = makeManifest();
    ensureCategoryExists(manifest, 'website/tips-and-tricks');
    expect(manifest.categories[0].label).toBe('Tips and tricks');
  });

  it('sets description to empty string (for human to fill in later)', () => {
    const manifest = makeManifest();
    ensureCategoryExists(manifest, 'confluence/features');
    expect(manifest.categories[0].description).toBe('');
  });

  it('can add multiple different categories', () => {
    const manifest = makeManifest();
    ensureCategoryExists(manifest, 'confluence/onboarding');
    ensureCategoryExists(manifest, 'website/features');
    ensureCategoryExists(manifest, 'confluence/help');
    expect(manifest.categories).toHaveLength(3);
    expect(manifest.categories.map(c => c.id)).toEqual([
      'confluence/onboarding',
      'website/features',
      'confluence/help'
    ]);
  });
});
