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

// Reads Base context from URL params (set by mewsie-loader.js iframe).
// Returns null values for any params not present.
export function getBaseContext(): {
  baseUserId: string | null;
  accountingSoftware: string | null;
  tier: string | null;
  companyName: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    baseUserId: getBaseUserId(),
    accountingSoftware: params.get('as'),
    tier: params.get('tier'),
    companyName: params.get('company'),
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
