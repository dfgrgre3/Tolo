/**
 * Query Freshness Profiles (P0-6)
 *
 * Replaces a single global staleTime/refetchOnMount setting with five
 * domain-specific profiles. Every useQuery call MUST explicitly spread one
 * of these profiles so its caching semantics are visible at the call site.
 *
 * Profile selection guide:
 *   static      — public content that rarely changes (catalog, CMS, categories)
 *   dashboard   — user-specific counters / activity feeds (teacher stats, notifications)
 *   financial   — any monetary or audit-sensitive data (transactions, wallet, earnings)
 *   progress    — learning progress, grades (event-driven source of truth, but poll-able)
 *   eventDriven — final/immutable results (exam results, certificates) — explicit
 *                 invalidation only; never auto-refetch
 */

export interface QueryProfileOptions {
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean | 'always';
  refetchOnReconnect?: boolean | 'always';
  retry?: boolean | number;
  retryDelay?: number | ((attemptIndex: number) => number);
}

// ── 1. Static catalog (public courses, categories, CMS content) ─────────────
// Data changes on back-office publish, never on user action.
// Long staleTime is safe; aggressive caching cuts CDN bill.
export const staticProfile: QueryProfileOptions = {
  staleTime: 10 * 60_000,       // 10 minutes
  gcTime: 30 * 60_000,          // 30 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
};

// ── 2. Dashboard / activity feeds ──────────────────────────────────────────
// User-specific counters and activity items that change frequently.
// Refresh on mount so returning to the tab shows up-to-date counts.
export const dashboardProfile: QueryProfileOptions = {
  staleTime: 30_000,            // 30 seconds
  gcTime: 5 * 60_000,           // 5 minutes
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 15_000),
};

// ── 3. Financial / audit-sensitive data ────────────────────────────────────
// Transactions, earnings, wallet balance, billing.
// Must ALWAYS show the latest server state — staleTime: 0 means React Query
// considers the data stale immediately after it arrives, triggering a
// background refetch on every mount and window focus.
export const financialProfile: QueryProfileOptions = {
  staleTime: 0,                 // always stale — always background-refresh
  gcTime: 2 * 60_000,           // 2 minutes GC (keep in cache briefly for UX)
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 1,
  retryDelay: 2_000,
};

// ── 4. Learning progress ───────────────────────────────────────────────────
// Course progress, lesson completion, grades.
// Driven primarily by explicit invalidation after mutations (useLearningHub),
// but also polls on mount in case offline mutations were flushed since last visit.
export const progressProfile: QueryProfileOptions = {
  staleTime: 30_000,            // 30 seconds
  gcTime: 10 * 60_000,          // 10 minutes
  refetchOnMount: true,
  refetchOnWindowFocus: false,  // progress changes via user action, not time
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
};

// ── 5. Event-driven / immutable results ───────────────────────────────────
// Exam results, issued certificates, final grades.
// Data does not change once set. Refetch ONLY when the calling code
// explicitly invalidates (e.g. after grading webhook arrives).
// Do NOT use for anything that might legitimately update over time.
export const eventDrivenProfile: QueryProfileOptions = {
  staleTime: Infinity,          // treat as permanently fresh
  gcTime: 60 * 60_000,          // 1 hour (user can navigate away and return)
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
};

// ── Convenience re-exports under descriptive aliases ──────────────────────
export const queryProfiles = {
  static: staticProfile,
  dashboard: dashboardProfile,
  financial: financialProfile,
  progress: progressProfile,
  eventDriven: eventDrivenProfile,
} as const;

export type QueryProfileName = keyof typeof queryProfiles;
