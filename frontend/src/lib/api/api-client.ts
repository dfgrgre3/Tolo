/**
 * Centralized API Client (Fetch Wrapper)
 * This replaces all custom apiFetch instances across the app to reduce over-engineering.
 */
import { performanceMonitor } from '../metrics/performance';
import { getBackendApiUrl } from './backend-url';
import { requestCache } from './request-cache';
import { applyCsrfHeader, ensureCsrfToken, isCsrfValidationFailure } from './csrf';
import { handleUnauthorized } from './redirect-loop-guard';
import { requiresIdempotencyKey } from './idempotency-policy';
import {
    RETRYABLE_STATUSES,
    RETRY_DELAY,
    canRetryMethod,
    isRetryableError,
    classifyFetchError,
    sleep,
    TimeoutError,
    CallerAbortError,
} from './retry-policy';

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
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    code?: string;
}

/** Thrown when an HTTP-success response violates the API envelope contract. */
export class ApiContractError extends Error {
    public readonly status = 502;
    public readonly payload: unknown;

    constructor(message: string, payload: unknown) {
        super(message);
        this.name = 'ApiContractError';
        this.payload = payload;
    }
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | object;
type JsonBody<T> = T extends FormData | Blob | ArrayBuffer | URLSearchParams | ReadableStream
    ? never
    : T;

// Client-side request timeout. Set to 30s — slightly larger than the
// proxy's FETCH_TIMEOUT_MS (25s in /api/[...path]/route.ts) so a slow
// cold-start backend gets a chance to respond before the client gives up.
// The previous 15s was too tight: when the Go backend's DB pool was still
// warming up on a cold start, the proxy's 12s timeout + client 15s timeout
// would both fire within ~15s and surface a TimeoutError to the user even
// though the backend would have succeeded a few seconds later.
const API_TIMEOUT = 30_000;
// Proxy timeout is 25s (FETCH_TIMEOUT_MS in /api/[...path]/route.ts)
// Client timeout is slightly larger to allow proper error propagation,
// but not so large that it masks backend issues.
// One retry is enabled for methods explicitly accepted by retry-policy.
// Write methods qualify only when the endpoint policy supplied an
// Idempotency-Key, so the backend can replay the same mutation.
const MAX_RETRIES = 1;

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

    get isUnauthorized(): boolean { return this.status === 401; }
    get isForbidden(): boolean { return this.status === 403; }
    get isNotFound(): boolean { return this.status === 404; }
    get isValidation(): boolean { return this.status === 422; }
    get isRateLimited(): boolean { return this.status === 429; }
}

function normalizeEndpoint(endpoint: string): string {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }

    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // In the browser, always use relative path (/api/...) to route through Next.js proxy.
    // This avoids CORS issues entirely.
    if (typeof window !== 'undefined') {
        if (normalized.startsWith('/api/')) {
            return normalized;
        }
        return `/api${normalized}`;
    }

    return getBackendApiUrl(normalized);
}


/**
 * Converts the transport response into the application payload contract.
 *
 * `apiClient` is intentionally an unwrapped client: callers' `T` is always
 * the value inside `data`. A response that advertises an envelope but omits
 * its data is a contract failure, not a valid empty application payload.
 */
