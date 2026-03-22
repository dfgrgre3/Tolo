import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
}

// Fallback implementation for browser and SSR where async_hooks is not available
class MockAsyncLocalStorage<T> {
  run<R>(store: T, fn: () => R): R {
    return fn();
  }
  getStore(): T | undefined {
    return undefined;
  }
}

// Lazy load AsyncLocalStorage only on server-side
// We use require to avoid static analysis attempting to bundle this on the client
const isServer = typeof window === 'undefined';
let storage: any;

if (isServer) {
  try {
    const { AsyncLocalStorage } = require('async_hooks');
    storage = new AsyncLocalStorage();
  } catch (error) {
    // If requirement fails, use the mock
    storage = new MockAsyncLocalStorage<RequestContext>();
  }
} else {
  // Use mock for browser
  storage = new MockAsyncLocalStorage<RequestContext>();
}

const contextStorage = storage;

/**
 * Get the current request context from AsyncLocalStorage
 */
export function getRequestContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

/**
 * Run a function within a request context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

/**
 * Initialize a new request context with a unique ID
 */
export function initRequestContext(partial?: Partial<RequestContext>): RequestContext {
  return {
    requestId: partial?.requestId || uuidv4(),
    startTime: Date.now(),
    ...partial,
  };
}

/**
 * Helper to get the current Request ID
 */
export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}
