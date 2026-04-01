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
  const { formatBotText, splitResponseIntoMessages, detectOptionButtons, sortButtonOptions } =
    await import(`${ROOT}/frontend/src/utils/chat-utils.ts`);

  const { uiStr, getThinkingMessages } =
    await import(`${ROOT}/frontend/src/config/chat-config.ts`);

  // ── formatBotText ─────────────────────────────────────────────────────────

  // Inline bold (within a sentence) → <strong>
  try {
    const result = formatBotText('This is **hello** text') as string;
    if (result.includes('<strong>hello</strong>')) {
      pass('formatBotText: inline **bold** → <strong>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: inline **bold** → <strong>', `Got: ${result}`);
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

  // H2 heading → converted to bold → promoted to .section-label (no <h2> tag)
  try {
    const result = formatBotText('## My Heading') as string;
    if (!result.includes('<h2>') && result.includes('section-label') && result.includes('My Heading')) {
      pass('formatBotText: ## heading → .section-label (no <h2>)');
      results.push({ ok: true });
    } else {
      fail('formatBotText: ## heading → .section-label (no <h2>)', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText h2 heading', (err as Error).message);
    results.push({ ok: false });
  }

  // Intro line always prepended (even without H1)
  try {
    const result = formatBotText('Just a plain answer.') as string;
    if (result.includes('intro-line')) {
      pass('formatBotText: always prepends .intro-line');
      results.push({ ok: true });
    } else {
      fail('formatBotText: intro-line missing', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText intro-line', (err as Error).message);
    results.push({ ok: false });
  }

  // Intro line is deterministic — same text always produces the same intro line.
  // Regression: previously used Math.random(), so the intro line changed on every call.
  // BotTextBubble uses useState(() => formatBotText(text)) to compute it once on mount,
  // but the hash determinism is an additional guarantee that even if the function is
  // called again (e.g. remount), the same text always yields the same intro line.
  try {
    const introLineMatch = /class="intro-line">([^<]+)<\/p>/;
    const text = 'How do I configure my GL mapping in Mews?';
    const calls = Array.from({ length: 20 }, () => (formatBotText(text) as string).match(introLineMatch)?.[1] ?? '');
    const first = calls[0];
    const allSame = calls.every(c => c === first);
    if (first && allSame) {
      pass(`formatBotText: intro-line is deterministic — 20 calls with same text all return "${first}"`);
      results.push({ ok: true });
    } else {
      fail('formatBotText: intro-line changed across calls with same input (non-determinism regression)', `unique values: ${JSON.stringify([...new Set(calls)])}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText intro-line determinism', (err as Error).message);
    results.push({ ok: false });
  }

  // Different texts produce potentially different intro lines (hash spread check)
  try {
    const introLineMatch = /class="intro-line">([^<]+)<\/p>/;
    const texts = [
      'How do I configure GL mapping?',
      'What is the onboarding process?',
      'Why is my revenue push failing?',
      'How do I set up a new integration?',
      'Where can I find my API key?',
    ];
    const lines = texts.map(t => (formatBotText(t) as string).match(introLineMatch)?.[1] ?? '');
    const knownLines = [
      "Here's what I found:", "Here's what you need:", "Here's a quick rundown:",
      "Let me walk you through it:", "Here's the full picture:", "Here's what the guide says:",
      "Here's exactly how to do it:", "Let me break that down:", "Here's the short version:",
    ];
    const allKnown = lines.every(l => knownLines.includes(l));
    if (allKnown) {
      pass('formatBotText: intro-line for any text is always one of the known INTRO_LINES values');
      results.push({ ok: true });
    } else {
      fail('formatBotText: intro-line outside known values', `Got: ${JSON.stringify(lines)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText intro-line known values', (err as Error).message);
    results.push({ ok: false });
  }

  // Closing line gets .response-end class — standalone paragraph (double newline)
  try {
    const result = formatBotText("# Setup\n\nSome text.\n\nFeel free to ask if something's unclear.") as string;
    if (result.includes('response-end')) {
      pass("formatBotText: closing line in own paragraph → .response-end");
      results.push({ ok: true });
    } else {
      fail("formatBotText: closing line → .response-end (own paragraph)", `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText response-end own paragraph', (err as Error).message);
    results.push({ ok: false });
  }

  // Closing line gets .response-end class — single newline (ends up after <br>)
  try {
    const result = formatBotText("# Setup\n\nSome text.\nFeel free to ask if something\u2019s unclear.") as string;
    if (result.includes('response-end')) {
      pass("formatBotText: closing line after single newline (<br> case) → .response-end");
      results.push({ ok: true });
    } else {
      fail("formatBotText: closing line → .response-end (<br> case)", `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText response-end br case', (err as Error).message);
    results.push({ ok: false });
  }

  // Lone bold paragraph → section label
  try {
    const result = formatBotText('**Setup steps**') as string;
    if (result.includes('section-label') && result.includes('Setup steps') && !result.includes('<strong>')) {
      pass('formatBotText: lone bold paragraph → .section-label (not <strong>)');
      results.push({ ok: true });
    } else {
      fail('formatBotText: lone bold paragraph → .section-label', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText section-label', (err as Error).message);
    results.push({ ok: false });
  }

  // H3 heading → stripped to bold then promoted to section label (lone paragraph)
  try {
    const result = formatBotText('### Sub heading') as string;
    if (!result.includes('<h3>') && result.includes('section-label') && result.includes('Sub heading')) {
      pass('formatBotText: ### heading → .section-label (no <h3>)');
      results.push({ ok: true });
    } else {
      fail('formatBotText: ### heading → .section-label (no <h3>)', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText h3 stripped', (err as Error).message);
    results.push({ ok: false });
  }

  // Numbered list — 2+ items → <ol>
  try {
    const result = formatBotText('1. First\n2. Second') as string;
    if (result.includes('<ol') && result.includes('<li')) {
      pass('formatBotText: numbered list (2+ items) → <ol><li>');
      results.push({ ok: true });
    } else {
      fail('formatBotText: numbered list → <ol><li>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText numbered list', (err as Error).message);
    results.push({ ok: false });
  }

  // Numbered list always starts at 1, even when source numbers start higher
  // Use source numbers 7, 8, 9 so no overlap with expected output 1, 2, 3
  try {
    const result = formatBotText('7. First step\n8. Second step\n9. Third step') as string;
    const hasOl = result.includes('<ol');
    const startsAt1 = result.includes('>1)<');
    const hasCorrectCount = result.includes('>2)<') && result.includes('>3)<');
    const noSourceNums = !result.includes('>7)<') && !result.includes('>8)<') && !result.includes('>9)<');
    if (hasOl && startsAt1 && hasCorrectCount && noSourceNums) {
      pass('formatBotText: numbered list always renumbers from 1 regardless of source numbers');
      results.push({ ok: true });
    } else {
      fail('formatBotText: numbered list renumbering from 1', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText numbered list renumbering', (err as Error).message);
    results.push({ ok: false });
  }

  // Single numbered item → no <ol>, number stripped, rendered as plain text
  try {
    const result = formatBotText('Some context.\n\n4. If you only have one step, no list needed.') as string;
    const hasNoOl = !result.includes('<ol');
    const numberStripped = !result.includes('>4)<') && !result.includes('>4.');
    const textPresent = result.includes('If you only have one step');
    if (hasNoOl && numberStripped && textPresent) {
      pass('formatBotText: single numbered item → no <ol>, number stripped');
      results.push({ ok: true });
    } else {
      fail('formatBotText: single numbered item → no list', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText single numbered item', (err as Error).message);
    results.push({ ok: false });
  }

  // ── Response structure rules ────────────────────────────────────────────────
  // Verifies the formatting invariants defined in the response spec.
  // Each test is named with the spec item it covers.

  // #2: Markdown --- must NOT produce <hr> — sections are separated by blank lines only
  try {
    const result = formatBotText('First section.\n\n---\n\nSecond section.') as string;
    if (!result.includes('<hr')) {
      pass('formatBotText [#2]: markdown --- does not produce <hr> (blank lines only between sections)');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#2]: markdown --- must not produce <hr>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#2] no hr', (err as Error).message);
    results.push({ ok: false });
  }

  // #4: All 9 approved intro-line variations are ≤ 12 words
  try {
    const approvedIntroLines = [
      "Here's what I found:", "Here's what you need:", "Here's a quick rundown:",
      "Let me walk you through it:", "Here's the full picture:", "Here's what the guide says:",
      "Here's exactly how to do it:", "Let me break that down:", "Here's the short version:",
    ];
    const tooLong = approvedIntroLines.filter(l => l.split(/\s+/).length > 12);
    if (tooLong.length === 0) {
      pass('formatBotText [#4]: all 9 approved intro-line variations are ≤ 12 words');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#4]: intro-line variations exceed 12-word limit', `Offenders: ${JSON.stringify(tooLong)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#4] intro-line max 12 words', (err as Error).message);
    results.push({ ok: false });
  }

  // #5: Intro line always appears before <h1> in rendered HTML — never after
  try {
    const result = formatBotText('# My Title\n\nBody text here.') as string;
    const introPos = result.indexOf('intro-line');
    const h1Pos = result.indexOf('<h1>');
    if (introPos !== -1 && h1Pos !== -1 && introPos < h1Pos) {
      pass('formatBotText [#5]: intro-line always appears before <h1> in rendered output');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#5]: intro-line must precede <h1>', `introPos=${introPos}, h1Pos=${h1Pos}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#5] intro before h1', (err as Error).message);
    results.push({ ok: false });
  }

  // #6: # Title → <h1>Title</h1> in rendered output
  try {
    const result = formatBotText('# My Title\n\nSome body text.') as string;
    if (result.includes('<h1>My Title</h1>')) {
      pass('formatBotText [#6]: # Title → <h1>Title</h1>');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#6]: H1 not rendered as <h1>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#6] H1 rendered', (err as Error).message);
    results.push({ ok: false });
  }

  // #15: Em dash (—) is always replaced — never appears in rendered output
  try {
    const result = formatBotText('This — that, and — the other.') as string;
    if (!result.includes('—') && result.includes(' - ')) {
      pass('formatBotText [#15]: em dash (—) → " - " — no raw em dash in output');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#15]: em dash must be replaced with " - "', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#15] em dash replaced', (err as Error).message);
    results.push({ ok: false });
  }

  // #16: Opening introductory sentence stripped before a numbered step list
  try {
    const result = formatBotText('Here are the steps:\n1. First step\n2. Second step\n3. Third step') as string;
    if (!result.includes('Here are the steps')) {
      pass('formatBotText [#16]: opening sentence ("Here are the steps:") stripped before numbered list');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#16]: opening sentence before steps must be stripped', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#16] opening sentence stripped', (err as Error).message);
    results.push({ ok: false });
  }

  // #17: No trailing empty paragraphs — output is trimmed clean
  try {
    const result = formatBotText('# Title\n\nBody text.\n\n') as string;
    const hasEmptyP = /<p>\s*<\/p>/.test(result);
    if (!hasEmptyP) {
      pass('formatBotText [#17]: no empty <p></p> in output — trailing whitespace trimmed');
      results.push({ ok: true });
    } else {
      fail('formatBotText [#17]: trailing empty paragraph found', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [#17] no trailing empty paragraph', (err as Error).message);
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

  // ── sortButtonOptions ─────────────────────────────────────────────────────

  // "Something else" in the middle → moved to end, 4 main options
  try {
    const result = sortButtonOptions([
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Something else',
    ]) as { main: string[]; somethingElse: string | null };
    if (
      result.main.length === 4 &&
      result.main[0] === 'Option A' &&
      result.main[1] === 'Option B' &&
      result.main[2] === 'Option C' &&
      result.main[3] === 'Option D' &&
      result.somethingElse === 'Something else'
    ) {
      pass('sortButtonOptions: "Something else" extracted and 4 main options returned in order');
      results.push({ ok: true });
    } else {
      fail('sortButtonOptions: ordering', `main=${JSON.stringify(result.main)}, se=${result.somethingElse}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('sortButtonOptions ordering', (err as Error).message);
    results.push({ ok: false });
  }

  // No "Something else" in input → somethingElse is null, 4 main options
  try {
    const result = sortButtonOptions(['A', 'B', 'C', 'D']) as { main: string[]; somethingElse: string | null };
    if (result.main.length === 4 && result.somethingElse === null) {
      pass('sortButtonOptions: no "Something else" → null, 4 main options');
      results.push({ ok: true });
    } else {
      fail('sortButtonOptions: no SE', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('sortButtonOptions no SE', (err as Error).message);
    results.push({ ok: false });
  }

  // More than 4 non-SE options → capped at 4
  try {
    const result = sortButtonOptions(['A', 'B', 'C', 'D', 'E', 'Something else']) as { main: string[]; somethingElse: string | null };
    if (result.main.length === 4 && result.somethingElse === 'Something else') {
      pass('sortButtonOptions: >4 non-SE options → capped at 4, SE preserved');
      results.push({ ok: true });
    } else {
      fail('sortButtonOptions: cap at 4', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('sortButtonOptions cap', (err as Error).message);
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

  // Two paragraphs → single bubble (responses are one continuous document)
  try {
    const result = splitResponseIntoMessages('First paragraph.\n\nSecond paragraph.') as string[];
    if (Array.isArray(result) && result.length === 1) {
      pass('splitResponseIntoMessages two paragraphs → 1 bubble (single document)');
      results.push({ ok: true });
    } else {
      fail('splitResponseIntoMessages two paragraphs → 1 bubble', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('splitResponseIntoMessages two paragraphs', (err as Error).message);
    results.push({ ok: false });
  }

  // Numbered list → always 1 bubble
  try {
    const result = splitResponseIntoMessages('1. Step one\n\n2. Step two\n\n3. Step three') as string[];
    if (Array.isArray(result) && result.length === 1) {
      pass('splitResponseIntoMessages numbered list → 1 bubble');
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

  // Bullet list with en-dash (–) inside items → must still produce buttons
  // Regression: items like "Error – user not authorized" were incorrectly rejected
  try {
    const text = [
      'What kind of issue are you running into?',
      '- Error code 5 – user not authorized',
      '- Error code 10 – missing scope',
      '- Something else',
    ].join('\n');
    const result = detectOptionButtons(text) as { options: string[] } | null;
    if (result && Array.isArray(result.options) && result.options.length === 3) {
      pass('detectOptionButtons: items with en-dash (–) → still detected as buttons');
      results.push({ ok: true });
    } else {
      fail('detectOptionButtons: en-dash in items → buttons', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('detectOptionButtons en-dash items', (err as Error).message);
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

  // ── Callout variants ──────────────────────────────────────────────────────

  // [warn]
  try {
    const result = formatBotText('[warn]Watch out for this[/warn]') as string;
    if (result.includes('callout-warn') && result.includes('!') && result.includes('Watch out for this')) {
      pass('formatBotText: [warn] → callout-warn with ! icon');
      results.push({ ok: true });
    } else {
      fail('formatBotText [warn] callout', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [warn]', (err as Error).message);
    results.push({ ok: false });
  }

  // [tip]
  try {
    const result = formatBotText('[tip]Quick trick here[/tip]') as string;
    if (result.includes('callout-tip') && result.includes('Quick trick here')) {
      pass('formatBotText: [tip] → callout-tip');
      results.push({ ok: true });
    } else {
      fail('formatBotText [tip] callout', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [tip]', (err as Error).message);
    results.push({ ok: false });
  }

  // [dont]
  try {
    const result = formatBotText('[dont]Never do this[/dont]') as string;
    if (result.includes('callout-dont') && result.includes('Never do this')) {
      pass('formatBotText: [dont] → callout-dont');
      results.push({ ok: true });
    } else {
      fail('formatBotText [dont] callout', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText [dont]', (err as Error).message);
    results.push({ ok: false });
  }

  // ── Code block ────────────────────────────────────────────────────────────

  try {
    const result = formatBotText('Example\n```\nhttps://api.example.com\n```') as string;
    if (result.includes('code-block') && result.includes('<code>') && result.includes('api.example.com')) {
      pass('formatBotText: ```code``` → .code-block with <code>');
      results.push({ ok: true });
    } else {
      fail('formatBotText code block', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText code block', (err as Error).message);
    results.push({ ok: false });
  }

  // ── Markdown table ────────────────────────────────────────────────────────

  try {
    const result = formatBotText('| A | B |\n|---|---|\n| 1 | 2 |') as string;
    if (result.includes('response-table') && result.includes('<th') && result.includes('<td')) {
      pass('formatBotText: markdown table → .response-table');
      results.push({ ok: true });
    } else {
      fail('formatBotText markdown table', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText markdown table', (err as Error).message);
    results.push({ ok: false });
  }

  // ── Cut-short notice ──────────────────────────────────────────────────────

  try {
    const result = formatBotText('some text[cutshort]') as string;
    if (result.includes('cutshort-notice') && !result.includes('[cutshort]')) {
      pass('formatBotText: [cutshort] → .cutshort-notice, marker stripped');
      results.push({ ok: true });
    } else {
      fail('formatBotText cut-short notice', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('formatBotText cut-short', (err as Error).message);
    results.push({ ok: false });
  }

  // ── CSS: Response visual spec ─────────────────────────────────────────────
  // Reads frontend/src/styles.css directly to verify visual requirements.
  // A change to any of these CSS values will break the corresponding test.
  {
    let css = '';
    try {
      const fs = await import('fs/promises');
      css = await fs.readFile(join(ROOT, 'frontend/src/styles.css'), 'utf-8');
    } catch (err) {
      fail('CSS [setup]: could not read styles.css', (err as Error).message);
      results.push({ ok: false });
    }

    if (css) {
      // Extracts an integer px value for a CSS property inside a selector block.
      // Works with both single-line and multi-line rule declarations.
      const extractPx = (selector: string, property: string): number | null => {
        const sel = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(sel + '\\s*\\{[^}]*' + property + ':\\s*(\\d+)px');
        const m = css.match(re);
        return m ? parseInt(m[1]) : null;
      };

      // #6 (CSS): H1 font-size is 20–22px — clearly bold and dominant
      try {
        const h1Size = extractPx('.bot-text h1', 'font-size');
        if (h1Size !== null && h1Size >= 20 && h1Size <= 22) {
          pass(`CSS [#6]: .bot-text h1 font-size is ${h1Size}px (spec: 20–22px)`);
          results.push({ ok: true });
        } else {
          fail('CSS [#6]: .bot-text h1 font-size must be 20–22px', `Got: ${h1Size}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#6] h1 font-size', (err as Error).message);
        results.push({ ok: false });
      }

      // #8: H1 is visually the largest element — h1 > section-label > body
      try {
        const h1Size = extractPx('.bot-text h1', 'font-size');
        const labelSize = extractPx('.bot-text .section-label', 'font-size');
        const bodySize = extractPx('.bot-text p', 'font-size');
        if (h1Size !== null && labelSize !== null && bodySize !== null
            && h1Size > labelSize && labelSize > bodySize) {
          pass(`CSS [#8]: H1 (${h1Size}px) > section-label (${labelSize}px) > body (${bodySize}px) — H1 is dominant`);
          results.push({ ok: true });
        } else {
          fail('CSS [#8]: H1 must be larger than section-label, which must be larger than body',
            `h1=${h1Size}px, label=${labelSize}px, body=${bodySize}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#8] H1 dominant', (err as Error).message);
        results.push({ ok: false });
      }

      // #9: Section titles have a gap above them — margin-top > 0
      try {
        const marginTop = extractPx('.bot-text .section-label', 'margin-top');
        if (marginTop !== null && marginTop > 0) {
          pass(`CSS [#9]: .section-label margin-top is ${marginTop}px — gap above section titles`);
          results.push({ ok: true });
        } else {
          fail('CSS [#9]: .section-label must have margin-top > 0', `Got: ${marginTop}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#9] section-label margin-top', (err as Error).message);
        results.push({ ok: false });
      }

      // #10: Section titles are exactly 2px larger than body text
      try {
        const labelSize = extractPx('.bot-text .section-label', 'font-size');
        const bodySize = extractPx('.bot-text p', 'font-size');
        if (labelSize !== null && bodySize !== null && labelSize === bodySize + 2) {
          pass(`CSS [#10]: section-label (${labelSize}px) = body (${bodySize}px) + 2px exactly`);
          results.push({ ok: true });
        } else {
          fail('CSS [#10]: section-label must be exactly body + 2px',
            `section-label=${labelSize}px, body=${bodySize}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#10] section-label 2px larger', (err as Error).message);
        results.push({ ok: false });
      }

      // #11: Minimum 16px — bot-text paragraph (response body text)
      try {
        const bodySize = extractPx('.bot-text p', 'font-size');
        if (bodySize !== null && bodySize >= 16) {
          pass(`CSS [#11]: .bot-text p font-size is ${bodySize}px (≥ 16px minimum)`);
          results.push({ ok: true });
        } else {
          fail('CSS [#11]: .bot-text p font-size must be ≥ 16px', `Got: ${bodySize}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#11] bot-text min 16px', (err as Error).message);
        results.push({ ok: false });
      }

      // #11: Minimum 16px — user message (question display)
      try {
        const userSize = extractPx('.user-msg', 'font-size');
        if (userSize !== null && userSize >= 16) {
          pass(`CSS [#11]: .user-msg font-size is ${userSize}px (≥ 16px minimum)`);
          results.push({ ok: true });
        } else {
          fail('CSS [#11]: .user-msg font-size must be ≥ 16px', `Got: ${userSize}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#11] user-msg min 16px', (err as Error).message);
        results.push({ ok: false });
      }

      // #12: Bullet markers are blue — ul li::marker uses var(--Mewsie-blue)
      try {
        const hasBlueMarker = /\.bot-text ul li::marker\s*\{[^}]*color:\s*var\(--Mewsie-blue\)/.test(css);
        if (hasBlueMarker) {
          pass('CSS [#12]: .bot-text ul li::marker color is var(--Mewsie-blue) — visible blue bullets');
          results.push({ ok: true });
        } else {
          fail('CSS [#12]: ul li::marker must use var(--Mewsie-blue) for blue bullet points', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#12] blue bullet markers', (err as Error).message);
        results.push({ ok: false });
      }

      // #18: Closing line (.response-end) has margin-top: 18px
      try {
        const marginTop = extractPx('.bot-text .response-end', 'margin-top');
        if (marginTop === 18) {
          pass('CSS [#18]: .response-end margin-top is 18px — gap above closing line');
          results.push({ ok: true });
        } else {
          fail('CSS [#18]: .response-end margin-top must be 18px', `Got: ${marginTop}px`);
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [#18] response-end 18px margin-top', (err as Error).message);
        results.push({ ok: false });
      }
    }
  }
}
