import { createHash } from 'crypto';

/**
 * Returns the SHA-256 hex digest of a string.
 * Used to detect whether a page's content has changed since the last sync.
 */
export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}
