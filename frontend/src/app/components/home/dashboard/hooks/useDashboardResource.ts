"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeFetch } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";

export interface DashboardResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Safely unwraps backend envelope { success, data }.
 * Returns payload as-is if no valid envelope is detected.
 */
function unwrapEnvelope<T>(payload: unknown): T {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "success" in (payload as Record<string, unknown>) &&
    "data" in (payload as Record<string, unknown>)
  ) {
    const inner = (payload as { data: unknown }).data;
    // Only unwrap if 'data' exists and is not undefined
    if (inner !== undefined) {
      return inner as T;
    }
  }
  return payload as T;
}

/**
 * Fetches a dashboard resource with automatic cancellation on URL change or unmount.
 *
 * @param url        Endpoint to read, or `null` to skip fetching entirely.
 * @param resourceId Label used in error logs for debugging.
 */
export function useDashboardResource<T>(
  url: string | null,
  resourceId: string
): DashboardResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!url) {
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    let isMounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await safeFetch<unknown>(url, { signal: controller.signal }, null);

        if (!isMounted || controller.signal.aborted) return;

        if (result.error) {
          // Distinguish abort from real errors
          if (result.error.name === "AbortError") {
            return;
          }

          logger.warn(`[useDashboardResource] Failed to load ${resourceId}`, {
            url,
            error: result.error.message,
            name: result.error.name,
          });

          setError(`تعذر تحميل ${resourceId}`);
          setData(null);
        } else {
          const unwrapped = result.data === null ? null : unwrapEnvelope<T>(result.data);
          setData(unwrapped);
        }
      } catch (err) {
        if (!isMounted || controller.signal.aborted) return;

        // Catch unexpected errors not handled by safeFetch
        if (err instanceof Error && err.name !== "AbortError") {
          logger.error(`[useDashboardResource] Unexpected error loading ${resourceId}`, err);
          setError(`حدث خطأ غير متوقع أثناء تحميل ${resourceId}`);
          setData(null);
        }
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
      abortRef.current = null;
    };
  }, [url, resourceId, reloadToken]);

  return url
    ? { data, loading, error, refetch }
    : { data: null, loading: false, error: null, refetch };
}