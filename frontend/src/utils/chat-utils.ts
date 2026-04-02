// ── Callout type map ──────────────────────────────────────────────────────────
const CALLOUT_TYPES: Record<string, { cls: string; icon: string }> = {
  callout: { cls: "callout-box",  icon: "i" },
  warn:    { cls: "callout-warn", icon: "!" },
  tip:     { cls: "callout-tip",  icon: "★" },
  dont:    { cls: "callout-dont", icon: "✕" },
};

// ── Intro lines for H1-headed responses ──────────────────────────────────────
const INTRO_LINES = [
  "Here's what I found:",
  "Here's what you need:",
  "Here's a quick rundown:",
  "Let me walk you through it:",
  "Here's the full picture:",
  "Here's what the guide says:",
  "Here's exactly how to do it:",
  "Let me break that down:",
  "Here's the short version:",
];

// Deterministic pick based on text content — same text always → same intro line
function pickIntroLine(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0x7fffffff;
  }
  return INTRO_LINES[hash % INTRO_LINES.length];
}

// ── Link deduplication ────────────────────────────────────────────────────────
// If the same href appears more than once, replace the 2nd+ occurrence with
// the anchor text only (no <a> tag). Runs after all HTML is assembled.
function deduplicateLinks(html: string): string {
  const seen = new Set<string>();
  return html.replace(/<a\s+href="([^"]+)"([^>]*)>([^<]*)<\/a>/g, (_match, href, _attrs, text) => {
    if (seen.has(href)) return text;
    seen.add(href);
    return _match;
  });
}

// ── Related-links section enforcement ────────────────────────────────────────
// A section whose label matches "Related / See also / Additional / etc." should
// only appear on complex responses (H1 + steps or multiple sections) and always
// at the very end (just before the closing-line paragraph, or at end of string).
const RELATED_LABEL_RE = /^(related|see also|additional|further|links|more info)/i;

function enforceRelatedLinksSection(html: string): string {
  // Find a section-label whose text matches the related-links pattern
  const labelRe = /<div class="section-label">([^<]*)<\/div>/g;
  let match: RegExpExecArray | null;
  let relatedStart = -1;
  let relatedLabelFull = '';

  while ((match = labelRe.exec(html)) !== null) {
    if (RELATED_LABEL_RE.test(match[1])) {
      relatedStart = match.index;
      relatedLabelFull = match[0];
      break;
    }
  }

  if (relatedStart === -1) return html; // no related-links section found

  // Determine where the section ends (next section-label, response-end, or end)
  const afterLabel = html.indexOf('<div class="section-label">', relatedStart + relatedLabelFull.length);
  const responseEnd = html.indexOf('<p class="response-end">', relatedStart);
  const endCandidates = [
    afterLabel > -1 ? afterLabel : html.length,
    responseEnd > -1 ? responseEnd : html.length,
  ];
  const relatedEnd = Math.min(...endCandidates);
  const section = html.slice(relatedStart, relatedEnd);

  // Complex = has H1 AND (has ordered list OR 2+ section-label divs)
  const sectionLabelCount = (html.match(/<div class="section-label">/g) ?? []).length;
  const isComplex = html.includes('<h1>') && (html.includes('<ol') || sectionLabelCount >= 2);

  if (!isComplex) {
    // Simple response — remove the section entirely
    return html.slice(0, relatedStart) + html.slice(relatedEnd);
  }

  // Complex — if already at the end (no content after it except response-end), leave it
  const afterSection = html.slice(relatedEnd).replace(/<p class="response-end">.*$/i, '').trim();
  if (!afterSection) return html;

  // Not at end — extract and move it
  html = html.slice(0, relatedStart) + html.slice(relatedEnd);
  const insertBefore = html.indexOf('<p class="response-end">');
  if (insertBefore > -1) {
    return html.slice(0, insertBefore) + section + html.slice(insertBefore);
  }
  return html + section;
}

