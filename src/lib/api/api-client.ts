/**
 * Centralized API Client (Fetch Wrapper)
 * This replaces all custom apiFetch instances across the app to reduce over-engineering.
 */
import { performanceMonitor } from '../metrics/performance';

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

const AUTH_REFRESH_ENDPOINT = '/api/auth/refresh';

const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class ApiError extends Error {
    public status: number;
    public code?: string;
    public data?: any;

    constructor(message: string, status: number, code?: string, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const DEFAULT_API_URL = 'http://127.0.0.1:8082/api';

const BASE_API_URL = (typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL)).replace(/\/+$/, '');

function normalizeEndpoint(endpoint: string): string {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }

    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (normalized.startsWith('/api/')) {
        return normalized;
    }
    if (BASE_API_URL.endsWith('/api')) {
        return `${BASE_API_URL}${normalized}`;
    }
    return `${BASE_API_URL}/api${normalized}`;
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

class ApiClient {
    public async fetch(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<Response> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const headers = new Headers({
            ...(customOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...customOptions.headers,
        });

        try {
            const url = normalizeEndpoint(endpoint);
            const timer = performanceMonitor.startTimer('API Request', { endpoint, method: customOptions.method || 'GET' });
            const response = await fetch(url, {
                ...customOptions,
                headers,
                credentials: 'include',
                signal: controller.signal,
            });
            timer.stop();
            clearTimeout(id);

            if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login') && retryCount < 1) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return this.fetch(endpoint, options, retryCount + 1);
                }

                if (typeof window !== 'undefined') {
                    import('@/lib/auth/auth-store').then(({ useAuthStore }) => {
                        useAuthStore.getState().reset();
                    }).catch(() => {});
                }
            }

            const shouldRetry = [408, 429, 500, 502, 503, 504].includes(response.status) && retryCount < retries;
            if (shouldRetry) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.fetch(endpoint, options, retryCount + 1);
            }

            return response;
        } catch (error: unknown) {
            clearTimeout(id);

            const errName = (error as { name?: string })?.name;
            const errMsg = (error as { message?: string })?.message;

            if ((errName === 'AbortError' || errMsg?.includes('fetch')) && retryCount < retries) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.fetch(endpoint, options, retryCount + 1);
            }

            import('@/lib/logging/error-service').then(({ errorService: errorManager }) => {
                errorManager.handleNetworkError(error, endpoint);
            }).catch(() => {});

            throw error;
        }
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<T> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const headers = new Headers({
            'Content-Type': 'application/json',
            ...customOptions.headers,
        });

        // Developer Bypass for Admin Routes
        // Disabled by default to allow real authentication to work.
        /*
        const isDev = process.env.NODE_ENV === 'development' || 
                      (typeof window !== 'undefined' && (
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1'
                      ));

        if (isDev) {
            headers.set('X-Dev-Admin-Bypass', 'true');
        }
        */

        try {
            const url = normalizeEndpoint(endpoint);
            
            const timer = performanceMonitor.startTimer('API Request', { endpoint, method: customOptions.method || 'GET' });
            const response = await fetch(url, {
                ...customOptions,
                headers,
                credentials: 'include', // Ensure cookies are sent (access_token)
                signal: controller.signal,
            });
            timer.stop();

            clearTimeout(id);

            // Handle 401 Unauthorized - Attempt Token Refresh
            if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login') && retryCount < 1) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry original request once more
                    return this.request<T>(endpoint, options, retryCount + 1);
                }
                
                // If refresh failed, reset auth state (if in browser)
                if (typeof window !== 'undefined') {
                    import('@/lib/auth/auth-store').then(({ useAuthStore }) => {
                        useAuthStore.getState().reset();
                    }).catch(() => {});
                }
            }

            if (!response.ok) {
                let errorMessage = `Server error: ${response.statusText}`;
                let errorCode = 'HTTP_ERROR';
                let errorData: any = null;
                
                // Read response body once as text to avoid "body stream already read" errors
                const responseText = await response.text();
                try {
                    errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    errorCode = errorData.code || errorCode;
                } catch {
                    // If JSON parsing fails, use the raw text response if available
                    if (responseText) errorMessage = responseText;
                }

                const shouldRetry = [408, 429, 500, 502, 503, 504].includes(response.status) && retryCount < retries;
                if (shouldRetry) {
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                    return this.request<T>(endpoint, options, retryCount + 1);
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
        } catch (error: unknown) {
            clearTimeout(id);

            if (error instanceof ApiError) throw error;

            const errName = (error as { name?: string })?.name;
            const errMsg = (error as { message?: string })?.message;

            // Timeout or Network Retry
            if ((errName === 'AbortError' || errMsg?.includes('fetch')) && retryCount < retries) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.request<T>(endpoint, options, retryCount + 1);
            }

            // Handle to centralized ErrorManager (lazy import to avoid circular deps)
            import('@/lib/logging/error-service').then(({ errorService: errorManager }) => {
                errorManager.handleNetworkError(error, endpoint);
            }).catch(() => { /* silently ignore if ErrorManager fails to load */ });

            throw error;
        }
    }

    private refreshPromise: Promise<boolean> | null = null;

    private async refreshToken(): Promise<boolean> {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            try {
                const response = await fetch(AUTH_REFRESH_ENDPOINT, {
                    method: 'POST',
                    credentials: 'include',
                });
                return response.ok;
            } catch {
                return false;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
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
