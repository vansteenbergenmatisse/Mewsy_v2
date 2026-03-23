/**
 * index.js — Scraper entry point and cron scheduler
 *
 * Two modes:
 *   node backend/scraper/index.js --force-sync   → full sync, then exit
 *   node backend/scraper/index.js                → start cron jobs, run forever
 *
 * Cron intervals are read from knowledge/fetch_sources.json at startup
 * (and re-read on every sync run so changes take effect without restart).
 */

import 'dotenv/config';
import cron from 'node-cron';
import { readFileSync, existsSync, unlinkSync, readdirSync, rmdirSync } from 'fs';
import { join } from 'path';
import config from './config.js';
import { scrapeStatic } from './scrapers/static.js';
import { scrapeMulti } from './scrapers/multi.js';
import { scrapeConfluence } from './scrapers/confluence.js';
import { getScraperEntries, deleteEntry } from './pipeline/manifest.js';
import { logger } from './utils/logger.js';

const forceSync = process.argv.includes('--force-sync');

// ── Helpers ───────────────────────────────────────────────────────────────────

function readFetchSources() {
  const path = join(process.cwd(), config.fetchSourcesPath);
  if (!existsSync(path)) {
    logger.warn('fetch_sources.json not found — nothing to sync');
    return { confluence: { syncIntervalMinutes: 60, folders: [] }, website: { syncIntervalMinutes: 1440, pages: [] } };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Converts a minute-based interval into a node-cron expression.
 * Handles common cases: sub-hour, hourly, daily.
 */
function minutesToCron(minutes) {
  if (minutes < 60)  return `*/${Math.max(1, minutes)} * * * *`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`;
  }
  return '0 0 * * *'; // daily
}

// ── Deletion check ────────────────────────────────────────────────────────────

/**
 * Removes a file and then walks up its parent directories, pruning any that
 * are now empty. Stops at the knowledge/ root so it never deletes that folder.
 */
function deleteFileAndPruneEmptyDirs(filePath) {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  // Walk up and remove empty directories (but stop at knowledge/)
  const knowledgeRoot = join(process.cwd(), config.knowledgeDir);
  let dir = join(filePath, '..');
  while (dir !== knowledgeRoot && dir.startsWith(knowledgeRoot)) {
    try {
      const contents = readdirSync(dir);
      if (contents.length === 0) {
        rmdirSync(dir);
        dir = join(dir, '..');
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

/**
 * Compares scraper-managed manifest entries against the current fetch_sources.json.
 * Deletes .md files and manifest entries for any source that has been removed.
 * Also deletes any .md files found under knowledge/website/ or knowledge/confluence/
 * that have no manifest entry at all (orphan files left over from failed syncs).
 */
function runDeletionCheck(sources) {
  const scraperEntries = getScraperEntries();
  const manifestPaths = new Set(scraperEntries.map(e => e.path));

  // Build sets of currently configured source IDs
  const websiteSingleIds = new Set(
    (sources.website?.pages ?? []).filter(p => p.type === 'single').map(p => p.id)
  );
  const websiteMultiIds = new Set(
    (sources.website?.pages ?? []).filter(p => p.type === 'multi').map(p => p.id)
  );
  const confluenceFolderIds = new Set(
    (sources.confluence?.folders ?? []).map(f => f.id)
  );

  // Pass 1: delete manifest entries (and their files) that no longer have a source
  for (const entry of scraperEntries) {
    let shouldDelete = false;

    if (entry.source_type === 'website_single') {
      shouldDelete = !websiteSingleIds.has(entry.slug);
    } else if (entry.source_type === 'website_multi') {
      // IDs may contain slashes (e.g. "omniboost-help-center/tips-and-tricks"),
      // so check whether any configured multi-ID is a prefix of this slug.
      shouldDelete = !Array.from(websiteMultiIds).some(id => entry.slug.startsWith(id + '/') || entry.slug === id);
    } else if (entry.source_type === 'confluence') {
      shouldDelete = !!entry.source_folder_id && !confluenceFolderIds.has(entry.source_folder_id);
    }

    if (shouldDelete) {
      const filePath = join(process.cwd(), entry.path);
      deleteFileAndPruneEmptyDirs(filePath);
      logger.info(`Deleted: ${entry.path}`);
      deleteEntry(entry.slug);
    }
  }

}

// ── Main sync ─────────────────────────────────────────────────────────────────

async function runSync(type) {
  logger.info(`Sync started: ${type}`);

  // Re-read fetch_sources.json on every run so config changes take effect without restart
  const sources = readFetchSources();

  // Build a lookup of existing scraper entries by slug for hash comparison
  const existingEntries = {};
  for (const entry of getScraperEntries()) {
    existingEntries[entry.slug] = entry;
  }

  try {
    if (type === 'website') {
      for (const page of (sources.website?.pages ?? [])) {
        await new Promise(r => setTimeout(r, config.requestDelayMs));
        if (page.type === 'single') {
          await scrapeStatic(page, forceSync, existingEntries[page.id]?.content_hash);
        } else if (page.type === 'multi') {
          await scrapeMulti(page, forceSync, existingEntries);
        } else {
          logger.warn(`Unknown page type "${page.type}" for "${page.id}" — skipping`);
        }
      }
    } else if (type === 'confluence') {
      for (const folder of (sources.confluence?.folders ?? [])) {
        await scrapeConfluence(folder, forceSync, existingEntries);
      }
    }
  } catch (err) {
    logger.error(`Sync failed (${type}): ${err.message}`);
  } finally {
    // Always run deletion check — even if scraping errored — so removed sources
    // are cleaned up regardless of whether the scrape step succeeded.
    runDeletionCheck(sources);
    logger.info(`Sync complete: ${type}`);
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────

if (forceSync) {
  // --force-sync: run everything immediately and exit
  logger.info('Force sync mode — running full sync now');
  (async () => {
    await runSync('website');
    await runSync('confluence');
    logger.info('Force sync complete');
    process.exit(0);
  })();
} else {
  // Schedule mode: read intervals from fetch_sources.json and start cron jobs
  const sources = readFetchSources();
  const websiteInterval    = sources.website?.syncIntervalMinutes    ?? 1440;
  const confluenceInterval = sources.confluence?.syncIntervalMinutes ?? 60;

  logger.info(`Scheduling website sync every ${websiteInterval} minutes`);
  logger.info(`Scheduling Confluence sync every ${confluenceInterval} minutes`);

  cron.schedule(minutesToCron(websiteInterval),    () => runSync('website'));
  cron.schedule(minutesToCron(confluenceInterval), () => runSync('confluence'));

  logger.info('Scraper scheduler started — waiting for cron triggers');
}