// ── Text formatting ───────────────────────────────────────────────────────────
export function formatBotText(text: string): string {
  if (!text) return "";
  let html = text.trim();

  // ── Em-dash replacement — must happen first, before anything renders
  html = html.replace(/—/g, ' - ');

  // ── Trim trailing whitespace and blank lines
  html = html.trimEnd();

  // ── Cut-short detection
  let cutShort = false;
  if (html.endsWith("[cutshort]")) {
    cutShort = true;
    html = html.slice(0, -"[cutshort]".length).trim();
  }

  // Strip any [checklist]...[/checklist] blocks — feature is disabled
  html = html.replace(/\[checklist\][\s\S]*?\[\/checklist\]/gi, "").trim();

  // ── Extract code blocks before any HTML escaping
  const codeBlocks: Array<{ lang: string; code: string }> = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_: string, lang: string, code: string) => {
    codeBlocks.push({ lang: lang.trim(), code: code.trim() });
    return `\n\nMEWSIECODEBLOCK${codeBlocks.length - 1}MEWSIECODEBLOCK\n\n`;
  });

  // ── Extract callout blocks
  const callouts: Array<{ type: string; content: string }> = [];
  html = html.replace(/\[(callout|warn|tip|dont)\]([\s\S]*?)\[\/\1\]/gi, (_: string, type: string, content: string) => {
    callouts.push({ type: type.toLowerCase(), content: content.trim() });
    return `\n\nMEWSIECALLOUT${callouts.length - 1}MEWSIECALLOUT\n\n`;
  });

  // ── Extract markdown tables
  const tables: string[] = [];
  html = html.replace(/((?:\|[^\n]+\|\n?)+)/g, (match: string) => {
    const rows = match.trim().split("\n").map((r: string) => r.trim()).filter(Boolean);
    if (rows.length < 2) return match;
    const isSeparator = (r: string) => /^[\s|:\-]+$/.test(r);
    if (!isSeparator(rows[1])) return match;
    const parseRow = (r: string) => r.replace(/^\||\|$/g, "").split("|").map((c: string) => c.trim());
    const headers = parseRow(rows[0]);
    const body = rows.slice(2).filter(r => !isSeparator(r)).map(parseRow);
    const thead = `<thead><tr>${headers.map((h: string) => `<th>${h}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${body.map((cells: string[]) => `<tr>${cells.map((c: string) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
    tables.push(`<table class="response-table">${thead}${tbody}</table>`);
    return `\n\nMEWSIETABLE${tables.length - 1}MEWSIETABLE\n\n`;
  });

  // ── Convert ## and ### headings to **bold** inline (H1 stays as the only heading tag)
  html = html.replace(/^## (.+)$/gm, '\n\n**$1**');
  html = html.replace(/^### (.+)$/gm, '\n\n**$1**');

  // ── Convert prose sequential instructions to numbered list
  // Matches runs of lines each starting with a sequential marker (2+ lines required)
  html = html.replace(
    /((?:^|\n)(First|Then|Next|After that|After this|Finally|Lastly)[,:]?\s+[^\n]+(?:\n(Then|Next|After that|After this|Finally|Lastly)[,:]?\s+[^\n]+)+)/gim,
    (match: string) => {
      const lines = match.trim().split('\n').filter((l: string) => l.trim());
      return '\n\n' + lines.map((line: string, i: number) =>
        `${i + 1}. ${line.replace(/^(?:First|Then|Next|After that|After this|Finally|Lastly)[,:]?\s+/i, '').trim()}`
      ).join('\n') + '\n';
    }
  );

  // ── Remove wrapping sentences before/after numbered lists
  html = html.replace(/^[^\n]*(?:here are(?: the)?|follow these|these are the|please follow|steps? below|following steps?)[^\n]*:?\s*\n+(\s*\d+\.)/gim, '$1');
  html = html.replace(/((?:^\d+\..*$\n?)+)\s*\n*[^\n]*(?:hope that helps|let me know if you have|feel free to reach out|don't hesitate to)[^\n]*/gim, '$1');

  // ── Detect H1 for intro line (check before heading conversion)
  const startsWithH1 = /^# .+/m.test(html.trimStart());

  // Normalise inline numbered lists: "1. Step 2. Step" → separate lines
  html = html.replace(/(?<!\n)\s+(\d+)[.)]\s+/g, (_, num: string) => `\n${num}. `);
  // Collapse blank lines between consecutive numbered items so they form one <ol>
  html = html.replace(/(^\d+[\.)]\s+[^\n]+)\n\n+(?=\d+[\.)]\s+)/gm, '$1\n');
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');               // H1 → h1 (only heading tag allowed)
  // H2 and H3 already converted to **bold** above
  html = html.replace(/((?:^\d+[\.)]\s+.*$\n?)+)/gm, (match: string) => {
    const items = match.trim().split(/\n(?=\d+[\.)]\s+)/);
    // Single item — strip the number and render as plain text (not a list)
    if (items.length === 1) {
      const m = items[0].match(/^\d+[\.)]\s+(.*)$/);
      return m ? m[1] : items[0];
    }
    // Multiple items — always renumber from 1 regardless of source numbers
    const listItems = items.map((item: string, i: number) => {
      const m = item.match(/^\d+[\.)]\s+(.*)$/);
      return m ? `<li><strong>${i + 1})</strong><span class="step-body"> ${m[1]}</span></li>` : `<li>${item}</li>`;
    }).join("");
    return `<ol class="step-list">${listItems}</ol>`;
  });
  html = html.replace(/((?:^[^\S\n]*[-*•]\s+.*$\n?)+)/gm, (match: string) => {
    const items = match.trim().split(/\n(?=[^\S\n]*[-*•]\s+)/);
    const listItems = items.map((item: string) => `<li>${item.replace(/^[^\S\n]*[-*•]\s+/, "")}</li>`).join("");
    return `<ul>${listItems}</ul>`;
  });
  html = html.replace(/\n\n+/g, "</p><p>");
  if (!html.startsWith("<ol") && !html.startsWith("<ul") && !html.startsWith("<h1")) {
    html = `<p>${html}</p>`;
  }
  // Lone-bold paragraphs → section labels (bold that is the entire paragraph content)
  html = html.replace(/<p><strong>(.*?)<\/strong><\/p>/g, '<div class="section-label">$1</div>');
  html = html.replace(/([^>])\n([^<])/g, "$1<br>$2");

  // ── Re-insert callouts
  callouts.forEach(({ type, content }: { type: string; content: string }, idx: number) => {
    const { cls, icon } = CALLOUT_TYPES[type] ?? CALLOUT_TYPES.callout;
    let c = content
      .replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    const calloutHtml = `<div class="${cls}"><span class="callout-icon">${icon}</span><span>${c}</span></div>`;
    html = html.replace(`<p>MEWSIECALLOUT${idx}MEWSIECALLOUT</p>`, calloutHtml);
    html = html.replace(`MEWSIECALLOUT${idx}MEWSIECALLOUT`, calloutHtml);
  });

  // ── Re-insert tables
  tables.forEach((tableHtml: string, idx: number) => {
    html = html.replace(`<p>MEWSIETABLE${idx}MEWSIETABLE</p>`, tableHtml);
    html = html.replace(`MEWSIETABLE${idx}MEWSIETABLE`, tableHtml);
  });

  // ── Re-insert code blocks
  codeBlocks.forEach(({ lang, code }: { lang: string; code: string }, idx: number) => {
    const label = lang || "Example";
    const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const dataCode = code.replace(/"/g, "&quot;");
    const codeHtml = `<div class="code-block"><div class="code-label">${label}</div><button class="copy-btn" onclick="this.textContent='Copied';setTimeout(()=>this.textContent='Copy',1500);navigator.clipboard.writeText(this.dataset.code)" data-code="${dataCode}">Copy</button><pre><code>${escapedCode}</code></pre></div>`;
    html = html.replace(`<p>MEWSIECODEBLOCK${idx}MEWSIECODEBLOCK</p>`, codeHtml);
    html = html.replace(`MEWSIECODEBLOCK${idx}MEWSIECODEBLOCK`, codeHtml);
  });

  // ── Deduplicate links — same href appearing twice renders 2nd+ as plain text
  html = deduplicateLinks(html);

  // ── Enforce related-links section placement
  html = enforceRelatedLinksSection(html);

  // ── Cut-short notice
  if (cutShort) {
    html += `<div class="cutshort-notice">Response was cut short - try asking again or break your question into smaller parts.</div>`;
  }

  // ── Detect and tag closing lines so CSS can add spacing above them
  // Handles straight ('), curly (\u2019), or missing apostrophes.
  // Two cases:
  //   1. Closing line is its own <p> (double newline before it)
  //   2. Closing line follows a <br> inside a <p> (single newline before it) — split it out
  const closingLinePatterns = [
    /Feel free to ask if something[\u2019']?s unclear\./i,
    /Let Mewsy know if you get stuck\./i,
    /Let me know if you need anything else\./i,
  ];
  for (const pat of closingLinePatterns) {
    const src = pat.source;
    // Case 1: already its own paragraph — closed or unclosed (h1-led responses skip the outer <p>)
    html = html.replace(new RegExp(`<p>(${src})(<\/p>|$)`, 'i'), '<p class="response-end">$1$2');
    // Case 2: tacked on after <br> inside a paragraph — closed or unclosed
    html = html.replace(new RegExp(`<br>(${src})(<\/p>|$)`, 'i'), '</p><p class="response-end">$1$2');
  }

  // ── Always prepend intro line (every substantive response)
  const intro = `<p class="intro-line">${pickIntroLine(text)}</p>`;

  return `<div class="bot-text">${intro}${html}</div>`;
}

// ── Response splitting ────────────────────────────────────────────────────────
// Responses are one continuous document — always rendered as a single bubble.
export function splitResponseIntoMessages(text: string): string[] {
  if (!text.trim()) return [];
  return [text];
}

// ── Option button detection ───────────────────────────────────────────────────

import { BUTTON_MAX, BUTTON_IMPERATIVE_VERBS } from '../config/chat-config';

export interface DetectedButtons {
  bodyText: string | null;
  questionText: string | null;
  options: string[];
}

export function detectOptionButtons(text: string): DetectedButtons | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const explicitMatch = trimmed.match(/\[BUTTONS:\s*([^\]]+)\]/i);
  if (explicitMatch) {
    const options = explicitMatch[1].split("|").map((s: string) => s.trim()).filter(Boolean);
    const bodyText = trimmed.replace(/\s*\[BUTTONS:[^\]]*\]/gi, "").trim();
    return { bodyText, questionText: null, options };
  }
  const labelsMatch = trimmed.match(/\[LABELS:\s*([^\]]+)\]/i);
  if (labelsMatch) {
    const options = labelsMatch[1].split("|").map((s: string) => s.trim()).filter(Boolean);
    const withoutTag = trimmed.replace(/\s*\[LABELS:[^\]]*\]/gi, "").trim();
    const { bodyText, questionText } = splitQuestionFromBody(withoutTag);
    return { bodyText, questionText, options };
  }
  return detectListButtons(trimmed);
}

export function detectListButtons(text: string): DetectedButtons | null {
  const lines = text.split(/\r?\n/);
  // Only match unordered list items (bullet markers) — never numbered lists
  const listRe = /^\s*(?:[•·▪▸\-\*])\s+(.+)$/;
  const items: string[] = [];
  for (const line of lines) {
    const m = line.match(listRe);
    if (m) {
      const item = m[1].trim().replace(/\*\*/g, "").trim();
      if (item.length > 0) items.push(item);
    }
  }

  // Must have between 2 and BUTTON_MAX items
  if (items.length < 2 || items.length > BUTTON_MAX) return null;

  // All items must be ≤ 65 characters
  if (items.some(i => i.length > 65)) return null;

  // The message must contain a sentence ending in ? (required)
  const hasQuestion = text.includes("?");
  if (!hasQuestion) return null;

  // None of the items may start with an imperative verb
  if (items.some(i => BUTTON_IMPERATIVE_VERBS.test(i))) return null;

  // Reject informational bullet patterns
  // Only check " - " (em-dash is converted to this by formatBotText); leave en-dash alone
  if (items.some(i => i.includes(" - "))) return null;
  const infoPattern = /^(a |an )|\bcalled\b|\bincluding\b|\bsuch as\b/i;
  if (items.filter(i => infoPattern.test(i)).length > items.length / 2) return null;
  const instructionPhrase = /\b(at the bottom|at the top|in the settings|in the menu|on the screen|from the list|from the dropdown|in the field|in the box|on the page|by clicking|by selecting)\b/i;
  if (items.some(i => instructionPhrase.test(i))) return null;

  const nonListLines = lines.filter(l => {
    const t = l.trim();
    return t && !listRe.test(t) && !/^\w[\w\s]*:$/.test(t);
  });
  let questionText: string | null = null;
  const otherLines: string[] = [];
  for (const line of nonListLines) {
    const t = line.trim();
    if (!questionText && (t.includes("?") || /^(which|what|are you|do you|have you|would you|is this|did|can you|were you|should|select|choose|pick)\b/i.test(t))) {
      questionText = t.replace(/^#{1,3}\s+/, '');  // strip H1/H2/H3 prefix if AI wrote it
    } else if (t) {
      otherLines.push(t);
    }
  }
  if (!questionText) return null;
  const bodyText = otherLines.join(" ").trim() || null;
  return { bodyText, questionText, options: items };
}

export function splitQuestionFromBody(text: string): { bodyText: string | null; questionText: string | null } {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter(Boolean);
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].endsWith("?") || /or not/i.test(sentences[i])) {
      return {
        questionText: sentences[i],
        bodyText: sentences.filter((_: string, j: number) => j !== i).join(" ").trim() || null
      };
    }
  }
  return { bodyText: text, questionText: null };
}

export function stripButtonSyntax(text: string): string {
  return text.replace(/\s*\[BUTTONS:[^\]]*\]/gi, "").replace(/\s*\[LABELS:[^\]]*\]/gi, "").trim();
}

// ── Post-render list-to-buttons conversion ────────────────────────────────────
//
// Called after a bot message renders. Finds any <ul> in the rendered HTML and
// converts it to option buttons if the content passes the filter criteria.
// Returns the detected options (and question text) or null if no conversion.

export interface PostRenderResult {
  options: string[];
  questionText: string | null;
}

export function checkListForButtons(
  msgDiv: HTMLElement,
  allSiblings: HTMLElement[]
): PostRenderResult | null {
  // Only convert <ul> — never <ol> (numbered lists are always sequential steps)
  const list = msgDiv.querySelector("ul");
  if (!list) return null;

  const options = Array.from(list.querySelectorAll("li")).map((li: Element) => li.textContent?.trim() ?? "").filter(Boolean);

  // Must have between 2 and BUTTON_MAX items
  if (options.length < 2 || options.length > BUTTON_MAX) return null;

  // All items must be ≤ 90 characters
  if (options.some(o => o.length > 90)) return null;

  // None of the items may start with an imperative verb
  if (options.some(o => BUTTON_IMPERATIVE_VERBS.test(o))) return null;

  // Reject if items look like informational bullets not choices
  // Only check " - " (formatBotText converts em-dashes to this); en-dash " – " is left alone
  // because it legitimately appears inside quoted error messages (e.g. "Forbidden – user division…")
  if (options.some(o => o.includes(" - "))) return null;
  const infoPattern = /^(a |an )|\bcalled\b|\bincluding\b|\bsuch as\b/i;
  if (options.filter(o => infoPattern.test(o)).length > options.length / 2) return null;
  const instructionPhrase = /\b(at the bottom|at the top|in the settings|in the menu|on the screen|from the list|from the dropdown|in the field|in the box|on the page|by clicking|by selecting)\b/i;
  if (options.some(o => instructionPhrase.test(o))) return null;

  // The message must contain a sentence ending in ? (Mewsie asked a clarifying question)
  let questionText: string | null = null;
  const clone = msgDiv.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("ul,ol").forEach(l => l.remove());
  clone.querySelector('.intro-line')?.remove();  // strip intro line so it doesn't contaminate questionText
  // Insert newlines before block elements so textContent doesn't glue adjacent words together
  clone.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,li,br').forEach(el => el.insertAdjacentText('beforebegin', '\n'));
  const lines = (clone.textContent ?? "").trim().split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.includes("?") || /^(which|what|are you|do you|have you|would you|is this|did|can you|were you|should|select|choose|pick|could you|could)\b/i.test(line)) {
      questionText = line;
      break;
    }
  }
  if (!questionText) {
    for (const sib of allSiblings) {
      if (sib === msgDiv) continue;
      if (sib.textContent?.includes("?")) { questionText = sib.textContent.trim(); break; }
    }
  }
  // Must have a clarifying question — no question, no buttons
  if (!questionText) return null;

  // Remove the list from the DOM so we can replace it with buttons
  list.remove();

  return { options, questionText };
}

// ── Option button sorting ─────────────────────────────────────────────────────
// Separates "Something else" variants from the main numbered options so they
// can always be rendered last, regardless of position in the incoming array.
// Returns up to 4 main options plus the "Something else" label (if present).
const SOMETHING_ELSE_SORT_RE = /\b(something else|other|etwas anderes|autre chose|iets anders|anders)\b/i;

export function sortButtonOptions(options: string[]): { main: string[]; somethingElse: string | null } {
  const main = options.filter(o => !SOMETHING_ELSE_SORT_RE.test(o)).slice(0, 4);
  const somethingElse = options.find(o => SOMETHING_ELSE_SORT_RE.test(o)) ?? null;
  return { main, somethingElse };
}

// ── Accordion placeholder (accordion grouping removed) ────────────────────────
// Steps render as a flat continuous list — no collapsing or grouping.
export function initAccordions(_container: HTMLElement): void {
  return;
}

// ── Progressive reveal for prose bot messages ─────────────────────────────────
/*
 * Called after each bot message bubble renders. For prose bubbles (no accordion,
 * multiple block-level elements), reveals each paragraph one by one with a short
 * animated typing indicator between them — mimicking the feeling of the bot
 * composing each thought rather than dumping a wall of text at once.
 *
 * Skipped for:
 *   - Bubbles that contain an accordion (they have their own structure)
 *   - Single-element bubbles (nothing to reveal progressively)
 */
export function applyProgressiveReveal(msgDiv: HTMLElement, autoScrollFn: () => void): void {
  // No inter-paragraph reveal — content is shown immediately.
  // Bubble entry animation is handled entirely by CSS (.bot-msg-container).
  autoScrollFn();
}
