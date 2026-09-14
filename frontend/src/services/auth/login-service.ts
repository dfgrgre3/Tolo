/**
 * Login Service — the single source of truth for the sign-in and MFA contract.
 *
 * The backend exposes ONE canonical contract (`internal/application/dto/auth_dto.go`):
 *   - POST /api/auth/login      → { email, password, rememberMe?, deviceName?, fingerprint? }
 *   - POST /api/auth/mfa/verify → { challengeId, code }
 *   - a pending-MFA login returns { mfaRequired: true, challengeId }.
 *
 * This module used to hedge against a drifted contract by sending *both*
 * `email`+`identifier` and `ticket`+`userId`. Those aliases are gone: the
 * backend only ever reads `email` and `challengeId`, so that is all we send.
 * The wire shapes are declared once in `@thanawy/shared/types/auth` and
 * re-checked at runtime with zod — any future backend drift now fails loudly
 * here instead of silently breaking login.
 */
import * as z from "zod";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type {
  LoginRequestPayload,
  MfaVerifyPayload,
  LoginChallengeResponse,
} from "@thanawy/shared/types/auth";

// ─── Runtime validators (mirror the shared canonical DTOs) ────────────────────

const loginRequestSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
  deviceName: z.string(),
  fingerprint: z.string().optional(),
});

const mfaVerifyPayloadSchema = z.object({
  challengeId: z.string().trim().min(1),
  // TOTP codes are six digits; recovery codes may contain letters and dashes.
  code: z.string().trim().refine(
    (value) => /^\d{6}$/.test(value) || /^[A-Za-z0-9-]{8,32}$/.test(value),
    "Invalid MFA code",
  ),
  rememberMe: z.boolean().optional(),
});

const loginChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  challengeId: z.string().trim().min(1),
});

/** Parses the canonical MFA-challenge branch of `POST /auth/login`. */
function parseChallenge(data: unknown): LoginChallengeResponse | null {
  const parsed = loginChallengeSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Normalized outcome of a sign-in attempt, modeled as a discriminated union
 * on `status` (SYM-005 in the symbol architecture audit).
 *
 * The previous shape (`{ success: boolean; requiresMfa: boolean; challengeId:
 * string | null; error?: string }`) let TypeScript accept combinations that
 * are never actually valid, e.g. `{ success: true, requiresMfa: true }` or
 * `{ success: false, requiresMfa: false, challengeId: "x" }`. Narrowing on
 * `status` instead makes those combinations unrepresentable.
 *
 * `success` and `requiresMfa` are kept as derived boolean fields on every
 * branch (rather than removed) so existing call sites that check
 * `result.requiresMfa` then `result.success` — which is exactly how a
 * discriminated union narrows — keep working unchanged.
 */
export type LoginOutcome =
  | { status: "success"; success: true; requiresMfa: false; challengeId: null; error?: undefined }
  | { status: "mfa_required"; success: false; requiresMfa: true; challengeId: string; error?: undefined }
  | { status: "failure"; success: false; requiresMfa: false; challengeId: string | null; error: string };

export interface LoginCredentials {
  /**
   * Email — the only identifier the backend accepts (`json:"email"`,
   * validated by `binding:"required,email"` in auth_dto.go).
   */
  email: string;
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
 * On `requiresMfa: true` the session is NOT yet established; pass `challengeId`
 * to `verifyMfa` along with the user's code.
 */
export async function login(credentials: LoginCredentials): Promise<LoginOutcome> {
  const payload: LoginRequestPayload = {
    email: credentials.email.trim(),
    password: credentials.password,
    rememberMe: credentials.rememberMe ?? false,
    deviceName: getDeviceName(),
    ...(credentials.fingerprint ? { fingerprint: credentials.fingerprint } : {}),
  };

  const parsed = loginRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "failure",
      success: false,
      requiresMfa: false,
      challengeId: null,
      error: "بيانات الدخول غير صالحة",
    };
  }

  try {
    const data = await apiClient.post<unknown>(apiRoutes.auth.login, parsed.data);

    // Only the MFA branch requires reading the body; a successful sign-in maps
    // directly to success (the session is established via HttpOnly cookies).
    if ((data as { mfaRequired?: unknown } | null)?.mfaRequired === true) {
      const challenge = parseChallenge(data);
      if (!challenge) {
        return {
          status: "failure",
          success: false,
          requiresMfa: false,
          challengeId: null,
          error: "استجابة غير متوقعة من الخادم",
        };
      }
      return {
        status: "mfa_required",
        success: false,
        requiresMfa: true,
        challengeId: challenge.challengeId,
      };
    }

    return { status: "success", success: true, requiresMfa: false, challengeId: null };
  } catch (err: unknown) {
    return {
      status: "failure",
      success: false,
      requiresMfa: false,
      challengeId: null,
      error: toErrorMessage(err, "فشل تسجيل الدخول"),
    };
  }
}

/**
 * Completes an MFA challenge started by `login`. Never throws.
 *
 * `challengeId` is the opaque handle from `LoginOutcome.challengeId`; it is the
 * only handle the backend's `VerifyMFARequest` accepts.
 */
export async function verifyMfa(
  challengeId: string,
  code: string,
  rememberMe = false
): Promise<LoginOutcome> {
  const payload: MfaVerifyPayload = { challengeId, code: code.trim(), rememberMe };

  const parsed = mfaVerifyPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "failure",
      success: false,
      requiresMfa: false,
      challengeId,
      error: "بيانات التحقق غير صالحة",
    };
  }

  try {
    await apiClient.post(apiRoutes.auth.mfa.verify, parsed.data);
    return { status: "success", success: true, requiresMfa: false, challengeId: null };
  } catch (err: unknown) {
    return {
      status: "failure",
      success: false,
      requiresMfa: false,
      challengeId,
      error: toErrorMessage(err, "فشل التحقق من الرمز"),
    };
  }
}

/**
 * Allowed hosts for each provider's OAuth authorization endpoint. A backend
 * response pointing anywhere else is rejected — scheme-only validation
 * (`https://`) is not enough, since a compromised or misconfigured backend
 * could still hand back an attacker-controlled `https://` URL and the
 * browser would navigate the user's authenticated session straight to it
 * (open redirect).
 */
const SOCIAL_LOGIN_ALLOWED_HOSTS: Record<"google" | "apple", readonly string[]> = {
  google: ["accounts.google.com"],
  apple: ["appleid.apple.com"],
};

/**
 * Starts a social sign-in flow and returns the provider's authorization URL.
 * Throws if the backend returns a URL that is not absolute HTTPS on the
 * expected provider host — an attacker-controlled value here would be an
 * open redirect.
 */
export async function getSocialLoginUrl(
  provider: "google" | "apple"
): Promise<string> {
  const { redirectUrl } = await apiClient.get<{ redirectUrl: string }>(
    apiRoutes.auth.social.login(provider)
  );

  const allowedHosts = SOCIAL_LOGIN_ALLOWED_HOSTS[provider];
  let parsed: URL | null = null;
  try {
    parsed = redirectUrl ? new URL(redirectUrl) : null;
  } catch {
    parsed = null;
  }

  if (!parsed || parsed.protocol !== "https:" || !allowedHosts.includes(parsed.hostname)) {
    throw new Error("رابط تسجيل الدخول الاجتماعي غير صالح");
  }

  return redirectUrl;
}
