import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import TurndownService from 'turndown';
import config from '../config.ts';
import { cleanContent, generateMetadata } from '../pipeline/cleanup.ts';
import { upsertEntry } from '../pipeline/manifest.ts';
import { sha256 } from '../utils/hash.ts';
import { slugify } from '../utils/slugify.ts';
import { logger } from '../utils/logger.ts';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

// Shape of a Confluence folder from fetch_sources.json
interface ConfluenceFolder {
  id: string;
  label: string;
}

// Shape of an existing scraper entry for hash comparison
interface ExistingEntry {
  content_hash?: string;
  slug?: string;
}

// Shape of a Confluence page from the API response
interface ConfluencePage {
  id: string;
  title: string;
  body?: {
    view?: {
      value?: string;
    };
  };
}

// Shape of the Confluence API paginated response
interface ConfluencePagedResponse {
  results: ConfluencePage[];
  _links?: { next?: string };
}

/**
 * Pre-processes Confluence Storage Format XML before handing to turndown.
 * Converts the most common Confluence macros to plain HTML equivalents.
 */
function preprocessConfluenceContent(html: string): string {
  return html
    // Code blocks: <ac:structured-macro ac:name="code">...<ac:plain-text-body><![CDATA[...]]></ac:plain-text-body>...
    .replace(
      /<ac:structured-macro[^>]*ac:name="code"[^>]*>[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/gi,
      (_, code: string) => `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    )
    // Note / info / warning / tip panels → blockquotes
    .replace(
      /<ac:structured-macro[^>]*ac:name="(?:note|info|warning|tip)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
      (_, body: string) => {
        const inner = body.replace(/<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>/i, '$1');
        return `<blockquote>${inner}</blockquote>`;
      }
    )
    // Strip all remaining Confluence and Resource Identifier tags
    .replace(/<\/?ac:[^>]*>/gi, '')
    .replace(/<\/?ri:[^>]*>/gi, '');
}

/**
 * Creates an authenticated axios config for the Confluence REST API.
 * Reads credentials from environment variables — never hardcoded.
 */
function confluenceAxiosHeaders(): Record<string, string> {
  const { CONFLUENCE_EMAIL, CONFLUENCE_TOKEN } = process.env;
  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_TOKEN}`).toString('base64');
  return { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
}

/**
 * Fetches all direct child pages of a given page ID, handling pagination.
 * Uses body.view (rendered HTML) which is far easier to convert than storage format XML.
 */
async function getChildPages(pageId: string): Promise<ConfluencePage[]> {
  const baseURL = process.env.CONFLUENCE_BASE_URL;
  const headers = confluenceAxiosHeaders();
  const pages: ConfluencePage[] = [];
  let start = 0;
  const limit = 50;

  while (true) {
    const res = await axios.get<ConfluencePagedResponse>(
      `${baseURL}/wiki/rest/api/content/${pageId}/child/page`,
      {
        headers,
        params: { expand: 'body.view,title', limit, start },
      }
    );
    pages.push(...res.data.results);
    if (!res.data._links?.next) break;
    start += limit;
  }

  return pages;
}

/**
 * Processes one Confluence page: converts HTML → markdown, runs cleanup,
 * saves to disk, updates the manifest, then recurses into child pages.
 *
 * pathSegments: slug array from the folder root to this page's parent
 * folderSlug: slugified label of the top-level Confluence folder
 * folderId: raw Confluence folder ID, stored in manifest for deletion tracking
 */
const MAX_CONFLUENCE_DEPTH = 10;

async function processPage(
  page: ConfluencePage,
  pathSegments: string[],
  folderSlug: string,
  folderId: string,
  forceSync: boolean,
  existingEntries: Record<string, ExistingEntry>,
  depth = 0
): Promise<void> {
  if (depth > MAX_CONFLUENCE_DEPTH) {
    logger.warn(`Confluence: max depth (${MAX_CONFLUENCE_DEPTH}) reached at "${page.title}" — skipping subtree`);
    return;
  }
  const title = page.title;
  const slug = slugify(title);
  const allSegments = [...pathSegments, slug];

  const relDir = [config.knowledgeDir, 'confluence', folderSlug, ...pathSegments].join('/');
  const relPath = `${relDir}/${slug}.md`;
  const outPath = join(process.cwd(), relPath);
  const entryKey = `confluence/${folderSlug}/${allSegments.join('/')}`;

  // Convert Confluence HTML to markdown
  const rawHTML = page.body?.view?.value ?? '';
  const processedHTML = preprocessConfluenceContent(rawHTML);
  const rawMarkdown = `# ${title}\n\n${turndown.turndown(processedHTML)}`;

  const hash = sha256(rawMarkdown);
  const existing = existingEntries[entryKey];

  if (!forceSync && existing?.content_hash === hash) {
    logger.info(`Unchanged: ${relPath} — skipping`);
  } else {
    const { content, failed } = await cleanContent(rawMarkdown);
    if (failed) logger.warn(`Cleanup failed for Confluence page "${title}" — saved raw content`);

    const { description, keywords } = await generateMetadata(content);

    mkdirSync(join(process.cwd(), relDir), { recursive: true });
    writeFileSync(outPath, content);
    logger.info(`Scraped: ${relPath}`);

    upsertEntry(entryKey, {
      title,
      description,
      keywords,
      path: relPath,
      source_url: `${process.env.CONFLUENCE_BASE_URL}/wiki/pages/viewpage.action?pageId=${page.id}`,
      source_type: 'confluence',
      source_folder_id: folderId,
      content_hash: hash,
    });
  }

  // Recurse into child pages
  let children: ConfluencePage[];
  try {
    children = await getChildPages(page.id);
  } catch (err) {
    logger.error(`Failed to get children of Confluence page "${title}" (${page.id}): ${(err as Error).message}`);
    return;
  }

  for (const child of children) {
    await new Promise(r => setTimeout(r, config.requestDelayMs));
    await processPage(child, allSegments, folderSlug, folderId, forceSync, existingEntries, depth + 1);
  }
}

/**
 * Entry point for one Confluence folder sync.
 * Walks the full page tree and mirrors it under knowledge/confluence/<folder-slug>/.
 */
export async function scrapeConfluence(folder: ConfluenceFolder, forceSync: boolean, existingEntries: Record<string, ExistingEntry>): Promise<void> {
  const { id, label } = folder;
  const folderSlug = slugify(label);

  logger.info(`Confluence sync: starting folder "${label}" (${id})`);

  let topLevelPages: ConfluencePage[];
  try {
    topLevelPages = await getChildPages(id);
  } catch (err) {
    logger.error(`Failed to fetch Confluence folder ${id}: ${(err as Error).message}`);
    return;
  }

  for (const page of topLevelPages) {
    await new Promise(r => setTimeout(r, config.requestDelayMs));
    await processPage(page, [], folderSlug, id, forceSync, existingEntries);
  }

  logger.info(`Confluence sync: complete for folder "${label}"`);
}
