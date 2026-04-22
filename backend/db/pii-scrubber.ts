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
    // Match 13-19 digit card numbers (Visa, MC, Amex, etc.) with optional separators.
    // Requires word boundaries to avoid matching product codes like "V2024-1234-5678-9012".
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g,
    replacement: '[CARD_REDACTED]',
  },
  {
    name: 'phone_international',
    // International format: +31 6 12345678, +1 (555) 123-4567, +49.30.12345
    pattern: /\+\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    name: 'phone_local',
    // Local formats: (555) 123-4567, 06-12345678, 030 1234567
    // Requires 7+ digits total to avoid matching short product codes.
    pattern: /\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,5}/g,
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
