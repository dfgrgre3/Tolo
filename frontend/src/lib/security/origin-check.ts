/**
 * Strict Origin/Referer validation for state-changing requests.
 *
 * SECURITY: matches the FULL origin (protocol + hostname + port) against a
 * canonical expected origin — NOT just the hostname. An attacker that manages
 * to register an attacker-controlled domain that resolves to the same host
 * (or serves content on a different port) would otherwise bypass a
 * hostname-only check. By pinning protocol + hostname + port, the request
 * must come from the exact same site the user is browsing.
 *
 * The canonical expected origin is derived from (in order of precedence):
 *   1. NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL (server-controlled)
 *   2. The request's Host header (only used as a fallback when no canonical
 *      env var is configured — the protocol is then inferred from the
 *      request, with HTTPS preferred in production).
 *
 * When neither header is present the request is rejected: state-changing
 * requests MUST have either Origin or Referer set, and any non-empty value
 * must match the canonical origin exactly.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Returns true if the host (without port) is a loopback/local development
 * host. Loopback origins can run on either http or https; pinning the
 * protocol for them causes false negatives when the dev server runs on
 * plain http.
 */
function isLocalHost(hostname: string): boolean {
  const bare = hostname.toLowerCase();
  if (LOCAL_HOSTS.has(bare)) return true;
  // Cover bracketed IPv6 loopback and any zero-segment IPv4 forms.
  return bare.startsWith("127.") || bare === "::1";
}

/**
 * Canonicalize an origin string so protocol/host/port comparison is
 * deterministic: lowercased host, default ports omitted, no trailing slash.
 * Returns null when the input is not a parseable absolute URL.
 *
 * Development-only relaxation: a dev server is routinely browsed as both
 * `localhost` and `127.0.0.1` (same machine, same port), so loopback
 * hostnames normalize to one canonical name. The port still must match, and
 * production keeps the strict exact-origin comparison above.
 */
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function canonicalizeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!IS_PRODUCTION && isLocalHost(url.hostname)) {
      url.hostname = "localhost";
    }
    // URL already strips default ports (80/443) and lowercases hostname.
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Compute the canonical app origin for a given request. In production we
 * trust NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL — they are configured by
 * the operator and represent the public-facing site. Falling back to the
 * Host header is a degraded mode used only when no canonical env var is
 * set (typically local development).
 */
function getCanonicalOrigin(request: Request): string | null {
  // In development/test, derive the canonical origin from the request URL
  // itself instead of NEXT_PUBLIC_BASE_URL. The dev server is routinely
  // browsed through multiple addresses (localhost, 127.0.0.1, or a LAN IP
  // like http://192.168.1.15:3000), and pinning the canonical origin to a
  // single configured value rejects genuine same-origin requests arriving
  // through any of the other addresses. The Origin/Referer header must
  // still match the request origin exactly, which browsers guarantee for
  // real same-origin requests, so CSRF protection is preserved.
  if (!IS_PRODUCTION) {
    try {
      return canonicalizeOrigin(new URL(request.url).origin);
    } catch {
      // fall through to the configured/fallback logic below
    }
  }

  const configured = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return canonicalizeOrigin(configured);
  }

  const host = request.headers.get("host");
  if (!host) return null;

  // In production we always expect HTTPS. In development (loopback host)
  // we accept http to allow the local dev server to function.
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname) return null;
  const protocol = isLocalHost(hostname) ? "http" : "https";
  try {
    return new URL(`${protocol}//${host}`).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returns true when the request's Origin (or, if absent, Referer) matches
 * the canonical app origin exactly — protocol, hostname, AND port.
 *
 * Returns false in any of the following cases:
 *   - Neither Origin nor Referer is present (state-changing requests from
 *     same-origin browsers always include one of them).
 *   - The header value is not a valid absolute URL.
 *   - The canonical origin cannot be determined (no env var and no Host).
 *   - The header's protocol/hostname/port differs from the canonical origin.
 */
export function isSameOriginRequest(request: Request): boolean {
  const canonical = getCanonicalOrigin(request);
  if (!canonical) return false;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const candidate = origin || referer;
  if (!candidate) return false;

  const candidateCanonical = canonicalizeOrigin(candidate);
  if (!candidateCanonical) return false;

  return candidateCanonical === canonical;
}