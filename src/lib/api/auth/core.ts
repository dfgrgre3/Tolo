/**
 * Core API functionality for authentication
 */

const API_TIMEOUT = 30000; // 30 seconds
const API_BASE_URL = '/api/auth';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const CONNECTION_TIMEOUT = 15000; // 15 seconds for connection timeout

/**
 * Check if device is online
 */
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = (error as Error).message || String(error);
    const errorName = (error as Error).name || '';

    return (
        errorName === 'TypeError' ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
        errorMessage.includes('ERR_NETWORK_CHANGED') ||
        !isOnline()
    );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
    if (!error) return false;

    const errorName = (error as Error).name || '';
    const errorMessage = (error as Error).message || String(error);

    return (
        errorName === 'AbortError' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('TIMED_OUT')
    );
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown, status?: number): boolean {
    if (status && RETRYABLE_STATUS_CODES.includes(status)) {
        return true;
    }

    if (isTimeoutError(error) || isNetworkError(error)) {
        return true;
    }

    return false;
}

/**
 * Generic fetch wrapper with timeout, retry logic, and comprehensive error handling
 * Improved with connection timeout and better error handling
 */
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
): Promise<T> {
    // Check online status before making request
    if (!isOnline()) {
        throw {
            error: 'لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
            code: 'NETWORK_ERROR',
        };
    }

    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
        throw {
            error: 'مسار API غير صحيح',
            code: 'INVALID_ENDPOINT',
        };
    }

    const controller = new AbortController();
    let timeoutReason: string | null = null;

    const timeoutId = setTimeout(() => {
        timeoutReason = 'Request timeout';
        controller.abort();
    }, API_TIMEOUT);

    // Add connection timeout for faster failure detection
    const connectionTimeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
            timeoutReason = 'Connection timeout';
            controller.abort();
        }
    }, CONNECTION_TIMEOUT);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearTimeout(connectionTimeoutId);

        // Handle empty response
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');
        const contentLength = response.headers.get('content-length');
        const hasContent = contentLength !== '0' && contentLength !== null;

        // Read response body once (can only be read once)
        let responseText = '';
        let responseData: unknown = null;

        try {
            responseText = await response.text();
            if (responseText && responseText.trim().length > 0) {
                // Check if it's HTML (error page) - this takes priority
                const isHtml = responseText.trim().startsWith('<!DOCTYPE html>') ||
                    responseText.trim().startsWith('<html') ||
                    responseText.trim().startsWith('<HTML');

                if (isHtml) {
                    // This is HTML, not JSON - likely an error page from Next.js
                    const status = response.status;
                    let errorMessage = `خطأ في الخادم (${status})`;

                    if (status === 404) {
                        errorMessage = 'مسار API غير موجود. يرجى التحقق من إعدادات الخادم.';
                    } else if (status === 500) {
                        errorMessage = 'خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
                    } else if (status === 503) {
                        errorMessage = 'الخادم غير متاح حالياً. يرجى المحاولة مرة أخرى لاحقاً.';
                    } else if (status >= 400 && status < 500) {
                        errorMessage = `خطأ في الطلب (${status}). يرجى التحقق من البيانات المرسلة.`;
                    } else if (status >= 500) {
                        errorMessage = `خطأ في الخادم (${status}). يرجى المحاولة مرة أخرى لاحقاً.`;
                    }

                    throw {
                        error: errorMessage,
                        code: status === 404 ? 'NOT_FOUND' :
                            status === 429 ? 'RATE_LIMITED' :
                                status >= 500 ? 'SERVER_ERROR' :
                                    'SERVER_RESPONSE_ERROR',
                        status,
                    };
                }

                // Try to parse as JSON
                try {
                    responseData = JSON.parse(responseText);
                } catch (parseError) {
                    // Not valid JSON and not HTML - this is unusual
                    // Check if response should be JSON based on content-type
                    if (!isJson) {
                        const status = response.status;
                        throw {
                            error: 'استجابة غير صحيحة من الخادم - تنسيق غير متوقع',
                            code: 'INVALID_RESPONSE_FORMAT',
                            status,
                        };
                    }

                    // Content-type says JSON but parsing failed
                    const status = response.status;
                    throw {
                        error: 'فشل في معالجة استجابة الخادم',
                        code: 'JSON_PARSE_ERROR',
                        status,
                    };
                }
            } else {
                // Empty response
                if (response.status === 204 || (response.status === 200 && !hasContent)) {
                    // For login endpoint, empty response is an error
                    if (endpoint === '/login') {
                        throw {
                            error: 'استجابة فارغة من الخادم. يرجى المحاولة مرة أخرى.',
                            code: 'EMPTY_RESPONSE',
                            status: response.status,
                        };
                    }
                    return {} as T;
                }
            }
        } catch (readError: unknown) {
            // If error already has structure, re-throw it
            if (readError && (readError as { error?: string; code?: string }).error) {
                throw readError;
            }

            // Otherwise, create a generic error
            throw {
                error: 'فشل في قراءة استجابة الخادم',
                code: 'RESPONSE_READ_ERROR',
                status: response.status,
            };
        }

        // Handle non-OK responses
        if (!response.ok) {
            // Check if error is retryable and we haven't exceeded max retries
            const isRetryable = isRetryableError(null, response.status);

            if (isRetryable && retryCount < MAX_RETRIES) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = RETRY_DELAY * Math.pow(2, retryCount);
                await sleep(delay);

                // Retry the request
                return apiFetch<T>(endpoint, options, retryCount + 1);
            }

            // Handle error response
            if (responseData && typeof responseData === 'object') {
                // Check if responseData is empty object
                const responseDataKeys = Object.keys(responseData);
                if (responseDataKeys.length === 0) {
                    // Empty object response - create proper error
                    throw {
                        error: `خطأ في الخادم: ${response.statusText || 'Unknown Error'} (${response.status})`,
                        code: response.status === 429 ? 'RATE_LIMITED' :
                            response.status === 404 ? 'NOT_FOUND' :
                                response.status >= 500 ? 'SERVER_ERROR' :
                                    'SERVER_RESPONSE_ERROR',
                        status: response.status,
                    };
                }

                // Valid JSON error response
                const error: Record<string, unknown> = {
                    ...responseData,
                    status: response.status,
                };

                // Ensure error has at least error message and code
                if (!error.error && !error.message) {
                    error.error = `خطأ في الخادم: ${response.statusText || 'Unknown Error'} (${response.status})`;
                }

                // Add specific error codes based on status if not present
                if (!error.code) {
                    if (response.status === 401) {
                        error.code = 'UNAUTHORIZED';
                    } else if (response.status === 403) {
                        error.code = 'FORBIDDEN';
                    } else if (response.status === 404) {
                        error.code = 'NOT_FOUND';
                    } else if (response.status === 429) {
                        error.code = 'RATE_LIMITED';
                    } else if (response.status >= 500) {
                        error.code = 'SERVER_ERROR';
                    } else {
                        error.code = 'HTTP_ERROR';
                    }
                }

                throw error;
            } else {
                // Non-JSON or empty error response
                const statusMessage = response.statusText || 'Unknown Error';
                let errorMessage = `خطأ في الخادم: ${statusMessage} (${response.status})`;

                if (responseText && responseText.trim().length > 0 && responseText.length < 200) {
                    // Use text response if it's short enough
                    errorMessage = responseText;
                }

                throw {
                    error: errorMessage,
                    code: response.status === 429 ? 'RATE_LIMITED' :
                        response.status === 404 ? 'NOT_FOUND' :
                            response.status >= 500 ? 'SERVER_ERROR' :
                                'SERVER_RESPONSE_ERROR',
                    status: response.status,
                };
            }
        }

        // Successful response - return parsed data
        if (responseData !== null) {
            return responseData as T;
        }

        // Empty successful response - for login endpoint, this is an error
        if (endpoint === '/login') {
            throw {
                error: 'استجابة فارغة من الخادم. يرجى المحاولة مرة أخرى.',
                code: 'EMPTY_RESPONSE',
                status: response.status,
            };
        }

        // For other endpoints, return empty object
        return {} as T;
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        clearTimeout(connectionTimeoutId);

        // Check if error is retryable and we haven't exceeded max retries
        if (isRetryableError(error) && retryCount < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            await sleep(delay);

            // Retry the request
            return apiFetch<T>(endpoint, options, retryCount + 1);
        }

        // Check if error is empty object first
        if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
            // Log this weird case
            if (process.env.NODE_ENV === 'development') {
                console.error('apiFetch caught empty error:', error);
            }

            throw {
                error: 'حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.',
                code: 'UNEXPECTED_ERROR',
                originalError: String(error)
            };
        }

        // If error already has the expected structure, normalize it
        if (error && typeof error === 'object' && ((error as { error?: string }).error || (error as { code?: string }).code)) {
            // Ensure error message is present
            const normalizedError = {
                error: (error as { error?: string; message?: string }).error || (error as { error?: string; message?: string }).message || 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.',
                code: (error as { code?: string }).code || 'UNEXPECTED_ERROR',
                ...((error as { status?: number }).status !== undefined && { status: (error as { status?: number }).status }),
                ...((error as { retryAfterSeconds?: number }).retryAfterSeconds !== undefined && { retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds }),
                ...((error as { requiresCaptcha?: boolean }).requiresCaptcha !== undefined && { requiresCaptcha: (error as { requiresCaptcha?: boolean }).requiresCaptcha }),
            };
            throw normalizedError;
        }

        // Handle timeout errors
        if (isTimeoutError(error)) {
            throw {
                error: timeoutReason === 'Connection timeout'
                    ? 'انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
                    : 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
                code: 'REQUEST_TIMEOUT',
            };
        }

        // Handle network errors
        if (isNetworkError(error)) {
            throw {
                error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
                code: 'FETCH_ERROR',
            };
        }

        // Generic error - ensure we always have a proper error structure
        let errorMessage = 'حدث خطأ غير متوقع أثناء معالجة الطلب';
        if (error instanceof Error) {
            errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
            errorMessage = error || errorMessage;
        } else if ((error as { message?: string }).message) {
            errorMessage = (error as { message: string }).message;
        } else if ((error as { error?: string }).error) {
            errorMessage = (error as { error: string }).error;
        } else {
            errorMessage = String(error) || errorMessage;
        }

        throw {
            error: errorMessage,
            code: 'UNEXPECTED_ERROR',
            ...(process.env.NODE_ENV === 'development' && {
                originalError: String(error),
            }),
        };
    }
}
