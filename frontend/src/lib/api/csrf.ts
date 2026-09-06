/**
 * CSRF bootstrap + header injection for `ApiClient`, implementing the Double
 * Submit Cookie pattern: the backend sets a `_csrf` cookie, and every
 * state-changing request must echo its value back in the `X-CSRF-Token`
 * header.
 *
 * The module stores only the in-flight bootstrap promise. The CSRF cookie is
 * the sole token source, so separate tabs cannot disagree through module
 * memory.
 */
import { CSRF_COOKIE_NAME } from '@/lib/security/cookie-attrs';

/** In-flight CSRF bootstrap request — shared across concurrent callers to avoid duplicate fetches */
let csrfBootstrapPromise: Promise<void> | null = null;

/**
 * Upper bound for the bootstrap GET to /api/auth/csrf. The backend route
 * itself caps the upstream call at 10s (see src/app/api/auth/csrf/route.ts);
 * this client-side abort is a defence-in-depth so a hung fetch cannot stall
 * the first state-changing request indefinitely (single-flight pattern would
 * otherwise leave every concurrent caller waiting on the same dead promise).
 */
const CSRF_BOOTSTRAP_TIMEOUT_MS = 10_000;

/**
 * Resets the in-flight bootstrap state. Must be invoked on:
 *   - logout        (token bound to previous account, must not leak across)
 *   - account switch (identity changed; old token must not be replayed)
 *   - auth reset    (forced re-bootstrap on next write request)
 */
export function clearCsrfToken(): void {
    // Also reset any in-flight bootstrap so the next caller re-bootstraps
    // instead of reusing a stale promise after an auth reset.
    csrfBootstrapPromise = null;
}

export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        const c = ca[i];
        if (!c) continue;
        let trimmed = c;
        while (trimmed.charAt(0) === ' ') trimmed = trimmed.substring(1);
        if (trimmed.indexOf(nameEQ) === 0) return trimmed.substring(nameEQ.length);
    }
    return null;
}

/**
 * Ensures the _csrf cookie exists by fetching GET /api/auth/csrf when it is absent.
 * Multiple simultaneous callers share the same in-flight request (single-flight pattern).
 *
 * This solves the bootstrap problem: on first load (or after cookie expiry) the browser
 * has no _csrf cookie, so any POST/PUT/PATCH/DELETE would fail with
 * "CSRF token validation failed" until a GET request triggered ensureCSRFToken on the backend.
 */
export async function ensureCsrfToken(forceRefresh = false): Promise<void> {
    if (typeof window === 'undefined') return;

    // Fast path: cookie already present and no forced refresh requested.
    if (!forceRefresh) {
        const existingCookie = getCookie(CSRF_COOKIE_NAME);
        if (existingCookie) {
            return;
        }
    }

    if (!csrfBootstrapPromise) {
        csrfBootstrapPromise = fetch('/api/auth/csrf', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            // Defence-in-depth: cap the bootstrap at CSRF_BOOTSTRAP_TIMEOUT_MS
            // so a hung upstream (backend down, stuck connection) cannot
            // leave concurrent callers waiting on a dead single-flight
            // promise. The backend route itself enforces a 10s timeout on
            // its upstream call; aborting here keeps the surface consistent.
            signal: AbortSignal.timeout(CSRF_BOOTSTRAP_TIMEOUT_MS),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`CSRF bootstrap failed with status ${response.status}`);
                }
                // The cookie is the source of truth. The response header is
                // intentionally not cached because module state is not shared
                // across tabs and cannot be cleared from the browser cookie.
            })
            .catch((err) => {
                // Clear the in-flight state on any failure (timeout, network,
                // non-2xx) so a subsequent attempt can bootstrap again.
                if (err instanceof DOMException && err.name === 'TimeoutError') {
                    throw new Error(`CSRF bootstrap timed out after ${CSRF_BOOTSTRAP_TIMEOUT_MS}ms`);
                }
                throw err;
            })
            .finally(() => { csrfBootstrapPromise = null; });
    }

    return csrfBootstrapPromise;
}

/**
 * Injects the `X-CSRF-Token` header for write methods, ensuring the `_csrf`
 * cookie exists first. No-op for GET-like requests or outside the browser.
 */
export async function applyCsrfHeader(headers: Headers, isWriteMethod: boolean): Promise<void> {
    if (typeof window === 'undefined' || !isWriteMethod) return;

    await ensureCsrfToken();
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }
}

export async function isCsrfValidationFailure(response: Response): Promise<boolean> {
    if (response.status !== 403) return false;
    try {
        const body = await response.clone().json().catch(() => null) as { error?: string; message?: string } | null;
        const message = body?.error || body?.message || '';
        return message.toLowerCase().includes('csrf');
    } catch {
        return false;
    }
}
