import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import config from '../config.js';
import { cleanContent, generateMetadata } from '../pipeline/cleanup.js';
import { upsertEntry } from '../pipeline/manifest.js';
import { sha256 } from '../utils/hash.js';
import { slugify } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev';

/**
 * Scrapes a single URL with Firecrawl, then splits the result by H2 headings (## ).
 * Each section is saved as its own file under knowledge/website/<id>/<slug>.md.
 *
 * This is useful for pages that render all content in one request (e.g. JS tab pages)
 * but contain logically separate sections that benefit from individual routing.
 *
 * Skips unchanged sections (by content hash) unless forceSync is true.
 */
export async function scrapeStaticSplit(page, forceSync, existingEntries) {
  const { id, label, url } = page;
  const outDir = join(process.cwd(), config.knowledgeDir, 'website', id);

  // Step 1: Scrape the full page
  let rawMarkdown;
  try {
    const res = await axios.post(
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

  // Step 2: Split by H2 headings
  const sections = splitByH2(rawMarkdown);
  if (sections.length === 0) {
    logger.warn(`static-split "${label}": no ## sections found — skipping`);
    return;
  }
  logger.info(`static-split "${label}": found ${sections.length} sections`);

  // Step 3: Save each section
  for (const { heading, content: sectionContent } of sections) {
    const slug = slugify(heading);
    const sectionSlug = `${id}/${slug}`;
    const outPath = join(outDir, `${slug}.md`);
    const relPath = `${config.knowledgeDir}/website/${id}/${slug}.md`;

    const hash = sha256(sectionContent);
    const existing = existingEntries[sectionSlug];
    if (!forceSync && existing?.content_hash === hash) {
      logger.info(`Unchanged: ${relPath} — skipping`);
      continue;
    }

    const { content, failed } = await cleanContent(sectionContent);
    if (failed) logger.warn(`Cleanup failed for section "${heading}" — saved raw content`);

    const { description, keywords } = await generateMetadata(content);

    try {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(outPath, content);
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
      logger.error(`Failed to save section "${heading}": ${saveErr.message} — skipping`);
    }
  }
}

/**
 * Splits a markdown string into sections by H2 headings (## ).
 * Returns an array of { heading, content } objects.
 * Skips any content before the first H2 (typically the H1 page title).
 */
function splitByH2(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentHeading = null;
  let currentLines = [];

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
