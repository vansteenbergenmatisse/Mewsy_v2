/**
 * tools.ts — Normalize a Base-supplied accountingSoftware string into a clean
 * tool list.
 *
 * Base hands Mewsie the user's integration tool(s) as a comma-separated string
 * (e.g. "QuickBooks", or "Xero, DATEV"). This helper:
 *   - trims each entry
 *   - drops empties — so a degenerate value (" ", ",", ", ") collapses to []
 *
 * Centralized so the live-context pre-fill and the DB pre-fill in agent.ts parse
 * identically, and so a whitespace-only value can never be turned into a
 * one-element array of blanks (which would leave context.tools "non-empty" yet
 * useless, and silently re-trigger the "which integration?" question).
 */
export function parseTools(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
