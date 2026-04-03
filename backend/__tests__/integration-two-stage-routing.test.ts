import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Manifest } from '../types/manifest.ts';

// Mock LLM calls — all hoisted so vi.mock factories can reference them
const mockSelectRelevantCategories = vi.hoisted(() => vi.fn());
const mockSelectRelevantFiles = vi.hoisted(() => vi.fn());
const mockChat = vi.hoisted(() => vi.fn().mockResolvedValue('Mocked reply'));

vi.mock('../pipeline/claude.ts', () => ({
  selectRelevantCategories: mockSelectRelevantCategories,
  selectRelevantFiles: mockSelectRelevantFiles,
  chat: mockChat,
}));

// Mock fs so we can control what manifest is "loaded"
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual };
});

// Mock fs/promises for file reads inside loadKnowledgeFiles
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return { ...actual };
});

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { handleMessage } from '../pipeline/agent.ts';
import { addToHistory } from '../pipeline/session.ts';

const MOCK_MANIFEST: Manifest = {
  categories: [
    { id: 'confluence/onboarding', label: 'Onboarding', description: 'Setup steps and activation' },
    { id: 'confluence/features', label: 'Features', description: 'Product capabilities and configuration' }
  ],
  files: [
    {
      id: 'onboarding-step4',
      title: 'Step 4: GL mapping',
      category: 'confluence/onboarding',
      description: 'GL account mapping, cost centers',
      keywords: ['gl mapping', 'cost center'],
      trigger_questions: ['How do I map GL accounts?', 'Set up GL mapping', 'Wrong postings', 'gl accounts chart'],
      sections: [{ id: 'intro', heading: 'Introduction', line_start: 1 }],
      path: 'knowledge/confluence/onboarding/step4.md'
    },
    {
      id: 'features-accounting',
      title: 'Accounting integration features',
      category: 'confluence/features',
      description: 'Accounting sync, journal entries, real-time posting',
      keywords: ['journal entry', 'real-time posting', 'accounting sync'],
      trigger_questions: ['How does accounting sync work?', 'Configure accounting', 'Sync not working', 'accounting sync journals'],
      sections: [],
      path: 'knowledge/confluence/features/accounting.md'
    }
  ]
};

describe('Two-stage routing integration', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset mock functions
    mockSelectRelevantCategories.mockReset();
    mockSelectRelevantFiles.mockReset();
    mockChat.mockReset().mockResolvedValue('Mocked reply');

    // Spy on readFileSync (used by loadManifest) to return our test manifest
    vi.spyOn(fs, 'readFileSync').mockImplementation((path: unknown) => {
      const p = String(path);
      if (p.includes('knowledge-manifest')) {
        return JSON.stringify(MOCK_MANIFEST);
      }
      return '';
    });

    // Spy on readFile (used by loadKnowledgeFiles) to return dummy content
    vi.spyOn(fsp, 'readFile').mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.includes('step4.md')) return '# Step 4\n\n## Introduction\n\nContent.';
      if (p.includes('accounting.md')) return '# Accounting\n\nContent.';
      return '';
    });
  });

  it('Stage 1 filters files to the matched category before Stage 2 runs', async () => {
    mockSelectRelevantCategories.mockResolvedValue(['confluence/onboarding']);
    mockSelectRelevantFiles.mockResolvedValue({ indices: [0], confidence: 0.92 });

    await handleMessage('test-session-a', 'How do I map GL accounts?');

    // Stage 2 should only have been called with onboarding files
    expect(mockSelectRelevantFiles).toHaveBeenCalledOnce();
    const stage2Files = mockSelectRelevantFiles.mock.calls[0][0];
    expect(stage2Files.every((f: { category: string }) => f.category === 'confluence/onboarding')).toBe(true);
    expect(stage2Files.some((f: { category: string }) => f.category === 'confluence/features')).toBe(false);
  });

  it('Stage 2 receives files from BOTH categories when Stage 1 matches two', async () => {
    mockSelectRelevantCategories.mockResolvedValue(['confluence/onboarding', 'confluence/features']);
    mockSelectRelevantFiles.mockResolvedValue({ indices: [0, 1], confidence: 0.97 });

    await handleMessage('test-session-b', 'How does GL mapping work with the accounting feature?');

    const stage2Files = mockSelectRelevantFiles.mock.calls[0][0];
    const categories = stage2Files.map((f: { category: string }) => f.category);
    expect(categories).toContain('confluence/onboarding');
    expect(categories).toContain('confluence/features');
  });

  it('goes to BASIC_MODE when Stage 1 returns empty', async () => {
    mockSelectRelevantCategories.mockResolvedValue([]);

    await handleMessage('test-session-c', 'Something totally unrelated');

    // Stage 2 should NOT have been called
    expect(mockSelectRelevantFiles).not.toHaveBeenCalled();
    // chat should have been called with BASIC_MODE sentinel
    expect(mockChat).toHaveBeenCalledOnce();
    const knowledgeArg = mockChat.mock.calls[0][2];
    expect(knowledgeArg).toBe('__BASIC_MODE__');
  });

  it('Stage 1 is NOT called for greetings (shouldSkipRouting reuses docs)', async () => {
    // First turn: set up session with loaded docs
    mockSelectRelevantCategories.mockResolvedValue(['confluence/onboarding']);
    mockSelectRelevantFiles.mockResolvedValue({ indices: [0], confidence: 0.95 });
    await handleMessage('test-session-d', 'How do I map GL accounts?');

    // Simulate what real chat() does: add to history so isFirstMessage = false next turn
    addToHistory('test-session-d', 'user', 'How do I map GL accounts?');
    addToHistory('test-session-d', 'assistant', 'Mocked reply');

    // Reset call counts after first turn
    mockSelectRelevantCategories.mockClear();
    mockSelectRelevantFiles.mockClear();

    // Second turn: greeting — should skip all routing
    await handleMessage('test-session-d', 'thanks');

    expect(mockSelectRelevantCategories).not.toHaveBeenCalled();
    expect(mockSelectRelevantFiles).not.toHaveBeenCalled();
  });

  it('does not crash when manifest has no categories (full search fallback)', async () => {
    const manifestNoCats: Manifest = { categories: [], files: MOCK_MANIFEST.files };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(manifestNoCats));

    mockSelectRelevantCategories.mockResolvedValue([]);
    mockSelectRelevantFiles.mockResolvedValue({ indices: [0], confidence: 0.9 });

    // Should not throw — when no categories, Stage 1 is skipped, goes straight to Stage 2
    await expect(
      handleMessage('test-session-e', 'How do I map GL accounts?')
    ).resolves.not.toThrow();

    // Stage 1 not called (no categories), Stage 2 was called
    expect(mockSelectRelevantCategories).not.toHaveBeenCalled();
    expect(mockSelectRelevantFiles).toHaveBeenCalledOnce();
  });
});
