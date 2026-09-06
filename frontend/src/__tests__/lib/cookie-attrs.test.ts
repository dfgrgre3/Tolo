import { describe, it, expect, vi } from 'vitest';
import {
  getSetCookieHeaders,
  forwardSetCookieForDev,
  validateAuthCookieAttributes,
  forwardSetCookies,
} from '@/lib/security/cookie-attrs';

/**
 * `process.env.NODE_ENV` is a readonly string in modern TypeScript
 * types. Use `vi.stubEnv` to flip it per-test without TypeScript
 * complaining. The implementation reads `process.env.NODE_ENV` on
 * every call (not at module load) so this works end-to-end.
 */

describe('getSetCookieHeaders', () => {
  it('uses getSetCookie() when available (RFC 6265 path)', () => {
    const headers = {
      getSetCookie: () => ['a=1; Path=/', 'b=2; Path=/'],
      get: (_name: string) => null,
    } as unknown as Response;
    expect(getSetCookieHeaders(headers)).toEqual([
      'a=1; Path=/',
      'b=2; Path=/',
    ]);
  });

  it('falls back to comma-split when getSetCookie is missing', () => {
    const headers = { get: () => null } as unknown as Headers;
    expect(getSetCookieHeaders(headers)).toEqual([]);
  });

  it('accepts a raw Headers instance', () => {
    const headers = {
      getSetCookie: () => ['x=1'],
      get: () => null,
    } as unknown as Headers;
    expect(getSetCookieHeaders(headers)).toEqual(['x=1']);
  });
});

describe('forwardSetCookieForDev', () => {
  it('strips Secure in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(forwardSetCookieForDev('a=1; Secure; Path=/')).toBe('a=1; Path=/');
    expect(forwardSetCookieForDev('a=1;secure;Path=/')).toBe('a=1;Path=/');
  });

  it('preserves Secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(forwardSetCookieForDev('a=1; Secure; Path=/')).toBe(
      'a=1; Secure; Path=/',
    );
  });

  it('does not strip "Secure" inside other attribute names', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(
      forwardSetCookieForDev('a=1; SecureFoo=bar; Path=/'),
    ).toBe('a=1; SecureFoo=bar; Path=/');
  });

  it('strips a trailing Secure with no following attributes', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(forwardSetCookieForDev('a=1; Secure')).toBe('a=1');
  });
});

describe('validateAuthCookieAttributes', () => {
  it('passes a fully hardened cookie in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(
      validateAuthCookieAttributes(
        'access_token=abc; HttpOnly; Secure; SameSite=Lax; Path=/',
      ),
    ).toEqual([]);
  });

  it('flags missing HttpOnly', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const v = validateAuthCookieAttributes('access_token=abc; Secure; SameSite=Lax');
    expect(v).toContain("'access_token' is missing HttpOnly attribute");
  });

  it('flags missing Secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const v = validateAuthCookieAttributes(
      'access_token=abc; HttpOnly; SameSite=Lax',
    );
    expect(v).toContain("'access_token' is missing Secure attribute (production)");
  });

  it('does NOT flag missing Secure in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(
      validateAuthCookieAttributes('access_token=abc; HttpOnly; SameSite=Lax'),
    ).toEqual([]);
  });

  it('flags SameSite=None (unsafe for auth cookies)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const v = validateAuthCookieAttributes(
      'access_token=abc; HttpOnly; Secure; SameSite=None',
    );
    expect(v).toContain(
      "'access_token' has SameSite=None which is unsafe for auth cookies",
    );
  });

  it('treats missing SameSite as a soft warning when allowMissingSameSite=false', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const v = validateAuthCookieAttributes(
      'access_token=abc; HttpOnly; Secure',
      { allowMissingSameSite: false },
    );
    expect(v).toContain("'access_token' is missing SameSite attribute");
  });

  it('accepts missing SameSite by default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(
      validateAuthCookieAttributes('access_token=abc; HttpOnly; Secure'),
    ).toEqual([]);
  });

  it('uses the cookieName override in violation messages', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const v = validateAuthCookieAttributes('a=1; Secure; SameSite=Lax', {
      cookieName: 'jwt',
    });
    expect(v[0]).toContain("'jwt'");
  });
});

describe('forwardSetCookies', () => {
  function makeFromResponse(cookies: string[]): Response {
    return {
      headers: {
        getSetCookie: () => cookies,
        get: () => null,
      },
    } as unknown as Response;
  }

  function makeToResponse() {
    const appended: Array<{ name: string; value: string }> = [];
    return {
      target: {
        headers: {
          append: (name: string, value: string) => {
            appended.push({ name, value });
          },
        },
      },
      appended,
    };
  }

  it('forwards each Set-Cookie verbatim in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookies = [
      'access_token=abc; HttpOnly; Secure; SameSite=Lax',
      'csrf_token=xyz; HttpOnly; Secure; SameSite=Lax',
    ];
    const to = makeToResponse();
    forwardSetCookies({ from: makeFromResponse(cookies), to: to.target });
    expect(to.appended).toEqual([
      { name: 'Set-Cookie', value: cookies[0] },
      { name: 'Set-Cookie', value: cookies[1] },
    ]);
  });

  it('strips Secure in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const to = makeToResponse();
    forwardSetCookies({
      from: makeFromResponse([
        'access_token=abc; HttpOnly; Secure; SameSite=Lax',
      ]),
      to: to.target,
    });
    expect(to.appended[0]?.value).toBe(
      'access_token=abc; HttpOnly; SameSite=Lax',
    );
  });

  it('reports HttpOnly/Secure violations to the reporter', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const report = vi.fn();
    forwardSetCookies({
      from: makeFromResponse(['access_token=abc; SameSite=Lax']),
      to: makeToResponse().target,
      reportViolation: report,
    });
    expect(report).toHaveBeenCalledWith(
      'access_token',
      expect.arrayContaining([
        expect.stringContaining('HttpOnly'),
        expect.stringContaining('Secure'),
      ]),
    );
  });

  it('does NOT report violations for non-auth cookies', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const report = vi.fn();
    forwardSetCookies({
      from: makeFromResponse(['theme=dark; Path=/']),
      to: makeToResponse().target,
      reportViolation: report,
    });
    expect(report).not.toHaveBeenCalled();
  });

  it('reports csrf_token violations', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const report = vi.fn();
    forwardSetCookies({
      from: makeFromResponse(['csrf_token=xyz']),
      to: makeToResponse().target,
      reportViolation: report,
    });
    expect(report).toHaveBeenCalledWith('csrf_token', expect.any(Array));
  });

  it('uses the isAuthCookie predicate when provided', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const report = vi.fn();
    forwardSetCookies({
      from: makeFromResponse(['session=abc']),
      to: makeToResponse().target,
      isAuthCookie: (n) => n === 'session',
      reportViolation: report,
    });
    expect(report).toHaveBeenCalledWith('session', expect.any(Array));
  });

  it('skips the reporter when omitted', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() =>
      forwardSetCookies({
        from: makeFromResponse(['access_token=abc']),
        to: makeToResponse().target,
      }),
    ).not.toThrow();
  });
});
