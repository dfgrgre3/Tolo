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
    private buildHeaders(customOptions: RequestInit): Headers {
        const headers = new Headers({
            ...(customOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...customOptions.headers,
        });

        // Add CSRF token for state-changing requests in browser
        if (typeof window !== 'undefined' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(customOptions.method || 'GET')) {
            const csrfToken = this.getCookie('_csrf');
            if (csrfToken) {
                headers.set('X-CSRF-Token', csrfToken);
            }
        }
        return headers;
    }

    private resetAuthStore(): void {
        if (typeof window !== 'undefined') {
            import('@/lib/auth/auth-store').then(({ useAuthStore }) => {
                useAuthStore.getState().reset();
            }).catch(() => {});
        }
    }

    private logNetworkError(error: unknown, endpoint: string): void {
        import('@/lib/logging/error-service').then(({ errorService: errorManager }) => {
            errorManager.handleNetworkError(error, endpoint);
        }).catch(() => {});
    }

    private isRetryableError(error: unknown, retryCount: number, retries: number): boolean {
        const errName = (error as { name?: string })?.name;
        const errMsg = (error as { message?: string })?.message;
        return !!((errName === 'AbortError' || errMsg?.includes('fetch')) && retryCount < retries);
    }

    public async fetch(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<Response> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const headers = this.buildHeaders(customOptions);

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
                this.resetAuthStore();
            }

            const shouldRetry = [408, 429, 500, 502, 503, 504].includes(response.status) && retryCount < retries;
            if (shouldRetry) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.fetch(endpoint, options, retryCount + 1);
            }

            return response;
        } catch (error: unknown) {
            clearTimeout(id);

            if (this.isRetryableError(error, retryCount, retries)) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.fetch(endpoint, options, retryCount + 1);
            }

            this.logNetworkError(error, endpoint);
            throw error;
        }
    }

    private async handleApiErrorResponse(response: Response, retryCount: number, retries: number): Promise<boolean> {
        let errorMessage = `Server error: ${response.statusText}`;
        let errorCode = 'HTTP_ERROR';
        let errorData: any = null;
        
        const responseText = await response.text();
        try {
            errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorCode = errorData.code || errorCode;
        } catch {
            if (responseText) errorMessage = responseText;
        }

        const shouldRetry = [408, 429, 500, 502, 503, 504].includes(response.status) && retryCount < retries;
        if (shouldRetry) return true;

        throw new ApiError(errorMessage, response.status, errorCode, errorData);
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<T> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const headers = this.buildHeaders(customOptions);

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
                
                this.resetAuthStore();
            }

            if (!response.ok) {
                const shouldRetry = await this.handleApiErrorResponse(response, retryCount, retries);
                if (shouldRetry) {
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                    return this.request<T>(endpoint, options, retryCount + 1);
                }
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

            if (this.isRetryableError(error, retryCount, retries)) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.request<T>(endpoint, options, retryCount + 1);
            }

            this.logNetworkError(error, endpoint);
            throw error;
        }
    }

    private refreshPromise: Promise<boolean> | null = null;

    private async refreshToken(): Promise<boolean> {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            try {
                const headers: Record<string, string> = {};
                if (typeof window !== 'undefined') {
                    const csrfToken = this.getCookie('_csrf');
                    if (csrfToken) {
                        headers['X-CSRF-Token'] = csrfToken;
                    }
                }

                const response = await fetch(AUTH_REFRESH_ENDPOINT, {
                    method: 'POST',
                    headers,
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

    private getCookie(name: string): string | null {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }
}


export const apiClient = new ApiClient();
export default apiClient;
