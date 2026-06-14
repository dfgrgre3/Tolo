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
    // eslint-disable-next-line no-eval
    const hookMod = eval('require')('async_hooks');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

/**
 * Run a function within a request context
 */
function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/**
 * Initialize a new request context with a unique ID
 */
function initRequestContext(partial?: Partial<RequestContext>): RequestContext {
  return {
    requestId: partial?.requestId || crypto.randomUUID(),
    startTime: Date.now(),
    ...partial
  };
}

/**
 * Helper to get the current Request ID
 */
function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}