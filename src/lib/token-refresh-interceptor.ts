'use client';

import { logger } from '@/lib/logger';
import { safeRemoveItem } from '@/lib/safe-client-utils';

/**
 * Clear authentication state from local storage
 */
function clearAuthState(): void {
  safeRemoveItem('authToken');
  safeRemoveItem('user');
  safeRemoveItem('token');
  safeRemoveItem('refreshToken');
}

/**
 * تحديث التوكن تلقائياً
 * Note: Token is in httpOnly cookie, so we can't check expiration from client
 * We'll rely on the server to handle token refresh based on the cookie
 */
export async function refreshTokenIfNeeded(bufferMinutes: number = 5): Promise<string | null> {
  // Token is in httpOnly cookie - we can't read it from JavaScript
  // Just call the refresh endpoint and let the server handle it
  // The server will check the refresh_token cookie and update access_token cookie if needed

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies for refresh
    });

    // التحقق من نوع المحتوى قبل تحليل JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json') ?? false;

    // قراءة النص أولاً للتحقق من نوع المحتوى
    const text = await response.text();

    // إذا كان HTML، يعني أن هناك خطأ في الخادم (مثل 404 أو 500 صفحة خطأ)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      // فقط في وضع التطوير نُظهر الخطأ التفصيلي
      if (process.env.NODE_ENV === 'development') {
        // Suppress HTML error logs unless explicitly debugging
        // logger.warn('[Development] Token refresh: Server returned HTML error page');
      }

      // If refresh failed, clear auth state
      clearAuthState();
      return null;
    }

    if (!response.ok) {
      // If refresh failed, clear auth state
      clearAuthState();

      // محاولة تحليل JSON للرسالة الخطأ
      if (isJson) {
        try {
          const errorData = JSON.parse(text);

          // Don't log error if it's just missing refresh token (expected when not logged in)
          if (
            errorData?.errorData?.error === 'REFRESH_TOKEN_MISSING' ||
            errorData?.error === 'REFRESH_TOKEN_MISSING' ||
            errorData?.code === 'REFRESH_TOKEN_MISSING'
          ) {
            // Just clear state and return null, no need to log as error
            clearAuthState();
            return null;
          }

          // Log other errors
          logger.warn('Token refresh failed:', {
            status: response.status,
            error: errorData?.error || 'Unknown error'
          });
        } catch {
          // لا بأس إذا فشل تحليل JSON
        }
      }

      return null;
    }

    // محاولة تحليل JSON من النص
    let data: { token?: string };
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // logger.error('Failed to parse token refresh response as JSON');
      return null;
    }

    // Token is updated in httpOnly cookie by server
    // Return success indicator (token is in cookie, not accessible from JS)
    if (data.token || response.ok) {
      return 'token_refreshed'; // Return indicator that refresh succeeded
    }

    return null;
  } catch (error) {
    // Network errors etc.
    // logger.error('Token refresh error:', error);
    clearAuthState();
    return null;
  }
}

/**
 * إعداد مراقب تلقائي لتحديث التوكن
 * يتحقق كل دقيقة من الحاجة للتحديث
 */
export function setupAutoTokenRefresh(
  onTokenRefreshed?: (token: string) => void,
  onRefreshFailed?: () => void,
  bufferMinutes: number = 5,
  checkIntervalMinutes: number = 4 // Increase interval to reduce load, server handles expiration
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let isRefreshing = false;

  // دالة التنظيف - تعريفها أولاً كدالة مسماة لتجنب مشاكل الـ hoisting
  const cleanup = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // دالة التحقق والتحديث - استخدام arrow function لضمان الوصول الصحيح لـ cleanup
  const checkAndRefresh = async () => {
    // تجنب التحديث المتزامن
    if (isRefreshing) return;

    // Token is in httpOnly cookie - we can't check expiration from client
    // Just call refresh endpoint periodically and let server handle it
    // Server will check refresh_token cookie and update access_token cookie if needed
    isRefreshing = true;
    try {
      const result = await refreshTokenIfNeeded(bufferMinutes);
      if (result) {
        // Token was refreshed (in cookie)
        onTokenRefreshed?.('token_refreshed');
      } else {
        // Refresh failed - token might be expired
        onRefreshFailed?.();
        cleanup();
      }
    } catch (error) {
      logger.error('Auto refresh error:', error);
      onRefreshFailed?.();
      cleanup();
    } finally {
      isRefreshing = false;
    }
  };

  // التحقق الفوري
  checkAndRefresh();

  // إعداد المراقبة الدورية
  intervalId = setInterval(
    checkAndRefresh,
    checkIntervalMinutes * 60 * 1000
  );

  return cleanup;
}

/**
 * Interceptor للـ fetch API لتحديث التوكن تلقائياً قبل الطلبات
 * Note: Token is in httpOnly cookie, so we don't add Authorization header
 * The server will read the token from the cookie automatically
 */
export function createAuthFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Ensure credentials are included for cookie-based auth
    if (!init) {
      init = { credentials: 'include' };
    } else if (!init.credentials) {
      init.credentials = 'include';
    }

    // إجراء الطلب الأصلي (لا حاجة لإضافة Authorization header - التوكن في cookie)
    let response = await originalFetch(input, init);

    // معالجة 401 Unauthorized - محاولة تحديث التوكن وإعادة الطلب
    if (response.status === 401) {
      // Token might be expired, try to refresh
      const refreshResult = await refreshTokenIfNeeded(0);

      if (refreshResult) {
        // Token was refreshed (in cookie), retry the request
        response = await originalFetch(input, init);
      }
    }

    return response;
  };

  // إرجاع دالة لاستعادة fetch الأصلي
  return () => {
    window.fetch = originalFetch;
  };
}

