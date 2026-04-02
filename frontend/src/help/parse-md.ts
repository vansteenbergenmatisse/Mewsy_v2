// ── Markdown parser for help-resources/*.md ──────────────────────────────────
//
// Parses a simple markdown format into a HelpTopic structure.
//
// Expected format:
//   ---
//   title: My Title
//   cta_title: CTA heading
//   cta_text: CTA description
//   cta_button: Button label
//   cta_message: Message sent to Mewsie when the button is clicked
//   ---
//
//   ## Section heading
//
//   Paragraph content here.
//
//   ## Section with a list
//
//   - Item one
//   - Item two
//
// Rules:
//   - Frontmatter is between the two `---` lines at the top.
//   - Each `## ` line starts a new section.
//   - If all non-empty lines in a section body start with `- `, it is a list.
//   - Otherwise the body is treated as a single content paragraph.
// ─────────────────────────────────────────────────────────────────────────────

import type { HelpTopic, HelpSection, HelpCta } from './help-content';

export function parseMd(raw: string): HelpTopic {
  const lines = raw.split('\n');

  // ── 1. Parse frontmatter ──────────────────────────────────────────────────
  const fm: Record<string, string> = {};
  let bodyStart = 0;

  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        bodyStart = i + 1;
        break;
      }
      const colonIdx = lines[i].indexOf(':');
      if (colonIdx > 0) {
        const key = lines[i].slice(0, colonIdx).trim();
        const value = lines[i].slice(colonIdx + 1).trim();
        fm[key] = value;
      }
    }
  }

  // ── 2. Split body into sections by `## ` headings ─────────────────────────
  const body = lines.slice(bodyStart).join('\n');
  const rawSections = body.split(/\n## /).filter(s => s.trim());

  const sections: HelpSection[] = rawSections.map(part => {
    const nlIdx = part.indexOf('\n');
    const heading = nlIdx >= 0 ? part.slice(0, nlIdx).trim() : part.trim();
    const content = nlIdx >= 0 ? part.slice(nlIdx + 1).trim() : '';

    const contentLines = content.split('\n').filter(l => l.trim() !== '');
    const isList = contentLines.length > 0 && contentLines.every(l => l.trim().startsWith('- '));

    if (isList) {
      return { heading, list: contentLines.map(l => l.trim().slice(2).trim()) };
    }
    return { heading, content };
  });

  // ── 3. Build CTA (optional) ───────────────────────────────────────────────
  const cta: HelpCta | undefined = fm.cta_title
    ? {
        title: fm.cta_title,
        text: fm.cta_text ?? '',
        button: fm.cta_button ?? '',
        message: fm.cta_message ?? '',
      }
    : undefined;

  return { title: fm.title ?? '', sections, cta };
}
