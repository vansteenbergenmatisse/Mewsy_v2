import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config.ts';

const manifestPath = join(process.cwd(), config.manifestPath);

// Shape of a single manifest entry
interface ManifestEntry {
  title: string;
  description: string;
  keywords: string[];
  path: string;
  source_url?: string;
  source_type?: string;
  source_folder_id?: string;
  source_parent_id?: string;
  content_hash?: string;
}

// Shape of the manifest file
interface Manifest {
  pages: Record<string, ManifestEntry>;
}

// Shape of a scraper entry (manifest entry with slug attached)
interface ScraperEntry extends ManifestEntry {
  slug: string;
}

export function readManifest(): Manifest {
  if (!existsSync(manifestPath)) return { pages: {} };
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  } catch {
    return { pages: {} };
  }
}

export function writeManifest(manifest: Manifest): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Validates that a manifest entry has all required fields.
 * Throws a clear error if anything is missing — catches problems at write time.
 */
function validateEntry(slug: string, entry: Partial<ManifestEntry>): void {
  const required = ['title', 'description', 'keywords', 'path'] as const;
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
export function upsertEntry(slug: string, entry: Partial<ManifestEntry>): void {
  validateEntry(slug, entry);
  const manifest = readManifest();
  manifest.pages[slug] = entry as ManifestEntry;
  writeManifest(manifest);
}

/**
 * Delete a scraper-managed entry. Will NOT delete manually-maintained entries
 * (those without a source_type field).
 * Returns true if deleted, false if the entry was manual or didn't exist.
 */
export function deleteEntry(slug: string): boolean {
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
export function getScraperEntries(): ScraperEntry[] {
  const manifest = readManifest();
  return Object.entries(manifest.pages)
    .filter(([, v]) => v.source_type)
    .map(([slug, v]) => ({ slug, ...v }));
}
