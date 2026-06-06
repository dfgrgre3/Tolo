'use client';

/**
 * مكتبة شاملة للوصول الآمن لواجهات برمجة التطبيقات الخاصة بالعميل
 * Comprehensive library for safe client-side API access
 */

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { trimTrailingSlashes } from './utils';
import { requestCache } from './api/request-cache';

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

// ==================== Safe JSON Parsing ====================

/**
 * محاولة تحليل JSON بأمان مع fallback
 * Safely parse JSON with fallback
 */
function tryParseJSON<T>(
  text: string,
  response: Response,
  fallback: T | null,
  raiseOnError: boolean = false
): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (jsonError) {
    // في حالة خطأ JSON، نحاول تحليل النص
    if (process.env.NODE_ENV === 'development') {
      logger.warn(
        `[Development] JSON parse error on response from ${response.url}:`,
        jsonError
      );
    }
    if (raiseOnError) {
      throw new Error(`Failed to parse JSON response from ${response.url}`);
    }
    return fallback;
  }
}

/**
 * فحص ما إذا كان النص هو HTML
 * Check if text is HTML
 */
function isHtmlContent(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<');
}

/**
 * تحليل آمن لاستجابة JSON
 * Safe JSON parsing
 */
async function safeJsonParse<T>(
  response: Response,
  fallback: T | null
): Promise<T | null> {
  try {
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
    return tryParseJSON<T>(text, response, fallback, !response.ok);
  } catch (_error) {
    // فقط في وضع التطوير نُظهر تفاصيل الخطأ
    if (process.env.NODE_ENV === 'development') {
      logger.error('[Development] Error parsing JSON response:', _error);
    }
    return fallback;
  }
}

