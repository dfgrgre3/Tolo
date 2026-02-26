import { useCallback, useState } from 'react';
import errorManager from '../services/ErrorManager';

export interface ErrorHandlerOptions {
  context?: Record<string, unknown>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  onError?: (error: Error, errorId: string) => void;
}

export interface ErrorHandlerReturn {
  handleError: (error: Error | string, additionalContext?: Record<string, unknown>) => string;
  error: Error | null;
  errorId: string | null;
  clearError: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

/**
 * Custom hook for handling errors in React components
 */
export const useErrorHandler = (options: ErrorHandlerOptions = {}): ErrorHandlerReturn => {
  const [error, setError] = useState<Error | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleError = useCallback(
    (error: Error | string, additionalContext?: Record<string, unknown>) => {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      const context = {
        ...options.context,
        ...additionalContext,
        severity: (additionalContext?.severity as string) || options.severity || 'medium',
      };

      const id = errorManager.logError(errorObj, context);
      setError(errorObj);
      setErrorId(id);

      if (options.onError) {
        options.onError(errorObj, id);
      }

      return id;
    },
    [options.context, options.severity, options.onError]
  );

  const clearError = useCallback(() => {
    setError(null);
    setErrorId(null);
  }, []);

  return { handleError, error, errorId, clearError, isLoading, setIsLoading };
};

/**
 * Hook for async operations with error handling
 */
export const useAsyncError = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const catchError = useCallback((error: Error) => {
    setError(error);
    errorManager.logError(error, { source: 'useAsyncError' });
  }, []);

  return { error, resetError, catchError };
};

/**
 * Hook for handling errors in async functions
 */
export const useAsyncOperation = <T, P extends unknown[]>(
  asyncFn: (...args: P) => Promise<T>,
  options: ErrorHandlerOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await asyncFn(...args);
        setData(result);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);

        const errorId = errorManager.logError(errorObj, {
          ...options.context,
          source: 'useAsyncOperation',
          severity: options.severity || 'medium',
          functionName: asyncFn.name || 'anonymous',
        });

        if (options.onError) {
          options.onError(errorObj, errorId);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn, options.context, options.severity, options.onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, execute, reset };
};

export default useErrorHandler;
