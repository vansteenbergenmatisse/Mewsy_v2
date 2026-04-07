import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config.ts';
import type { Manifest, ManifestFile, ManifestCategory } from '../../types/manifest.ts';

const manifestPath = join(process.cwd(), config.manifestPath);

// ── Exported types (re-exported for convenience) ──────────────────────────────
export type { Manifest, ManifestFile, ManifestCategory };

// Shape of a scraper entry (ManifestFile with slug attached, for internal use)
interface ScraperEntry extends ManifestFile {
  slug: string;
}

// ── Category helper ────────────────────────────────────────────────────────────

/**
 * Ensures a category entry exists in the manifest.
 * If it does not exist, adds a placeholder with a derived label.
 * Does NOT overwrite existing categories.
 */
export function ensureCategoryExists(manifest: Manifest, categoryId: string): void {
  const exists = manifest.categories.some(c => c.id === categoryId);
  if (!exists) {
    const parts = categoryId.split('/');
    const lastPart = parts[parts.length - 1];
    const label = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');

    manifest.categories.push({
      id: categoryId,
      label: label,
      description: '', // operator fills this in manually after reviewing
    });
  }
}

// ── Category derivation ────────────────────────────────────────────────────────

/**
 * Derives a category ID from a file path relative to project root.
 * "knowledge/website/mews-help-center/file.md" → "website/mews-help-center"
 * "knowledge/mews.md" → "mews.md" (root-level, first segment)
 */
export function deriveCategoryFromPath(filePath: string): string {
  const parts = filePath.replace(/^knowledge\//, '').split('/');
  if (parts.length >= 3) {
    return parts.slice(0, parts.length - 1).join('/');
  }
  return parts[0] ?? 'uncategorized';
}

// ── Manifest I/O ───────────────────────────────────────────────────────────────

/** Raw shape of an entry in the old { pages: {} } format */
interface LegacyManifestEntry {
  id?: string;
  title?: string;
  description?: string;
  keywords?: string[];
  path: string;
  source_url?: string;
  source_type?: string;
  source_folder_id?: string;
  source_parent_id?: string;
  content_hash?: string;
}

/** Raw shape of the old manifest format */
interface LegacyManifest {
  pages?: Record<string, LegacyManifestEntry>;
}

/**
 * Reads and parses the manifest file.
 * Handles migration from the old { pages: {} } format to the new { categories, files } format.
 * Also handles migration from flat arrays (legacy format before pages).
 */
export function readManifest(): Manifest {
  if (!existsSync(manifestPath)) return { categories: [], files: [] };
  try {
    const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return migrateManifest(raw);
  } catch {
    return { categories: [], files: [] };
  }
}

export function migrateManifest(raw: unknown): Manifest {
  // Already new format
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.categories) && Array.isArray(obj.files)) {
      return raw as Manifest;
    }

    // Old { pages: {} } format — migrate to new shape
    if (obj.pages && typeof obj.pages === 'object' && !Array.isArray(obj.pages)) {
      const legacy = raw as LegacyManifest;
      return {
        categories: [],
        files: Object.entries(legacy.pages ?? {}).map(([key, page]) => ({
          id: key,
          title: page.title ?? key,
          category: deriveCategoryFromPath(page.path ?? ''),
          description: page.description ?? '',
          keywords: page.keywords ?? [],
          trigger_questions: [],
          path: page.path ?? '',
          source_url: page.source_url,
          source_type: page.source_type,
          source_folder_id: page.source_folder_id,
          source_parent_id: page.source_parent_id,
          content_hash: page.content_hash,
        })),
      };
    }
  }

  // Flat array legacy format
  if (Array.isArray(raw)) {
    return {
      categories: [],
      files: (raw as LegacyManifestEntry[]).map(entry => ({
        id: String(entry.id ?? ''),
        title: entry.title ?? '',
        category: deriveCategoryFromPath(entry.path ?? ''),
        description: entry.description ?? '',
        keywords: entry.keywords ?? [],
        trigger_questions: [],
        path: entry.path ?? '',
        source_url: entry.source_url,
        source_type: entry.source_type,
        source_folder_id: entry.source_folder_id,
        source_parent_id: entry.source_parent_id,
        content_hash: entry.content_hash,
      })),
    };
  }

  return { categories: [], files: [] };
}

export function writeManifest(manifest: Manifest): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Validates that a manifest file entry has all required fields.
 * Throws a clear error if anything is missing.
 */
function validateEntry(slug: string, entry: Partial<ManifestFile>): void {
  const required = ['title', 'description', 'keywords', 'path'] as const;
  for (const field of required) {
    if (!entry[field]) {
      throw new Error(`Manifest entry "${slug}" is missing required field: "${field}"`);
    }
  }
  if (!Array.isArray(entry.keywords)) {
    throw new Error(`Manifest entry "${slug}": keywords must be an array`);
  }
}

/**
 * Add or update a scraper-managed manifest entry.
 * Automatically derives category from path, calls ensureCategoryExists,
 * and stamps trigger_questions/sections with safe defaults if not provided.
 */
export function upsertEntry(slug: string, entry: Partial<ManifestFile>): void {
  validateEntry(slug, entry);
  const manifest = readManifest();

  const category = deriveCategoryFromPath(entry.path ?? '');
  ensureCategoryExists(manifest, category);

  const existing = manifest.files.findIndex(f => f.id === slug);
  const updated: ManifestFile = {
    id: slug,
    title: entry.title!,
    category,
    description: entry.description!,
    keywords: entry.keywords!,
    trigger_questions: entry.trigger_questions ?? [],
    path: entry.path!,
    source_url: entry.source_url,
    source_type: entry.source_type,
    source_folder_id: entry.source_folder_id,
    source_parent_id: entry.source_parent_id,
    content_hash: entry.content_hash,
  };

  if (existing >= 0) {
    manifest.files[existing] = updated;
  } else {
    manifest.files.push(updated);
  }

  writeManifest(manifest);
}

/**
 * Delete a scraper-managed entry. Will NOT delete manually-maintained entries
 * (those without a source_type field).
 * Returns true if deleted, false if the entry was manual or didn't exist.
 */
export function deleteEntry(slug: string): boolean {
  const manifest = readManifest();
  const idx = manifest.files.findIndex(f => f.id === slug);
  if (idx < 0) return false;
  const existing = manifest.files[idx];
  if (!existing.source_type) return false;
  manifest.files.splice(idx, 1);
  writeManifest(manifest);
  return true;
}

/**
 * Returns all scraper-managed entries (those with a source_type field)
 * as an array of { slug, ...fields } objects.
 */
export function getScraperEntries(): ScraperEntry[] {
  const manifest = readManifest();
  return manifest.files
    .filter(f => f.source_type)
    .map(f => ({ ...f, slug: f.id }));
}
