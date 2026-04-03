import { describe, it, expect } from 'vitest';
import { shouldSkipRouting, determineMode } from '../pipeline/agent.ts';
import type { SessionContext } from '../pipeline/agent.ts';

// ─── shouldSkipRouting — unchanged behavior ───────────────────────────────────

describe('shouldSkipRouting — unchanged behavior', () => {

  const baseSession: SessionContext = {
    lastLoadedDocIds: ['doc-1'],
    previousQuestion: null,
    frustrationCounter: 0,
    clarifyRoundCounter: 0,
    tools: [],
    setupType: null,
    language: null,
  };

  it('skips routing for a simple greeting', () => {
    expect(shouldSkipRouting('hi', baseSession)).toBe(true);
    expect(shouldSkipRouting('hello', baseSession)).toBe(true);
    expect(shouldSkipRouting('thanks', baseSession)).toBe(true);
    expect(shouldSkipRouting('ok', baseSession)).toBe(true);
  });

  it('does NOT skip routing for a real question', () => {
    expect(shouldSkipRouting('How do I set up GL mapping?', baseSession)).toBe(false);
    expect(shouldSkipRouting('My postings are going to the wrong account', baseSession)).toBe(false);
  });

  it('skips routing when previous message was a question AND reply is 4 words or fewer', () => {
    const sessionWithQuestion: SessionContext = { ...baseSession, previousQuestion: 'Which tool do you use?' };
    expect(shouldSkipRouting('Xero', sessionWithQuestion)).toBe(true);
    expect(shouldSkipRouting('I use Xero', sessionWithQuestion)).toBe(true); // 3 words
  });

  it('does NOT skip routing when previous message was a question but reply is 5+ words', () => {
    const sessionWithQuestion: SessionContext = { ...baseSession, previousQuestion: 'Which tool do you use?' };
    expect(shouldSkipRouting('I am using Xero for accounting', sessionWithQuestion)).toBe(false);
  });

  it('does NOT skip routing when there are no lastLoadedDocIds', () => {
    const emptySession: SessionContext = { ...baseSession, lastLoadedDocIds: [] };
    expect(shouldSkipRouting('ok', emptySession)).toBe(false);
  });

  it('never skips on the first message (isFirstMessage = true)', () => {
    expect(shouldSkipRouting('hi', baseSession, true)).toBe(false);
    expect(shouldSkipRouting('ok', baseSession, true)).toBe(false);
  });
});

// ─── Confidence threshold mode selection ─────────────────────────────────────

describe('determineMode — confidence threshold logic', () => {

  it('returns ANSWER mode when confidence >= 0.95', () => {
    expect(determineMode({ matches: ['doc-1'], confidence: 0.95 })).toBe('ANSWER');
    expect(determineMode({ matches: ['doc-1', 'doc-2'], confidence: 0.97 })).toBe('ANSWER');
  });

  it('returns ANSWER mode when confidence >= 0.85 and exactly 1 doc', () => {
    expect(determineMode({ matches: ['doc-1'], confidence: 0.90 })).toBe('ANSWER');
    expect(determineMode({ matches: ['doc-1'], confidence: 0.85 })).toBe('ANSWER');
  });

  it('returns CLARIFY mode when confidence >= 0.85 but multiple docs', () => {
    expect(determineMode({ matches: ['doc-1', 'doc-2'], confidence: 0.90 })).toBe('CLARIFY');
  });

  it('returns CLARIFY mode when confidence < 0.85 with 1 doc', () => {
    expect(determineMode({ matches: ['doc-1'], confidence: 0.80 })).toBe('CLARIFY');
  });

  it('returns CLARIFY mode when confidence < 0.85 with multiple docs', () => {
    expect(determineMode({ matches: ['doc-1', 'doc-2'], confidence: 0.60 })).toBe('CLARIFY');
  });

  it('returns BASIC mode when no docs matched', () => {
    expect(determineMode({ matches: [], confidence: 0.0 })).toBe('BASIC');
  });
});
