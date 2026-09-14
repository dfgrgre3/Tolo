/**
 * Header construction policy for `ApiClient.fetch` — extracted from the
 * client class itself (SYM-001 in the symbol architecture audit: `ApiClient`
 * was accreting security/reliability policies directly in its body instead of
 * delegating to named policy modules the way csrf.ts / retry-policy.ts /
 * idempotency-policy.ts already do).
 *
 * This module owns exactly one concern: given the caller's `RequestInit`,
 * produce the `Headers` to send — Content-Type defaulting, header merging,
 * the CSRF double-submit header, and the Idempotency-Key header. It does not
 * touch transport, retries, or response handling.
 */
import { applyCsrfHeader } from './csrf';
import { requiresIdempotencyKey } from './idempotency-policy';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Builds the `Headers` for one request attempt: merges the caller's headers
 * over the Content-Type default, then applies the CSRF and Idempotency-Key
 * policies for write methods.
 */
export async function buildRequestHeaders(endpoint: string, customOptions: RequestInit): Promise<Headers> {
    const headers = new Headers();

    if (!(customOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    if (customOptions.headers) {
        if (customOptions.headers instanceof Headers) {
            customOptions.headers.forEach((value, key) => {
                headers.set(key, value);
            });
        } else if (Array.isArray(customOptions.headers)) {
            customOptions.headers.forEach(([key, value]) => {
                headers.set(key, value);
            });
        } else {
            Object.entries(customOptions.headers).forEach(([key, value]) => {
                headers.set(key, value);
            });
        }
    }

    const isWriteMethod = WRITE_METHODS.includes(customOptions.method || 'GET');

    // For state-changing requests in the browser: guarantee the CSRF cookie exists first,
    // then inject it as the X-CSRF-Token header (Double Submit Cookie pattern).
    await applyCsrfHeader(headers, isWriteMethod);

    // Only explicitly replay-safe endpoint families receive an idempotency
    // key. Login, logout, telemetry, search-like POSTs, and uploads have
    // different semantics and must not inherit payment retry behavior.
    if (isWriteMethod && requiresIdempotencyKey(customOptions.method || 'GET', endpoint) && !headers.has('Idempotency-Key')) {
        headers.set('Idempotency-Key', crypto.randomUUID());
    }

    return headers;
}
