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

/**
 * Maps known backend change-password errors (English) to Arabic UX strings.
 * Unknown messages pass through verbatim — never blank the server verdict.
 */
function toChangePasswordError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("current password is incorrect")) {
    return "كلمة المرور الحالية غير صحيحة.";
  }
  if (msg.includes("user not found")) {
    return "لا توجد كلمة مرور لهذا الحساب (مسجل عبر Google/Apple؟). استخدم رابط الاستعادة.";
  }
  if (msg.includes("too common")) {
    return "كلمة المرور الجديدة شائعة جدًا، اختر كلمة أقوى.";
  }
  if (msg.includes("uppercase")) {
    return "كلمة المرور الجديدة يجب أن تحتوي على حرف كبير (A-Z).";
  }
  if (msg.includes("lowercase")) {
    return "كلمة المرور الجديدة يجب أن تحتوي على حرف صغير (a-z).";
  }
  if (msg.includes("at least one digit")) {
    return "كلمة المرور الجديدة يجب أن تحتوي على رقم.";
  }
  if (msg.includes("special character")) {
    return "كلمة المرور الجديدة يجب أن تحتوي على رمز خاص.";
  }
  if (msg.includes("at least 8")) {
    return "كلمة المرور الجديدة قصيرة جدًا (8 أحرف على الأقل).";
  }
  if (msg.includes("exceed 128")) {
    return "كلمة المرور الجديدة طويلة جدًا (128 حرفًا كحد أقصى).";
  }
  if (msg.includes("invalid input")) {
    return "بيانات غير صالحة. تأكد من إدخال الحالية والجديدة (8 أحرف على الأقل).";
  }
  return raw;
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

/**
 * Redeems the one-time token from an emailed sign-in link.
 *
 * Contract: POST /api/v1/auth/magic-link/verify
 *   body: { token }
 * On success the backend sets the HttpOnly session cookies and returns the
 * same `{ accessToken, user }` shape as login — the caller just needs to
 * refresh the session cache, never to store a token itself.
 */
export async function verifyMagicLink(
  token: string
): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.magicLink.verify, { token });
    return { success: true };
  } catch (err: unknown) {
    return actionFailure("Network error")(err);
  }
}

/**
 * Authenticated password change (profile → security tab).
 *
 * Contract: POST /api/v1/auth/change-password
 *   body: { oldPassword, newPassword }
 * Backend validates the current password, rejects reuse, revokes the old
 * session family and issues a FRESH session (new HttpOnly cookies).
 * Caller must rebind client caches (`refreshUser`) — NOT force re-login.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<AuthActionResult> {
  if (!oldPassword || !newPassword) {
    return { success: false, error: "يرجى إدخال كلمة المرور الحالية والجديدة." };
  }
  if (oldPassword === newPassword) {
    return { success: false, error: "كلمة المرور الجديدة يجب أن تختلف عن الحالية." };
  }
  try {
    const data = await apiClient.post<{ message?: string }>(
      apiRoutes.auth.changePassword,
      { oldPassword, newPassword }
    );
    return { success: true, message: data?.message };
  } catch (err: unknown) {
    const mapped = actionFailure("تعذر تغيير كلمة المرور، حاول مرة أخرى.")(err);
    if (mapped.error) {
      return { ...mapped, error: toChangePasswordError(mapped.error) };
    }
    return mapped;
  }
}
export async function fetchAuthMe<T = unknown>(url: string, signal?: AbortSignal): Promise<T> {
  return apiClient.get<T>(url, { signal });
}

export async function logoutUser(): Promise<void> {
  await apiClient.post<void>(apiRoutes.auth.logout, {});
}
