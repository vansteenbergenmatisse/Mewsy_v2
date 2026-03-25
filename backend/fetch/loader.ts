/**
 * fetch/loader.ts
 *
 * Startup validation for the knowledge manifest.
 *
 * This file has one job: confirm that knowledge-manifest.json exists and is
 * valid JSON before the server starts accepting requests. If the manifest is
 * broken, every chat message will silently fail to load any documents — so
 * catching that at startup is much better than discovering it mid-conversation.
 *
 * It does NOT load any documents into memory. In the CAG architecture, all
 * document loading happens at query time inside agent.ts — this is just a
 * sanity check.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules by default — this reconstructs it
const __dirname  = dirname(fileURLToPath(import.meta.url));

// Path to the manifest — two levels up from backend/fetch/ to the project root,
// then into the knowledge/ directory
const INDEX_PATH = join(__dirname, '../../knowledge/knowledge-manifest.json');

function ts(): string {
  return new Date().toISOString();
}

// Shape of the parsed manifest
interface Manifest {
  pages?: Record<string, unknown>;
}

// Called once at startup by server.ts. Reads the manifest and logs how many
// knowledge files are registered. If the file is missing or malformed, logs
// an error but does not crash the server.
export async function loadAllDocuments(): Promise<void> {
  console.log(`[loader] ${ts()} verifying knowledge manifest`);
  try {
    const raw      = await readFile(INDEX_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as Manifest;

    const count = Object.keys(manifest.pages ?? {}).length;
    console.log(`[loader] ${ts()} manifest ok — ${count} knowledge file(s) registered`);
  } catch (err) {
    console.error(`[loader] ${ts()} manifest check failed: ${(err as Error).message}`);
  }
}
