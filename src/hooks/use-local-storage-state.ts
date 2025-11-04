"use client";

/**
 * @deprecated Use `useSafeLocalStorage` from '@/lib/safe-client-utils' instead.
 * This hook is kept for backward compatibility.
 */

import { useSafeLocalStorage } from '@/lib/safe-client-utils';

export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void] {
  const [value, setValue] = useSafeLocalStorage<T>(key, initialValue);
  return [value, setValue];
}

/**
 * Hook for reading a value from localStorage without updating it.
 * @param key The localStorage key to read
 * @param initialValue The initial value to use if no value is found
 * @returns The current value from localStorage
 */
export function useLocalStorageValue<T>(key: string, initialValue: T): T {
  const [value] = useSafeLocalStorage<T>(key, initialValue);
  return value;
}
