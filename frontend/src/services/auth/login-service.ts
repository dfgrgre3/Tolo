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
import { formatCooldownAr } from "@/lib/auth/rate-limit";
import { isSocialAuthRedirectUrl } from "@/lib/security/redirect-policy";
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
  // TOTP (6 digits) or a recovery code (XXXX-XXXX). Mirrors the backend:
  // ValidateTOTP requires len 6, backup codes are issued as XXXX-XXXX.
  // Deliberately looser than the backend charset — the server hash-match
  // is the real boundary; this only stops obvious typos from a round-trip.
  code: z.string().trim().regex(/^(\d{6}|[A-Za-z0-9]{4}-[A-Za-z0-9]{4})$/, "رمز التحقق غير صالح"),
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

/** Normalized outcome of a sign-in attempt. */
export interface LoginOutcome {
  success: boolean;
  /**
   * Machine-readable branch. Mirrors `AuthLoginResult["status"]` in
   * auth-context: every producer below must set it so context narrowing
   * (`result.status === "mfa_required"`) compiles.
   */
  status: "success" | "mfa_required" | "failure";
  /** True when the account has MFA enabled and a code is still required. */
  requiresMfa: boolean;
  /**
   * Opaque MFA challenge handle to pass back to `verifyMfa`.
   * Callers should treat it as opaque — it maps to the backend's `challengeId`.
   */
  challengeId: string | null;
  error?: string;
  /** True when the failure is a server 429 (drives client throttle UI). */
  rateLimited?: boolean;
  /** Server-directed wait in ms, when the backend supplied one. */
  retryAfterMs?: number | null;
  /**
   * True when the backend rejected the login because the email is not
   * verified yet. Drives a "verify your email first" CTA instead of a
   * dead-end error — otherwise fresh accounts look like wrong passwords.
   */
  needsVerification?: boolean;
}

/** Extracts 429 semantics from an ApiError (status + optional body hint). */
function rateLimitOf(err: unknown): { rateLimited: boolean; retryAfterMs: number | null } {  if (err instanceof ApiError && err.status === 429) {
    const raw = err.data?.retryAfterMs ?? err.data?.retry_after_ms ?? err.data?.retryAfter;
    const ms = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
    return { rateLimited: true, retryAfterMs: ms };
  }
  return { rateLimited: false, retryAfterMs: null };
}

/**
 * Detects a rejected login caused by an unverified/inactive email rather
 * than wrong credentials. Backends phrase it many ways; match liberally in
 * English and Arabic, but never match the generic invalid-credentials text.
 */
function parseEmailNotVerified(err: unknown): boolean {
  const raw = err instanceof ApiError || err instanceof Error ? err.message : "";
  return /email.{0,20}not.{0,20}verif|not.{0,20}verif.{0,20}email|unverified|not.{0,20}activat|inactive|EMAIL_NOT_VERIFIED|ACCOUNT_NOT_VERIFIED|غير.?مفعّل|لم يتم (تفعيل|توثيق|تأكيد)/i.test(
    raw
  );
}

/**
 * Parses a backend temporary account lockout (`ACCOUNT_LOCKED[:seconds]`).
 * The suffix is the remaining lockout in seconds. Returns a friendly Arabic
 * message plus the wait in ms (fed to the client throttle so the form shows
 * a live countdown), or `null` when this is not a lockout error.
 */
function parseAccountLocked(err: unknown): { message: string; retryAfterMs: number | null } | null {
  const raw = err instanceof ApiError || err instanceof Error ? err.message : "";
  const match = /ACCOUNT_LOCKED(?::(\d+))?/.exec(raw);
  if (!match) return null;
  const seconds = match[1] ? Number.parseInt(match[1], 10) : null;
  const retryAfterMs =
    seconds !== null && Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
  const waitText = retryAfterMs !== null ? ` — حاول مجددًا ${formatCooldownAr(retryAfterMs)}` : "";
  return {
    message: `تم إغلاق الحساب مؤقتًا لكثرة محاولات الدخول الفاشلة${waitText}`,
    retryAfterMs,
  };
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
    // Email is case-insensitive (RFC 5321 mailbox): normalize so
    // `User@Example.com` at register matches `user@example.com` at login.
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
    rememberMe: credentials.rememberMe ?? false,
    deviceName: getDeviceName(),
    ...(credentials.fingerprint ? { fingerprint: credentials.fingerprint } : {}),
  };

  const parsed = loginRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      status: "failure",
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
          status: "failure",
          requiresMfa: false,
          challengeId: null,
          error: "استجابة غير متوقعة من الخادم",
        };
      }
      return {
        success: false,
        status: "mfa_required",
        requiresMfa: true,
        challengeId: challenge.challengeId,
      };
    }

    return { success: true, status: "success", requiresMfa: false, challengeId: null };
  } catch (err: unknown) {
    const locked = parseAccountLocked(err);
    if (locked) {
      return {
        success: false,
        status: "failure",
        requiresMfa: false,
        challengeId: null,
        error: locked.message,
        retryAfterMs: locked.retryAfterMs,
      };
    }
    if (parseEmailNotVerified(err)) {
      return {
        success: false,
        status: "failure",
        requiresMfa: false,
        challengeId: null,
        error: "هذا الحساب غير مفعّل بعد — أدخل رمز التفعيل المرسل إلى بريدك الإلكتروني أولاً.",
        needsVerification: true,
      };
    }
    return {
      success: false,
      status: "failure",
      requiresMfa: false,
      challengeId: null,
      error: toErrorMessage(err, "فشل تسجيل الدخول"),
      ...rateLimitOf(err),
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
      success: false,
      status: "failure",
      requiresMfa: false,
      challengeId,
      error: "بيانات التحقق غير صالحة",
    };
  }

  try {
    await apiClient.post(apiRoutes.auth.mfa.verify, parsed.data);
    return { success: true, status: "success", requiresMfa: false, challengeId: null };
  } catch (err: unknown) {
    return {
      success: false,
      status: "failure",
      requiresMfa: false,
      challengeId,
      error: toErrorMessage(err, "فشل التحقق من الرمز"),
      ...rateLimitOf(err),
    };
  }
}

/**
 * Starts a social sign-in flow and returns the provider's authorization URL.
 * Throws unless the backend returns the exact OAuth host of the requested
 * provider — any other host (even HTTPS) is rejected as an open redirect.
 */
export async function getSocialLoginUrl(
  provider: "google" | "apple"
): Promise<string> {
  const { redirectUrl } = await apiClient.get<{ redirectUrl: string }>(
    apiRoutes.auth.social.login(provider)
  );

  if (!isSocialAuthRedirectUrl(redirectUrl, provider)) {
    throw new Error("رابط تسجيل الدخول الاجتماعي غير صالح");
  }

  return redirectUrl;
}

/**
 * Starts a link-mode ceremony for the SIGNED-IN user. Unlike login, the
 * backend binds the OAuth state to the current userID, so the shared
 * callback attaches the provider account instead of switching sessions.
 */
export async function getSocialLinkUrl(
  provider: "google" | "apple"
): Promise<string> {
  const { redirectUrl } = await apiClient.get<{ redirectUrl: string }>(
    apiRoutes.auth.social.linkRedirect(provider)
  );

  if (!isSocialAuthRedirectUrl(redirectUrl, provider)) {
    throw new Error("رابط ربط الحساب الاجتماعي غير صالح");
  }

  return redirectUrl;
}
