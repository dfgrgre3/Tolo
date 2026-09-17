/**
 * Auth API Service
 *
 * Thin typed wrappers around the backend auth endpoints. All requests go through
 * `apiClient`, which in the browser routes them via the Next.js proxy
 * (`/api/...` → Go backend), attaches CSRF / idempotency headers, unwraps the
 * `{ success, data }` envelope and applies the request cache where appropriate.
 */
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
  /** True when the failure is a server 429 (drives cooldown UI). */
  rateLimited?: boolean;
  /** Server-directed wait in ms, when the backend supplied one. */
  retryAfterMs?: number | null;
  /** Resend cooldown in ms for code-delivery endpoints. */
  cooldownMs?: number;
}

/** Shared failure mapping: preserves 429 semantics for throttle UI. */
function actionFailure(fallback: string): (err: unknown) => AuthActionResult {
  return (err: unknown) => {
    const rateLimited = err instanceof ApiError && err.status === 429;
    const raw = err instanceof ApiError
      ? err.data?.retryAfterMs ?? err.data?.retry_after_ms ?? err.data?.retryAfter
      : null;
    const retryAfterMs = typeof raw === "number" && Number.isFinite(raw) && raw > 0
      ? Math.round(raw)
      : null;
    return {
      success: false,
      error: err instanceof Error ? err.message : fallback,
      ...(rateLimited ? { rateLimited: true as const, retryAfterMs } : {}),
    };
  };
}

export async function forgotPassword(
  email: string
): Promise<AuthActionResult> {
  try {
    const data = await apiClient.post<{ message?: string }>(
      apiRoutes.auth.forgotPassword,
      { email }
    );
    return { success: true, message: data?.message };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}

export async function verifyForgotPasswordCode(
  email: string,
  code: string
): Promise<AuthActionResult & { resetToken?: string }> {
  try {
    const data = await apiClient.post<{ resetToken?: string; message?: string }>(
      `${apiRoutes.auth.forgotPassword}/verify-code`,
      { email, code }
    );
    return { success: true, message: data?.message, resetToken: data?.resetToken };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}

export async function resetPassword(
  token: string | undefined,
  newPassword: string
): Promise<AuthActionResult> {
  try {
    // The backend accepts the reset token from the body or, when omitted,
    // from the HttpOnly `reset_session` cookie set by verify-code.
    await apiClient.post(
      apiRoutes.auth.resetPassword,
      token ? { token, newPassword } : { newPassword }
    );
    return { success: true };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}

export async function verifyEmail(token: string): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.verifyEmail, { token });
    return { success: true };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}

export async function resendVerification(
  email?: string
): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.resendVerification, { email });
    return { success: true };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}

export async function requestMagicLink(
  email: string
): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.magicLink.request, { email });
    return { success: true };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}