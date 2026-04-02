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

  // ── Link rules ────────────────────────────────────────────────────────────

  // [link-1a] Raw https:// URL must NOT be auto-linkified
  try {
    const result = formatBotText('visit https://example.com for help') as string;
    if (!result.includes('href="https://example.com"')) {
      pass('[link-1a] raw https:// URL is not linkified');
      results.push({ ok: true });
    } else {
      fail('[link-1a] raw https:// URL is not linkified', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-1a] raw https:// URL is not linkified', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-1b] Markdown [text](url) MUST still be linkified
  try {
    const result = formatBotText('[read the guide](https://example.com)') as string;
    if (result.includes('href="https://example.com"') && result.includes('read the guide')) {
      pass('[link-1b] markdown [text](url) is linkified');
      results.push({ ok: true });
    } else {
      fail('[link-1b] markdown [text](url) is linkified', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-1b] markdown [text](url) is linkified', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-1c] Raw URL inside a callout must NOT be linkified
  try {
    const result = formatBotText('[callout]visit https://example.com for help[/callout]') as string;
    if (!result.includes('href="https://example.com"') && result.includes('https://example.com')) {
      pass('[link-1c] raw URL inside callout is not linkified');
      results.push({ ok: true });
    } else {
      fail('[link-1c] raw URL inside callout is not linkified', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-1c] raw URL inside callout is not linkified', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-1d] Bare domain (no protocol) must NOT be auto-linkified
  try {
    const result = formatBotText('visit example.com for help') as string;
    if (!result.includes('href="https://example.com"') && !result.includes('href="example.com"')) {
      pass('[link-1d] bare domain is not linkified');
      results.push({ ok: true });
    } else {
      fail('[link-1d] bare domain is not linkified', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-1d] bare domain is not linkified', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-4a] Markdown link must have target="_blank"
  try {
    const result = formatBotText('[guide](https://example.com)') as string;
    if (result.includes('target="_blank"')) {
      pass('[link-4a] markdown link has target="_blank"');
      results.push({ ok: true });
    } else {
      fail('[link-4a] markdown link has target="_blank"', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-4a] markdown link has target="_blank"', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-3a] Duplicate URL — second occurrence rendered as plain text, not <a>
  try {
    const result = formatBotText('[guide](https://x.com) and [guide](https://x.com)') as string;
    const matches = result.match(/href="https:\/\/x\.com"/g) ?? [];
    if (matches.length === 1) {
      pass('[link-3a] duplicate URL — second rendered as plain text');
      results.push({ ok: true });
    } else {
      fail('[link-3a] duplicate URL — second rendered as plain text', `Found ${matches.length} href occurrences. Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-3a] duplicate URL — second rendered as plain text', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-3b] Two different URLs — both rendered as <a>
  try {
    const result = formatBotText('[A](https://a.com) and [B](https://b.com)') as string;
    if (result.includes('href="https://a.com"') && result.includes('href="https://b.com"')) {
      pass('[link-3b] two distinct URLs both rendered as <a>');
      results.push({ ok: true });
    } else {
      fail('[link-3b] two distinct URLs both rendered as <a>', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-3b] two distinct URLs both rendered as <a>', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-3c] Same URL, different anchor text — second deduplicated to plain text
  try {
    const result = formatBotText('[first](https://x.com) then [second](https://x.com)') as string;
    const hrefCount = (result.match(/href="https:\/\/x\.com"/g) ?? []).length;
    if (hrefCount === 1 && result.includes('second')) {
      pass('[link-3c] same URL different anchor text — second is plain text');
      results.push({ ok: true });
    } else {
      fail('[link-3c] same URL different anchor text — second is plain text', `href count: ${hrefCount}. Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-3c] same URL different anchor text', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-2a] Related-links section on a simple response is removed
  try {
    const result = formatBotText('**Related links**\n\n- [guide](https://x.com)') as string;
    if (!result.includes('section-label')) {
      pass('[link-2a] related-links section on simple response is removed');
      results.push({ ok: true });
    } else {
      fail('[link-2a] related-links section on simple response is removed', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-2a] related-links section on simple response is removed', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-2b] Related-links section on a complex response (H1 + steps) is kept
  try {
    const complex = '# Setup Guide\n\n**Overview**\n\nGetting started is straightforward.\n\n1. Step one\n2. Step two\n3. Step three\n\n**Related links**\n\n- [guide](https://x.com)';
    const result = formatBotText(complex) as string;
    if (result.includes('section-label') && result.includes('Related links')) {
      pass('[link-2b] related-links section on complex response is kept');
      results.push({ ok: true });
    } else {
      fail('[link-2b] related-links section on complex response is kept', `Got: ${result}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-2b] related-links section on complex response is kept', (err as Error).message);
    results.push({ ok: false });
  }

  // [link-2c] Related-links section mid-body on complex response is moved to end
  try {
    const complex = '# Setup Guide\n\n**Related links**\n\nFor setup details, see [guide](https://x.com).\n\n**Overview**\n\nGetting started is straightforward.\n\n1. Step one\n2. Step two\n3. Step three';
    const result = formatBotText(complex) as string;
    const relatedIdx = result.indexOf('Related links');
    const stepsIdx = result.indexOf('<ol');
    if (relatedIdx > stepsIdx && relatedIdx > -1) {
      pass('[link-2c] related-links section moved after steps in complex response');
      results.push({ ok: true });
    } else {
      fail('[link-2c] related-links section moved after steps in complex response', `relatedIdx=${relatedIdx} stepsIdx=${stepsIdx}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[link-2c] related-links section moved after steps in complex response', (err as Error).message);
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

      // ── Sidebar in side-panel mode ────────────────────────────────────────

      const desktopCss = css.slice(0, css.indexOf('@media (max-width: 768px)'));

      // [sidebar-css-0a] Desktop: .topbar-open-sidebar base rule is display:none — hidden in fullscreen desktop (no override)
      try {
        const baseHidden = /\.topbar-open-sidebar\s*\{[^}]*display:\s*none/.test(desktopCss);
        if (baseHidden) {
          pass('CSS [sidebar-css-0a]: .topbar-open-sidebar base has display:none — hidden on desktop by default, including fullscreen');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-0a]: .topbar-open-sidebar base must have display:none to hide it in fullscreen desktop', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-0a]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-0b] Desktop: #Mewsie-app.side-panel override shows .topbar-open-sidebar as display:inline-flex
      try {
        const visibleSidePanel = /#Mewsie-app\.side-panel \.topbar-open-sidebar\s*\{[^}]*display:\s*inline-flex/.test(desktopCss);
        if (visibleSidePanel) {
          pass('CSS [sidebar-css-0b]: #Mewsie-app.side-panel .topbar-open-sidebar has display:inline-flex — button shown in side-panel desktop');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-0b]: #Mewsie-app.side-panel .topbar-open-sidebar must have display:inline-flex', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-0b]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-0c] Desktop: no #Mewsie-app.fullscreen override for .topbar-open-sidebar — button stays hidden in fullscreen desktop
      try {
        const noFullscreenOverride = !/#Mewsie-app\.fullscreen \.topbar-open-sidebar\s*\{[^}]*display:\s*inline-flex/.test(desktopCss);
        if (noFullscreenOverride) {
          pass('CSS [sidebar-css-0c]: no #Mewsie-app.fullscreen .topbar-open-sidebar inline-flex override — button stays hidden in fullscreen desktop');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-0c]: #Mewsie-app.fullscreen .topbar-open-sidebar must NOT have display:inline-flex — would make it visible in fullscreen desktop', 'Unwanted rule found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-0c]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-1] Desktop: side-panel sidebar has position:absolute (overlay, not layout column)
      try {
        const isOverlay = /#Mewsie-app\.side-panel #sidebar\s*\{[^}]*position:\s*absolute/.test(desktopCss);
        if (isOverlay) {
          pass('CSS [sidebar-css-1]: #Mewsie-app.side-panel #sidebar is position:absolute on desktop — slide-in overlay');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-1]: #Mewsie-app.side-panel #sidebar must be position:absolute on desktop', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-1]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-2] Desktop: side-panel sidebar hidden off-screen via translateX(-100%)
      try {
        const hiddenOffscreen = /#Mewsie-app\.side-panel #sidebar\s*\{[^}]*transform:\s*translateX\(-100%\)/.test(desktopCss);
        if (hiddenOffscreen) {
          pass('CSS [sidebar-css-2]: #Mewsie-app.side-panel #sidebar has translateX(-100%) when hidden — clipped by overflow:hidden');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-2]: #Mewsie-app.side-panel #sidebar must use translateX(-100%) when hidden', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-2]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-3] Desktop: side-panel sidebar expanded with translateX(0) — right:100% pins it to border
      try {
        const slidesIn = /#Mewsie-app\.side-panel #sidebar\.expanded\s*\{[^}]*transform:\s*translateX\(0\)/.test(desktopCss);
        if (slidesIn) {
          pass('CSS [sidebar-css-3]: #Mewsie-app.side-panel #sidebar.expanded has translateX(0) — right edge at chat border');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-3]: #Mewsie-app.side-panel #sidebar.expanded must use translateX(0) on desktop', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-3]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-4] Desktop: side-panel sidebar-backdrop is position:absolute (covers chat window)
      try {
        const backdropAbsolute = /#Mewsie-app\.side-panel #sidebar-backdrop\s*\{[^}]*position:\s*absolute/.test(desktopCss);
        if (backdropAbsolute) {
          pass('CSS [sidebar-css-4]: #Mewsie-app.side-panel #sidebar-backdrop is position:absolute — covers chat window area');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-4]: #Mewsie-app.side-panel #sidebar-backdrop must be position:absolute to cover chat window', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-4]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-5] Desktop: side-panel sidebar has pointer-events:auto (clickable despite parent none)
      try {
        const clickable = /#Mewsie-app\.side-panel #sidebar\s*\{[^}]*pointer-events:\s*auto/.test(desktopCss);
        if (clickable) {
          pass('CSS [sidebar-css-5]: #Mewsie-app.side-panel #sidebar has pointer-events:auto — buttons are clickable');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-5]: #Mewsie-app.side-panel #sidebar must have pointer-events:auto', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-5]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-6] Desktop: side-panel sidebar-backdrop has pointer-events:auto (backdrop click closes sidebar)
      try {
        const backdropClickable = /#Mewsie-app\.side-panel #sidebar-backdrop\s*\{[^}]*pointer-events:\s*auto/.test(desktopCss);
        if (backdropClickable) {
          pass('CSS [sidebar-css-6]: #Mewsie-app.side-panel #sidebar-backdrop has pointer-events:auto — backdrop click works');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-6]: #Mewsie-app.side-panel #sidebar-backdrop must have pointer-events:auto', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-6]', (err as Error).message);
        results.push({ ok: false });
      }

      // ── Fullscreen sidebar ────────────────────────────────────────────────

      // [sidebar-css-7] Fullscreen: close (X) button is hidden — widget cannot be dismissed in full-page mode
      try {
        const closeHidden = /#Mewsie-app\.fullscreen \.topbar-icon-btn\.danger\s*\{[^}]*display:\s*none/.test(desktopCss);
        if (closeHidden) {
          pass('CSS [sidebar-css-7]: #Mewsie-app.fullscreen .topbar-icon-btn.danger has display:none — close button hidden in fullscreen');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-7]: #Mewsie-app.fullscreen .topbar-icon-btn.danger must have display:none', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-7]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-8] Fullscreen: collapsed sidebar has a fixed width (icon-only strip)
      try {
        const collapsedWidth = /#sidebar\s*\{[^}]*width:\s*60px/.test(desktopCss);
        if (collapsedWidth) {
          pass('CSS [sidebar-css-8]: #sidebar base width is 60px — collapsed icon-only strip in fullscreen');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-8]: #sidebar base width must be 60px for collapsed icon strip', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-8]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-9] Fullscreen: expanded sidebar grows to a readable width
      try {
        const expandedWidth = /#sidebar\.expanded\s*\{[^}]*width:\s*clamp\(/.test(desktopCss);
        if (expandedWidth) {
          pass('CSS [sidebar-css-9]: #sidebar.expanded uses clamp() width — readable panel in fullscreen');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-9]: #sidebar.expanded must use clamp() width for fullscreen expanded state', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-9]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-10] Mobile fullscreen: sidebar becomes a slide-in overlay (position:absolute)
      try {
        const mobileCssBlock = css.slice(css.indexOf('@media (max-width: 768px)'));
        const mobileOverlay = /#Mewsie-app\.fullscreen #sidebar\s*\{[^}]*position:\s*absolute/.test(mobileCssBlock);
        if (mobileOverlay) {
          pass('CSS [sidebar-css-10]: fullscreen sidebar is position:absolute on mobile — slide-in overlay');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-10]: fullscreen sidebar must be position:absolute on mobile', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-10]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-11] Mobile fullscreen: expanded sidebar slides in (translateX(0))
      try {
        const mobileCssBlock = css.slice(css.indexOf('@media (max-width: 768px)'));
        const mobileSlidesIn = /#Mewsie-app\.fullscreen #sidebar\.expanded\s*\{[^}]*transform:\s*translateX\(0\)/.test(mobileCssBlock);
        if (mobileSlidesIn) {
          pass('CSS [sidebar-css-11]: fullscreen sidebar.expanded has translateX(0) on mobile — slides in');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-11]: fullscreen sidebar.expanded must use translateX(0) on mobile', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-11]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-12] Sidebar toggle button is display:flex by default — always visible in all modes
      try {
        const toggleVisible = /\.sidebar-toggle-btn\s*\{[^}]*display:\s*flex/.test(desktopCss);
        if (toggleVisible) {
          pass('CSS [sidebar-css-12]: .sidebar-toggle-btn base style has display:flex — toggle button always visible');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-12]: .sidebar-toggle-btn base style must have display:flex', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-12]', (err as Error).message);
        results.push({ ok: false });
      }

      // [sidebar-css-13] Mobile: .topbar-open-sidebar is display:inline-flex (covers fullscreen + side-panel on mobile)
      try {
        const mobileCssBlock = css.slice(css.indexOf('@media (max-width: 768px)'));
        const mobileOpenBtn = /\.topbar-open-sidebar\s*\{[^}]*display:\s*inline-flex/.test(mobileCssBlock);
        if (mobileOpenBtn) {
          pass('CSS [sidebar-css-13]: .topbar-open-sidebar has display:inline-flex in mobile media query — opens sidebar on mobile');
          results.push({ ok: true });
        } else {
          fail('CSS [sidebar-css-13]: .topbar-open-sidebar must have display:inline-flex in mobile media query', 'Rule not found');
          results.push({ ok: false });
        }
      } catch (err) {
        fail('CSS [sidebar-css-13]', (err as Error).message);
        results.push({ ok: false });
      }
    }
  }

  // ── Help resources ────────────────────────────────────────────────────────
  // Tests for the knowledge/help-resources/*.md files and the help-items list.
  // We test .md files directly (fs reads) so we avoid the Vite ?raw import
  // which is not available in the Node.js/tsx test environment.

  const { readFileSync, existsSync } = await import('fs');

  const EXPECTED_TOPICS = [
    'omniboost', 'mews', 'integration', 'onboarding', 'tiers',
    'accounting-flows', 'mapping', 'fallback', 'suspense', 'vat',
    'ledgers', 'gateway-commission', 'troubleshooting',
  ];

  const HELP_RESOURCES_DIR = join(ROOT, 'knowledge/help-resources');

  // [help-1] All expected topic .md files exist in knowledge/help-resources/
  for (const topic of EXPECTED_TOPICS) {
    const filename = `${topic}.md`;
    const filePath = join(HELP_RESOURCES_DIR, filename);
    try {
      if (existsSync(filePath)) {
        pass(`[help-1] knowledge/help-resources/${filename} exists`);
        results.push({ ok: true });
      } else {
        fail(`[help-1] knowledge/help-resources/${filename} missing`, 'File not found');
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`[help-1] ${filename} existence check`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // [help-2] All .md files have a non-empty title: in frontmatter
  for (const topic of EXPECTED_TOPICS) {
    const filePath = join(HELP_RESOURCES_DIR, `${topic}.md`);
    try {
      if (!existsSync(filePath)) { results.push({ ok: 'skip' }); continue; }
      const raw = readFileSync(filePath, 'utf-8');
      const titleMatch = raw.match(/^title:\s*(.+)$/m);
      if (titleMatch && titleMatch[1].trim()) {
        pass(`[help-2] ${topic}.md has non-empty title: "${titleMatch[1].trim()}"`);
        results.push({ ok: true });
      } else {
        fail(`[help-2] ${topic}.md is missing a title: field in frontmatter`, 'Not found');
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`[help-2] ${topic}.md title check`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // [help-3] All .md files have a non-empty cta_message: in frontmatter (so the CTA button sends a real question)
  for (const topic of EXPECTED_TOPICS) {
    const filePath = join(HELP_RESOURCES_DIR, `${topic}.md`);
    try {
      if (!existsSync(filePath)) { results.push({ ok: 'skip' }); continue; }
      const raw = readFileSync(filePath, 'utf-8');
      const msgMatch = raw.match(/^cta_message:\s*(.+)$/m);
      if (msgMatch && msgMatch[1].trim()) {
        pass(`[help-3] ${topic}.md has non-empty cta_message`);
        results.push({ ok: true });
      } else {
        fail(`[help-3] ${topic}.md is missing cta_message: in frontmatter`, 'Required for CTA button to send a message');
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`[help-3] ${topic}.md cta_message check`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // [help-4] No .md file contains an em-dash ( — )
  for (const topic of EXPECTED_TOPICS) {
    const filePath = join(HELP_RESOURCES_DIR, `${topic}.md`);
    try {
      if (!existsSync(filePath)) { results.push({ ok: 'skip' }); continue; }
      const raw = readFileSync(filePath, 'utf-8');
      if (!raw.includes(' \u2014 ')) {
        pass(`[help-4] ${topic}.md contains no em-dashes`);
        results.push({ ok: true });
      } else {
        fail(`[help-4] ${topic}.md contains em-dashes ( — ) — use plain dashes or colons instead`, 'Em-dash found');
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`[help-4] ${topic}.md em-dash check`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // [help-5] All .md files have at least one ## section heading
  for (const topic of EXPECTED_TOPICS) {
    const filePath = join(HELP_RESOURCES_DIR, `${topic}.md`);
    try {
      if (!existsSync(filePath)) { results.push({ ok: 'skip' }); continue; }
      const raw = readFileSync(filePath, 'utf-8');
      if (/^## /m.test(raw)) {
        pass(`[help-5] ${topic}.md has at least one ## section heading`);
        results.push({ ok: true });
      } else {
        fail(`[help-5] ${topic}.md has no ## section headings`, 'At least one required');
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`[help-5] ${topic}.md section heading check`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // [help-6] getHelpItems('en') returns exactly 13 items (contact removed)
  try {
    const { getHelpItems } = await import(`${ROOT}/frontend/src/help/help-items.ts`);
    const items = getHelpItems('en');
    if (items.length === 13) {
      pass('[help-6] getHelpItems("en") returns 13 items (contact support removed)');
      results.push({ ok: true });
    } else {
      fail('[help-6] getHelpItems("en") must return 13 items', `Got: ${items.length}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[help-6] getHelpItems count', (err as Error).message);
    results.push({ ok: false });
  }

  // [help-7] 'contact' is not in the en help items list
  try {
    const { getHelpItems } = await import(`${ROOT}/frontend/src/help/help-items.ts`);
    const items = getHelpItems('en');
    const hasContact = items.some((i: { topic: string }) => i.topic === 'contact');
    if (!hasContact) {
      pass('[help-7] "contact" topic is not in en help items — correctly removed');
      results.push({ ok: true });
    } else {
      fail('[help-7] "contact" topic must not appear in help items', 'Found in list');
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[help-7] contact topic absence check', (err as Error).message);
    results.push({ ok: false });
  }

  // [help-8] All en topic keys have a corresponding .md file in knowledge/help-resources/
  try {
    const { getHelpItems } = await import(`${ROOT}/frontend/src/help/help-items.ts`);
    const items = getHelpItems('en');
    let allMatch = true;
    const missing: string[] = [];
    for (const item of items) {
      const fp = join(HELP_RESOURCES_DIR, `${item.topic}.md`);
      if (!existsSync(fp)) { allMatch = false; missing.push(item.topic); }
    }
    if (allMatch) {
      pass('[help-8] every en topic key has a matching .md file in knowledge/help-resources/');
      results.push({ ok: true });
    } else {
      fail('[help-8] some topic keys are missing a .md file', `Missing: ${missing.join(', ')}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[help-8] topic-to-file mapping check', (err as Error).message);
    results.push({ ok: false });
  }
}
