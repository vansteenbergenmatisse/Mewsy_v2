// Shared manifest types used by agent.ts, scraper, and tests.

export interface ManifestFile {
  id: string;
  title: string;
  category: string;             // matches a ManifestCategory.id
  description: string;          // max 15 words, noun phrases
  keywords: string[];           // 5–8 unique discriminating terms
  trigger_questions: string[];  // exactly 4 phrasings
  // User-language phrases checked in Stage 1 alongside keywords.
  // Written from the user's perspective (e.g. "won't sync", "books not matching").
  // Generated at doc-authoring time, not at runtime. Leave empty [] if not yet populated.
  synonyms?: string[];
  path: string;
  source_url?: string;
  source_type?: string;
  source_folder_id?: string;
  source_parent_id?: string;
  content_hash?: string;
}

export interface ManifestCategory {
  id: string;          // folder path relative to knowledge/ — e.g. "website/mews-help-center"
  label: string;       // human-readable — e.g. "Mews Help Center"
  description: string; // 10–15 words: what types of content live here
}

export interface Manifest {
  categories: ManifestCategory[];
  files: ManifestFile[];
}
