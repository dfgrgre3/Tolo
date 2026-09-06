/**
 * Retry policy for `ApiClient.fetch` — which statuses/methods are safe to
 * retry automatically, and the backoff delay between attempts.
 *
 * Also defines explicit error classes for the three failure modes that
 * `api-client` may produce. Consumers and tests rely on `instanceof`, not on
 * parsing `error.name` / `error.message` strings.
 */

// IMPORTANT: Do NOT include 500 or 503 here.
// 503 means the backend is overwhelmed (DB pool exhaustion, cold start, etc.).
// Retrying a 503 immediately multiplies the load by MAX_RETRIES × — making
// pool exhaustion catastrophically worse (thundering herd).
// 500 is a server-side logic error and is not transient by definition.
// Only retry transient network/gateway errors: timeout(408), rate-limit(429),
// bad-gateway(502), and gateway-timeout(504).
export const RETRYABLE_STATUSES = [408, 429, 502, 504];

// Methods that are safe to retry at the HTTP level *and* for which the server's
// idempotency middleware will replay the original response when the same
// `Idempotency-Key` is reused (see backend middleware/idempotency.go).
// - POST and PATCH are intentionally excluded: the server-side idempotency
//   cache prevents double-execution, but only if the client reuses the
//   *same* key on retry. `ApiClient.fetch` does that for writes that
//   already carry a header, but the default-UUID-per-attempt case for POST
//   would defeat it. We restrict retries to methods whose second attempt is
//   guaranteed safe under HTTP semantics (GET) or where the server enforces
//   idempotency by design (PUT, DELETE).
export const RETRYABLE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const RETRY_DELAY = 1000;

export const sleep = (ms: number) =>
    // Add ±10% jitter to prevent thundering herd: when many clients retry
    // simultaneously they would hammer the backend in lockstep without jitter.
    new Promise<void>((resolve) => setTimeout(resolve, ms + Math.random() * ms * 0.1));

export function canRetryMethod(method: string): boolean {
    return RETRYABLE_METHODS.includes(method.toUpperCase());
}

// ---------------------------------------------------------------------------
// Explicit error classes
// ---------------------------------------------------------------------------
//
// Why explicit classes (and not string matching on `error.name`):
//   - Caller aborts must NEVER be retried. Before this, every abort looked like
//     `name === 'AbortError'` regardless of who triggered it (the user's own
//     AbortController vs our internal timeout vs an unrelated browser abort).
//   - String-matching `errMsg?.includes('fetch')` is a footgun: any backend
//     error string that happens to contain "fetch" would falsely trigger a
//     retry loop.
//   - Tests assert on `instanceof` rather than brittle regex on messages.

/** Internal timeout fired by ApiClient's own setTimeout. Safe to retry. */
export class TimeoutError extends Error {
    public override readonly cause?: unknown;
    constructor(message = 'Request timed out', options?: { cause?: unknown }) {
        super(message);
        this.name = 'TimeoutError';
        this.cause = options?.cause;
    }
}

/** The caller passed their own AbortSignal and aborted it. NEVER retry. */
export class CallerAbortError extends Error {
    constructor(message = 'Aborted by caller') {
        super(message);
        this.name = 'CallerAbortError';
    }
}

/** Underlying `fetch` rejected (DNS, TLS, offline, CORS preflight, etc.). Safe to retry. */
export class NetworkError extends Error {
    public override readonly cause?: unknown;
    constructor(message = 'Network request failed', options?: { cause?: unknown }) {
        super(message);
        this.name = 'NetworkError';
        this.cause = options?.cause;
    }
}

/**
 * Coerces a thrown value from `fetch()` into one of our explicit error
 * classes. Centralized so every call to `fetch` in the codebase produces the
 * same error taxonomy and `isRetryableError` can stay a pure `instanceof`
 * check.
 */
export function classifyFetchError(error: unknown): Error {
    if (error instanceof TimeoutError
        || error instanceof CallerAbortError
        || error instanceof NetworkError) {
        return error;
    }

    // The DOM sometimes rejects with a generic `TypeError: Failed to fetch`
    // for network-layer failures. Wrap it so callers can `instanceof` it.
    if (error instanceof TypeError) {
        return new NetworkError(error.message || 'Network request failed', { cause: error });
    }

    // Fallback: leave unknown errors untouched. Callers that don't care
    // about the taxonomy get the original throwable.
    return error instanceof Error ? error : new Error(String(error));
}

/**
 * Decides whether a thrown error is safe to retry given the HTTP method,
 * remaining budget, and — for caller aborts — a flag the caller can set to
 * short-circuit any retry logic.
 */
export function isRetryableError(
    error: unknown,
    retryCount: number,
    retries: number,
    method: string,
): boolean {
    if (!canRetryMethod(method)) return false;
    if (retryCount >= retries) return false;

    const classified = classifyFetchError(error);

    // Caller cancellation is always terminal — the caller explicitly asked
    // for the request to stop. Re-issuing would defeat the abort.
    if (classified instanceof CallerAbortError) return false;

    // Internal timeouts and network failures are transient and safe to retry
    // for idempotent methods (already gated by canRetryMethod above).
    return classified instanceof TimeoutError || classified instanceof NetworkError;
}