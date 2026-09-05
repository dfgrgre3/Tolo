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
  code: z.string().trim().min(1),
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

/** Normalized outcome of a sign-in attempt. */
export interface LoginOutcome {
  success: boolean;
  /** True when the account has MFA enabled and a code is still required. */
  requiresMfa: boolean;
  /**
   * Opaque MFA challenge handle to pass back to `verifyMfa`.
   * Callers should treat it as opaque — it maps to the backend's `challengeId`.
   */
  challengeId: string | null;
  error?: string;
}

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
          success: false,
          requiresMfa: false,
          challengeId: null,
          error: "استجابة غير متوقعة من الخادم",
        };
      }
      return {
        success: false,
        requiresMfa: true,
        challengeId: challenge.challengeId,
      };
    }

    return { success: true, requiresMfa: false, challengeId: null };
  } catch (err: unknown) {
    return {
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
  code: string
): Promise<LoginOutcome> {
  const payload: MfaVerifyPayload = { challengeId, code: code.trim() };

  const parsed = mfaVerifyPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      requiresMfa: false,
      challengeId,
      error: "بيانات التحقق غير صالحة",
    };
  }

  try {
    await apiClient.post(apiRoutes.auth.mfa.verify, parsed.data);
    return { success: true, requiresMfa: false, challengeId: null };
  } catch (err: unknown) {
    return {
      success: false,
      requiresMfa: false,
      challengeId,
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
