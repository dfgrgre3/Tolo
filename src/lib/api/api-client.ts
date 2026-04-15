/**
 * Centralized API Client (Fetch Wrapper)
 * This replaces all custom apiFetch instances across the app to reduce over-engineering.
 */

// NOTE: ErrorManager is intentionally NOT imported at the top level.
// Doing so creates a circular dependency:
//   api-client → ErrorManager → safe-client-utils → client-logger → unified-logger → ErrorManager
// This cycle causes api-client to resolve as `undefined` in modules that import it (e.g. auth-client).
// Instead, ErrorManager is loaded lazily inside the catch block below.

interface FetchOptions extends RequestInit {
    timeout?: number;
    retries?: number;
}

const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class ApiError extends Error {
    public status: number;
    public code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ApiClient {
    private async request<T>(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<T> {
        const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...customOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const headers = new Headers({
            'Content-Type': 'application/json',
            ...customOptions.headers,
        });

        try {
            const response = await fetch(endpoint.startsWith('http') ? endpoint : `/api${endpoint}`, {
                ...customOptions,
                headers,
                credentials: 'include', // Ensure cookies are sent (access_token)
                signal: controller.signal,
            });

            clearTimeout(id);

            // Handle 401 Unauthorized - Attempt Token Refresh
            if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry original request one more time
                    return this.request<T>(endpoint, options, retryCount);
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
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    errorCode = errorData.code || errorCode;
                } catch {
                    const textData = await response.text();
                    if (textData) errorMessage = textData;
                }

                const shouldRetry = [408, 429, 500, 502, 503, 504].includes(response.status) && retryCount < retries;
                if (shouldRetry) {
                    await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                    return this.request<T>(endpoint, options, retryCount + 1);
                }

                throw new ApiError(errorMessage, response.status, errorCode);
            }

            // Check for empty response
            const contentLength = response.headers.get('content-length');
            if (response.status === 204 || contentLength === '0') {
                return {} as T;
            }

            return await response.json() as T;
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
                const response = await fetch('/api/auth/refresh', {
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
