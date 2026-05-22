'use client';

import { useSafeLocalStorage } from '@/lib/safe-client-utils';

/**
 * Hook for local storage with automatic synchronization and safety checks.
 * Delegates to the industrial-strength useSafeLocalStorage in safe-client-utils.
 */
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [value, setValue] = useSafeLocalStorage<T>(key, { fallback: initialValue });
  // Adapt the return type: useSafeLocalStorage returns [T | null, setter, remover]
  // We cast to match the expected [T, setter, boolean] signature
  return [value ?? initialValue, setValue as (value: T | ((val: T) => T)) => void, true];
}

/**
 * Alias for the same hook, often used for reading only.
 */
function useLocalStorageValue<T>(key: string, initialValue: T): T {
  const [value] = useSafeLocalStorage<T>(key, { fallback: initialValue });
  return value ?? initialValue;
}
