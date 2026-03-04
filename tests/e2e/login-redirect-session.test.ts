/**
 * End-to-end authentication flow test for cookie-based sessions.
 *
 * Covers:
 * 1) Login API sets auth cookies
 * 2) Authenticated visit to /login redirects to target route
 * 3) Session is restored via /api/auth/me
 */

if (typeof global.fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (_e) {
    global.fetch = (async (_url: RequestInfo | URL, _options?: any) => {
      throw new Error('fetch is not available in test environment. Please install node-fetch.');
    }) as any;
  }
}

type HeadersWithCookieExtensions = Headers & {
  getSetCookie?: () => string[];
  raw?: () => Record<string, string[]>;
};

function splitSetCookieHeader(value: string): string[] {
  // Split on cookie boundaries while keeping Expires date commas intact.
  return value.split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/g).map(part => part.trim()).filter(Boolean);
}

function readSetCookieHeaders(headers: Headers): string[] {
  const extended = headers as HeadersWithCookieExtensions;

  if (typeof extended.getSetCookie === 'function') {
    return extended.getSetCookie();
  }

  if (typeof extended.raw === 'function') {
    const raw = extended.raw();
    if (Array.isArray(raw['set-cookie'])) {
      return raw['set-cookie'];
    }
  }

  const fallback = headers.get('set-cookie');
  if (!fallback) {
    return [];
  }

  return splitSetCookieHeader(fallback);
}

function toCookieHeader(setCookieHeaders: string[]): string {
  return setCookieHeaders
    .map(cookie => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

describe('Login Redirect and Session Restore E2E', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  const hasCredentials = Boolean(testEmail && testPassword);
  const runIfConfigured = hasCredentials ? it : it.skip;

  runIfConfigured('should login, redirect away from /login, and restore session from cookies', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
      redirect: 'manual',
    });

    const loginBody = await loginResponse.json().catch(() => ({}));
    expect(loginResponse.status).toBe(200);
    expect(loginBody.user).toBeDefined();

    const setCookieHeaders = readSetCookieHeaders(loginResponse.headers);
    expect(setCookieHeaders.length).toBeGreaterThan(0);

    const cookieHeader = toCookieHeader(setCookieHeaders);
    expect(cookieHeader).toContain('access_token=');
    expect(cookieHeader).toContain('refresh_token=');

    const redirectResponse = await fetch(
      `${baseUrl}/login?redirect=${encodeURIComponent('/dashboard')}`,
      {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
        redirect: 'manual',
      }
    );

    expect([301, 302, 303, 307, 308]).toContain(redirectResponse.status);
    const location = redirectResponse.headers.get('location');
    expect(location).toBe('/dashboard');

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    });

    const meBody = await meResponse.json().catch(() => ({}));
    expect(meResponse.status).toBe(200);
    expect(meBody.user).toBeDefined();
    expect(meBody.user.id).toBeDefined();
  });
});

