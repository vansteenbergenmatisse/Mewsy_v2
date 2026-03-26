// ── Text formatting ───────────────────────────────────────────────────────────
export function formatBotText(text: string): string {
  if (!text) return "";
  let html = text.trim();

  // Strip any [checklist]...[/checklist] blocks — feature is disabled
  html = html.replace(/\[checklist\][\s\S]*?\[\/checklist\]/gi, "").trim();

  // ── Step 0: Extract [callout]...[/callout] blocks before any other processing.
  // They are saved as raw text, replaced with unique block-level placeholders,
  // then re-inserted after all markdown runs so their content is also formatted.
  const callouts: string[] = [];
  html = html.replace(/\[callout\]([\s\S]*?)\[\/callout\]/gi, (_, content: string) => {
    callouts.push(content.trim());
    // Surround with \n\n so the placeholder ends up in its own <p> after processing
    return `\n\nMEWSYCALLOUT${callouts.length - 1}MEWSYCALLOUT\n\n`;
  });

  // Normalise inline numbered lists: "1. Step 2. Step" → separate lines
  html = html.replace(/(?<!\n)\s+(\d+)[.)]\s+/g, (_, num: string) => `\n${num}. `);
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
  // Bare domains without protocol (e.g. omniboost.io/page) — prepend https://
  html = html.replace(/(?<![="\/])(\b(?:[a-z0-9-]+\.)+(?:io|com|org|net|co|be|nl|de|fr|eu)(?:\/[^\s<]*)?)/g, '<a href="https://$1" target="_blank">$1</a>');
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/((?:^\d+[\.)]\s+.*$\n?)+)/gm, (match: string) => {
    const items = match.trim().split(/\n(?=\d+[\.)]\s+)/);
    const listItems = items.map((item: string) => {
      const m = item.match(/^(\d+)[\.)]\s+(.*)$/);
      return m ? `<li><strong>${m[1]})</strong> ${m[2]}</li>` : `<li>${item}</li>`;
    }).join("");
    return `<ol style="list-style: none; padding-left: 0;">${listItems}</ol>`;
  });
  html = html.replace(/((?:^\s*[-*•]\s+.*$\n?)+)/gm, (match: string) => {
    const items = match.trim().split(/\n(?=\s*[-*•]\s+)/);
    const listItems = items.map((item: string) => `<li>${item.replace(/^\s*[-*•]\s+/, "")}</li>`).join("");
    return `<ul>${listItems}</ul>`;
  });
  html = html.replace(/\n\n+/g, "</p><p>");
  if (!html.startsWith("<h") && !html.startsWith("<ol") && !html.startsWith("<ul")) {
    html = `<p>${html}</p>`;
  }
  html = html.replace(/([^>])\n([^<])/g, "$1<br>$2");

  // ── Re-insert callouts.
  // Each placeholder is now wrapped in <p>...</p> — we replace the whole <p> with
  // the callout div so we never nest a block element inside a <p>.
  callouts.forEach((rawContent: string, idx: number) => {
    // Apply inline markdown to the callout content too
    let c = rawContent
      .replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
    const calloutHtml = `<div class="callout-box"><span class="callout-icon">i</span><span>${c}</span></div>`;
    // Replace <p>PLACEHOLDER</p> to avoid div-inside-p invalid HTML
    html = html.replace(`<p>MEWSYCALLOUT${idx}MEWSYCALLOUT</p>`, calloutHtml);
    // Fallback: plain placeholder (in case it wasn't wrapped in <p>)
    html = html.replace(`MEWSYCALLOUT${idx}MEWSYCALLOUT`, calloutHtml);
  });

  return `<div class="bot-text">${html}</div>`;
}

// ── Response splitting ────────────────────────────────────────────────────────
export function splitResponseIntoMessages(text: string): string[] {
  text = text.trim();
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean);
  if (paragraphs.length === 1) return [text];

  // Pass 1: collapse consecutive numbered-list paragraphs into one block.
  // This prevents a 7-step list from being spread across 3 tiny bubbles that
  // each fall below the accordion threshold — they become one block of 7 steps.
  const isListItem = (p: string) => /^\d+[.)]\s/.test(p);
  const grouped: string[] = [];
  let listBlock: string | null = null;
  for (const para of paragraphs) {
    if (isListItem(para)) {
      listBlock = listBlock === null ? para : listBlock + "\n\n" + para;
    } else {
      if (listBlock !== null) { grouped.push(listBlock); listBlock = null; }
      grouped.push(para);
    }
  }
  if (listBlock !== null) grouped.push(listBlock);

  // Pass 2: merge short non-list paragraphs (≤ 600 chars combined) into one bubble.
  const bubbles: string[] = [];
  let current = "";
  for (const block of grouped) {
    if (!current) {
      current = block;
    } else if (!isListItem(block) && !isListItem(current) && current.length + block.length < 600) {
      current += "\n\n" + block;
    } else {
      bubbles.push(current);
      current = block;
    }
  }
  if (current) bubbles.push(current);
  return bubbles;
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
  if (items.some(i => i.includes(" - ") || i.includes(" – "))) return null;
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
      questionText = t;
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
  if (options.some(o => o.includes(" - ") || o.includes(" – "))) return null;
  const infoPattern = /^(a |an )|\bcalled\b|\bincluding\b|\bsuch as\b/i;
  if (options.filter(o => infoPattern.test(o)).length > options.length / 2) return null;
  const instructionPhrase = /\b(at the bottom|at the top|in the settings|in the menu|on the screen|from the list|from the dropdown|in the field|in the box|on the page|by clicking|by selecting)\b/i;
  if (options.some(o => instructionPhrase.test(o))) return null;

  // The message must contain a sentence ending in ? (Mewsy asked a clarifying question)
  let questionText: string | null = null;
  const clone = msgDiv.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("ul,ol").forEach(l => l.remove());
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

