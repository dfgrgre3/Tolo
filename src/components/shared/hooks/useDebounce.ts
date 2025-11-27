import { useState, useEffect } from 'react';

/**
 * Hook لتأخير تحديث القيمة (Debouncing)
 * 
 * مفيد لتحسين الأداء عند البحث أو التحقق من المدخلات
 * 
 * @template T - نوع القيمة
 * @param {T} value - القيمة المراد تأخيرها
 * @param {number} delay - وقت التأخير بالميلي ثانية
 * @returns {T} القيمة المؤخرة
 * 
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 *   useEffect(() => {
 *     if (debouncedSearchTerm) {
 *       // تنفيذ البحث فقط بعد توقف المستخدم عن الكتابة لمدة 500ms
 *       searchAPI(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 * 
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="ابحث..."
 *     />
 *   );
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // تعيين مؤقت لتحديث القيمة المؤخرة
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // إلغاء المؤقت إذا تغيرت القيمة قبل انتهاء الوقت
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook لتأخير تنفيذ دالة (Debounced Callback)
 * 
 * @param {Function} callback - الدالة المراد تأخيرها
 * @param {number} delay - وقت التأخير بالميلي ثانية
 * @returns {Function} الدالة المؤخرة
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const handleSearch = useDebouncedCallback((term: string) => {
 *     console.log('Searching for:', term);
 *   }, 500);
 * 
 *   return (
 *     <input onChange={(e) => handleSearch(e.target.value)} />
 *   );
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