export function unwrapApplicationPayload<T>(payload: unknown): T {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return payload as T;
    }

    const envelope = payload as Partial<ApiEnvelope<T>> & Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(envelope, 'success')) {
        return payload as T;
    }

    if (envelope.success !== true || !Object.prototype.hasOwnProperty.call(envelope, 'data')) {
        throw new ApiContractError('Invalid API success envelope', payload);
    }

    return envelope.data as T;
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
    private async buildHeaders(endpoint: string, customOptions: RequestInit): Promise<Headers> {
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

        // Only explicitly replay-safe endpoint families receive an idempotency
        // key. Login, logout, telemetry, search-like POSTs, and uploads have
        // different semantics and must not inherit payment retry behavior.
        if (isWriteMethod && requiresIdempotencyKey(customOptions.method || 'GET', endpoint) && !headers.has('Idempotency-Key')) {
            headers.set('Idempotency-Key', crypto.randomUUID());
        }

        return headers;
    }

    private logNetworkError(error: unknown, endpoint: string): void {
        // Caller cancellation and our own internal timeouts are expected
        // control flow, not failures — logging them as HIGH network errors
        // just spams Sentry/console with noise on every unmount/navigation.
        const classified = classifyFetchError(error);
        if (classified instanceof CallerAbortError || classified instanceof TimeoutError) {
            return;
        }

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
            // Internal timeout: stamp a TimeoutError onto the controller so the
            // catch block below can recover the original reason even after the
            // generic `AbortError` DOMException is raised by `fetch`.
            const id = setTimeout(() => {
                controller.abort(new TimeoutError());
            }, timeout);

            // Forward the caller's own AbortSignal (if any) into the internal
            // timeout controller. Without this, `fetcher()` below always sent
            // `controller.signal` and silently discarded any `signal` the
            // caller passed in `options` (e.g. auth-context's unmount cleanup)
            // — the caller's abort had no effect and the request kept running.
            const externalSignal = customOptions.signal instanceof AbortSignal ? customOptions.signal : undefined;
            // Stamp a CallerAbortError on the controller so downstream code
            // can `instanceof` it instead of guessing from `error.name` /
            // `error.message`. We never propagate the caller's raw `reason`
            // (often a plain string like "Component unmounted") because that
            // breaks the error taxonomy.
            const forwardAbort = () => controller.abort(new CallerAbortError());
            if (externalSignal) {
                if (externalSignal.aborted) {
                    controller.abort(new CallerAbortError());
                } else {
                    externalSignal.addEventListener('abort', forwardAbort);
                }
            }

            const headers = await this.buildHeaders(endpoint, customOptions);
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

                const hasIdempotencyKey = headers.has('Idempotency-Key');
                const shouldRetry = canRetryMethod(method, hasIdempotencyKey)
                    && RETRYABLE_STATUSES.includes(response.status)
                    && retryCount < retries;
                if (shouldRetry) {
                    retryCount++;
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount - 1));
                    continue;
                }

                return response;
            } catch (error: unknown) {
                clearTimeout(id);

                // Recover the reason we stamped on the controller. `fetch`
                // unwraps the DOMException reason into a generic
                // `DOMException { name: 'AbortError' }`, but we can recover
                // the original `TimeoutError` / `CallerAbortError` instance
                // we passed to `controller.abort(reason)` — that's the whole
                // reason we used explicit classes.
                const reason = controller.signal.reason;
                const classified = (reason instanceof TimeoutError || reason instanceof CallerAbortError)
                    ? reason
                    : classifyFetchError(error);

                // The caller explicitly cancelled (e.g. a component unmounting) —
                // propagate immediately. Without this check the abort is
                // indistinguishable from an internal timeout abort below and
                // would be retried, which re-issues a request the caller no
                // longer wants.
                if (externalSignal?.aborted || classified instanceof CallerAbortError) {
                    throw classified;
                }

                if (isRetryableError(
                    classified,
                    retryCount,
                    retries,
                    customOptions.method || 'GET',
                    headers.has('Idempotency-Key'),
                )) {
                    retryCount++;
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount - 1));
                    continue;
                }

                this.logNetworkError(classified, endpoint);
                throw classified;
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

        const payload = await response.json();
        return unwrapApplicationPayload<T>(payload);
    }

    public get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public postJson<TResult, TBody extends JsonValue = JsonValue>(endpoint: string, body: JsonBody<TBody>, options?: FetchOptions): Promise<TResult> {
        return this.request<TResult>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /** @deprecated Use postJson() for JSON or postRaw() for another body type. */
    public post<TResult, TBody extends JsonValue = JsonValue>(endpoint: string, body: JsonBody<TBody>, options?: FetchOptions): Promise<TResult> {
        return this.postJson<TResult, TBody>(endpoint, body, options);
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

    public postRaw<T>(endpoint: string, body: BodyInit, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body,
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
