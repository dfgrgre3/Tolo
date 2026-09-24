"use client";

/**
 * Cross-tab cache synchronisation — مزامنة الكاش بين تبويبات المتصفح
 *
 * When an identity transition (logout, account switch, forced session
 * reset) wipes the caches in ONE tab, every other open tab of the app
 * must wipe too — otherwise a stale tab can keep rendering the previous
 * user's data and, worse, issue writes under the new session with the
 * old in-memory assumptions.
 *
 * Transport: BroadcastChannel (same-origin, zero server cost). Tabs on
 * browsers without BroadcastChannel support (very old Safari) simply
 * miss the signal; their next navigation revalidates anyway.
 *
 * Loop safety: messages carry a random `originId`. A tab ignores its own
 * broadcast, and the receiving side clears WITHOUT re-broadcasting (the
 * `broadcast` option of `clearClientCaches`), so the signal fans out
 * exactly once.
 */

export const CACHE_SYNC_CHANNEL = "tolo-cache-sync-v1";

export interface CacheSyncMessage {
  type: "clear-all";
  /** Random id of the broadcasting tab — receivers ignore their own. */
  originId: string;
  /** Human/log-friendly reason ("logout", "account-switch", ...). */
  reason?: string;
}

/** Stable per-tab random id (not persisted — a reload is a new tab id). */
const TAB_ID =
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.BroadcastChannel === "function";
}

/**
 * Tells every other open tab to wipe its client caches. Fire-and-forget;
 * never throws (unsupported browsers are a silent no-op).
 */
export function broadcastCacheClear(reason?: string): void {
  if (!isSupported()) return;
  try {
    const channel = new BroadcastChannel(CACHE_SYNC_CHANNEL);
    const message: CacheSyncMessage = { type: "clear-all", originId: TAB_ID, reason };
    channel.postMessage(message);
    channel.close();
  } catch {
    // BroadcastChannel can throw in locked-down contexts (disabled storage).
    // The local tab still cleared; other tabs converge on next navigation.
  }
}

/**
 * Registers a handler invoked when ANOTHER tab broadcasts a cache clear.
 * Returns an unsubscribe function. Typically wired once near the root
 * provider with `() => clearClientCaches({ queryClient, broadcast: false })`.
 */
export function onCacheClearBroadcast(
  handler: (reason?: string) => void,
): () => void {
  if (!isSupported()) return () => undefined;

  const channel = new BroadcastChannel(CACHE_SYNC_CHANNEL);
  const listener = (event: MessageEvent<CacheSyncMessage>) => {
    const data = event.data;
    if (!data || data.type !== "clear-all") return;
    if (data.originId === TAB_ID) return; // our own echo
    handler(data.reason);
  };
  channel.addEventListener("message", listener);

  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
