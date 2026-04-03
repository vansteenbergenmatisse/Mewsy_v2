/**
 * enrich.ts
 *
 * LLM-powered manifest enrichment — called at the end of every sync run.
 *
 * Three enrichment passes (in order, cheapest first):
 *
 *   1. Sections  (no API) — re-parse every file's ## headings from disk.
 *      Always runs. Keeps sections in sync with the current markdown content.
 *
 *   2. Trigger questions  (Haiku) — generate 5 natural user questions per file.
 *      Only runs for files whose trigger_questions array is empty.
 *      Preserves any manually written questions.
 *
 *   3. Category descriptions  (Haiku) — write a 10-15 word description of each
 *      category based on the titles and descriptions of its files.
 *      Only runs for categories whose description field is empty.
 *      Preserves any manually written descriptions.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { callHaiku } from '../../utils/haiku.ts';
import { readManifest, writeManifest, enrichSections } from './manifest.ts';
import type { ManifestCategory, ManifestFile } from '../../types/manifest.ts';

// ── Trigger questions ─────────────────────────────────────────────────────────

/**
 * Asks Haiku to write 5 natural user questions that the given article answers.
 * Returns an empty array on any error so the caller can safely skip.
 */
export async function generateTriggerQuestions(title: string, content: string): Promise<string[]> {
  const excerpt = content.slice(0, 2000);

  const prompt = `You are a knowledge base assistant. Given this article, write exactly 5 short questions that a user might type in a chat to find this article.

Article title: "${title}"
Article excerpt:
${excerpt}

Rules:
- Each question must be specific to the article content, not generic
- Write questions as a real user would type them (natural, concise)
- Do NOT include yes/no questions

Return ONLY a JSON array of 5 strings: ["question 1", "question 2", "question 3", "question 4", "question 5"]
No markdown, no explanation, only the JSON array.`;

  try {
    const response = await callHaiku(prompt);
    const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0 && (parsed as unknown[]).every(q => typeof q === 'string')) {
      return (parsed as string[]).slice(0, 6);
    }
  } catch { /* fall through */ }
  return [];
}

// ── Category descriptions ─────────────────────────────────────────────────────

/**
 * Asks Haiku to write a 10-15 word description of a category based on its files.
 * Returns an empty string on any error so the caller can safely skip.
 */
export async function generateCategoryDescription(
  cat: ManifestCategory,
  files: ManifestFile[]
): Promise<string> {
  const fileList = files
    .slice(0, 12)
    .map(f => `- ${f.title}: ${f.description}`)
    .join('\n');

  const prompt = `Write a 10-15 word description of a knowledge base category named "${cat.label}" that contains these articles:

${fileList}

The description must tell a routing AI what types of user questions this category can answer.
Be specific. Do not use generic phrases like "various topics" or "information about".
Return ONLY the description text. No quotes. No JSON. No full stop at the end.`;

  try {
    const response = await callHaiku(prompt);
    return response.trim().replace(/^["']|["']$/g, '').replace(/\.$/, '').slice(0, 200);
  } catch {
    return '';
  }
}

// ── Main enrichment entry point ───────────────────────────────────────────────

/**
 * Reads the manifest, runs all three enrichment passes, and writes back if
 * anything changed. Called automatically at the end of every sync run.
 */
export async function enrichManifest(): Promise<void> {
  const manifest = readManifest();
  let changed = false;

  // Pass 1: sections — always refresh from disk (no API, cheap, deterministic)
  if (enrichSections(manifest)) {
    changed = true;
    console.log('[enrich] sections refreshed');
  }

  // Pass 2: trigger_questions — only for files with empty arrays
  const needsQuestions = manifest.files.filter(f => f.trigger_questions.length === 0);
  if (needsQuestions.length > 0) {
    console.log(`[enrich] generating trigger_questions for ${needsQuestions.length} file(s)...`);
    for (const file of needsQuestions) {
      try {
        const content = readFileSync(join(process.cwd(), file.path), 'utf-8');
        const questions = await generateTriggerQuestions(file.title, content);
        if (questions.length > 0) {
          file.trigger_questions = questions;
          changed = true;
          console.log(`[enrich]   trigger_questions → ${file.id}`);
        }
      } catch { /* skip unreadable files */ }
    }
  }

  // Pass 3: category descriptions — only for categories with empty description
  const needsDesc = manifest.categories.filter(c => !c.description.trim());
  if (needsDesc.length > 0) {
    console.log(`[enrich] generating descriptions for ${needsDesc.length} category/categories...`);
    for (const cat of needsDesc) {
      const filesInCat = manifest.files.filter(f => f.category === cat.id);
      if (filesInCat.length === 0) continue;
      try {
        const description = await generateCategoryDescription(cat, filesInCat);
        if (description) {
          cat.description = description;
          changed = true;
          console.log(`[enrich]   description → ${cat.id}`);
        }
      } catch { /* skip */ }
    }
  }

  if (changed) {
    writeManifest(manifest);
    console.log('[enrich] manifest updated');
  } else {
    console.log('[enrich] manifest already up to date — nothing to write');
  }
}
