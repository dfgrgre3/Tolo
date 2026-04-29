'use client';

/**
 * مكتبة شاملة للوصول الآمن لواجهات برمجة التطبيقات الخاصة بالعميل
 * Comprehensive library for safe client-side API access
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Use console internally to avoid circular dependencies with the unified logger
const logger = console;

// ==================== Type Definitions ====================

type StorageType = 'local' | 'session';

interface SafeStorageOptions<T = unknown> {
  /** قيمة افتراضية في حالة عدم توفر التخزين */
  fallback?: T;
  /** نوع التخزين */
  storageType?: StorageType;
  /** تحليل القيمة المخزنة */
  parser?: (value: string) => T;
  /** تحويل القيمة قبل التخزين */
  serializer?: (value: T) => string;
}

// ==================== Storage Safety Checks ====================

/**
 * فحص ما إذا كان localStorage متاحًا
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * فحص ما إذا كان sessionStorage متاحًا
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, 'test');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * الحصول على كائن التخزين المناسب
 * Get the appropriate storage object
 */
function getStorage(type: StorageType = 'local'): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return type === 'local' ? window.localStorage : window.sessionStorage;
  } catch (e) {
    logger.warn(`Failed to access ${type}Storage:`, e);
    return null;
  }
}

// ==================== Safe Storage Operations ====================

/**
 * قراءة قيمة من التخزين بشكل آمن
 * Safely read a value from storage
 */
export function safeGetItem<T = unknown>(
key: string,
options: SafeStorageOptions<T> = {})
: T | null {
  const { fallback = null, storageType = 'local', parser } = options;

  const storage = getStorage(storageType);
  if (!storage) return fallback;

  try {
    const item = storage.getItem(key);
    if (item === null) return fallback;

    if (parser) {
      return parser(item);
    }

    // Try to parse as JSON by default
    try {
      return JSON.parse(item);
    } catch {
      return item as unknown as T;
    }
  } catch (e) {
    logger.warn(`Failed to get item "${key}" from ${storageType}Storage:`, e);
    return fallback;
  }
}

/**
 * كتابة قيمة إلى التخزين بشكل آمن
 * Safely write a value to storage
 */
export function safeSetItem<T = unknown>(
key: string,
value: T,
options: SafeStorageOptions<T> = {})
: boolean {
  const { storageType = 'local', serializer } = options;

  const storage = getStorage(storageType);
  if (!storage) return false;

  try {
    const stringValue = serializer ?
    serializer(value) :
    typeof value === 'string' ?
    value :
    JSON.stringify(value);

    storage.setItem(key, stringValue);
    return true;
  } catch (e) {
    logger.warn(`Failed to set item "${key}" in ${storageType}Storage:`, e);
    return false;
  }
}

/**
 * حذف قيمة من التخزين بشكل آمن
 * Safely remove a value from storage
 */
function safeRemoveItem(
key: string,
options: SafeStorageOptions = {})
: boolean {
  const { storageType = 'local' } = options;

  const storage = getStorage(storageType);
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch (e) {
    logger.warn(`Failed to remove item "${key}" from ${storageType}Storage:`, e);
    return false;
  }
}

/**
 * مسح جميع البيانات من التخزين بشكل آمن
 * Safely clear all storage
 */
function safeClearStorage(storageType: StorageType = 'local'): boolean {
  const storage = getStorage(storageType);
  if (!storage) return false;

  try {
    storage.clear();
    return true;
  } catch (e) {
    logger.warn(`Failed to clear ${storageType}Storage:`, e);
    return false;
  }
}

// ==================== React Hooks ====================

/**
 * Hook للوصول الآمن إلى localStorage مع المزامنة التلقائية
 * Hook for safe localStorage access with automatic sync
 */
export function useSafeLocalStorage<T = any>(
key: string,
initialValue: T)
: [T, (value: T | ((prev: T) => T)) => void, boolean] {
  // Use useSyncExternalStore for safe storage access
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (mounted) {
      const value = safeGetItem(key, { fallback: initialValue });
      setStoredValue(value as T);
    }
  }, [key, initialValue, mounted]);

  // دالة لتحديث القيمة
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);
      safeSetItem(key, valueToStore);
    } catch (_error) {
      logger.warn(`Error setting localStorage key "${key}":`, _error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, mounted];
}

/**
 * Hook للوصول الآمن إلى sessionStorage مع المزامنة التلقائية
 * Hook for safe sessionStorage access with automatic sync
 */
