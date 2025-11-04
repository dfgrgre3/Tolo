'use client';

/**
 * مكتبة شاملة للوصول الآمن لواجهات برمجة التطبيقات الخاصة بالعميل
 * Comprehensive library for safe client-side API access
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== Type Definitions ====================

export type StorageType = 'local' | 'session';

export interface SafeStorageOptions {
  /** قيمة افتراضية في حالة عدم توفر التخزين */
  fallback?: any;
  /** نوع التخزين */
  storageType?: StorageType;
  /** تحليل القيمة المخزنة */
  parser?: (value: string) => any;
  /** تحويل القيمة قبل التخزين */
  serializer?: (value: any) => string;
}

// ==================== Storage Safety Checks ====================

/**
 * فحص ما إذا كان localStorage متاحًا
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * فحص ما إذا كان sessionStorage متاحًا
 * Check if sessionStorage is available
 */
export function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, 'test');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch (e) {
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
    console.warn(`Failed to access ${type}Storage:`, e);
    return null;
  }
}

// ==================== Safe Storage Operations ====================

/**
 * قراءة قيمة من التخزين بشكل آمن
 * Safely read a value from storage
 */
export function safeGetItem(
  key: string,
  options: SafeStorageOptions = {}
): any {
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
      return item;
    }
  } catch (e) {
    console.warn(`Failed to get item "${key}" from ${storageType}Storage:`, e);
    return fallback;
  }
}

/**
 * كتابة قيمة إلى التخزين بشكل آمن
 * Safely write a value to storage
 */
export function safeSetItem(
  key: string,
  value: any,
  options: SafeStorageOptions = {}
): boolean {
  const { storageType = 'local', serializer } = options;
  
  const storage = getStorage(storageType);
  if (!storage) return false;
  
  try {
    const stringValue = serializer 
      ? serializer(value)
      : typeof value === 'string'
        ? value
        : JSON.stringify(value);
    
    storage.setItem(key, stringValue);
    return true;
  } catch (e) {
    console.warn(`Failed to set item "${key}" in ${storageType}Storage:`, e);
    return false;
  }
}

/**
 * حذف قيمة من التخزين بشكل آمن
 * Safely remove a value from storage
 */
