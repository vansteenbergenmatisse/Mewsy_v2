/**
 * config.js — Scraper configuration
 *
 * All non-secret config lives here. Change cleanupModel to switch AI models.
 * All secrets (API keys, credentials) must come from .env — never hardcode them here.
 */

export default {
  // AI model used for the cleanup agent and description generation
  cleanupModel: 'claude-sonnet-4-6',

  // Paths (relative to project root, i.e. where you run `node` from)
  knowledgeDir: 'knowledge',
  manifestPath: 'knowledge/knowledge-manifest.json',
  fetchSourcesPath: 'knowledge/fetch_sources.json',
  logPath: 'knowledge/sync.log',
  cleanupPromptPath: 'backend/scraper/prompts/cleanup.txt',

  // How many links deep multi-article scrapers follow (1 = index page + article pages only)
  multiArticleMaxDepth: 1,

  // Milliseconds to wait between Firecrawl requests to avoid rate-limiting
  requestDelayMs: 500,
};