function useSafeSessionStorage<T = any>(
key: string,
initialValue: T)
: [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (mounted) {
      const value = safeGetItem(key, {
        fallback: initialValue,
        storageType: 'session'
      });
      setStoredValue(value as T);
    }
  }, [key, initialValue, mounted]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);
      safeSetItem(key, valueToStore, { storageType: 'session' });
    } catch (_error) {
      logger.warn(`Error setting sessionStorage key "${key}":`, _error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, mounted];
}

// ==================== Window & Document Safe Access ====================

/**
 * فحص ما إذا كان الكود يعمل في المتصفح
 * Check if code is running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * الوصول الآمن إلى window
 * Safe window access
 */
function safeWindow<T>(
accessor: (window: Window) => T,
fallback: T)
: T {
  if (!isBrowser()) return fallback;

  try {
    return accessor(window);
  } catch (e) {
    logger.warn('Failed to access window:', e);
    return fallback;
  }
}

/**
 * الوصول الآمن إلى document
 * Safe document access
 */
function safeDocument<T>(
accessor: (document: Document) => T,
fallback: T)
: T {
  if (!isBrowser() || typeof document === 'undefined') return fallback;

  try {
    return accessor(document);
  } catch (e) {
    logger.warn('Failed to access document:', e);
    return fallback;
  }
}

/**
 * Hook للتحقق من تحميل المكون في المتصفح
 * Hook to check if component is mounted in browser
 */
export function useIsMounted(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * Hook للحصول على حجم نافذة المتصفح
 * Hook to get browser window size
 */
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    // تعيين الحجم الأولي
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * Hook للتحقق من استعلامات الوسائط
 * Hook for media queries
 */
function useSafeMediaQuery(query: string): boolean {
  const matches = useSyncExternalStore(
    (callback) => {
      if (!isBrowser()) return () => {};
      try {
        const media = window.matchMedia(query);
        if (media.addEventListener) {
          media.addEventListener('change', callback);
          return () => media.removeEventListener('change', callback);
        } else {
          media.addListener(callback);
          return () => media.removeListener(callback);
        }
      } catch (e) {
        logger.warn('Failed to setup media query:', e);
        return () => {};
      }
    },
    () => isBrowser() ? window.matchMedia(query).matches : false,
    () => false
  );

  const mounted = useIsMounted();

  // إرجاع false قبل التحميل لتجنب مشاكل الهايدريشن
  return mounted ? matches : false;
}

// ==================== Event Listener Helpers ====================

/**
 * Hook لإضافة مستمع أحداث بشكل آمن
 * Hook to safely add event listener
 */
function useSafeEventListener<K extends keyof WindowEventMap>(
eventName: K,
handler: (event: WindowEventMap[K]) => void,
element?: HTMLElement | Window | null)
{
  const savedHandler = useRef<(event: WindowEventMap[K]) => void>(undefined);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isBrowser()) return;

    const targetElement = element || window;
    if (!targetElement || !targetElement.addEventListener) return;

    const eventListener = (event: Event) => {
      savedHandler.current?.(event as WindowEventMap[K]);
    };

    targetElement.addEventListener(eventName, eventListener);

    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

// blocks removed

// ==================== Safe Fetch & JSON Parsing ====================

/**
 * التحقق من أن الاستجابة هي JSON وليست HTML
 * Check if response is JSON and not HTML
 */
/**
 * التحقق من أن النص هو HTML وليس JSON
 */
function isHtmlContent(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML') ||
    trimmed.startsWith('<Html') ||
    trimmed.startsWith('<') && (trimmed.includes('<head') || trimmed.includes('<body')));

}

function shouldAttemptTokenRefresh(url: string, response: Response): boolean {
  if (response.status !== 401) return false;
  if (!isBrowser()) return false;
  const isBrowserEnv = typeof window !== 'undefined';
  const BASE_API_URL = isBrowserEnv ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082/api');
  if (!url.startsWith('/api/') && !url.startsWith(BASE_API_URL)) return false;
  if (url.includes('/auth/')) return false;
  return true;
}

async function refreshAuthSession(): Promise<boolean> {
  try {
    const isBrowserEnv = typeof window !== 'undefined';
    const BASE_API_URL = isBrowserEnv ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082/api');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const refreshUrl = `${BASE_API_URL.replace(/\/+$/, '')}/auth/refresh`;
    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal
    });

    clearTimeout(timeout);
    return refreshResponse.ok;
  } catch (_error) {
    return false;
  }
}

