'use client';

import { getTokenFromStorage, setAuthToken, clearAuthState } from './auth-client';

interface DecodedToken {
  exp: number;
  iat: number;
  userId: string;
  email: string;
}

/**
 * فك تشفير التوكن بدون مكتبة خارجية (فك تشفير بسيط للـ payload فقط)
 */
function decodeTokenPayload(token: string): DecodedToken | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // فك base64 للـ payload
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    return decoded as DecodedToken;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * حساب الوقت المتبقي قبل انتهاء صلاحية التوكن (بالميلي ثانية)
 */
function getTokenExpirationTime(token: string): number | null {
  try {
    const decoded = decodeTokenPayload(token);
    if (!decoded || !decoded.exp) return null;
    
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    return expirationTime;
  } catch (error) {
    console.error('Error getting token expiration:', error);
    return null;
  }
}

/**
 * حساب الوقت المتبقي قبل انتهاء صلاحية التوكن
 */
function getTimeUntilExpiration(token: string): number | null {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return null;
  
  const now = Date.now();
  const timeUntilExpiration = expirationTime - now;
  
  return timeUntilExpiration;
}

/**
 * التحقق من صلاحية التوكن
 */
export function isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
  const timeUntilExpiration = getTimeUntilExpiration(token);
  if (!timeUntilExpiration) return true; // إذا فشل فك التشفير، اعتبره منتهي
  
  const bufferMs = bufferMinutes * 60 * 1000;
  return timeUntilExpiration <= bufferMs;
}

/**
 * تحديث التوكن تلقائياً
 */
export async function refreshTokenIfNeeded(bufferMinutes: number = 5): Promise<string | null> {
  const token = getTokenFromStorage();
  
  if (!token) {
    return null;
  }
  
  // التحقق من الحاجة للتحديث
  if (!isTokenExpiringSoon(token, bufferMinutes)) {
    return token; // التوكن لا يزال صالحاً
  }
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
        console.warn(
          '[Development] Token refresh: Server returned HTML error page instead of JSON:',
          {
            status: response.status,
            statusText: response.statusText
          }
        );
      }
      
      // إذا فشل التحديث والتوكن منتهي، امسح الحالة
      const timeUntilExpiration = getTimeUntilExpiration(token);
      if (timeUntilExpiration && timeUntilExpiration <= 0) {
        clearAuthState();
      }
      
      return null;
    }
    
    if (!response.ok) {
      // إذا فشل التحديث والتوكن منتهي، امسح الحالة
      const timeUntilExpiration = getTimeUntilExpiration(token);
      if (timeUntilExpiration && timeUntilExpiration <= 0) {
        clearAuthState();
        return null;
      }
      
      // محاولة تحليل JSON للرسالة الخطأ
      if (isJson) {
        try {
          const errorData = JSON.parse(text);
          console.error('Token refresh failed:', errorData);
        } catch {
          // لا بأس إذا فشل تحليل JSON
        }
      }
      
      return null;
    }
    
    // محاولة تحليل JSON من النص
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse token refresh response as JSON:', text.substring(0, 100));
      return null;
    }
    
    if (data.token) {
      setAuthToken(data.token);
      return data.token;
    }
    
    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // إذا كان التوكن منتهي بالفعل، امسح الحالة
    const timeUntilExpiration = getTimeUntilExpiration(token);
    if (timeUntilExpiration && timeUntilExpiration <= 0) {
      clearAuthState();
    }
    
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
  checkIntervalMinutes: number = 1
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
    
    const token = getTokenFromStorage();
    if (!token) {
      cleanup();
      return;
    }
    
    if (isTokenExpiringSoon(token, bufferMinutes)) {
      isRefreshing = true;
      try {
        const newToken = await refreshTokenIfNeeded(bufferMinutes);
        if (newToken) {
          onTokenRefreshed?.(newToken);
        } else {
          onRefreshFailed?.();
          cleanup();
        }
      } catch (error) {
        console.error('Auto refresh error:', error);
        onRefreshFailed?.();
        cleanup();
      } finally {
        isRefreshing = false;
      }
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
 */
export function createAuthFetchInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // تحديث التوكن قبل إجراء الطلب إذا لزم الأمر
    const refreshedToken = await refreshTokenIfNeeded();
    
    // إضافة التوكن إلى الـ headers إذا كان موجوداً
    if (refreshedToken && (!init || !init.headers)) {
      init = init || {};
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${refreshedToken}`,
      };
    } else if (refreshedToken && init?.headers) {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      init.headers = headers;
    }
    
    // إجراء الطلب الأصلي
    let response = await originalFetch(input, init);
    
    // معالجة 401 Unauthorized - محاولة تحديث التوكن وإعادة الطلب
    if (response.status === 401) {
      const token = getTokenFromStorage();
      if (token && isTokenExpiringSoon(token, 0)) {
        // التوكن منتهي، حاول التحديث
        const newToken = await refreshTokenIfNeeded(0);
        
        if (newToken && newToken !== token) {
          // إعادة الطلب بالتوكن الجديد
          const newInit = { ...init };
          const headers = new Headers(newInit?.headers);
          headers.set('Authorization', `Bearer ${newToken}`);
          newInit.headers = headers;
          
          response = await originalFetch(input, newInit);
        }
      }
    }
    
    return response;
  };
  
  // إرجاع دالة لاستعادة fetch الأصلي
  return () => {
    window.fetch = originalFetch;
  };
}

