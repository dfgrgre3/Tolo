/**
 * Pure hydration merge for server ↔ localStorage collections on /time.
 *
 * Policy (documented in docs/time-system-audit.md):
 *  - mutations are local-first: every change is already written to
 *    localStorage before a POST/PATCH fires, so on id conflict the LOCAL
 *    copy wins — on this device it may be one write ahead of the server
 *    (failed/offline sync), never behind;
 *  - ids that exist only on the server are appended (rows created on
 *    another device survive);
 *  - local order is preserved (stable UI), server-only rows follow in
 *    server order;
 *  - idempotent: merging the same server payload twice is a no-op.
 *
 * Known limitation: a row deleted locally while offline can be
 * re-appended by the next successful hydrate (no tombstones yet).
 */
export function mergeById<T extends { id: string }>(
  local: readonly T[],
  server: readonly T[],
): T[] {
  const localIds = new Set(local.map((item) => item.id));
  const serverOnly = server.filter((item) => !localIds.has(item.id));
  return [...local, ...serverOnly];
}