async function safeJsonParse<T = any>(
response: Response,
fallback: T | null = null)
: Promise<T | null> {
  try {
    // قراءة النص أولاً للتحقق من نوع المحتوى
    // نستخدم clone() إذا كان response مستهلكاً بالفعل
    let text: string;
    try {
      text = await response.text();
    } catch (textError) {
      // إذا فشل قراءة النص (مثلاً إذا تم استهلاك response بالفعل)
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[Development] Failed to read response text:', textError);
      }
      return fallback;
    }

    // التحقق من أن النص غير فارغ
    if (!text || text.trim().length === 0) {
      return fallback;
    }

    // إذا كان HTML، يعني أن هناك خطأ في الخادم (مثل صفحة خطأ Next.js)
    if (isHtmlContent(text)) {
      // فقط في وضع التطوير نُظهر الخطأ التفصيلي
      if (process.env.NODE_ENV === 'development') {
        const url = response.url || 'Unknown URL';
        logger.warn(
          `[Development] Server returned HTML error page instead of JSON:`,
          {
            status: response.status,
            statusText: response.statusText,
            url: url,
            preview: text.substring(0, 200)
          }
        );
      }
      return fallback;
    }

    // التحقق من أن الاستجابة ناجحة وأن المحتوى هو JSON
    if (!response.ok) {
      // محاولة تحليل JSON حتى لو كانت الاستجابة غير ناجحة
      // (بعض APIs ترجع JSON حتى في حالة الخطأ)
      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        // إذا فشل تحليل JSON، رجوع للـ fallback
        if (process.env.NODE_ENV === 'development') {
          logger.warn(
            `[Development] Failed to parse error response as JSON:`,
            {
              status: response.status,
              statusText: response.statusText,
              preview: text.substring(0, 200),
              error: parseError
            }
          );
        }
        return fallback;
      }
    }

    // محاولة تحليل JSON من النص
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      // فقط في وضع التطوير نُظهر تفاصيل الخطأ
      if (process.env.NODE_ENV === 'development') {
        logger.warn(
          `[Development] Failed to parse response as JSON:`,
          {
            error: parseError,
            preview: text.substring(0, 200),
            contentType: response.headers.get('content-type')
          }
        );
      }
      return fallback;
    }
  } catch (_error) {
    // فقط في وضع التطوير نُظهر تفاصيل الخطأ
    if (process.env.NODE_ENV === 'development') {
      logger.error('[Development] Error parsing JSON response:', _error);
    }
    return fallback;
  }
}

/**
 * استدعاء fetch مع معالجة آمنة للأخطاء والـ JSON
 * Safe fetch with error handling and JSON parsing
 */
