interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
}

interface ALS<T> {
  run<R>(store: T, fn: () => R): R;
  getStore(): T | undefined;
}

class MockAsyncLocalStorage<T> implements ALS<T> {
  run<R>(store: T, fn: () => R): R {
    return fn();
  }
  getStore(): T | undefined {
    return undefined;
  }
}

function tryCreateALS(): ALS<RequestContext> {
  try {
    if (typeof process === 'undefined' || process.release?.name !== 'node') {
      return new MockAsyncLocalStorage<RequestContext>();
    }
    const hookMod = eval('require')('async_hooks');
    return new (hookMod.AsyncLocalStorage as any)() as ALS<RequestContext>;
  } catch {
    return new MockAsyncLocalStorage<RequestContext>();
  }
}

const storage: ALS<RequestContext> = tryCreateALS();

/**
 * Get the current request context from AsyncLocalStorage
 */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}