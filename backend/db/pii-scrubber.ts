/**
 * pii-scrubber.ts — Regex-based PII removal before DB writes.
 * Called by TurnBuffer.flush() on every message content_raw.
 */

// Order matters: more specific patterns (IBAN, credit card) must run before
// the broad phone pattern to prevent false matches.
const PII_PATTERNS: { name: string; pattern: RegExp; replacement: string }[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'iban',
    pattern: /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9\s]{0,20}\b/g,
    replacement: '[IBAN_REDACTED]',
  },
  {
    name: 'credit_card',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g,
    replacement: '[CARD_REDACTED]',
  },
  {
    name: 'phone_international',
    pattern: /\+\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    replacement: '[PHONE_REDACTED]',
  },
];

export function scrubPII(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