export async function safeFetch<T = any>(
url: string,
options?: RequestInit,
fallback: T | null = null)
: Promise<{data: T | null;error: Error | null;response: Response | null;}> {
  try {
    const isBrowser = typeof window !== 'undefined';
    const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082/api';
    const finalUrl = url.startsWith('/api/') 
      ? (isBrowser ? url : `${BASE_API_URL}${url.substring(4)}`) 
      : url;

    // Add timeout to prevent hanging requests (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Merge abort signals if options already has a signal
    let signal: AbortSignal | undefined;
    if (options?.signal) {
      signal = options.signal as AbortSignal;
    } else {
      signal = controller.signal;
    }

    let response: Response;
    try {
      response = await fetch(finalUrl, { 
        ...options, 
        signal,
        credentials: options?.credentials || 'include' // Ensure cookies are sent
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Enhance error message with URL for debugging
      if (fetchError instanceof Error) {
        fetchError.message = `Failed to fetch from ${finalUrl}: ${fetchError.message}`;
        throw fetchError;
      }
      throw new Error(`Failed to fetch from ${finalUrl}`);
    }

    if (shouldAttemptTokenRefresh(url, response)) {
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        // Add timeout for the retry request as well
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
        
        let retrySignal: AbortSignal | undefined;
        if (options?.signal) {
          retrySignal = options.signal as AbortSignal;
        } else {
          retrySignal = retryController.signal;
        }

        try {
          response = await fetch(finalUrl, { ...options, signal: retrySignal });
          clearTimeout(retryTimeoutId);
        } catch (retryError) {
          clearTimeout(retryTimeoutId);
          throw retryError;
        }
      }
    }

    // استخدام safeJsonParse الذي يتعامل مع HTML و JSON بشكل آمن
    const data = await safeJsonParse<T>(response, fallback);

    // إذا كانت الاستجابة غير ناجحة
    if (!response.ok) {
      // إذا كان data هو fallback (يعني أن الـ response لم تكن JSON صالحة)
      // يجب التحقق من ذلك أولاً قبل محاولة استخراج رسالة الخطأ
      const isFallback = data === fallback;

      if (isFallback) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText} at ${url} - Server returned non-JSON response (likely HTML error page)`;
        return {
          data: fallback,
          error: new Error(errorMessage),
          response
        };
      }

      // محاولة استخراج رسالة خطأ من البيانات إذا كانت موجودة
      let errorMessage: string = `HTTP ${response.status}: ${response.statusText}`;

      try {
        if (data && typeof data === 'object' && data !== null) {
          // محاولة استخراج رسالة الخطأ من الـ response
          if ('error' in data && typeof data.error === 'string') {
            errorMessage = data.error;
          } else if ('message' in data && typeof data.message === 'string') {
            errorMessage = data.message;
          } else if ('details' in data && typeof data.details === 'string') {
            errorMessage = `${errorMessage} - ${data.details}`;
          }
        }
      } catch (extractError) {
        // في حالة فشل استخراج رسالة الخطأ، نستخدم الرسالة الافتراضية
        if (process.env.NODE_ENV === 'development') {
          logger.warn('[Development] Failed to extract error message:', extractError);
        }
      }

      // التأكد من أن errorMessage ليس فارغاً أو undefined
      if (!errorMessage || typeof errorMessage !== 'string' || errorMessage.trim().length === 0) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      // إذا كان data ليس fallback، يعني أننا حصلنا على JSON (حتى لو كانت error response)
      const requestError = new Error(errorMessage);
      // فقط في وضع التطوير نعرض الخطأ في console
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[Development] API Error (${url}):`, {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data: data
        });
      }

      return {
        data,
        error: requestError,
        response
      };
    }

    return { data, error: null, response };
  } catch (_error) {
    const signalWasAborted = Boolean(
      options?.signal &&
      typeof options.signal === 'object' &&
      'aborted' in options.signal &&
      (options.signal as AbortSignal).aborted
    );

    let normalizedError: Error;
    if (_error instanceof Error) {
      normalizedError = _error;
    } else if (typeof _error === 'string' && _error.trim().length > 0) {
      normalizedError = new Error(_error);
    } else if (
    typeof _error === 'object' &&
    _error !== null &&
    'message' in _error &&
    typeof (_error as {message: unknown;}).message === 'string' &&
    (_error as {message: string;}).message.trim().length > 0)
    {
      normalizedError = new Error((_error as {message: string;}).message);
    } else {
      normalizedError = new Error('Unknown fetch error');
    }

    if (signalWasAborted && normalizedError.name !== 'AbortError') {
      normalizedError.name = 'AbortError';
      if (!normalizedError.message || normalizedError.message === 'Unknown fetch error') {
        normalizedError.message = 'Request was aborted';
      }
    }

    // فقط في وضع التطوير نُظهر تفاصيل الأخطاء غير المتوقعة
    if (process.env.NODE_ENV === 'development' && normalizedError.name !== 'AbortError') {
      logger.error(`[Development] Fetch error for URL: ${url}`, normalizedError);
    }

    return {
      data: fallback,
      error: normalizedError,
      response: null
    };
  }
}

export function getSafeUserId(): string | null {
  const normalizeUserId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const lowered = trimmed.toLowerCase();
    if (lowered === 'undefined' || lowered === 'null' || lowered === 'nan') {
      return null;
    }

    return trimmed;
  };

  const legacyUserIdRaw = safeGetItem<unknown>('x-user-id', { fallback: '' });
  const legacyUserId = normalizeUserId(legacyUserIdRaw);
  if (legacyUserId) {
    return legacyUserId;
  }
  if (typeof legacyUserIdRaw === 'string' && legacyUserIdRaw.trim().length > 0) {
    safeRemoveItem('x-user-id');
  }

  const userIdRaw = safeGetItem<unknown>('tw_user_id', { fallback: '' });
  const userId = normalizeUserId(userIdRaw);
  if (userId) {
    return userId;
  }
  if (typeof userIdRaw === 'string' && userIdRaw.trim().length > 0) {
    safeRemoveItem('tw_user_id');
  }

  return null;
}

// ==================== Export All ====================

const safeClientUtils = {
  // Storage checks
  isLocalStorageAvailable,
  isSessionStorageAvailable,

  // Storage operations
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeClearStorage,

  // React hooks
  useSafeLocalStorage,
  useSafeSessionStorage,
  useIsMounted,
  useWindowSize,
  useSafeMediaQuery,
  useSafeEventListener,

  // Browser checks
  isBrowser,
  safeWindow,
  safeDocument,
  getSafeUserId,

  // Safe fetch & JSON
  safeJsonParse,
  safeFetch
};

