/**
 * Centralized API Client (Fetch Wrapper)
 * This replaces all custom apiFetch instances across the app to reduce over-engineering.
 */
import { performanceMonitor } from '../metrics/performance';
import { trimTrailingSlashes } from '../utils';
import { requestCache } from './request-cache';

// NOTE: ErrorManager is intentionally NOT imported at the top level.
// Doing so creates a circular dependency:
//   api-client → ErrorManager → safe-client-utils → client-logger → unified-logger → ErrorManager
// This cycle causes api-client to resolve as `undefined` in modules that import it (e.g. auth-client).
// Instead, ErrorManager is loaded lazily inside the catch block below.

interface FetchOptions extends RequestInit {
    timeout?: number;
    retries?: number;
}

interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    message?: string;
    error?: string;
    code?: string;
}

const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
// IMPORTANT: Do NOT include 500 or 503 here.
// 503 means the backend is overwhelmed (DB pool exhaustion, cold start, etc.).
// Retrying a 503 immediately multiplies the load by MAX_RETRIES × — making
// pool exhaustion catastrophically worse (thundering herd).
// 500 is a server-side logic error and is not transient by definition.
// Only retry transient network/gateway errors: timeout(408), rate-limit(429),
// bad-gateway(502), and gateway-timeout(504).
const RETRYABLE_STATUSES = [408, 429, 502, 504];
const RETRYABLE_METHODS = ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];

interface ClerkWindow extends Window {
    Clerk?: {
        session?: {
            getToken: () => Promise<string | null>;
        };
    };
}

class ApiError extends Error {
    public status: number;
    public code?: string;
    public data?: Record<string, unknown>;

    constructor(message: string, status: number, code?: string, data?: Record<string, unknown>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

const sleep = (ms: number) =>
    // Add ±10% jitter to prevent thundering herd: when many clients retry
    // simultaneously they would hammer the backend in lockstep without jitter.
    new Promise((resolve) => setTimeout(resolve, ms + Math.random() * ms * 0.1));

const isBrowser = typeof window !== 'undefined';
const isProd = process.env.NODE_ENV === 'production';

export const DEFAULT_API_URL = 'http://127.0.0.1:8082/api';

const BASE_API_URL = trimTrailingSlashes(
  isBrowser
    ? '/api'
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL)
);
const SERVER_API_URL = trimTrailingSlashes(process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);

function normalizeEndpoint(endpoint: string): string {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }

    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // In the browser, always use relative path (/api/...) to route through Next.js proxy.
    // This avoids CORS issues entirely.
    if (isBrowser) {
        if (normalized.startsWith('/api/')) {
            return normalized;
        }
        return `/api${normalized}`;
    }

    // Server-side (SSR) requests use the absolute base URL
    if (normalized.startsWith('/api/')) {
        return BASE_API_URL.endsWith('/api')
            ? `${BASE_API_URL}${normalized.substring(4)}`
            : `${BASE_API_URL}${normalized}`;
    }
    if (BASE_API_URL.endsWith('/api')) {
        return `${BASE_API_URL}${normalized}`;
    }
    return `${BASE_API_URL}/api${normalized}`;
}

function normalizeServerEndpoint(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }

    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (normalized.startsWith('/api/')) {
        return SERVER_API_URL.endsWith('/api')
            ? `${SERVER_API_URL}${normalized.substring(4)}`
            : `${SERVER_API_URL}${normalized}`;
    }

    return SERVER_API_URL.endsWith('/api')
        ? `${SERVER_API_URL}${normalized}`
        : `${SERVER_API_URL}/api${normalized}`;
}


function unwrapApiEnvelope<T>(payload: T | ApiEnvelope<T>): T {
    if (
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        'success' in payload &&
        'data' in payload
    ) {
        return (payload as ApiEnvelope<T>).data as T;
    }

    return payload as T;
}

/**
 * Detect whether Clerk's browser-side session is still active.
 * This checks the Clerk JS SDK directly (not React hooks) so it can
 * be called from non-component code like the API client.
 *
 * Returns true if Clerk has an active session with a valid ID.
 */
function isClerkSessionActive(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const clerk = (window as unknown as Record<string, unknown>)?.Clerk as
            | { session?: { id?: string; status?: string } | null }
            | undefined;
        // session.id being present and status being "active" means the session is valid.
        return !!(clerk?.session?.id && clerk?.session?.status === 'active');
    } catch {
        return false;
    }
}

