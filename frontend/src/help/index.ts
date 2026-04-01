// ── Help module ───────────────────────────────────────────────────────────────
//
// Everything related to Help & Resources lives here.
// Import from this module — not from the individual files directly.
//
//   help-items.ts   ← panel list (translated titles, subtitles, icons)
//   help-content.ts ← article body text shown in the detail panel
// ─────────────────────────────────────────────────────────────────────────────

export type { HelpItem } from './help-items';
export { getHelpItems } from './help-items';

export type { HelpSection, HelpCta, HelpTopic } from './help-content';
export { helpTopicContent } from './help-content';
