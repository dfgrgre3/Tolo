/**
 * Server-driven rate-limit signals + client cooldown store.
 *
 * Two halves that work together:
 *
 * 1. PARSING — the backend is the authority on rate limits. When it answers
 *    429 (or embeds a cooldown in a 200 body, e.g. resend endpoints), the UI
 *    must obey the SERVER's numbers, not a client guess. The wire vocabulary
 *    below is intentionally liberal (`retryAfterMs`, `retry_after`,
 *    `Retry-After` header, …) because the Go backend has no frozen contract
 *    for these fields yet — every read is defensive and falls back to the
 *    caller's client-side estimate when the server says nothing.
 *
 * 2. STORE — `setCooldown(key, ms)` / `getCooldownRemaining(key)` persist a
 *    "do not retry before T" deadline in localStorage, so a resend countdown
 *    survives reload (the old verify-email page kept it in `useState` only
 *    and a refresh reset it to zero). Keys are flow-scoped
 *    (`resend:verify-email`, …), never per-user PII.
 *
 * Neither half is a security boundary: real enforcement lives server-side.
 * This module only makes the UI honest about what the server decided.
 */

const COOLDOWN_STORAGE_KEY = "thanawy:cooldowns:v1";

// ─── Defensive wire readers ──────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPositiveMs(value: unknown, unit: "ms" | "s"): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const ms = unit === "s" ? value * 1000 : value;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  // Sanity cap: a server asking the UI to wait more than 24h is a bug or a
  // ban — surface it as a ban-like state upstream, not a countdown.
  return Math.min(Math.round(ms), 24 * 60 * 60 * 1000);
}

/**
 * Reads a retry delay from an unstructured backend body. Accepts every
 * spelling the backend might plausibly use today; unknown shapes → null.
 */
export function readRetryAfterMs(body: unknown): number | null {
  if (!isRecord(body)) return null;
  const candidates: Array<[unknown, "ms" | "s"]> = [
    [body.retryAfterMs, "ms"],
    [body.retry_after_ms, "ms"],
    [body.cooldownMs, "ms"],
    [body.cooldown_ms, "ms"],
    [body.retryAfter, "s"],
    [body.retry_after, "s"],
    [body.retryAfterSeconds, "s"],
    [body.retry_after_seconds, "s"],
    [body.cooldown, "s"],
    [body.cooldownSeconds, "s"],
    [body.cooldown_seconds, "s"],
    [body.resendAfter, "s"],
    [body.resend_after, "s"],
  ];
  for (const [value, unit] of candidates) {
    const ms = toPositiveMs(value, unit);
    if (ms !== null) return ms;
  }
  return null;
}

/**
 * Parses an HTTP `Retry-After` header value (delay-seconds or HTTP-date)
 * into milliseconds. Returns null when absent or unparsable.
 */
export function parseRetryAfterHeader(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), 24 * 60 * 60 * 1000);
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? Math.min(delta, 24 * 60 * 60 * 1000) : 0;
  }
  return null;
}

export interface RateLimitSignal {
  /** True when the response proves server-side throttling (HTTP 429). */
  rateLimited: boolean;
  /** Server-directed wait, when the server stated one. */
  retryAfterMs: number | null;
}

/**
 * Inspects an `ApiError`-shaped failure (status + parsed body) for a
 * server rate-limit verdict. Only HTTP 429 counts as `rateLimited` — any
 * other status is an ordinary failure even if its body happens to carry a
 * retry-looking field.
 */
export function parseApiRateLimit(err: unknown): RateLimitSignal {
  const status =
    isRecord(err) && typeof err.status === "number" ? err.status : null;
  if (status !== 429) return { rateLimited: false, retryAfterMs: null };
  const body = isRecord(err) ? (err as { data?: unknown }).data : null;
  return { rateLimited: true, retryAfterMs: readRetryAfterMs(body) };
}

/**
 * Inspects an openapi-fetch style `{ response, error }` result (used by the
 * login/MFA contract calls, which never throw) for a 429 verdict. Reads the
 * `Retry-After` response header first, then the error body.
 */
export function parseContractRateLimit(result: {
  response?: { status?: number; headers?: { get(name: string): string | null } } | null;
  error?: unknown;
}): RateLimitSignal {
  if (result.response?.status !== 429) {
    return { rateLimited: false, retryAfterMs: null };
  }
  const headerMs = parseRetryAfterHeader(
    result.response?.headers?.get("retry-after")
  );
  if (headerMs !== null) return { rateLimited: true, retryAfterMs: headerMs };
  return { rateLimited: true, retryAfterMs: readRetryAfterMs(result.error) };
}

/**
 * Reads a server-directed resend cooldown from a SUCCESSFUL response body
 * (resend endpoints answer 200 with "send again after N"). Returns null
 * when the backend states nothing — the caller then falls back to its
 * client-side default.
 */
export function readCooldownMs(body: unknown): number | null {
  return readRetryAfterMs(body);
}

// ─── Persistent cooldown store ───────────────────────────────────────────────

function readStore(): Record<string, number> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, number>): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full / private mode — countdowns degrade to in-memory only.
  }
}

function prune(store: Record<string, number>, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, deadline] of Object.entries(store)) {
    if (deadline > now) out[key] = deadline;
  }
  return out;
}

/** Starts (or extends, when longer) a "do not retry before" deadline. */
export function setCooldown(key: string, waitMs: number): void {
  if (!key || waitMs <= 0) return;
  const now = Date.now();
  const store = prune(readStore(), now);
  const deadline = now + Math.round(waitMs);
  if (!store[key] || store[key] < deadline) store[key] = deadline;
  writeStore(store);
}

/** Milliseconds until `key` may be retried; 0 when free to go. */
export function getCooldownRemaining(key: string): number {
  if (!key) return 0;
  const store = readStore();
  const remaining = (store[key] ?? 0) - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Clears a cooldown (tests, or an explicit server "you may retry now"). */
export function clearCooldown(key: string): void {
  if (!key) return;
  const store = readStore();
  delete store[key];
  writeStore(store);
}

// ─── Arabic countdown formatting ─────────────────────────────────────────────

function arabicUnit(
  value: number,
  one: string,
  two: string,
  few: string,
  many: string
): string {
  if (value <= 1) return one;
  if (value === 2) return two;
  if (value <= 10) return `${value} ${few}`;
  return `${value} ${many}`;
}

/**
 * Human Arabic wait text, e.g. "بعد 45 ثانية" / "بعد دقيقتين" /
 * "بعد 3 دقائق". Western digits match the rest of the auth UI ("6 أرقام").
 */
export function formatCooldownAr(waitMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(waitMs / 1000));
  if (totalSeconds < 60) {
    return `بعد ${arabicUnit(totalSeconds, "ثانية", "ثانيتين", "ثوانٍ", "ثانية")}`;
  }
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `بعد ${arabicUnit(totalMinutes, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;
  }
  const hours = Math.ceil(totalMinutes / 60);
  return `بعد ${arabicUnit(hours, "ساعة", "ساعتين", "ساعات", "ساعة")}`;
}
