/**
 * Converts a human-readable title into a URL-safe, filesystem-safe slug.
 *
 * Rules:
 *   - Lowercase + hyphens only
 *   - Special characters stripped
 *   - Segments that are purely numeric are removed (e.g. Confluence IDs)
 *   - Maximum 80 characters
 *   - Never returns a purely numeric string
 */
export function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip special characters
    .trim()
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');        // strip leading/trailing hyphens

  // Remove purely numeric segments (e.g. "1320910850-information" → "information")
  const segments = slug.split('-').filter(s => !/^\d+$/.test(s));

  // Never return an empty or numeric-only slug
  if (segments.length === 0) return 'page';

  return segments.join('-');
}
