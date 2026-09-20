/**
 * Centralized helpers for forwarding Set-Cookie headers from the Go
 * backend through the Next.js layer (Edge proxy, /api/[...path]
 * catch-all, /api/auth/csrf).
 *
 * Background:
 * The Go backend is the source of truth for cookie attributes
 * (HttpOnly, Secure, SameSite, Path, etc.). The frontend is a pure
 * pass-through — it must NOT rebuild or rewrite the cookies, because
 * rebuilding strips attributes the backend set (Partitioned,
 * Priority, SameParty, etc.) and risks silently weakening security
 * (e.g. forgetting HttpOnly).
 *
 * These helpers:
 *   1. forward Set-Cookie headers verbatim from a backend Response,
 *      2. validate that the backend's auth cookies carry the minimum
 *      security attributes the frontend contract requires, and
 *   3. expose a single Sentry-aware entry point so the rules live in
 *      one place.
 *
 * In production, invalid auth cookies are rejected rather than forwarded.
 */

export const AUTH_COOKIE_NAMES = ["access_token", "refresh_token"] as const;
export const CSRF_COOKIE_NAME = "_csrf";

export type AuthCookieName = (typeof AUTH_COOKIE_NAMES)[number];

/**
 * Returns `true` when the current process is in development mode.
 *
 * Read on every call (not module-load) so tests can flip
 * `NODE_ENV` between cases and the behaviour matches production.
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Whether a missing SameSite attribute must be treated as a violation.
 *
 * Read on every call (not module-load) so tests can flip it per case, same
 * as `isDevelopment()`.
 *
 * Background (B-10): the Go backend's actual Set-Cookie attributes are NOT
 * visible from this repo, so flipping the default to "missing = violation"
 * unconditionally could drop every auth cookie in production (login outage)
 * if the backend omits SameSite and relies on the browser Lax default.
 * Instead the operator opts into strictness explicitly after confirming the
 * backend sets SameSite: `REQUIRE_EXPLICIT_SAMESITE=true`.
 */
function isExplicitSameSiteRequired(): boolean {
  return process.env.REQUIRE_EXPLICIT_SAMESITE === 'true';
}

/**
 * Extracts the Set-Cookie array from a backend response's headers.
 *
 * Prefers `Headers.getSetCookie()` (RFC 6265 compliant, Node 19+)
 * and falls back to the comma-joined `get('set-cookie')` for older
 * runtimes. The fallback is intentionally split-naive — the proxy
 * uses the primary path on every supported Node version.
 *
 * Accepts either a `Response` or a raw `Headers` instance so callers
 * do not need to reach into `response.headers` themselves.
 */
export function getSetCookieHeaders(
  source: Response | Headers,
): string[] {
  const headers = (source as Response).headers ?? (source as Headers);
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  if (typeof getSetCookie === "function") {
    return getSetCookie.call(headers);
  }
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=[^;]+=)/) : [];
}

/**
 * Dev-only helper: removes the `Secure` attribute from a Set-Cookie
 * string so the cookie can be set on http://localhost during
 * development. No-op in production.
 *
 * Implementation note: matches the `Secure` attribute token only
 * when it stands alone between `;` boundaries. Negative lookahead
 * `(?!=)` prevents matching `Secure` when it is the prefix of a
 * longer attribute name (e.g. `SecureFoo=...`), and the leading
 * `;\s*` prevents matching `Secure` when it is a substring of
 * another attribute value. Trailing `(?=;|$)` ensures we only
 * strip when followed by another attribute or end of string,
 * leaving no orphan separator.
 */
export function forwardSetCookieForDev(cookie: string): string {
  if (!isDevelopment()) return cookie;
  return cookie.replace(
    /;\s*Secure(?=[;\s]|$)/gi,
    "",
  );
}

/**
 * Parses the cookie attributes from a single Set-Cookie string.
 * Used only by `validateAuthCookieAttributes` — never to rebuild
 * the cookie, because rebuilding loses data the backend intended.
 */
function parseCookieAttributes(cookie: string): {
  name: string;
  attributes: Map<string, string>;
} {
  const parts = cookie.split(";");
  const first = parts[0] ?? "";
  const eqIdx = first.indexOf("=");
  const name = eqIdx > 0 ? first.substring(0, eqIdx).trim() : first.trim();
  const attributes = new Map<string, string>();
  for (const part of parts.slice(1)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const attrEq = trimmed.indexOf("=");
    if (attrEq > 0) {
      attributes.set(
        trimmed.substring(0, attrEq).trim().toLowerCase(),
        trimmed.substring(attrEq + 1).trim(),
      );
    } else {
      attributes.set(trimmed.toLowerCase(), "");
    }
  }
  return { name, attributes };
}

/**
 * Returns `true` if the cookie carries the `Secure` attribute.
 */
function hasSecureAttribute(cookie: string): boolean {
  return parseCookieAttributes(cookie).attributes.has("secure");
}

/**
 * Returns `true` if the cookie carries the `HttpOnly` attribute.
 * Required for any auth-related cookie to block JS access.
 */
function hasHttpOnlyAttribute(cookie: string): boolean {
  return parseCookieAttributes(cookie).attributes.has("httponly");
}

/**
 * Returns the `SameSite` attribute value, or `null` if absent.
 * `SameSite=Lax` is the browser default, but explicitly setting it
 * avoids surprises in older browsers and prevents accidental
 * `SameSite=None` regressions.
 */
function getSameSiteAttribute(cookie: string): string | null {
  return parseCookieAttributes(cookie).attributes.get("samesite") ?? null;
}

