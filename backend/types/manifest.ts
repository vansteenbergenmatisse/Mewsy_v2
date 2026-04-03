// Shared manifest types used by agent.ts, scraper, and tests.

export interface ManifestSection {
  id: string;         // slug: "gl-mapping-steps"
  heading: string;    // original text: "GL mapping steps"
  line_start: number; // 1-indexed line number of the ## heading
}

export interface ManifestFile {
  id: string;
  title: string;
  category: string;             // matches a ManifestCategory.id
  description: string;          // max 15 words, noun phrases
  keywords: string[];           // 5–8 unique discriminating terms
  trigger_questions: string[];  // exactly 4 phrasings
  sections: ManifestSection[];  // empty array if no ## headings
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
