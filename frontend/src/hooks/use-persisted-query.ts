import { useState, useEffect } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from '@tanstack/react-query';

/**
 * A wrapper hook around TanStack useQuery that is safe from Hydration Mismatch issues
 * when using localStorage persistence. It prevents the query from running on the server
 * and only activates it after the client component has successfully mounted.
 */
export function usePersistedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isServer = typeof window === 'undefined';

  return useQuery({
    ...options,
    enabled: mounted && !isServer && options.enabled !== false,
  });
}
