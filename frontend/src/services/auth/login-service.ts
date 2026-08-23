/**
 * Login Service — the single source of truth for the sign-in and MFA contract.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The login and MFA-verify calls used to be duplicated in three places
 * (`LoginForm`, `auth-context.adminLogin`, `auth-repository`) with *different*
 * field names for the same endpoints: `email` vs `identifier` on the request,
 * and `ticket` vs `userId` on the MFA challenge. At most one of those spellings
 * can be the one the Go backend actually reads, so the others were silently
 * broken.
 *
 * Rather than guess, this module sends both accepted aliases and normalizes
 * whatever the backend returns into one internal shape. Go's `encoding/json`
 * ignores unknown object keys, so sending both is safe. When the backend
 * contract is confirmed, this is the only file that needs to change.
 */
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

/** Raw response from `POST /auth/login`, tolerating either MFA challenge spelling. */
interface RawLoginResponse {
  mfaRequired?: boolean;
  /** Opaque challenge handle (preferred). */
  ticket?: string | null;
  /** Legacy challenge handle used by older backend builds. */
  userId?: string | null;
}

/** Normalized outcome of a sign-in attempt. */
export interface LoginOutcome {
  success: boolean;
  /** True when the account has MFA enabled and a code is still required. */
  requiresMfa: boolean;
  /**
   * Handle to pass back to `verifyMfa`. Carries whichever value the backend
   * returned (`ticket` or `userId`) — callers should treat it as opaque.
   */
  challenge: string | null;
  error?: string;
}

export interface LoginCredentials {
  /** Email or username. Sent as both `email` and `identifier`. */
  identifier: string;
  password: string;
  rememberMe?: boolean;
  /** Best-effort device fingerprint; omitted from the payload when empty. */
  fingerprint?: string;
}

/** Human-readable device label used for the session list in account settings. */
export function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown Device";
  return `${navigator.platform} (${navigator.language})`;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

/**
 * Signs in with credentials. Never throws — inspect `success` / `requiresMfa`.
 *
 * On `requiresMfa: true` the session is NOT yet established; pass `challenge`
 * to `verifyMfa` along with the user's code.
 */
export async function login(credentials: LoginCredentials): Promise<LoginOutcome> {
  const identifier = credentials.identifier.trim();

  try {
    const data = await apiClient.post<RawLoginResponse>(apiRoutes.auth.login, {
      // Both aliases — see the file header for why.
      email: identifier,
      identifier,
      password: credentials.password,
      rememberMe: credentials.rememberMe ?? false,
      deviceName: getDeviceName(),
      ...(credentials.fingerprint ? { fingerprint: credentials.fingerprint } : {}),
    });

    if (data?.mfaRequired) {
      return {
        success: false,
        requiresMfa: true,
        challenge: data.ticket ?? data.userId ?? null,
      };
    }

    return { success: true, requiresMfa: false, challenge: null };
  } catch (err: unknown) {
    return {
      success: false,
      requiresMfa: false,
      challenge: null,
      error: toErrorMessage(err, "فشل تسجيل الدخول"),
    };
  }
}

/**
 * Completes an MFA challenge started by `login`. Never throws.
 *
 * `challenge` is the opaque value from `LoginOutcome.challenge`; it is sent as
 * both `ticket` and `userId` for the same reason the login request sends both
 * identifier spellings.
 */
export async function verifyMfa(
  challenge: string,
  code: string
): Promise<LoginOutcome> {
  try {
    await apiClient.post(apiRoutes.auth.mfa.verify, {
      ticket: challenge,
      userId: challenge,
      code: code.trim(),
    });
    return { success: true, requiresMfa: false, challenge: null };
  } catch (err: unknown) {
    return {
      success: false,
      requiresMfa: false,
      challenge,
      error: toErrorMessage(err, "فشل التحقق من الرمز"),
    };
  }
}

/**
 * Starts a social sign-in flow and returns the provider's authorization URL.
 * Throws if the backend returns a URL that is not absolute HTTPS — an
 * attacker-controlled value here would be an open redirect.
 */
export async function getSocialLoginUrl(
  provider: "google" | "apple"
): Promise<string> {
  const { redirectUrl } = await apiClient.get<{ redirectUrl: string }>(
    apiRoutes.auth.social.login(provider)
  );

  if (!redirectUrl || !/^https:\/\//i.test(redirectUrl)) {
    throw new Error("رابط تسجيل الدخول الاجتماعي غير صالح");
  }

  return redirectUrl;
}
