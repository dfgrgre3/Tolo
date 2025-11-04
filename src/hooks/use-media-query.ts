"use client";

/**
 * @deprecated Use `useSafeMediaQuery` from '@/lib/safe-client-utils' instead.
 * This hook is kept for backward compatibility.
 */

import { useSafeMediaQuery } from '@/lib/safe-client-utils';

export function useMediaQuery(query: string): boolean {
  return useSafeMediaQuery(query);
}
