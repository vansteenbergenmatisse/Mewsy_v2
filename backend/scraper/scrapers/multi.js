import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';
import { cleanContent, generateMetadata } from '../pipeline/cleanup.js';
import { upsertEntry } from '../pipeline/manifest.js';
import { sha256 } from '../utils/hash.js';
import { slugify } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function firecrawlScrape(url) {
  const res = await axios.post(
    `${FIRECRAWL_BASE}/v1/scrape`,
    { url, formats: ['markdown', 'links'] },
    {
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  );
  if (!res.data?.success) throw new Error('Firecrawl returned success: false');
  return res.data.data;
}

/**
 * Asks Claude to filter a raw link list down to actual article URLs.
 * Excludes navigation, footer, header, and UI links.
 * Returns an array of URL strings.
 */
const MAX_ARTICLES = 100; // hard cap to prevent scraping thousands of links

async function filterArticleLinks(links) {
  if (!links || links.length === 0) return [];
  try {
    const response = await client.messages.create({
      model: config.cleanupModel,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Given this list of links from a help center index page, return only the URLs that are actual article pages (not navigation, footer, header, or UI links). Return ONLY a JSON array of strings, nothing else.\n\n${JSON.stringify(links)}`,
      }],
    });
    const text = response.content[0].text.trim();
    // Strip code fences if present, then try to parse the whole response as JSON first
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: find the outermost JSON array using greedy match
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return links.slice(0, MAX_ARTICLES);
      parsed = JSON.parse(match[0]);
    }
    if (!Array.isArray(parsed)) return links.slice(0, MAX_ARTICLES);
    return parsed.slice(0, MAX_ARTICLES);
  } catch (err) {
    logger.warn(`Article link filtering failed: ${err.message} — using all links`);
    return links.slice(0, MAX_ARTICLES);
  }
}

/**
 * Scrapes a multi-article index page.
 *
 * Step 1: Scrape index URL to get all links
 * Step 2: Ask Claude to filter to article-only links
 * Step 3: Scrape each article individually, save to knowledge/website/<id>/<slug>.md
 *
 * Depth is always 1 — links inside articles are not followed.
 */
export async function scrapeMulti(page, forceSync, existingEntries) {
  const { id, label, url } = page;
  const outDir = join(process.cwd(), config.knowledgeDir, 'website', id);

  // Step 1: Scrape index page
  let indexData;
  try {
    indexData = await firecrawlScrape(url);
  } catch (err) {
    logger.error(`Firecrawl failed for multi-index ${url} — skipping this run`);
    return;
  }

  const rawLinks = indexData.links ?? [];

  // Step 2: Filter to article links
  const articleLinks = await filterArticleLinks(rawLinks);
  logger.info(`Multi scrape "${label}": found ${articleLinks.length} article links`);

  // Step 3: Scrape each article
  for (const articleUrl of articleLinks) {
    await new Promise(r => setTimeout(r, config.requestDelayMs));

    let articleData;
    try {
      articleData = await firecrawlScrape(articleUrl);
    } catch (err) {
      logger.error(`Firecrawl failed for ${articleUrl} — skipping this run`);
      continue;
    }

    const rawMarkdown = articleData.markdown ?? '';
    const title = articleData.metadata?.title ?? articleUrl;
    const slug = slugify(title);
    const articleSlug = `${id}/${slug}`;
    const outPath = join(outDir, `${slug}.md`);
    const relPath = `${config.knowledgeDir}/website/${id}/${slug}.md`;

    const hash = sha256(rawMarkdown);
    const existing = existingEntries[articleSlug];
    if (!forceSync && existing?.content_hash === hash) {
      logger.info(`Unchanged: ${relPath} — skipping`);
      continue;
    }

    const { content, failed } = await cleanContent(rawMarkdown);
    if (failed) logger.warn(`Cleanup failed for ${articleUrl} — saved raw content`);

    const { description, keywords } = await generateMetadata(content);

    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, content);
    logger.info(`Scraped: ${relPath}`);

    upsertEntry(articleSlug, {
      title,
      description,
      keywords,
      path: relPath,
      source_url: articleUrl,
      source_type: 'website_multi',
      source_parent_id: id,
      content_hash: hash,
    });
  }
}
