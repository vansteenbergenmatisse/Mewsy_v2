// Relative URL — works on localhost and any production domain without changes.
export const BACKEND_URL = "/webhook/chat";

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
