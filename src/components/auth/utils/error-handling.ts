/**
 * Shared error handling utilities for auth components
 */

export interface ApiError {
  error: string;
  code?: string;
  retryAfterSeconds?: number;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<ApiError | null> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!isJson) {
    // Response is not JSON (likely HTML error page)
    const status = response.status;
    let errorMessage = `خطأ في الخادم (${status})`;
    
    if (status === 404) {
      errorMessage = 'مسار API غير موجود. يرجى التحقق من إعدادات الخادم.';
    } else if (status === 500) {
      errorMessage = 'خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
    } else if (status === 503) {
      errorMessage = 'الخادم غير متاح حالياً. يرجى المحاولة مرة أخرى لاحقاً.';
    }
    
    return {
      error: errorMessage,
      code: 'SERVER_RESPONSE_ERROR',
    };
  }

  try {
    const data = await response.json();
    return {
      error: data.error || 'حدث خطأ غير متوقع',
      code: typeof data.code === 'string' && data.code.trim().length > 0
        ? data.code
        : 'API_ERROR',
      retryAfterSeconds: data.retryAfterSeconds,
      requiresCaptcha: data.requiresCaptcha,
      failedAttempts: data.failedAttempts,
    };
  } catch (jsonError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('JSON parsing error:', jsonError);
    }
    return {
      error: `خطأ في الاتصال: ${response.status} ${response.statusText}`,
      code: 'PARSING_ERROR',
    };
  }
}

/**
 * Handle network errors
 */
export function handleNetworkError(error: unknown): { error: string; code: string } {
  if (error instanceof Error) {
    // Handle AbortError (timeout)
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return {
        error: 'انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        code: 'REQUEST_TIMEOUT',
      };
    }

    // Handle network errors
    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('Network request failed') ||
      error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('ERR_CONNECTION_TIMED_OUT') ||
      !navigator.onLine
    ) {
      return {
        error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      error: error.message || 'حدث خطأ غير متوقع',
      code: 'FETCH_ERROR',
    };
  }

  return {
    error: 'حدث خطأ غير متوقع',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Create a fetch with timeout
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise that resolves to Response or rejects with AbortError
 */
export function createFetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Enhanced fetch with automatic error handling and timeout
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise that resolves to parsed JSON or throws ApiError
 */
export async function fetchWithErrorHandling<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<T> {
  try {
    const response = await createFetchWithTimeout(url, options, timeoutMs);
    const apiError = await parseApiError(response);
    
    if (apiError) {
      throw apiError;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (isJson) {
      return await response.json() as T;
    }

    throw {
      error: `Expected JSON response but got ${contentType}`,
      code: 'INVALID_RESPONSE_TYPE',
    } as ApiError;
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      throw error;
    }
    
    const networkError = handleNetworkError(error as unknown);
    throw networkError;
  }
}

