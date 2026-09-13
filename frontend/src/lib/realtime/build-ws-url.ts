/**
 * Single place for browser WebSocket URL to `/api/ws` (notifications + future live payloads).
 * Set `NEXT_PUBLIC_WS_HOST` (e.g. `localhost:3000`) if the WS entry is not the page host.
 *
 * The caller's identity is derived server-side from the HttpOnly access_token
 * cookie. Credentials are deliberately absent from the URL.
 */
export function buildAppUserWebSocketUrl(): string {
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

  return `${wsProtocol}//${host}/api/v1/ws`;
}
