import 'jest-extended';
import '@testing-library/jest-dom';
import React from 'react';

// Make React available globally for JSX
if (typeof global.React === 'undefined') {
  global.React = React;
}

// Mock jose library globally (ES modules fix)
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-access-token'),
  })),
  jwtVerify: jest.fn().mockResolvedValue({
    payload: {
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
  }),
}));

// Mock uuid library (ES modules fix)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
  v1: jest.fn(() => 'mock-uuid-v1'),
}));

// Mock ErrorLogger to prevent memory issues
jest.mock('@/services/ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn(),
      saveLogsToStorage: jest.fn(),
    })),
  },
}));

// Mock safe-client-utils to prevent browser-only code from running
jest.mock('@/lib/safe-client-utils', () => ({
  safeGetItem: jest.fn(() => null),
  safeSetItem: jest.fn(),
  safeRemoveItem: jest.fn(),
  safeWindow: jest.fn((fn, fallback) => fallback),
  isBrowser: false,
}));

// Mock redis to prevent server-only errors
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Mock cache-service-unified
jest.mock('@/lib/cache-service-unified', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock server-only module
jest.mock('server-only', () => ({}));

// Mock fetch for E2E tests
if (typeof global.fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (_e) {
    // If node-fetch is not available, use a simple mock
    global.fetch = jest.fn();
  }
}

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-characters';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => {
    const body = init?.body || '{}';
    const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
    return {
      url,
      method: init?.method || 'GET',
      headers: new Headers(init?.headers || {}),
      json: jest.fn().mockResolvedValue(parsedBody),
      text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
      nextUrl: new URL(url),
    };
  }),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: jest.fn().mockResolvedValue(data),
      status: init?.status || 200,
      headers: new Map(),
      ok: (init?.status || 200) < 400,
    })),
    redirect: jest.fn((url) => ({
      status: 307,
      headers: { Location: url },
    })),
  },
}));

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Setup global test timeout
jest.setTimeout(10000);
