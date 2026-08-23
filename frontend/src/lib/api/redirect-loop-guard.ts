/**
 * Guards the automatic 401 → /login redirect in `ApiClient.fetch`.
 *
 * IMPORTANT: Token refresh is handled EXCLUSIVELY by the Edge middleware
 * (`src/proxy.ts`). It checks access-token expiry on every matched request
 * and performs silent rotation before the request reaches this client. That
 * single source of truth prevents race conditions and duplicate refresh
 * attempts.
 *
 * A 401 arriving here therefore means one of:
 *   1. the middleware already tried to refresh and failed (no valid refresh_token)
 *   2. the backend rejected the request for another reason (permissions, revoked session)
 *   3. the request bypassed the middleware matcher
 *
 * `handleUnauthorized` is only a safety net for case 3 — the middleware
 * handles 1 and 2 by redirecting with `?error=session_expired` before we get
 * here.
 */

/**
 * Endpoints that own their own 401 handling — a 401 from these must NOT trigger
 * an automatic redirect to /login. `/auth/me` returns 401 for every guest, and
 * the login/register/refresh flows surface the error inside the form instead.
 */
const AUTH_ENDPOINT_MARKERS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/me',
    '/auth/mfa',
    '/auth/csrf',
] as const;

/** Pages that already are the login destination — never redirect onto ourselves. */
const AUTH_PAGES = [
    '/login',
    '/register',
    '/admin-login',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
];

const REDIRECT_LOOP_KEY = '__api_redirect_count';
const REDIRECT_LOOP_WINDOW = 15_000; // 15 seconds — generous window to catch slow loops
const MAX_REDIRECTS_IN_WINDOW = 2;   // at most 2 redirects per window

export function isAuthEndpoint(endpoint: string): boolean {
    return AUTH_ENDPOINT_MARKERS.some((marker) => endpoint.includes(marker));
}

function detectRedirectLoop(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const raw = sessionStorage.getItem(REDIRECT_LOOP_KEY);
        if (!raw) return false;
        const { count, timestamp } = JSON.parse(raw) as { count: number; timestamp: number };
        if (Date.now() - timestamp > REDIRECT_LOOP_WINDOW) {
            sessionStorage.removeItem(REDIRECT_LOOP_KEY);
            return false;
        }
        return count >= MAX_REDIRECTS_IN_WINDOW;
    } catch {
        return false;
    }
}

function recordRedirect(): void {
    if (typeof window === 'undefined') return;
    try {
        const raw = sessionStorage.getItem(REDIRECT_LOOP_KEY);
        let count = 0;
        let timestamp = Date.now();
        if (raw) {
            const parsed = JSON.parse(raw) as { count: number; timestamp: number };
            if (Date.now() - parsed.timestamp <= REDIRECT_LOOP_WINDOW) {
                count = parsed.count;
                timestamp = parsed.timestamp;
            }
        }
        sessionStorage.setItem(REDIRECT_LOOP_KEY, JSON.stringify({
            count: count + 1,
            timestamp,
        }));
    } catch {
        // ignore
    }
}

function clearRedirectCount(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(REDIRECT_LOOP_KEY);
    } catch {
        // ignore
    }
}

/**
 * Handles a 401 response: navigates to `/login` unless the endpoint owns its
 * own 401 handling, we're already on an auth page, or a redirect loop is
 * detected (in which case automatic redirects are stopped entirely so the
 * user isn't bounced forever — they can still log in manually).
 */
export function handleUnauthorized(endpoint: string): void {
    if (isAuthEndpoint(endpoint) || typeof window === 'undefined') return;

    if (detectRedirectLoop()) {
        console.error(
            'API redirect loop detected — stopping automatic redirects. ' +
            'The user may need to log in manually.'
        );
        clearRedirectCount();
        return;
    }

    if (AUTH_PAGES.includes(window.location.pathname)) return;

    const currentPath = window.location.pathname;
    recordRedirect();
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
}