export function safeRemoveItem(
  key: string,
  options: SafeStorageOptions = {}
): boolean {
  const { storageType = 'local' } = options;
  
  const storage = getStorage(storageType);
  if (!storage) return false;
  
  try {
    storage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Failed to remove item "${key}" from ${storageType}Storage:`, e);
    return false;
  }
}

/**
 * مسح جميع البيانات من التخزين بشكل آمن
 * Safely clear all storage
 */
export function safeClearStorage(storageType: StorageType = 'local'): boolean {
  const storage = getStorage(storageType);
  if (!storage) return false;
  
  try {
    storage.clear();
    return true;
  } catch (e) {
    console.warn(`Failed to clear ${storageType}Storage:`, e);
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
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  // حالة للتحقق من تحميل المكون
  const [mounted, setMounted] = useState(false);
  
  // الحالة مع القيمة الأولية
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  
  // تحميل القيمة من localStorage بعد التحميل
  useEffect(() => {
    setMounted(true);
    const value = safeGetItem(key, { fallback: initialValue });
    setStoredValue(value);
  }, [key, initialValue]);
  
  // دالة لتحديث القيمة
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      safeSetItem(key, valueToStore);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setValue, mounted];
}

/**
 * Hook للوصول الآمن إلى sessionStorage مع المزامنة التلقائية
 * Hook for safe sessionStorage access with automatic sync
 */
export function useSafeSessionStorage<T = any>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [mounted, setMounted] = useState(false);
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  
  useEffect(() => {
    setMounted(true);
    const value = safeGetItem(key, { 
      fallback: initialValue,
      storageType: 'session'
    });
    setStoredValue(value);
  }, [key, initialValue]);
  
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      safeSetItem(key, valueToStore, { storageType: 'session' });
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
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
export function safeWindow<T>(
  accessor: (window: Window) => T,
  fallback: T
): T {
  if (!isBrowser()) return fallback;
  
  try {
    return accessor(window);
  } catch (e) {
    console.warn('Failed to access window:', e);
    return fallback;
  }
}

/**
 * الوصول الآمن إلى document
 * Safe document access
 */
export function safeDocument<T>(
  accessor: (document: Document) => T,
  fallback: T
): T {
  if (!isBrowser() || typeof document === 'undefined') return fallback;
  
  try {
    return accessor(document);
  } catch (e) {
    console.warn('Failed to access document:', e);
    return fallback;
  }
}

/**
 * Hook للتحقق من تحميل المكون في المتصفح
 * Hook to check if component is mounted in browser
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return mounted;
}

/**
 * Hook للحصول على حجم نافذة المتصفح
 * Hook to get browser window size
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });
  
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
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
export function useSafeMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    if (!isBrowser()) return;
    
    try {
      const media = window.matchMedia(query);
      
      // تعيين القيمة الأولية
      setMatches(media.matches);
      
      // الاستماع للتغييرات
      const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
      
      // استخدام الطريقة المناسبة حسب دعم المتصفح
      if (media.addEventListener) {
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
      } else {
        // للمتصفحات القديمة
        media.addListener(listener);
        return () => media.removeListener(listener);
      }
    } catch (e) {
      console.warn('Failed to setup media query:', e);
    }
  }, [query]);
  
  // إرجاع false قبل التحميل لتجنب مشاكل الهايدريشن
  return mounted ? matches : false;
}

// ==================== Event Listener Helpers ====================

/**
 * Hook لإضافة مستمع أحداث بشكل آمن
 * Hook to safely add event listener
 */
export function useSafeEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: HTMLElement | Window | null
) {
  const savedHandler = useRef<(event: WindowEventMap[K]) => void>();
  
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

// ==================== User ID Management ====================

const LOCAL_USER_KEY = 'user_id';

/**
 * الحصول على معرف المستخدم بشكل آمن
 * Safely get user ID
 */
export function getSafeUserId(): string | null {
  return safeGetItem(LOCAL_USER_KEY, { fallback: null });
}

/**
 * تعيين معرف المستخدم بشكل آمن
 * Safely set user ID
 */
export function setSafeUserId(userId: string): boolean {
  return safeSetItem(LOCAL_USER_KEY, userId);
}

/**
 * Hook لإدارة معرف المستخدم
 * Hook to manage user ID
 */
export function useSafeUserId(): [string | null, (id: string) => void, boolean] {
  const [userId, setUserId, mounted] = useSafeLocalStorage<string | null>(
    LOCAL_USER_KEY,
    null
  );
  
  return [userId, setUserId, mounted];
}

// ==================== Auth Token Management ====================

const AUTH_TOKEN_KEY = 'authToken';

/**
 * الحصول على رمز المصادقة بشكل آمن
 * Safely get auth token
 */
export function getSafeAuthToken(): string | null {
  return safeGetItem(AUTH_TOKEN_KEY, { fallback: null });
}

/**
 * تعيين رمز المصادقة بشكل آمن
 * Safely set auth token
 */
export function setSafeAuthToken(token: string): boolean {
  return safeSetItem(AUTH_TOKEN_KEY, token);
}

/**
 * حذف رمز المصادقة بشكل آمن
 * Safely remove auth token
 */
export function removeSafeAuthToken(): boolean {
  return safeRemoveItem(AUTH_TOKEN_KEY);
}

/**
 * Hook لإدارة رمز المصادقة
 * Hook to manage auth token
 */
export function useSafeAuthToken(): [string | null, (token: string) => void, () => void, boolean] {
  const [token, setToken, mounted] = useSafeLocalStorage<string | null>(
    AUTH_TOKEN_KEY,
    null
  );
  
  const removeToken = useCallback(() => {
    setToken(null);
    removeSafeAuthToken();
  }, [setToken]);
  
  return [token, setToken, removeToken, mounted];
}

// ==================== Export All ====================

export default {
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
  
  // User ID management
  getSafeUserId,
  setSafeUserId,
  useSafeUserId,
  
  // Auth token management
  getSafeAuthToken,
  setSafeAuthToken,
  removeSafeAuthToken,
  useSafeAuthToken,
};