function buildFinalUrl(url: string): string {
  const isBrowserEnv = typeof window !== 'undefined';
  const BASE_API_URL = trimTrailingSlashes(process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082/api');
  if (!url.startsWith('/api/')) {
    return url;
  }

  if (isBrowserEnv) {
    return url;
  }

  return BASE_API_URL.endsWith('/api')
    ? `${BASE_API_URL}${url.substring(4)}`
    : `${BASE_API_URL}${url}`;
}

/**
 * تحويل أي خطأ إلى سلسلة نصية قابلة للقراءة
 * Convert any error to a readable string message
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.reason === 'string') return obj.reason;
    if (typeof obj.description === 'string') return obj.description;
    // DOMException-like objects: try toString
    try {
      return String(error);
    } catch {
      return 'Unknown error (non-serializable)';
    }
  }
  return 'Unknown error';
}

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('signal is aborted') ||
      error.message.includes('Request was aborted')
    );
  }
  if (typeof error === 'string') {
    return error.includes('signal is aborted') || error.includes('Request was aborted');
  }
  return false;
}

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // Merge signals: if an external signal is provided, both the timeout and external signal can abort
  const externalSignal = options?.signal as AbortSignal | undefined;
  let combinedSignal: AbortSignal;

  if (externalSignal) {
    // When external signal aborts, also abort our controller
    const onExternalAbort = () => {
      controller.abort();
      externalSignal.removeEventListener('abort', onExternalAbort);
    };
    externalSignal.addEventListener('abort', onExternalAbort);

    combinedSignal = controller.signal;
  } else {
    combinedSignal = controller.signal;
  }

  const executeFetch = async () => {
    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal,
        credentials: options?.credentials || 'include' // Ensure cookies are sent
      });
      clearTimeout(timeoutId);
      return response;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (isAbortLikeError(fetchError) || controller.signal.aborted || externalSignal?.aborted) {
        const abortError = new Error('Request was aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      // Always preserve the original error message for better debugging
      const errorMessage = extractErrorMessage(fetchError);
      throw new Error(`Failed to fetch from ${url}: ${errorMessage}`);
    }
  };

  const method = options?.method || 'GET';
  if (method.toUpperCase() === 'GET') {
    return requestCache.getResponse(url, options, executeFetch);
  }
  return executeFetch();
}

function handleFailedResponse<T>(response: Response, data: T | null, fallback: T | null, url: string): { data: T | null; error: Error; response: Response } {
  const isFallback = data === fallback;

  if (isFallback) {
    const errorMessage = `HTTP ${response.status}: ${response.statusText} at ${url} - Server returned non-JSON response (likely HTML error page)`;
    return {
      data: fallback,
      error: new Error(errorMessage),
      response
    };
  }

  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

  try {
    if (data && typeof data === 'object' && data !== null) {
      const errData = data as Record<string, unknown>;
      if (typeof errData.error === 'string') {
        errorMessage = errData.error;
      } else if (typeof errData.message === 'string') {
        errorMessage = errData.message;
      } else if (typeof errData.details === 'string') {
        errorMessage = `${errorMessage} - ${errData.details}`;
      }
    }
  } catch (extractError) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[Development] Failed to extract error message:', extractError);
    }
  }

  if (!errorMessage || typeof errorMessage !== 'string' || errorMessage.trim().length === 0) {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  }

  const requestError = new Error(errorMessage);
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

function normalizeFetchCatchError(_error: unknown, options?: RequestInit): Error {
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
    typeof (_error as { message: unknown; }).message === 'string' &&
    (_error as { message: string; }).message.trim().length > 0
  ) {
    normalizedError = new Error((_error as { message: string; }).message);
  } else {
    normalizedError = new Error('Unknown fetch error');
  }

  if (signalWasAborted && normalizedError.name !== 'AbortError') {
    normalizedError = new Error('Request was aborted');
    normalizedError.name = 'AbortError';
  }

  if (isAbortLikeError(normalizedError) && normalizedError.name !== 'AbortError') {
    normalizedError = new Error('Request was aborted');
    normalizedError.name = 'AbortError';
  }

  return normalizedError;
}

/**
 * استدعاء fetch مع معالجة آمنة للأخطاء والـ JSON
 * Safe fetch with error handling and JSON parsing
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit,
  fallback: T | null = null,
  fetchFn: typeof fetchWithTimeout = fetchWithTimeout
): Promise<{ data: T | null; error: Error | null; response: Response | null; }> {
  try {
    const finalUrl = buildFinalUrl(url);
    let response = await fetchFn(finalUrl, options);

    if (shouldAttemptTokenRefresh(url, response)) {
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        response = await fetchWithTimeout(finalUrl, options);
      }
    }

    const data = await safeJsonParse<T>(response, fallback);

    if (!response.ok) {
      return handleFailedResponse<T>(response, data, fallback, url);
    }

    return { data, error: null, response };
  } catch (_error) {
    const normalizedError = normalizeFetchCatchError(_error, options);
    return { data: null, error: normalizedError, response: null };
  }
}

// ==================== Refresh Auth ====================

const AUTH_REFRESH_ENDPOINT = '/api/auth/refresh';
const REFRESH_COOLDOWN = 5_000; // 5 seconds

let lastRefreshAttempt = 0;
let refreshInProgress: Promise<boolean> | null = null;

function shouldAttemptTokenRefresh(url: string, response: Response): boolean {
  if (response.status !== 401) return false;
  if (url.includes('/auth/login') || url.includes('/auth/refresh')) return false;
  return true;
}

async function refreshAuthSession(): Promise<boolean> {
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
    return false;
  }

  if (refreshInProgress) {
    return refreshInProgress;
  }

  refreshInProgress = (async () => {
    try {
      lastRefreshAttempt = Date.now();
      const response = await fetch(buildFinalUrl(AUTH_REFRESH_ENDPOINT), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

// ==================== Safe State Management ====================

/**
 * هوك لحفظ واسترجاع القيم من التخزين المحلي بأمان
 * Safe storage hook for persisting values
 */
export function useSafeStorage<T = unknown>(
  key: string,
  options: SafeStorageOptions<T> = {}
): [T | null, (value: T | null) => void, () => void] {
  const {
    fallback = null,
    storageType = 'local',
    parser = JSON.parse,
    serializer = JSON.stringify,
  } = options;

  const storageAvailable = storageType === 'local' ? isLocalStorageAvailable() : isSessionStorageAvailable();
  const storage = storageType === 'local' ? (typeof window !== 'undefined' ? window.localStorage : null) : (typeof window !== 'undefined' ? window.sessionStorage : null);

  // دالة لقراءة القيمة من التخزين
  const readValue = useCallback((): T | null => {
    if (!storageAvailable || !storage) return fallback;
    try {
      const item = storage.getItem(key);
      if (item === null) return fallback;
      return parser(item) as T;
    } catch {
      return fallback;
    }
  }, [key, fallback, storageAvailable, storage, parser]);

  // حالة القيمة الحالية
  const [storedValue, setStoredValue] = useState<T | null>(readValue);

  // دالة لتحديث القيمة في التخزين والحالة
  const setValue = useCallback(
    (value: T | null) => {
      setStoredValue(value);
      if (!storageAvailable || !storage) return;
      try {
        if (value === null) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, serializer(value));
        }
      } catch (e) {
        logger.warn(`[SafeStorage] Failed to set item "${key}":`, e);
      }
    },
    [key, storageAvailable, storage, serializer]
  );

  // دالة لحذف القيمة
  const removeValue = useCallback(() => {
    setValue(null);
  }, [setValue]);

  // مزامنة مع التغييرات من النوافذ الأخرى
  useEffect(() => {
    if (!storageAvailable || !storage) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(parser(e.newValue) as T);
        } catch {
          setStoredValue(fallback);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storageAvailable, storage, parser, fallback]);

  return [storedValue, setValue, removeValue];
}

