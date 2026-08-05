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

export class ApiError extends Error {
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
    private isRefreshing = false;
    private refreshSubscribers: ((success: boolean) => void)[] = [];
    /** In-flight CSRF bootstrap request — shared across concurrent callers to avoid duplicate fetches */
    private csrfBootstrapPromise: Promise<void> | null = null;
    private lastCsrfToken: string | null = null;

    private subscribeTokenRefresh(cb: (success: boolean) => void) {
        this.refreshSubscribers.push(cb);
    }

    private onRefreshed(success: boolean) {
        this.refreshSubscribers.forEach((cb) => cb(success));
        this.refreshSubscribers = [];
    }

    /**
     * Ensures the _csrf cookie exists by fetching GET /api/auth/csrf when it is absent.
     * Multiple simultaneous callers share the same in-flight request (single-flight pattern).
     *
     * This solves the bootstrap problem: on first load (or after cookie expiry) the browser
     * has no _csrf cookie, so any POST/PUT/PATCH/DELETE would fail with
     * "CSRF token validation failed" until a GET request triggered ensureCSRFToken on the backend.
     */
    private async ensureCsrfToken(forceRefresh = false): Promise<void> {
        if (typeof window === 'undefined') return;
        if (!forceRefresh && this.getCookie('_csrf')) return;

        const existingCookie = this.getCookie('_csrf');
        if (!forceRefresh && existingCookie) {
            this.lastCsrfToken = existingCookie;
            return;
        }

        if (!this.csrfBootstrapPromise) {
            this.csrfBootstrapPromise = fetch('/api/auth/csrf', {
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
                        this.lastCsrfToken = token;
                    }
                })
                .finally(() => { this.csrfBootstrapPromise = null; });
        }

        return this.csrfBootstrapPromise;
    }

    private getCookie(name: string): string | null {
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

        const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(customOptions.method || 'GET');

        // For state-changing requests in the browser: guarantee the CSRF cookie exists first,
        // then inject it as the X-CSRF-Token header (Double Submit Cookie pattern).
        if (typeof window !== 'undefined' && isWriteMethod) {
            await this.ensureCsrfToken();
            const csrfToken = this.getCookie('_csrf');
            if (csrfToken) {
                this.lastCsrfToken = csrfToken;
                headers.set('X-CSRF-Token', csrfToken);
            } else if (this.lastCsrfToken) {
                headers.set('X-CSRF-Token', this.lastCsrfToken);
            }
        }

        // Auto-generate Idempotency-Key for write requests (idempotency middleware)
        if (isWriteMethod && !headers.has('Idempotency-Key')) {
            headers.set('Idempotency-Key', crypto.randomUUID());
        }

        return headers;
    }

    private resetAuthStore(): void {
        // No-op - auth store removed
    }

    private logNetworkError(error: unknown, endpoint: string): void {
        import('@/lib/logging/error-service').then(({ errorService: errorManager }) => {
            errorManager.handleNetworkError(error, endpoint);
        }).catch(() => {});
    }

    private canRetryMethod(method: string): boolean {
        return RETRYABLE_METHODS.includes(method.toUpperCase());
    }

    private async isCsrfValidationFailure(response: Response): Promise<boolean> {
        if (response.status !== 403) return false;
        try {
            const body = await response.clone().json().catch(() => null) as { error?: string; message?: string } | null;
            const message = body?.error || body?.message || '';
            return message.toLowerCase().includes('csrf');
        } catch {
            return false;
        }
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

                // Handle CSRF validation failure - force refresh token and retry once
                if (await this.isCsrfValidationFailure(response) && retryCount < 1) {
                    await this.ensureCsrfToken(true);
                    await sleep(100); // Small delay to ensure cookie is set
                    retryCount++;
                    continue;
                }

                if (response.status === 401 && retryCount < 1) {
                    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/refresh');
                    
                    if (!isAuthEndpoint) {
                        if (this.isRefreshing) {
                            try {
                                const success = await new Promise<boolean>((resolve) => {
                                    this.subscribeTokenRefresh((refreshed) => {
                                        resolve(refreshed);
                                    });
                                });
                                if (success) {
                                    retryCount++;
                                    continue;
                                }
                            } catch {
                                // fallback to redirect
                            }
                        } else {
                            this.isRefreshing = true;
                            try {
                                const refreshUrl = normalizeEndpoint('/auth/refresh');
                                const refreshHeaders: Record<string, string> = {
                                    'Content-Type': 'application/json'
                                };
                                if (typeof window !== 'undefined') {
                                    const csrfToken = this.getCookie('_csrf');
                                    if (csrfToken) {
                                        refreshHeaders['X-CSRF-Token'] = csrfToken;
                                    }
                                }
                                const refreshRes = await fetch(refreshUrl, {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: refreshHeaders
                                });

                                if (refreshRes.ok) {
                                    this.isRefreshing = false;
                                    this.onRefreshed(true);
                                    retryCount++;
                                    continue;
                                }
                            } catch (err) {
                                console.error('Error during token refresh:', err);
                            }
                            this.isRefreshing = false;
                            this.onRefreshed(false);
                        }
                    }

                    if (detectRedirectLoop()) {
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
                            const isAlreadyOnAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath === '/admin-login' || currentPath === '/verify-email';
                            if (!isAlreadyOnAuthPage && !isAuthEndpoint) {
                                recordRedirect();
                                window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                            }
                        }
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
