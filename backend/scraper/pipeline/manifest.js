import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config.js';

const manifestPath = join(process.cwd(), config.manifestPath);

export function readManifest() {
  if (!existsSync(manifestPath)) return { pages: {} };
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return { pages: {} };
  }
}

export function writeManifest(manifest) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Validates that a manifest entry has all required fields.
 * Throws a clear error if anything is missing — catches problems at write time.
 */
function validateEntry(slug, entry) {
  const required = ['title', 'description', 'keywords', 'path'];
  for (const field of required) {
    if (!entry[field]) {
      throw new Error(`Manifest entry "${slug}" is missing required field: "${field}"`);
    }
  }
  if (!Array.isArray(entry.keywords) || entry.keywords.length < 2) {
    throw new Error(`Manifest entry "${slug}": keywords must be an array with at least 2 items`);
  }
}

/**
 * Add or update a scraper-managed manifest entry.
 * Never called for manually-maintained entries (those have no source_type).
 * Throws if required fields (title, description, keywords, path) are missing.
 */
export function upsertEntry(slug, entry) {
  validateEntry(slug, entry);
  const manifest = readManifest();
  manifest.pages[slug] = entry;
  writeManifest(manifest);
}

/**
 * Delete a scraper-managed entry. Will NOT delete manually-maintained entries
 * (those without a source_type field).
 * Returns true if deleted, false if the entry was manual or didn't exist.
 */
export function deleteEntry(slug) {
  const manifest = readManifest();
  const existing = manifest.pages[slug];
  if (!existing || !existing.source_type) return false;
  delete manifest.pages[slug];
  writeManifest(manifest);
  return true;
}

/**
 * Returns all scraper-managed entries (those with a source_type field)
 * as an array of { slug, ...fields } objects.
 */
export function getScraperEntries() {
  const manifest = readManifest();
  return Object.entries(manifest.pages)
    .filter(([, v]) => v.source_type)
    .map(([slug, v]) => ({ slug, ...v }));
}
