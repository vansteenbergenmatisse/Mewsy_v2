import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Manifest } from '../types/manifest.ts';

// Mock fs before importing agent so readFileSync is intercepted
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual };
});

import * as fs from 'fs';
import { loadManifest } from '../pipeline/agent.ts';

describe('loadManifest', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the manifest with categories and files when already in new format', () => {
    const newFormat: Manifest = {
      categories: [
        { id: 'confluence/onboarding', label: 'Onboarding', description: 'Setup steps' }
      ],
      files: [
        {
          id: 'file-1',
          title: 'Step 1',
          category: 'confluence/onboarding',
          description: 'First step',
          keywords: ['keyword1'],
          trigger_questions: ['Q1', 'Q2', 'Q3', 'Q4'],
          sections: [],
          path: 'knowledge/confluence/onboarding/step1.md'
        }
      ]
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(newFormat));

    const result = loadManifest('any/path.json');

    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('files');
    expect(result.categories).toHaveLength(1);
    expect(result.files).toHaveLength(1);
  });

  it('migrates the old { pages: {} } format (our actual current format) into the new shape', () => {
    const oldFormat = {
      pages: {
        'file-1': { title: 'Old file', description: 'Desc', keywords: ['k1'], path: 'knowledge/confluence/onboarding/old.md' }
      }
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(oldFormat));

    const result = loadManifest('any/path.json');

    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('files');
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.files[0].title).toBe('Old file');
  });

  it('migrates a flat array (legacy format) into the new shape', () => {
    const oldFormat = [
      { id: 'file-1', title: 'Old file', description: 'Desc', keywords: ['k1'], path: 'knowledge/confluence/onboarding/old.md' }
    ];
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(oldFormat));

    const result = loadManifest('any/path.json');

    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('files');
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.files[0].title).toBe('Old file');
  });

  it('migrates old-format entries and adds missing new fields with safe defaults', () => {
    const oldFormat = [
      { id: 'x', title: 'X', description: 'D', keywords: ['a'], path: 'knowledge/website/features/x.md' }
    ];
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(oldFormat));

    const result = loadManifest('any/path.json');
    const file = result.files[0];

    expect(file.trigger_questions).toEqual([]);
    expect(file.sections).toEqual([]);
    expect(file.category).toBeDefined();
    expect(typeof file.category).toBe('string');
  });

  it('derives category from file path during migration', () => {
    const oldFormat = [
      { id: 'x', title: 'X', description: 'D', keywords: [], path: 'knowledge/confluence/onboarding/step4.md' }
    ];
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(oldFormat));

    const result = loadManifest('any/path.json');
    expect(result.files[0].category).toBe('confluence/onboarding');
  });

  it('does not treat the new format as needing migration even if files array is empty', () => {
    const newFormat: Manifest = { categories: [], files: [] };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(newFormat));

    const result = loadManifest('any/path.json');
    expect(result.categories).toEqual([]);
    expect(result.files).toEqual([]);
  });
});
