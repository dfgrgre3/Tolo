import { useEffect, useRef } from 'react';

/**
 * Hook to batch incoming items (e.g., streaming tokens) and invoke a callback at a set interval.
 * @param onBatch Callback invoked with an array of buffered items.
 * @param interval Batch interval in milliseconds (default 150ms).
 */
export function useTokenStreamBuffer<T>(onBatch: (items: T[]) => void, interval = 150) {
  const bufferRef = useRef<T[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const addItem = (item: T) => {
    bufferRef.current.push(item);
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        const batch = bufferRef.current.splice(0, bufferRef.current.length);
        onBatch(batch);
        timerRef.current = null;
      }, interval);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      bufferRef.current = [];
    };
  }, []);

  return addItem;
}
