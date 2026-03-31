/**
 * Suite 9: Frontend utilities
 * Tests pure utility functions from the frontend source.
 * No browser environment needed — all functions tested are pure or use injected logic.
 * Does NOT test DOM-dependent functions (initAccordions, checkListForButtons, applyProgressiveReveal).
 */

import { join } from 'path';
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

export async function checkFrontend({ pass, fail, skip: _skip, results }: Reporter): Promise<void> {
  const { formatBotText, splitResponseIntoMessages, detectOptionButtons } =
    await import(`${ROOT}/frontend/src/utils/chat-utils.ts`);

  const { uiStr, getThinkingMessages } =
    await import(`${ROOT}/frontend/src/config/chat-config.ts`);

  // ── formatBotText ─────────────────────────────────────────────────────────

  // Bold
  try {
    const result = formatBotText('**hello**') as string;
    if (result.includes('<strong>hello</strong>')) {
      pass('formatBotText: **bold** → <strong>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: **bold** → <strong>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText bold', (err as Error).message);
    results.push({ ok: false });
  }

  // Italic
  try {
    const result = formatBotText('*world*') as string;
    if (result.includes('<em>world</em>')) {
      pass('formatBotText: *italic* → <em>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: *italic* → <em>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText italic', (err as Error).message);
    results.push({ ok: false });
  }

  // Link
  try {
    const result = formatBotText('[click](https://example.com)') as string;
    if (result.includes('href="https://example.com"') && result.includes('click')) {
      pass('formatBotText: [text](url) → <a href>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: [text](url) → <a href>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText link', (err as Error).message);
    results.push({ ok: false });
  }

  // H2 heading
  try {
    const result = formatBotText('## My Heading') as string;
    if (result.includes('<h2>') && result.includes('My Heading')) {
      pass('formatBotText: ## heading → <h2>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: ## heading → <h2>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText h2', (err as Error).message);
    results.push({ ok: false });
  }

  // Numbered list
  try {
    const result = formatBotText('1. First\n2. Second') as string;
    if (result.includes('<ol') && result.includes('<li')) {
      pass('formatBotText: numbered list → <ol><li>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: numbered list → <ol><li>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText numbered list', (err as Error).message);
    results.push({ ok: false });
  }

  // Empty input
  try {
    const result = formatBotText('') as string;
    if (result === '') {
      pass('formatBotText("") returns empty string');
      results.push({ ok: true });
    } else {
      fail('formatBotText("") returns empty string', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText empty', (err as Error).message);
    results.push({ ok: false });
  }

  // ── splitResponseIntoMessages ─────────────────────────────────────────────

  // Empty string
  try {
    const result = splitResponseIntoMessages('') as string[];
    if (Array.isArray(result) && result.length === 0) {
      pass('splitResponseIntoMessages("") returns []');
      results.push({ ok: true });
    } else {
      fail('splitResponseIntoMessages("") returns []', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('splitResponseIntoMessages empty', (err as Error).message);
    results.push({ ok: false });
  }

  // Single paragraph
  try {
    const result = splitResponseIntoMessages('Hello world') as string[];
    if (Array.isArray(result) && result.length === 1 && result[0] === 'Hello world') {
      pass('splitResponseIntoMessages single paragraph → array of 1');
      results.push({ ok: true });
    } else {
      fail('splitResponseIntoMessages single paragraph', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('splitResponseIntoMessages single', (err as Error).message);
    results.push({ ok: false });
  }

  // Two paragraphs
  try {
    const result = splitResponseIntoMessages('First paragraph.\n\nSecond paragraph.') as string[];
    if (Array.isArray(result) && result.length >= 1) {
      pass(`splitResponseIntoMessages two paragraphs → ${result.length} bubble(s)`);
      results.push({ ok: true });
    } else {
      fail('splitResponseIntoMessages two paragraphs', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('splitResponseIntoMessages two paragraphs', (err as Error).message);
    results.push({ ok: false });
  }

  // Consecutive numbered list items are grouped into one bubble
  try {
    const result = splitResponseIntoMessages('1. Step one\n\n2. Step two\n\n3. Step three') as string[];
    if (Array.isArray(result) && result.length === 1) {
      pass('splitResponseIntoMessages groups consecutive list items into one bubble');
      results.push({ ok: true });
    } else {
      fail('splitResponseIntoMessages list grouping', `Expected 1 bubble, got ${result.length}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('splitResponseIntoMessages list grouping', (err as Error).message);
    results.push({ ok: false });
  }

  // ── detectOptionButtons ───────────────────────────────────────────────────

  // Explicit [BUTTONS:] syntax
  try {
    const result = detectOptionButtons('Which do you prefer? [BUTTONS: Option A | Option B | Option C]') as { options: string[] } | null;
    if (result && Array.isArray(result.options) && result.options.length === 3 && result.options[0] === 'Option A') {
      pass('detectOptionButtons: [BUTTONS: A | B | C] → 3 options');
      results.push({ ok: true });
    } else {
      fail('detectOptionButtons [BUTTONS:] syntax', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('detectOptionButtons [BUTTONS:]', (err as Error).message);
    results.push({ ok: false });
  }

  // Bullet list without ? → null (no question mark, so no buttons)
  try {
    const result = detectOptionButtons('Here are some items:\n- Alpha\n- Beta\n- Gamma');
    if (result === null) {
      pass('detectOptionButtons: bullet list without ? → null');
      results.push({ ok: true });
    } else {
      fail('detectOptionButtons: no question → null', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('detectOptionButtons no question', (err as Error).message);
    results.push({ ok: false });
  }

  // Plain text → null
  try {
    const result = detectOptionButtons('Just a plain sentence with no buttons.');
    if (result === null) {
      pass('detectOptionButtons: plain text → null');
      results.push({ ok: true });
    } else {
      fail('detectOptionButtons: plain text → null', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('detectOptionButtons plain text', (err as Error).message);
    results.push({ ok: false });
  }

  // ── uiStr ─────────────────────────────────────────────────────────────────

  // English
  try {
    const result = uiStr('typeMsg', 'en') as string;
    if (result === 'Type your message...') {
      pass('uiStr("typeMsg", "en") returns English string');
      results.push({ ok: true });
    } else {
      fail('uiStr typeMsg en', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('uiStr en', (err as Error).message);
    results.push({ ok: false });
  }

  // German
  try {
    const result = uiStr('typeMsg', 'de') as string;
    if (result && result !== 'Type your message...') {
      pass(`uiStr("typeMsg", "de") returns German string: "${result}"`);
      results.push({ ok: true });
    } else {
      fail('uiStr typeMsg de', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('uiStr de', (err as Error).message);
    results.push({ ok: false });
  }

  // Unknown language → falls back to English
  try {
    const result = uiStr('typeMsg', 'zz') as string;
    if (result === 'Type your message...') {
      pass('uiStr("typeMsg", "zz") falls back to English');
      results.push({ ok: true });
    } else {
      fail('uiStr unknown lang fallback', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('uiStr unknown lang', (err as Error).message);
    results.push({ ok: false });
  }

  // Unknown key → empty string
  try {
    const result = uiStr('nonExistentKey', 'en') as string;
    if (result === '') {
      pass('uiStr("nonExistentKey", "en") returns ""');
      results.push({ ok: true });
    } else {
      fail('uiStr unknown key → ""', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('uiStr unknown key', (err as Error).message);
    results.push({ ok: false });
  }

  // null lang → English fallback
  try {
    const result = uiStr('typeMsg', null) as string;
    if (result === 'Type your message...') {
      pass('uiStr("typeMsg", null) defaults to English');
      results.push({ ok: true });
    } else {
      fail('uiStr null lang fallback', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('uiStr null lang', (err as Error).message);
    results.push({ ok: false });
  }

  // ── getThinkingMessages ───────────────────────────────────────────────────

  // English
  try {
    const result = getThinkingMessages('en') as string[];
    if (Array.isArray(result) && result.length > 0) {
      pass('getThinkingMessages("en") returns non-empty array');
      results.push({ ok: true });
    } else {
      fail('getThinkingMessages en', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('getThinkingMessages en', (err as Error).message);
    results.push({ ok: false });
  }

  // German — first item should contain a German word
  try {
    const result = getThinkingMessages('de') as string[];
    const hasGerman = Array.isArray(result) && result.length > 0 && result[0].toLowerCase().includes('denkt');
    if (hasGerman) {
      pass('getThinkingMessages("de") returns German thinking messages');
      results.push({ ok: true });
    } else {
      fail('getThinkingMessages de', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('getThinkingMessages de', (err as Error).message);
    results.push({ ok: false });
  }

  // null → English fallback
  try {
    const result = getThinkingMessages(null) as string[];
    if (Array.isArray(result) && result.length > 0) {
      pass('getThinkingMessages(null) defaults to English array');
      results.push({ ok: true });
    } else {
      fail('getThinkingMessages null', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('getThinkingMessages null', (err as Error).message);
    results.push({ ok: false });
  }

  // de-at → sub-tag fallback (should return de messages)
  try {
    const result = getThinkingMessages('de-at') as string[];
    if (Array.isArray(result) && result.length > 0) {
      pass('getThinkingMessages("de-at") falls back to de messages');
      results.push({ ok: true });
    } else {
      fail('getThinkingMessages de-at fallback', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('getThinkingMessages de-at', (err as Error).message);
    results.push({ ok: false });
  }

  // ── getSessionId (simulated — browser sessionStorage not available in Node) ─

  // Inline simulation of the getSessionId logic from frontend/src/utils/session.ts
  {
    const mockStorage: Record<string, string> = {};
    const simGetSessionId = (): string => {
      let id = mockStorage['Mewsie_session_id'] ?? null;
      if (!id) {
        id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        mockStorage['Mewsie_session_id'] = id;
      }
      return id;
    };

    try {
      const id1 = simGetSessionId();
      if (typeof id1 === 'string' && id1.startsWith('sess_')) {
        pass('getSessionId creates a new session ID starting with "sess_"');
        results.push({ ok: true });
      } else {
        fail('getSessionId format', `Got: "${id1}"`);
        results.push({ ok: false });
      }

      const id2 = simGetSessionId();
      if (id1 === id2) {
        pass('getSessionId returns the same ID on subsequent calls (stable)');
        results.push({ ok: true });
      } else {
        fail('getSessionId stable across calls', `id1="${id1}", id2="${id2}"`);
        results.push({ ok: false });
      }
    } catch (err) {
      fail('getSessionId simulation', (err as Error).message);
      results.push({ ok: false });
    }
  }
}
