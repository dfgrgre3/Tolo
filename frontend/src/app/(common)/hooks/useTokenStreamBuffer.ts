import { useCallback, useEffect, useRef } from 'react';

/**
 * useTokenStreamBuffer
 *
 * Buffers incoming tokens (or any items) from a streaming AI response and
 * flushes them to the UI at a controlled cadence, preventing UI thread
 * starvation and unbounded memory growth.
 *
 * Key guarantees:
 *  - `addItem` is referentially stable (useCallback) — safe to pass as a dep.
 *  - `onBatch` is captured via ref — never causes stale closures or leaks.
 *  - Hard `maxBufferSize` cap: when breached, forces an immediate flush and
 *    drops excess tokens (Backpressure). Prevents OOM on very long responses.
 *  - Remaining tokens are flushed synchronously on component unmount instead
 *    of being silently discarded.
 *  - `flush()` is exposed so callers can drain the buffer when the stream ends.
 *
 * @param onBatch  Callback invoked with an array of buffered items.
 * @param interval Batch flush interval in milliseconds (default 150 ms).
 * @param maxBufferSize Max tokens held before a forced flush (default 500 tokens
 *                      ≈ ~375 words — well below a 5 000-word DOM explosion).
 */
export function useTokenStreamBuffer<T>(
  onBatch: (items: T[]) => void,
  interval = 150,
  maxBufferSize = 500,
): {
  addItem: (item: T) => void;
  flush: () => void;
} {
  // Keep onBatch in a ref so the timer callback always sees the latest version
  // without needing to be added to the useCallback dependency array. This
  // prevents stale closures AND avoids the ref being recreated on every render.
  const onBatchRef = useRef(onBatch);
  useEffect(() => {
    onBatchRef.current = onBatch;
  }, [onBatch]);

  const bufferRef = useRef<T[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drain the buffer and invoke the callback.
  // Defined outside addItem so it can also be called on unmount / stream end.
  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onBatchRef.current(batch);
  }, []);

  // Stable function reference — safe to use in dependency arrays or event handlers.
  const addItem = useCallback(
    (item: T) => {
      // ── Backpressure guard ────────────────────────────────────────────────
      // If the buffer is already at capacity, force an immediate flush before
      // accepting the new item. This bounds memory usage to roughly:
      //   maxBufferSize × avg_token_size_bytes
      // and prevents the Main Thread from being starved by a giant batch.
      if (bufferRef.current.length >= maxBufferSize) {
        flush();
      }

      bufferRef.current.push(item);

      // Schedule a debounced flush if one isn't already pending.
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flush();
        }, interval);
      }
    },
    [flush, interval, maxBufferSize],
  );

  // Cleanup: flush any buffered tokens before the component unmounts so that
  // partial streaming results are not silently lost.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Flush remaining items synchronously — the component is going away but
      // the parent state update from onBatch may still land in a Suspense
      // boundary that is still mounted.
      if (bufferRef.current.length > 0) {
        const remaining = bufferRef.current.splice(0, bufferRef.current.length);
        onBatchRef.current(remaining);
      }
    };
  }, []);

  return { addItem, flush };
}

