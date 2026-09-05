/**
 * Single place for browser WebSocket URL to `/api/v1/ws`.
 *
 * Authentication Architecture:
 * - Handshake relies on standard HttpOnly Secure session cookies (`access_token` / `__session`).
 * - Passing authentication credentials (like tokens) in the URL query string is insecure
 *   and avoided to prevent token leakage in server logs, browser histories, and proxy headers.
 * - `userId` is purely an optional client hint for logging / diagnostic verification,
 *   never trusted by the backend as an authoritative subject identity.
 *
 * Set `NEXT_PUBLIC_WS_HOST` (e.g. `localhost:8082`) if the WS entry is not the page host.
 */
export function buildAppUserWebSocketUrl(userId?: string, _token?: string): string {
  if (typeof window === "undefined") return "";
  
  // 1. If explicit NEXT_PUBLIC_WS_HOST is set, use it
  let host = process.env.NEXT_PUBLIC_WS_HOST?.trim();
  let wsProtocol = "";

  if (!host) {
    // 2. Fallback: Parse NEXT_PUBLIC_API_URL if set to connect directly to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        host = url.host; // e.g. "localhost:8082" or "backend-gamma-lyart.vercel.app"
        wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      } catch {
        // ignore invalid URL
      }
    }
  }

  // 3. Fallback to current window host
  if (!host) {
    host = window.location.host;
  }

  if (!wsProtocol) {
    const isProduction = process.env.NODE_ENV === 'production';
    wsProtocol = isProduction || window.location.protocol === "https:" ? "wss:" : "ws:";
  }

  // Ensure host doesn't end with slash
  host = host.replace(/\/+$/, "");

  // Base WebSocket URL. Credentials are exchanged automatically via HttpOnly Cookie.
  let url = `${wsProtocol}//${host}/api/v1/ws`;
  if (userId) {
    // Optional non-authoritative hint
    url += `?userId=${encodeURIComponent(userId)}`;
  }
  return url;
}
