// Relative URL — works on localhost and any production domain without changes.
export const BACKEND_URL = "/webhook/chat";

// Returns the Base user ID from URL params (iframe embed) or sessionStorage.
// When Mewsie is embedded in Base via an iframe, the loader script passes
// baseUserId as a URL param. We persist it to sessionStorage so it survives
// within the iframe session even if the URL is modified.
export function getBaseUserId(): string | null {
  // Check URL params first (initial iframe load)
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('baseUserId');
  if (fromUrl) {
    sessionStorage.setItem('Mewsie_base_user_id', fromUrl);
    return fromUrl;
  }
  // Fall back to previously stored value
  return sessionStorage.getItem('Mewsie_base_user_id');
}

// Reads Base context from URL params (set by mewsie-loader.js iframe), then
// persists each value to sessionStorage — exactly like getBaseUserId() does.
//
// Why persist: the loader only puts as/tier/company on the *initial* iframe URL.
// If the query string later changes (SPA navigation, an in-iframe reload after a
// backend restart or session TTL wipe), reading the URL fresh would return null
// and Mewsie would "forget" the integration and start asking "which tool?" again
// — even though baseUserId survived (it was persisted). Persisting all four keeps
// them in lockstep, so the backend pre-fill can re-populate context on any later
// message. URL value always wins when present; sessionStorage is the fallback.
export function getBaseContext(): {
  baseUserId: string | null;
  accountingSoftware: string | null;
  tier: string | null;
  companyName: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const persisted = (urlKey: string, storeKey: string): string | null => {
    const fromUrl = params.get(urlKey);
    if (fromUrl) {
      sessionStorage.setItem(storeKey, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(storeKey);
  };
  return {
    baseUserId: getBaseUserId(),
    accountingSoftware: persisted('as', 'Mewsie_as'),
    tier: persisted('tier', 'Mewsie_tier'),
    companyName: persisted('company', 'Mewsie_company'),
  };
}

// Returns a stable session ID for this browser tab, creating one if needed.
export function getSessionId(): string {
  let id = sessionStorage.getItem('Mewsie_session_id');
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('Mewsie_session_id', id);
  }
  return id;
}

// Returns a persistent browser token stored in localStorage.
// Survives tab close, browser restart — only cleared on explicit cache clear or incognito.
// Used for cross-session user identity linking.
export function getBrowserToken(): string {
  try {
    let token = localStorage.getItem('Mewsie_browser_token');
    if (!token) {
      token = 'bt_' + crypto.randomUUID();
      localStorage.setItem('Mewsie_browser_token', token);
    }
    return token;
  } catch {
    // localStorage blocked (e.g. by browser extension) — fall back to sessionStorage
    let token = sessionStorage.getItem('Mewsie_browser_token');
    if (!token) {
      token = 'bt_' + crypto.randomUUID();
      sessionStorage.setItem('Mewsie_browser_token', token);
    }
    return token;
  }
}
