/**
 * Centralized API Client (Fetch Wrapper)
 * This replaces all custom apiFetch instances across the app to reduce over-engineering.
 */

import errorManager from '@/services/ErrorManager';

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
                signal: controller.signal,
            });

            clearTimeout(id);

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
        } catch (error: any) {
            clearTimeout(id);

            // Timeout or Network Retry
            if ((error.name === 'AbortError' || error.message?.includes('fetch')) && retryCount < retries) {
                await sleep(RETRY_DELAY * Math.pow(2, retryCount));
                return this.request<T>(endpoint, options, retryCount + 1);
            }

            // Handle to centralized ErrorManager
            errorManager.handleNetworkError(error, endpoint);

            throw error;
        }
    }

    public get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public post<T>(endpoint: string, body: any, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    public put<T>(endpoint: string, body: any, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    public patch<T>(endpoint: string, body: any, options?: FetchOptions): Promise<T> {
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
