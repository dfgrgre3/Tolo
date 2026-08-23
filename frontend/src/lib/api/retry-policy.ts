/**
 * Retry policy for `ApiClient.fetch` — which statuses/methods are safe to
 * retry automatically, and the backoff delay between attempts.
 */

// IMPORTANT: Do NOT include 500 or 503 here.
// 503 means the backend is overwhelmed (DB pool exhaustion, cold start, etc.).
// Retrying a 503 immediately multiplies the load by MAX_RETRIES × — making
// pool exhaustion catastrophically worse (thundering herd).
// 500 is a server-side logic error and is not transient by definition.
// Only retry transient network/gateway errors: timeout(408), rate-limit(429),
// bad-gateway(502), and gateway-timeout(504).
export const RETRYABLE_STATUSES = [408, 429, 502, 504];
export const RETRYABLE_METHODS = ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];

export const RETRY_DELAY = 1000;

export const sleep = (ms: number) =>
    // Add ±10% jitter to prevent thundering herd: when many clients retry
    // simultaneously they would hammer the backend in lockstep without jitter.
    new Promise<void>((resolve) => setTimeout(resolve, ms + Math.random() * ms * 0.1));

export function canRetryMethod(method: string): boolean {
    return RETRYABLE_METHODS.includes(method.toUpperCase());
}

export function isRetryableError(error: unknown, retryCount: number, retries: number, method: string): boolean {
    if (!canRetryMethod(method)) return false;

    const errName = (error as { name?: string })?.name;
    const errMsg = (error as { message?: string })?.message;
    return !!((errName === 'AbortError' || errMsg?.includes('fetch')) && retryCount < retries);
}
