/**
 * Single place for browser WebSocket URL to `/api/ws` (notifications + future live payloads).
 * Set `NEXT_PUBLIC_WS_HOST` (e.g. `localhost:3000`) if the WS entry is not the page host.
 */
export function buildAppUserWebSocketUrl(userId: string): string {
  if (typeof window === "undefined" || !userId) return "";
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_WS_HOST?.trim()) ||
    window.location.host;
  return `${wsProtocol}//${host}/api/ws?userId=${encodeURIComponent(userId)}`;
}
