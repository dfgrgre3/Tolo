import 'jest-extended';
import '@testing-library/jest-dom';
import React from 'react';
import { TextDecoder, TextEncoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

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

// Mock otplib (and its ESM deps) to avoid parsing issues in Jest
jest.mock('otplib', () => ({
  OTP: jest.fn().mockImplementation(() => ({
    generateSecret: jest.fn(() => 'mock-secret'),
    generateURI: jest.fn(() => 'otpauth://mock'),
    verifySync: jest.fn(() => ({ valid: true })),
  })),
}));

// Mock qrcode used by TwoFactorService
jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
  },
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

// Fallback mock for @scure/base (used by otplib base32 plugin)
jest.mock('@scure/base', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
  base32: { encode: jest.fn(), decode: jest.fn() },
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
  // Minimal fetch implementation for E2E tests (avoid ESM node-fetch in Jest).
  // #region agent log
  globalThis.fetch?.('http://127.0.0.1:7820/ingest/1c1ffd62-1853-4a56-b4c6-7356b988052f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59fdf3'},body:JSON.stringify({sessionId:'59fdf3',runId:'pre-fix',hypothesisId:'H1_fetch_polyfill_path',location:'tests/setup.ts',message:'Installing custom http(s) fetch polyfill',data:{path:'customHttpFetch'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const http = require('node:http');
  const https = require('node:https');

  global.fetch = ((
    url: any,
    options: any = {}
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const target = typeof url === 'string' ? url : String(url);
      const parsed = new URL(target);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;

      const method = options.method || 'GET';
      const headers = options.headers || {};
      const body = options.body;

      const reqOptions: any = {
        method,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers,
      };

      const req = transport.request(reqOptions, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');

          const normalizedHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers || {})) {
            if (typeof v === 'string') normalizedHeaders[k.toLowerCase()] = v;
            else if (Array.isArray(v)) normalizedHeaders[k.toLowerCase()] = v.join('; ');
          }

          resolve({
            status: res.statusCode || 0,
            ok: (res.statusCode || 0) < 400,
            headers: {
              get: (name: string) => {
                const val = normalizedHeaders[name.toLowerCase()];
                return val ?? null;
              },
            },
            json: async () => JSON.parse(raw || 'null'),
            text: async () => raw,
          });
        });
      });

      req.on('error', (err: any) => reject(err));

      const signal = options.signal as AbortSignal | undefined;
      if (signal) {
        if (signal.aborted) {
          req.destroy();
          return reject(new Error('The user aborted a request.'));
        }
        signal.addEventListener('abort', () => {
          try {
            req.destroy();
          } catch {
            // ignore
          }
          reject(new Error('The user aborted a request.'));
        });
      }

      if (body !== undefined && body !== null) {
        req.write(body);
      }
      req.end();
    });
  }) as any;
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
jest.setTimeout(30000);