const REDIRECT_LOOP_KEY = '__api_redirect_count';
const REDIRECT_LOOP_WINDOW = 15_000; // 15 seconds — generous window to catch slow loops
const MAX_REDIRECTS_IN_WINDOW = 2;   // at most 2 redirects per window

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

class ApiClient {
    private async buildHeaders(customOptions: RequestInit): Promise<Headers> {
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

        // Add Clerk JWT token in Authorization header if in browser
        if (typeof window !== 'undefined') {
            const clerk = (window as unknown as {
                Clerk?: {
                    session?: {
                        getToken: () => Promise<string | null>;
                    };
                };
            }).Clerk;
            if (clerk?.session) {
                try {
                    const token = await clerk.session.getToken();
                    if (token) {
                        headers.set('Authorization', `Bearer ${token}`);
                    }
                } catch (e) {
                    console.error('Failed to get Clerk token:', e);
                }
            }
        }

        const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(customOptions.method || 'GET');

        // Auto-generate Idempotency-Key for write requests (idempotency middleware)
        if (isWriteMethod && !headers.has('Idempotency-Key')) {
            headers.set('Idempotency-Key', crypto.randomUUID());
        }

        // Attach CSRF token for write requests in browser environment
        if (isWriteMethod && typeof window !== 'undefined' && !headers.has('X-CSRF-Token')) {
            const cookies = window.document.cookie.split(';').map(c => c.trim());
            const csrfNames = ['_csrf', 'X-CSRF-Token', 'csrf', 'csrf_token'];
            let csrfToken: string | undefined;
            for (const name of csrfNames) {
                const entry = cookies.find(c => c.startsWith(name + '='));
                if (entry) {
                    try {
                        csrfToken = decodeURIComponent(entry.split('=')[1]);
                    } catch {
                        csrfToken = entry.split('=')[1];
                    }
                    break;
                }
            }
            if (csrfToken) {
                headers.set('X-CSRF-Token', csrfToken);
            }
        }

        return headers;
    }

    private resetAuthStore(): void {
        if (typeof window !== 'undefined') {
            import('@/lib/auth').then(({ useAuthStore }) => {
                useAuthStore.getState().reset();
            }).catch(() => {});
        }
    }

    private logNetworkError(error: unknown, endpoint: string): void {
        import('@/lib/logging/error-service').then(({ errorService: errorManager }) => {
            errorManager.handleNetworkError(error, endpoint);
        }).catch(() => {});
    }

    private canRetryMethod(method: string): boolean {
        return RETRYABLE_METHODS.includes(method.toUpperCase());
    }

    private isRetryableError(error: unknown, retryCount: number, retries: number, method: string): boolean {
        if (!this.canRetryMethod(method)) return false;

        const errName = (error as { name?: string })?.name;
        const errMsg = (error as { message?: string })?.message;
        return !!((errName === 'AbortError' || errMsg?.includes('fetch')) && retryCount < retries);
    }

    public async fetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;
        let retryCount = 0;
        let savedIdempotencyKey: string | null = null;

        while (true) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            const headers = await this.buildHeaders(customOptions);
            if (savedIdempotencyKey) {
                headers.set('Idempotency-Key', savedIdempotencyKey);
            } else {
                savedIdempotencyKey = headers.get('Idempotency-Key');
            }

