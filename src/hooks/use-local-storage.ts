'use client';

import { useSafeLocalStorage } from '@/lib/safe-client-utils';

/**
 * Hook for local storage with automatic synchronization and safety checks.
 * Delegates to the industrial-strength useSafeLocalStorage in safe-client-utils.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  return useSafeLocalStorage<T>(key, initialValue);
}

/**
 * Alias for the same hook, often used for reading only.
 */
export function useLocalStorageValue<T>(key: string, initialValue: T): T {
  const [value] = useSafeLocalStorage<T>(key, initialValue);
  return value;
}
