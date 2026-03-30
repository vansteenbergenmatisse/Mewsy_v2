import axios from 'axios';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import config from '../config.ts';
import { cleanContent, generateMetadata } from '../pipeline/cleanup.ts';
import { upsertEntry, deleteEntry, getScraperEntries } from '../pipeline/manifest.ts';
import { sha256 } from '../utils/hash.ts';
import { slugify } from '../utils/slugify.ts';
import { logger } from '../utils/logger.ts';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev';

// Shape of a fetch_sources.json static-split page entry
interface FetchPage {
  id: string;
  label: string;
  url: string;
  type: string;
}

// Shape of existing scraper entries passed in for hash comparison
interface ExistingEntry {
  content_hash?: string;
  slug?: string;
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
 * Scrapes a single URL with Firecrawl, cleans the full page first, then splits
 * the cleaned result by H2 headings (## ). Each section is saved as its own file
 * under knowledge/website/<id>/<slug>.md.
 *
 * Cleaning before splitting is critical for pages where Firecrawl returns raw content
 * without headings (e.g. JS tab pages) — the cleanup agent structures the content with
 * proper ## headings that the splitter can then use.
 *
 * Falls back to a single file if no ## sections are found even after cleanup.
 * Removes any stale section files from previous syncs that no longer exist.
 *
 * Skips unchanged sections (by content hash) unless forceSync is true.
 */
export async function scrapeStaticSplit(page: FetchPage, forceSync: boolean, existingEntries: Record<string, ExistingEntry>): Promise<void> {
  const { id, label, url } = page;
  const outDir = join(process.cwd(), config.knowledgeDir, 'website', id);

  // Step 1: Scrape the full page
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
    logger.error(`Firecrawl failed for static-split ${url} — skipping this run`);
    return;
  }

  // Step 2: Clean the whole page first — the cleanup agent structures raw content
  // into proper ## sections (e.g. one per integration tab on a JS-rendered page).
  const { content: cleanedPage, failed } = await cleanContent(rawMarkdown);
  if (failed) logger.warn(`Cleanup failed for ${url} — splitting raw content`);

  // Step 3: Split the cleaned content by H2 headings
  const sections = splitByH2(cleanedPage);

  if (sections.length === 0) {
    // Still no ## sections after cleanup — save as a single file
    logger.warn(`static-split "${label}": no ## sections found after cleanup — saving as single file`);
    const fallbackSlug = slugify(label);
    const fallbackSectionSlug = `${id}/${fallbackSlug}`;
    const fallbackPath = join(outDir, `${fallbackSlug}.md`);
    const fallbackRelPath = `${config.knowledgeDir}/website/${id}/${fallbackSlug}.md`;
    const hash = sha256(cleanedPage);
    const existing = existingEntries[fallbackSectionSlug];
    if (!forceSync && existing?.content_hash === hash) {
      logger.info(`Unchanged: ${fallbackRelPath} — skipping`);
      return;
    }
    const { description, keywords } = await generateMetadata(cleanedPage);
    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(fallbackPath, cleanedPage);
      logger.info(`Scraped (fallback): ${fallbackRelPath}`);
      upsertEntry(fallbackSectionSlug, {
        title: label,
        description,
        keywords,
        path: fallbackRelPath,
        source_url: url,
        source_type: 'website_split',
        source_parent_id: id,
        content_hash: hash,
      });
    } catch (saveErr) {
      logger.error(`Failed to save fallback "${label}": ${(saveErr as Error).message} — skipping`);
    }
    return;
  }

  logger.info(`static-split "${label}": found ${sections.length} sections`);

  // Step 4: Save each section
  const savedSlugs = new Set<string>();
  for (const { heading, content: sectionContent } of sections) {
    const slug = slugify(heading);
    const sectionSlug = `${id}/${slug}`;
    savedSlugs.add(sectionSlug);
    const outPath = join(outDir, `${slug}.md`);
    const relPath = `${config.knowledgeDir}/website/${id}/${slug}.md`;

    const hash = sha256(sectionContent);
    const existing = existingEntries[sectionSlug];
    if (!forceSync && existing?.content_hash === hash) {
      logger.info(`Unchanged: ${relPath} — skipping`);
      continue;
    }

    const { description, keywords } = await generateMetadata(sectionContent);

    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(outPath, sectionContent);
      logger.info(`Scraped: ${relPath}`);

      upsertEntry(sectionSlug, {
        title: heading,
        description,
        keywords,
        path: relPath,
        source_url: url,
        source_type: 'website_split',
        source_parent_id: id,
        content_hash: hash,
      });
    } catch (saveErr) {
      logger.error(`Failed to save section "${heading}": ${(saveErr as Error).message} — skipping`);
    }
  }

  // Step 5: Remove stale entries for this parent that are no longer in the current split
  // (e.g. the old single-file fallback, or sections that were renamed/removed)
  for (const entry of getScraperEntries()) {
    if (
      entry.source_parent_id === id &&
      entry.source_type === 'website_split' &&
      !savedSlugs.has(entry.slug)
    ) {
      const filePath = join(process.cwd(), entry.path);
      if (existsSync(filePath)) unlinkSync(filePath);
      deleteEntry(entry.slug);
      logger.info(`Removed stale: ${entry.path}`);
    }
  }
}

/**
 * Splits a markdown string into sections by H2 headings (## ).
 * Returns an array of { heading, content } objects.
 * Skips any content before the first H2 (typically the H1 page title).
 */
function splitByH2(markdown: string): { heading: string; content: string }[] {
  const lines = markdown.split('\n');
  const sections: { heading: string; content: string }[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading !== null) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
      }
      currentHeading = line.replace(/^##\s+/, '').trim();
      currentLines = [line];
    } else if (currentHeading !== null) {
      currentLines.push(line);
    }
    // lines before the first ## are skipped
  }

  if (currentHeading !== null && currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
  }

  return sections;
}