            try {
                const url = normalizeEndpoint(endpoint);
                const timer = performanceMonitor.startTimer('API Request', { endpoint, method: customOptions.method || 'GET' });
                
                const method = customOptions.method || 'GET';
                const fetcher = () => fetch(url, {
                    ...customOptions,
                    headers,
                    credentials: 'include',
                    signal: controller.signal,
                });

                const response = (method.toUpperCase() === 'GET' && !endpoint.includes('/exams/'))
                    ? await requestCache.getResponse(url, customOptions, fetcher)
                    : await fetcher();

                timer.stop();
                clearTimeout(id);

                if (response.status === 401 && retryCount < 1) {
                    // Only redirect if an Authorization header was actually sent.
                    // This avoids redirect loops on initialization before Clerk is loaded.
                    if (headers.has('Authorization')) {
                        // CRITICAL: If Clerk still reports an active session, the 401 is
                        // likely a transient issue (backend hasn't synced the new token yet,
                        // or the backend rejected a valid Clerk JWT for a non-auth reason).
                        // In this case, do NOT redirect or reset the auth store — that would
                        // trigger an infinite page-reload loop:
                        //   Dashboard → 401 → redirect to /login → middleware redirect
                        //   to /dashboard → API call → 401 → repeat.
                        if (isClerkSessionActive()) {
                            console.warn(
                                `[API Proxy] Received 401 for ${endpoint} but Clerk session is still active. ` +
                                `Skipping redirect to prevent infinite reload loop. ` +
                                `The backend may need time to sync, or the endpoint may require different permissions.`
                            );
                            // Do NOT resetAuthStore() or redirect — Clerk session is valid.
                        } else if (detectRedirectLoop()) {
                            // Check for redirect loop first — if we've already redirected
                            // multiple times in a short window, break the cycle.
                            console.error(
                                'API redirect loop detected! Multiple 401 redirects occurred in a short window. ' +
                                'Stopping automatic redirects to prevent infinite page reloads. ' +
                                'The user may need to manually log in again.'
                            );
                            // Clear the counter so future manual attempts can work
                            clearRedirectCount();
                            // Reset auth store but do NOT redirect
                            this.resetAuthStore();
                        } else {
                            this.resetAuthStore();
                            if (typeof window !== 'undefined') {
                                const currentPath = window.location.pathname;
                                // Never redirect if already on an auth page — that would create a loop.
                                // Also skip redirect for auth endpoints themselves (login/register/me calls).
                                const isAlreadyOnAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath === '/admin-login' || currentPath === '/verify-email';
                                const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/refresh') || endpoint.includes('/auth/me');
                                if (!isAlreadyOnAuthPage && !isAuthEndpoint) {
                                    recordRedirect();
                                    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                                }
                            }
                        }
                    } else {
                        console.warn('API returned 401, but no Authorization header was sent. Skipping auto-redirect to prevent infinite loops.');
                    }
                }

                const responseStatus = response.status;
                const shouldRetry = this.canRetryMethod(method) && RETRYABLE_STATUSES.includes(responseStatus) && retryCount < retries;
                if (shouldRetry) {
                    retryCount++;
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount - 1));
                    continue;
                }

                return response;
            } catch (error: unknown) {
                clearTimeout(id);

                if (this.isRetryableError(error, retryCount, retries, customOptions.method || 'GET')) {
                    retryCount++;
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount - 1));
                    continue;
                }

                this.logNetworkError(error, endpoint);
                throw error;
            }
        }
    }

    private async handleApiErrorResponse(response: Response, retryCount: number, retries: number, method: string): Promise<boolean> {
        let errorMessage = `Server error: ${response.statusText}`;
        let errorCode = 'HTTP_ERROR';
        let errorData: Record<string, unknown> | undefined = undefined;
        
        const responseText = await response.text();
        try {
            errorData = JSON.parse(responseText);
            if (errorData) {
                errorMessage = (errorData.error as string) || (errorData.message as string) || errorMessage;
                errorCode = (errorData.code as string) || errorCode;
            }
        } catch {
            if (responseText) errorMessage = responseText;
        }

        const shouldRetry = this.canRetryMethod(method) && RETRYABLE_STATUSES.includes(response.status) && retryCount < retries;
        if (shouldRetry) return true;

        throw new ApiError(errorMessage, response.status, errorCode, errorData);
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const response = await this.fetch(endpoint, options);

        if (!response.ok) {
            let errorMessage = `Server error: ${response.statusText}`;
            let errorCode = 'HTTP_ERROR';
            let errorData: Record<string, unknown> | undefined = undefined;
            
            const responseText = await response.text();
            try {
                errorData = JSON.parse(responseText);
                if (errorData) {
                    errorMessage = (errorData.error as string) || (errorData.message as string) || errorMessage;
                    errorCode = (errorData.code as string) || errorCode;
                }
            } catch {
                if (responseText) errorMessage = responseText;
            }
            throw new ApiError(errorMessage, response.status, errorCode, errorData);
        }

        // Check for empty response
        const contentLength = response.headers.get('content-length');
        if (response.status === 204 || contentLength === '0') {
            return {} as T;
        }

        const payload = await response.json() as T | ApiEnvelope<T>;
        return unwrapApiEnvelope<T>(payload);
    }

    public get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public post<T>(endpoint: string, body: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    public put<T>(endpoint: string, body: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    public patch<T>(endpoint: string, body: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    public delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