// ── Accordion for long step lists ─────────────────────────────────────────────
/*
 * Called after each bot message renders. Finds any <ol> with 5+ items and
 * wraps them in 2–3 collapsible accordion sections. The first section is
 * expanded; others start collapsed. Max-height is driven via JS so the
 * open/close animation works with dynamic content heights.
 */
export function initAccordions(container: HTMLElement): void {
  container.querySelectorAll("ol").forEach(ol => {
    const items = Array.from(ol.querySelectorAll("li"));
    if (items.length < 2) return; // single-item lists stay flat

    // 2–4 items → 1 collapsible section
    // 5–8 items → 2 sections
    // 9+  items → 3 sections
    const numGroups = items.length >= 9 ? 3 : items.length >= 5 ? 2 : 1;
    const groupSize = Math.ceil(items.length / numGroups);

    const accordion = document.createElement("div");
    accordion.className = "response-accordion";

    for (let g = 0; g < numGroups; g++) {
      const groupItems = items.slice(g * groupSize, (g + 1) * groupSize);
      if (groupItems.length === 0) continue;

      // Pull step numbers from the embedded <strong>N)</strong> badges
      const firstStrong = groupItems[0].querySelector("strong");
      const lastStrong  = groupItems[groupItems.length - 1].querySelector("strong");
      const firstNum = firstStrong ? parseInt(firstStrong.textContent ?? "") || g * groupSize + 1 : g * groupSize + 1;
      const lastNum  = lastStrong  ? parseInt(lastStrong.textContent ?? "")  || Math.min((g + 1) * groupSize, items.length) : Math.min((g + 1) * groupSize, items.length);
      const stepLabel = firstNum === lastNum ? `Step ${firstNum}` : `Steps ${firstNum}–${lastNum}`;

      // Title: up to 16 words of the first item's text (strip the leading "N) " badge)
      const rawText  = (groupItems[0].textContent ?? "").trim().replace(/^\d+[).]\s*/, "");
      const words    = rawText.split(/\s+/);
      const title    = words.slice(0, 16).join(" ");

      // ── DOM: section ──────────────────────────────────────────────
      const section = document.createElement("div");
      section.className = "accordion-section";

      const header = document.createElement("button");
      header.type = "button";
      header.className = "accordion-header" + (g === 0 ? " open" : "");
      header.innerHTML = `
        <span class="accordion-step-badge">${stepLabel}</span>
        <span class="accordion-title">${title}</span>
        <svg class="accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>`;

      const bodyEl = document.createElement("div");
      bodyEl.className = "accordion-body";

      const inner = document.createElement("div");
      inner.className = "accordion-body-inner";

      const newOl = document.createElement("ol");
      groupItems.forEach(li => newOl.appendChild(li.cloneNode(true)));
      inner.appendChild(newOl);
      bodyEl.appendChild(inner);

      // Set initial heights — first section open (no constraint), rest collapsed
      bodyEl.style.maxHeight = g === 0 ? "none" : "0";

      // ── Toggle handler ─────────────────────────────────────────────
      header.addEventListener("click", () => {
        const isOpen = header.classList.contains("open");
        if (isOpen) {
          // Closing: snapshot current height so transition has a start value
          bodyEl.style.maxHeight = bodyEl.scrollHeight + "px";
          // Double rAF ensures the browser has painted the snapshot before animating
          requestAnimationFrame(() => requestAnimationFrame(() => {
            bodyEl.style.maxHeight = "0";
          }));
          header.classList.remove("open");
        } else {
          // Opening: animate from 0 → scrollHeight, then release constraint
          bodyEl.style.maxHeight = bodyEl.scrollHeight + "px";
          bodyEl.addEventListener("transitionend", () => {
            if (header.classList.contains("open")) bodyEl.style.maxHeight = "none";
          }, { once: true });
          header.classList.add("open");
        }
      });

      section.appendChild(header);
      section.appendChild(bodyEl);
      accordion.appendChild(section);
    }

    ol.replaceWith(accordion);
  });
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
