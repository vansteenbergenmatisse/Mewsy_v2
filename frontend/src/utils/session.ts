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
