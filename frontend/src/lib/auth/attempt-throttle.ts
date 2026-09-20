/**
 * Client-side attempt throttle for credential/code surfaces.
 *
 * WHAT THIS IS: UX-layer brute-force friction. It counts consecutive
 * failures per scope, imposes escalating lockouts, and raises a
 * human-verification gate — so an automated credential-stuffing or OTP-
 * guessing run hits a wall in the UI instead of hammering the backend at
 * full speed.
 *
 * WHAT THIS IS NOT: a security boundary. Storage can be cleared and the
 * client can be bypassed entirely — real enforcement is the backend's HTTP
 * 429 (see `lib/auth/rate-limit.ts`, whose server-directed wait always wins
 * over the client estimate when both exist). Never weaken a server verdict
 * because of local state.
 *
 * State persists in localStorage so a reload does not reset the counter
 * (per scope: consecutive failures, escalations so far, lock deadline).
 * Scopes are independent: failing login must not lock password recovery.
 * Within the login scope, records are additionally keyed per account
 * (normalized email), so switching accounts shows each account's own
 * lockout instead of one shared browser-wide state.
 */

export type ThrottleScope =
  | "login"
  | "mfa"
  | "forgot-send"
  | "forgot-code"
  | "verify-email"
  | "change-password";

export interface ThrottleConfig {
  /** Consecutive failures that trigger a lockout (starting budget). */
  maxAttempts: number;
  /**
   * Floor for the decaying attempt budget. When set below `maxAttempts`,
   * each lockout shrinks the next round's budget by one:
   * `max( minAttempts, maxAttempts - lockouts )`.
   * Unset = fixed budget (no decay).
   */
  minAttempts?: number;
  /** First lockout length; doubles per escalation up to `maxLockoutMs`. */
  baseLockoutMs: number;
  maxLockoutMs: number;
  /**
   * Optional explicit escalation ladder: lockout #n lasts `steps[min(n, len-1)]`.
   * When set, it replaces the base-doubling rule for this scope.
   */
  lockoutStepsMs?: number[];
  /**
   * Failures after which human verification is required before the next
   * submit. `Infinity` = this scope never asks (lockout only).
   */
  captchaAfter: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const THROTTLE_CONFIGS: Record<ThrottleScope, ThrottleConfig> = {
  // Credentials: stuffing target. Captcha early. Decaying budget + growing
  // lockout per account: 4 attempts → lock 5min, 3 attempts → 10min,
  // 2 attempts → 15min, then 1 attempt → 30/60/120min up to a 3h cap.
  login: { maxAttempts: 4, minAttempts: 1, baseLockoutMs: 5 * MINUTE, maxLockoutMs: 180 * MINUTE, lockoutStepsMs: [5 * MINUTE, 10 * MINUTE, 15 * MINUTE, 30 * MINUTE, 60 * MINUTE, 120 * MINUTE, 180 * MINUTE], captchaAfter: 3 },
  // TOTP is 6 digits (a million combinations): failures must cost time.
  // No captcha here — the login gate already verified humanity; a lockout
  // is the correct friction for a code-entry step.
  mfa: { maxAttempts: 5, baseLockoutMs: MINUTE, maxLockoutMs: 15 * MINUTE, captchaAfter: Number.POSITIVE_INFINITY },
  // Anti-enumeration means sends rarely "fail" visibly — count SENDS so a
  // script cannot mass-trigger recovery emails. Captcha early.
  "forgot-send": { maxAttempts: 3, baseLockoutMs: 2 * MINUTE, maxLockoutMs: 30 * MINUTE, captchaAfter: 2 },
  // Recovery codes are 6 digits like TOTP: same lockout shape, no captcha
  // (the send gate already challenged).
  "forgot-code": { maxAttempts: 5, baseLockoutMs: MINUTE, maxLockoutMs: 15 * MINUTE, captchaAfter: Number.POSITIVE_INFINITY },
  // Email OTP verification: code-entry shape, lockout only.
  "verify-email": { maxAttempts: 5, baseLockoutMs: MINUTE, maxLockoutMs: 15 * MINUTE, captchaAfter: Number.POSITIVE_INFINITY },
  // Authenticated password change: credential-stuffing target on oldPassword.
  "change-password": { maxAttempts: 5, baseLockoutMs: MINUTE, maxLockoutMs: 15 * MINUTE, captchaAfter: Number.POSITIVE_INFINITY },
};

export interface ThrottleSnapshot {
  scope: ThrottleScope;
  /** Submit must be blocked right now. */
  locked: boolean;
  /** ms until unlock (0 when not locked). */
  remainingMs: number;
  /** Failures left before the next lockout (0 while locked). */
  remainingAttempts: number;
  /** Human verification required before the next submit. */
  captchaRequired: boolean;
}

interface ThrottleRecord {
  fails: number;
  lockouts: number;
  lockedUntil: number;
}

const STORAGE_KEY = "thanawy:throttle:v1";

type ThrottleStore = Record<string, ThrottleRecord>;

/**
 * Storage key for a scope, optionally namespaced per account.
 * The account key (e.g. normalized email) isolates lockouts so each
 * account carries its own failures/escalations/deadline.
 */
function storeKey(scope: ThrottleScope, accountKey?: string): string {
  const normalized = (accountKey ?? "").trim().toLowerCase();
  return normalized ? `${scope}::${normalized}` : scope;
}

function emptyRecord(): ThrottleRecord {
  return { fails: 0, lockouts: 0, lockedUntil: 0 };
}

function readStore(): ThrottleStore {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: ThrottleStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof key === "string" &&
        typeof value === "object" &&
        value !== null &&
        typeof (value as ThrottleRecord).fails === "number" &&
        typeof (value as ThrottleRecord).lockouts === "number" &&
        typeof (value as ThrottleRecord).lockedUntil === "number"
      ) {
        out[key] = {
          fails: Math.max(0, Math.floor((value as ThrottleRecord).fails)),
          lockouts: Math.max(0, Math.floor((value as ThrottleRecord).lockouts)),
          lockedUntil: (value as ThrottleRecord).lockedUntil,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore(store: ThrottleStore): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Degrades to per-load memory only — acceptable for a UX layer.
  }
}

function snapshotOf(scope: ThrottleScope, record: ThrottleRecord, now: number): ThrottleSnapshot {
  const config = THROTTLE_CONFIGS[scope];
  const locked = record.lockedUntil > now;
  const budget = effectiveMaxAttempts(config, record.lockouts);
  return {
    scope,
    locked,
    remainingMs: locked ? record.lockedUntil - now : 0,
    remainingAttempts: locked ? 0 : Math.max(0, budget - record.fails),
    captchaRequired:
      record.fails >= config.captchaAfter || record.lockouts > 0,
  };
}

/**
 * Attempt budget for the current escalation round. With `minAttempts`
 * configured (login), every served lockout shrinks the next round's budget
 * by one down to the floor: 4 → 3 → 2 → 1.
 */
export function effectiveMaxAttempts(config: ThrottleConfig, lockouts: number): number {
  const floor = config.minAttempts ?? config.maxAttempts;
  return Math.max(floor, config.maxAttempts - Math.max(0, Math.floor(lockouts)));
}

/** Current throttle state for `scope` (+ optional account). Never throws, never locks by itself. */
export function getThrottle(scope: ThrottleScope, accountKey?: string): ThrottleSnapshot {
  const store = readStore();
  return snapshotOf(scope, store[storeKey(scope, accountKey)] ?? emptyRecord(), Date.now());
}

/**
 * Records a failed attempt. Returns the new snapshot.
 *
 * When the failure budget is exhausted a lockout starts: `baseLockoutMs`
 * doubling per previous lockout, capped at `maxLockoutMs`. When the caller
 * also passes the SERVER's directed wait (`serverRetryAfterMs` from a 429),
 * the LONGER of the two wins — the server is never undercut.
 */
export function recordFailure(
  scope: ThrottleScope,
  serverRetryAfterMs?: number | null,
  accountKey?: string
): ThrottleSnapshot {
  const config = THROTTLE_CONFIGS[scope];
  const now = Date.now();
  const store = readStore();
  const key = storeKey(scope, accountKey);
  const record = store[key] ?? emptyRecord();

  // A failure arriving mid-lockout (stale tab, double submit) must not
  // extend or reset anything — the existing deadline stands.
  if (record.lockedUntil > now) {
    return snapshotOf(scope, record, now);
  }

  record.fails += 1;
  if (record.fails >= effectiveMaxAttempts(config, record.lockouts)) {
    // Stepped ladder when configured (login: 5 → 10 → 15 → 30 → 60 → 120 → 180min cap),
    // otherwise the classic base-doubling rule capped at maxLockoutMs.
    const steps = config.lockoutStepsMs;
    const clientLockout =
      steps && steps.length > 0
        ? Math.min(
            steps[Math.min(record.lockouts, steps.length - 1)]!,
            config.maxLockoutMs
          )
        : Math.min(
            config.baseLockoutMs * 2 ** Math.min(record.lockouts, 10),
            config.maxLockoutMs
          );
    const serverWait =
      typeof serverRetryAfterMs === "number" &&
      Number.isFinite(serverRetryAfterMs) &&
      serverRetryAfterMs > 0
        ? Math.round(serverRetryAfterMs)
        : 0;
    record.lockedUntil = now + Math.max(clientLockout, serverWait);
    record.lockouts += 1;
    record.fails = 0;
  }

  store[key] = record;
  writeStore(store);
  return snapshotOf(scope, record, Date.now());
}

/**
 * Records a success (or a send that reached the server): clears failures
 * AND the lockout escalation for `scope`, so a legitimate user who finally
 * gets it right is not punished for old mistakes. Human-verification solved
 * state is owned by the form, not the store.
 */
export function recordSuccess(scope: ThrottleScope, accountKey?: string): ThrottleSnapshot {
  const store = readStore();
  const record = emptyRecord();
  store[storeKey(scope, accountKey)] = record;
  writeStore(store);
  return snapshotOf(scope, record, Date.now());
}

/** Test/escape-hatch reset for one scope (+ optional account). */
export function resetThrottle(scope: ThrottleScope, accountKey?: string): void {
  const store = readStore();
  delete store[storeKey(scope, accountKey)];
  writeStore(store);
}
