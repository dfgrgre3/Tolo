/**
 * Auth API Service
 *
 * Thin typed wrappers around the backend auth endpoints. All requests go through
 * `apiClient`, which in the browser routes them via the Next.js proxy
 * (`/api/...` → Go backend), attaches CSRF / idempotency headers, unwraps the
 * `{ success, data }` envelope and applies the request cache where appropriate.
 */
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
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
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.resetPassword, { token, newPassword });
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function verifyEmail(token: string): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.verifyEmail, { token });
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function resendVerification(
  email?: string
): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.resendVerification, { email });
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function requestMagicLink(
  email: string
): Promise<AuthActionResult> {
  try {
    await apiClient.post(apiRoutes.auth.magicLink.request, { email });
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}