/**
 * Validates that an auth-related Set-Cookie carries the minimum
 * security attributes the frontend contract requires. Returns the
 * list of violations (empty list = valid).
 *
 * Contract:
 *   - HttpOnly: required (blocks JS access to the token)
 *   - Secure:   required in production (forces HTTPS)
 *   - SameSite: must be `Lax` or `Strict` when present. `None` is always a
 *               violation for auth cookies (CSRF regression); a garbage
 *               value (typo / injection) is always a violation too, since no
 *               backend emits one intentionally and browsers fall back in
 *               inconsistent ways. A MISSING value is a violation only when
 *               the caller passes `allowMissingSameSite: false` or the
 *               operator sets `REQUIRE_EXPLICIT_SAMESITE=true` (B-10) — the
 *               default stays lenient because the Go backend's attributes are
 *               not visible from this repo and `Lax` is the browser default.
 */
export function validateAuthCookieAttributes(
  cookie: string,
  options: { allowMissingSameSite?: boolean; cookieName?: string } = {},
): string[] {
  const { cookieName } = options;
  const allowMissingSameSite =
    options.allowMissingSameSite ?? !isExplicitSameSiteRequired();
  const violations: string[] = [];
  const { name } = parseCookieAttributes(cookie);
  const label = cookieName ?? name;

  if (!hasHttpOnlyAttribute(cookie)) {
    violations.push(`'${label}' is missing HttpOnly attribute`);
  }
  if (!isDevelopment() && !hasSecureAttribute(cookie)) {
    violations.push(`'${label}' is missing Secure attribute (production)`);
  }
  const sameSite = getSameSiteAttribute(cookie)?.toLowerCase() ?? null;
  if (sameSite === "none") {
    violations.push(
      `'${label}' has SameSite=None which is unsafe for auth cookies`,
    );
  } else if (sameSite === "lax" || sameSite === "strict") {
    // Explicit, recognized policy — the hardened state. Nothing to report.
  } else if (!sameSite) {
    if (!allowMissingSameSite) {
      violations.push(`'${label}' is missing SameSite attribute`);
    }
  } else {
    violations.push(
      `'${label}' has an unrecognized SameSite value '${sameSite}'`,
    );
  }

  return violations;
}

/**
 * Validates a readable double-submit CSRF cookie. Unlike auth cookies, a CSRF
 * cookie must not be HttpOnly because the browser client echoes it in a
 * request header.
 */
export function validateCsrfCookieAttributes(cookie: string): string[] {
  const violations: string[] = [];
  const { name, attributes } = parseCookieAttributes(cookie);
  if (attributes.has("httponly")) {
    violations.push(`'${name}' must remain readable by JavaScript (HttpOnly is not allowed)`);
  }
  if (!isDevelopment() && !hasSecureAttribute(cookie)) {
    violations.push(`'${name}' is missing Secure attribute (production)`);
  }
  const sameSite = getSameSiteAttribute(cookie)?.toLowerCase() ?? null;
  if (sameSite === "none") {
    violations.push(`'${name}' has SameSite=None which is unsafe for CSRF cookies`);
  } else if (sameSite !== null && sameSite !== "lax" && sameSite !== "strict") {
    violations.push(`'${name}' has an unrecognized SameSite value '${sameSite}'`);
  }
  return violations;
}

/**
 * Forwards Set-Cookie headers from a backend response to a Next.js
 * response, applying dev-only `Secure` stripping. Auth-related
 * cookies are validated; violations are reported via the provided
 * reporter (typically a Sentry breadcrumb in production).
 *
 * Centralizing this prevents the per-route copies that previously
 * existed in proxy.ts, api/[...path]/route.ts, and
 * api/auth/csrf/route.ts. See the audit finding that motivated
 * this helper for the prior duplication.
 *
 * `isAuthCookie` classifies the cookie name; if the predicate
 * returns `true`, validation runs and any violation is reported.
 *
 * `isCsrfCookie` classifies CSRF cookies separately; CSRF cookies
 * have different security requirements (must NOT be HttpOnly since
 * they need to be readable by JavaScript for the double-submit pattern).
 *
 * CSRF cookies are validated using `validateCsrfCookieAttributes` which
 * enforces that they remain readable by JavaScript (no HttpOnly), while
 * auth cookies use `validateAuthCookieAttributes` which requires HttpOnly.
 */
export function forwardSetCookies(params: {
  from: Response;
  to: { headers: { append(name: string, value: string): void } };
  isAuthCookie?: (name: string) => boolean;
  isCsrfCookie?: (name: string) => boolean;
  validateCookie?: (cookie: string) => string[];
  reportViolation?: (cookieName: string, violations: string[]) => void;
}): void {
  const {
    from,
    to,
    isAuthCookie = (n) =>
      (AUTH_COOKIE_NAMES as readonly string[]).includes(n),
    isCsrfCookie = (n) => n === CSRF_COOKIE_NAME,
    validateCookie = (cookie) => validateAuthCookieAttributes(cookie),
    reportViolation,
  } = params;

  for (const raw of getSetCookieHeaders(from)) {
    const adjusted = forwardSetCookieForDev(raw);
    const name = parseCookieAttributes(adjusted).name;

    // Use appropriate validation based on cookie type
    let violations: string[] = [];
    if (isAuthCookie(name)) {
      // Auth cookies must be HttpOnly to prevent JavaScript access
      violations = validateCookie(adjusted);
    } else if (isCsrfCookie(name)) {
      // CSRF cookies must NOT be HttpOnly - they need to be readable by JavaScript
      // for the double-submit pattern to work
      violations = validateCsrfCookieAttributes(adjusted);
    }

    if (violations.length > 0) {
      reportViolation?.(name, violations);
      if (!isDevelopment()) continue;
    }
    to.headers.append("Set-Cookie", adjusted);
  }
}
