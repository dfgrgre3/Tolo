/**
 * Redirect Policy — centralized external-redirect allowlist.
 *
 * Backend-provided URLs that the client navigates to (OAuth provider
 * authorization URLs, payment-provider checkouts) must never be trusted on
 * scheme alone: any `https://` URL would otherwise be an open redirect.
 * Every redirect target goes through these helpers before navigation.
 */

const GOOGLE_OAUTH_HOST = "accounts.google.com";
const APPLE_OAUTH_HOST = "appleid.apple.com";

type SocialProvider = "google" | "apple";

const SOCIAL_HOST_BY_PROVIDER: Record<SocialProvider, string> = {
  google: GOOGLE_OAUTH_HOST,
  apple: APPLE_OAUTH_HOST,
};

function parseHttpsUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^https:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Social auth redirect must be the exact OAuth host of the requested
 * provider — rejects any other host, even over HTTPS.
 */
export function isSocialAuthRedirectUrl(
  redirectUrl: unknown,
  provider: SocialProvider,
): boolean {
  const url = parseHttpsUrl(redirectUrl);
  if (!url) return false;
  return url.hostname.toLowerCase() === SOCIAL_HOST_BY_PROVIDER[provider];
}

/**
 * Payment redirect must be either:
 * - a same-origin relative path (single leading slash, no `//` host trick), or
 * - an absolute HTTPS URL on the Paymob provider boundary
 *   (`paymob.com` or any `*.paymob.com` host — the same boundary the CSP
 *   payment policy already trusts).
 */
export function isPaymentRedirectUrl(redirectUrl: unknown): boolean {
  if (typeof redirectUrl !== "string") return false;
  const value = redirectUrl.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  const url = parseHttpsUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === "paymob.com" || host.endsWith(".paymob.com");
}
