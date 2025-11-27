import { useState, useEffect } from 'react';

/**
 * Hook للتخزين المحلي مع مزامنة تلقائية
 * 
 * يحفظ القيمة في localStorage ويزامنها تلقائياً
 * 
 * @template T - نوع القيمة المخزنة
 * @param {string} key - مفتاح التخزين
 * @param {T} initialValue - القيمة الافتراضية
 * @returns {[T, (value: T | ((val: T) => T)) => void]} القيمة ودالة التحديث
 * 
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
 * 
 * // استخدام مباشر
 * setTheme('dark');
 * 
 * // استخدام مع دالة
 * setTheme(prev => prev === 'light' ? 'dark' : 'light');
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // الحصول على القيمة من localStorage أو استخدام القيمة الافتراضية
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // دالة لتحديث القيمة
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // السماح بالقيمة أو دالة التحديث
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // حفظ الحالة
      setStoredValue(valueToStore);
      
      // حفظ في localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // الاستماع للتغييرات من نوافذ أخرى
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