// ==================== Safe DOM Helpers ====================

/**
 * الحصول على قيمة بأمان من localStorage
 * Get value safely from localStorage
 */
export function safeLocalStorageGet<T = string>(key: string, fallback: T | null = null): T | null {
  if (!isLocalStorageAvailable()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch {
    return fallback;
  }
}

/**
 * تعيين قيمة بأمان في localStorage
 * Set value safely in localStorage
 */
export function safeLocalStorageSet<T>(key: string, value: T): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * إزالة قيمة بأمان من localStorage
 * Remove value safely from localStorage
 */
export function safeLocalStorageRemove(key: string): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ==================== Safe DOM Helpers ====================

/**
 * تحقق مما إذا كان الكود يعمل في بيئة المتصفح
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * تنفيذ دالة بأمان مع كائن window
 * Safely execute a function with window object
 */
export function safeWindow<T>(fn: (w: Window) => T, fallback: T | null = null): T | null {
  if (typeof window === 'undefined') return fallback;
  try {
    return fn(window);
  } catch {
    return fallback;
  }
}

/**
 * تنفيذ دالة بأمان مع كائن document
 * Safely execute a function with document object
 */
export function safeDocument<T>(fn: (d: Document) => T, fallback: T | null = null): T | null {
  if (typeof document === 'undefined') return fallback;
  try {
    return fn(document);
  } catch {
    return fallback;
  }
}

/**
 * هوك للتحقق من أن المكون لا يزال مركبًا (لم يتم إلغاء تركيبه)
 * Hook to check if component is still mounted
 */
export function useIsMounted(): boolean {
  const isMounted = useRef(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      isMounted.current = false;
      setMounted(false);
    };
  }, []);

  return mounted;
}

/**
 * الحصول على معرف المستخدم بأمان
 * Get user ID safely
 */
export function getSafeUserId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem('userId');
    return stored;
  } catch {
    return null;
  }
}

/**
 * الحصول على قيمة من التخزين المحلي بأمان
 * Get value from localStorage safely
 */
export function safeGetItem<T = string>(
  key: string,
  options?: { storageType?: StorageType; fallback?: T }
): T | null {
  const storageType = options?.storageType || 'local';
  const fallbackValue = options?.fallback !== undefined ? options.fallback : null;

  if (typeof window === 'undefined') return fallbackValue;

  const storage = storageType === 'session' ? window.sessionStorage : window.localStorage;
  try {
    const value = storage.getItem(key);
    if (value === null) return fallbackValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch {
    return fallbackValue;
  }
}

/**
 * تعيين قيمة في التخزين المحلي بأمان
 * Set value in localStorage safely
 */
export function safeSetItem(key: string, value: any, options?: { storageType?: StorageType }): boolean {
  if (typeof window === 'undefined') return false;

  const storageType = options?.storageType || 'local';
  const storage = storageType === 'session' ? window.sessionStorage : window.localStorage;

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * هوك للوصول الآمن لـ localStorage - اسم مستعار لـ useSafeStorage للتوافق
 * Safe localStorage hook - alias for useSafeStorage for backward compatibility
 */
export function useSafeLocalStorage<T = unknown>(
  key: string,
  options: SafeStorageOptions<T> = {}
): [T | null, (value: T | null) => void, () => void] {
  return useSafeStorage(key, options);
}

// ==================== Safe URL Helpers ====================

/**
 * إنشاء URL آمن مع معلمات الاستعلام
 * Create safe URL with query parameters
 */
export function safeBuildUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined | null> = {}
): string {
  try {
    const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  } catch {
    return base;
  }
}

/**
 * فحص ما إذا كانت قيمة آمنة كمعرف (ID)
 * Check if value is safe as an ID
 */
export function safeIsValidId(value: unknown): value is string | number {
  if (typeof value === 'string' && value.trim().length > 0) return true;
  if (typeof value === 'number' && value > 0) return true;
  return false;
}

// ==================== Exports ====================

export {
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  safeJsonParse
};
