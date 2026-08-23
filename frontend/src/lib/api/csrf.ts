/**
 * CSRF bootstrap + header injection for `ApiClient`, implementing the Double
 * Submit Cookie pattern: the backend sets a `_csrf` cookie, and every
 * state-changing request must echo its value back in the `X-CSRF-Token`
 * header.
 *
 * State here is module-level rather than per-instance because there is only
 * ever one `apiClient` singleton app-wide (mirrors the previous private
 * fields on the `ApiClient` class).
 */

/** In-flight CSRF bootstrap request — shared across concurrent callers to avoid duplicate fetches */
let csrfBootstrapPromise: Promise<void> | null = null;
let lastCsrfToken: string | null = null;

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
        const existingCookie = getCookie('_csrf');
        if (existingCookie) {
            lastCsrfToken = existingCookie;
            return;
        }
    }

    if (!csrfBootstrapPromise) {
        csrfBootstrapPromise = fetch('/api/auth/csrf', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`CSRF bootstrap failed with status ${response.status}`);
                }
                const token = response.headers.get('X-CSRF-Token');
                if (token) {
                    lastCsrfToken = token;
                }
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
    const csrfToken = getCookie('_csrf');
    if (csrfToken) {
        lastCsrfToken = csrfToken;
        headers.set('X-CSRF-Token', csrfToken);
    } else if (lastCsrfToken) {
        headers.set('X-CSRF-Token', lastCsrfToken);
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
