/**
 * @deprecated Use `useSafeLocalStorage` from '@/lib/safe-client-utils' instead.
 * This hook is kept for backward compatibility.
 */

import { useSafeLocalStorage } from '@/lib/safe-client-utils';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void] {
  const [value, setValue] = useSafeLocalStorage<T>(key, initialValue);
  return [value, setValue];
}