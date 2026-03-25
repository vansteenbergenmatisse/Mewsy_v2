import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import config from '../config.ts';
import { cleanContent, generateMetadata } from '../pipeline/cleanup.ts';
import { upsertEntry } from '../pipeline/manifest.ts';
import { sha256 } from '../utils/hash.ts';
import { logger } from '../utils/logger.ts';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev';

// Shape of a fetch_sources.json single page entry
interface FetchPage {
  id: string;
  label: string;
  url: string;
  type: string;
}

// Shape returned by scrapeStatic
interface ScrapeResult {
  skipped: boolean;
}

// Shape of the Firecrawl API response data
interface FirecrawlData {
  markdown?: string;
}

interface FirecrawlResponse {
  success?: boolean;
  data?: FirecrawlData;
}

/**
 * Scrapes a single URL with Firecrawl and saves it to knowledge/website/<id>.md.
 *
 * Skips if content hash is unchanged (unless forceSync is true).
 * Returns { skipped: true } when nothing was written, { skipped: false } when saved.
 *
 * On Firecrawl failure: logs error, returns { skipped: true } — leaves existing file intact.
 */
export async function scrapeStatic(page: FetchPage, forceSync: boolean, existingHash: string | undefined): Promise<ScrapeResult> {
  const { id, label, url } = page;
  const outPath = join(process.cwd(), config.knowledgeDir, 'website', `${id}.md`);
  const relPath = `${config.knowledgeDir}/website/${id}.md`;

  let rawMarkdown: string;
  try {
    const res = await axios.post<FirecrawlResponse>(
      `${FIRECRAWL_BASE}/v1/scrape`,
      { url, formats: ['markdown'] },
      {
        headers: {
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      }
    );
    if (!res.data?.success) throw new Error('Firecrawl returned success: false');
    rawMarkdown = res.data.data?.markdown ?? '';
  } catch (err) {
    logger.error(`Firecrawl failed for ${url} — skipping this run`);
    return { skipped: true };
  }

  const hash = sha256(rawMarkdown);
  if (!forceSync && hash === existingHash) {
    logger.info(`Unchanged: ${relPath} — skipping`);
    return { skipped: true };
  }

  const { content, failed } = await cleanContent(rawMarkdown);
  if (failed) logger.warn(`Cleanup failed for ${url} — saved raw content`);

  const { description, keywords } = await generateMetadata(content);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content);
  logger.info(`Scraped: ${relPath}`);

  upsertEntry(id, {
    title: label,
    description,
    keywords,
    path: relPath,
    source_url: url,
    source_type: 'website_single',
    content_hash: hash,
  });

  return { skipped: false };
}
