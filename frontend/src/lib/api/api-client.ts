/**
 * Centralized API Client (Fetch Wrapper)
 * This replaces all custom apiFetch instances across the app to reduce over-engineering.
 */
import { performanceMonitor } from '../metrics/performance';
import { trimTrailingSlashes } from '../utils';
import { requestCache } from './request-cache';
import { applyCsrfHeader, ensureCsrfToken, isCsrfValidationFailure } from './csrf';
import { handleUnauthorized } from './redirect-loop-guard';
import { RETRYABLE_STATUSES, RETRY_DELAY, canRetryMethod, isRetryableError, sleep } from './retry-policy';

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

const isBrowser = typeof window !== 'undefined';

export const DEFAULT_API_URL = 'http://127.0.0.1:8082/api/v1';

const BASE_API_URL = trimTrailingSlashes(
    isBrowser
        ? '/api'
        : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL)
);

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

    // Server-side (SSR) requests use the absolute base URL. The backend is
    // versioned at /api/v1 (internal/infrastructure/api/*_routes.go) — always
    // land on exactly one /api/v1 segment regardless of whether BASE_API_URL
    // or the caller-supplied endpoint already includes one.
    const withoutApiPrefix = normalized.startsWith('/api/')
        ? normalized.substring(4)
        : normalized;
    const base = BASE_API_URL.replace(/\/api(\/v1)?$/, '');
    return `${base}/api/v1${withoutApiPrefix}`;
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
 * Builds an ApiError from a non-OK response, preferring the backend's own
 * `error`/`message`/`code` fields and falling back to the raw body text.
 * Consumes the response body — call at most once per response.
 */
async function buildApiError(response: Response): Promise<ApiError> {
    let errorMessage = `Server error: ${response.statusText}`;
    let errorCode = 'HTTP_ERROR';
    let errorData: Record<string, unknown> | undefined;

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

    return new ApiError(errorMessage, response.status, errorCode, errorData);
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

        const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(customOptions.method || 'GET');

        // For state-changing requests in the browser: guarantee the CSRF cookie exists first,
        // then inject it as the X-CSRF-Token header (Double Submit Cookie pattern).
        await applyCsrfHeader(headers, isWriteMethod);

        // Auto-generate Idempotency-Key for write requests (idempotency middleware)
        if (isWriteMethod && !headers.has('Idempotency-Key')) {
            headers.set('Idempotency-Key', crypto.randomUUID());
        }

        return headers;
    }

    private logNetworkError(error: unknown, endpoint: string): void {
        // Aborts (caller cancellation, our own timeout) are expected control
        // flow, not failures — logging them as HIGH network errors just
        // spams Sentry/console with noise on every unmount/navigation.
        //
        // We can't rely solely on `error instanceof DOMException && name === 'AbortError'`:
        // when a caller aborts with a plain string reason (e.g.
        // `controller.abort("Component unmounted")`), `forwardAbort` propagates
        // that reason as-is via `controller.abort(externalSignal.reason ?? ...)`,
        // so the resulting rejection can be a generic Error whose name isn't
        // 'AbortError' at all. Detect those cases by name/message too.
        const name = (error as { name?: string } | null)?.name;
        const message = (error as { message?: string } | null)?.message;
        const isAbortLike =
            name === 'AbortError' ||
            (typeof message === 'string' && /aborted|abort/i.test(message));
        if (isAbortLike) return;

        import('@/lib/logging/error-service').then(({ errorService: errorManager }) => {
            errorManager.handleNetworkError(error, endpoint);
        }).catch(() => { });
    }

    public async fetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;
        let retryCount = 0;
        let savedIdempotencyKey: string | null = null;

        while (true) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeout);

            // Forward the caller's own AbortSignal (if any) into the internal
            // timeout controller. Without this, `fetcher()` below always sent
            // `controller.signal` and silently discarded any `signal` the
            // caller passed in `options` (e.g. auth-context's unmount cleanup)
            // — the caller's abort had no effect and the request kept running.
            const externalSignal = customOptions.signal instanceof AbortSignal ? customOptions.signal : undefined;
            // Always forward as a proper AbortError DOMException — never the
            // caller's raw `reason` (often a plain string like "Component
            // unmounted" from `controller.abort("...")`), so downstream
            // `error.name === 'AbortError'` checks (e.g. logNetworkError)
            // reliably recognize this as a cancellation, not a failure.
            const forwardAbort = () => controller.abort(new DOMException('Aborted by caller', 'AbortError'));
            if (externalSignal) {
                if (externalSignal.aborted) {
                    controller.abort();
                } else {
                    externalSignal.addEventListener('abort', forwardAbort);
                }
            }

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
                if (await isCsrfValidationFailure(response) && retryCount < 1) {
                    await ensureCsrfToken(true);
                    await sleep(100); // Small delay to ensure cookie is set
                    retryCount++;
                    continue;
                }

                // See redirect-loop-guard.ts for why a 401 here only means
                // "the middleware's silent refresh already failed" and is
                // handled as a safety-net redirect, not a refresh trigger.
                if (response.status === 401) {
                    handleUnauthorized(endpoint);
                }

                const shouldRetry = canRetryMethod(method) && RETRYABLE_STATUSES.includes(response.status) && retryCount < retries;
                if (shouldRetry) {
                    retryCount++;
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount - 1));
                    continue;
                }

                return response;
            } catch (error: unknown) {
                clearTimeout(id);

                // The caller explicitly cancelled (e.g. a component unmounting) —
                // propagate immediately. Without this check the abort is
                // indistinguishable from an internal timeout abort below and
                // would be retried, which re-issues a request the caller no
                // longer wants.
                if (externalSignal?.aborted) {
                    throw error;
                }

                if (isRetryableError(error, retryCount, retries, customOptions.method || 'GET')) {
                    retryCount++;
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount - 1));
                    continue;
                }

                this.logNetworkError(error, endpoint);
                throw error;
            } finally {
                if (externalSignal) {
                    externalSignal.removeEventListener('abort', forwardAbort);
                }
            }
        }
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const response = await this.fetch(endpoint, options);

        if (!response.ok) {
            throw await buildApiError(response);
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

    /**
     * POST a raw FormData body (multipart/form-data) without JSON-stringifying it.
     * Use this for file uploads — `post()` always calls JSON.stringify on its body,
     * which turns a FormData instance into "{}" and silently drops the file.
     */
    public postForm<T>(endpoint: string, formData: FormData, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: formData,
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
