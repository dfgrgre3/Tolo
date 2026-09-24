/**
 * Passkey / WebAuthn service — real browser + backend flow.
 *
 * Backend: D:\backend\internal\infrastructure\api\handlers\protected\passkey_handler.go
 *   BeginRegistration → { sessionId, options } → startRegistration(options)
 *     → POST finish { sessionId, credential }
 *   BeginLogin → { sessionId, options } → startAuthentication(options)
 *     → POST finish { sessionId, credential } (sets HttpOnly session cookies)
 *   DELETE /:id requires body { password } (recent-auth check).
 */
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

export interface PasskeyDevice {
  id: string;
  name: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export interface PasskeyResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number | null;
}

interface CeremonyStart {
  sessionId: string;
  options: Record<string, unknown>;
}

function rateLimitOf(err: unknown): { rateLimited: boolean; retryAfterMs: number | null } {
  if (err instanceof ApiError && err.status === 429) {
    const raw =
      err.data?.retryAfterMs ?? err.data?.retry_after_ms ?? err.data?.retryAfter;
    const ms =
      typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? Math.round(raw)
        : null;
    return { rateLimited: true, retryAfterMs: ms };
  }
  return { rateLimited: false, retryAfterMs: null };
}

function toError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 404) {
    return "الخادم لا يدعم مفاتيح المرور بعد.";
  }
  return err instanceof Error ? err.message : fallback;
}

/** False on HTTP, old browsers, or missing authenticator. */
export async function isPasskeySupported(): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (!window.isSecureContext) return false;
    if (!browserSupportsWebAuthn()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function listPasskeys(): Promise<PasskeyDevice[]> {
  const data = await apiClient.get<PasskeyDevice[] | { passkeys: PasskeyDevice[] }>(
    apiRoutes.auth.passkeys.list
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { passkeys?: unknown }).passkeys)) {
    return (data as { passkeys: PasskeyDevice[] }).passkeys;
  }
  return [];
}

/** Registers a new passkey on this device. Never throws. */
export async function registerPasskey(name: string): Promise<PasskeyResult> {
  try {
    if (!(await isPasskeySupported())) {
      return { success: false, error: "متصفحك لا يدعم مفاتيح المرور" };
    }
    const start = await apiClient.post<CeremonyStart>(
      apiRoutes.auth.passkeys.registerStart,
      {}
    );
    if (!start?.sessionId || !start?.options) {
      return { success: false, error: "استجابة غير صالحة من الخادم" };
    }
    const attestation = await startRegistration({ optionsJSON: start.options as never });
    // `name` is the user-chosen label from the PasskeysCard input. The backend
    // contract (`POST finish { sessionId, credential }`) reads sessionId and
    // credential; the label is sent alongside so the backend can persist it
    // when supported — it is ignored otherwise (unknown JSON field).
    const trimmedName = name.trim();
    await apiClient.post(apiRoutes.auth.passkeys.registerFinish, {
      sessionId: start.sessionId,
      credential: attestation,
      ...(trimmedName ? { name: trimmedName } : {}),
    });
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "NotAllowedError") {
      return { success: false, error: "تم إلغاء العملية" };
    }
    return { success: false, error: toError(err, "فشل في تسجيل مفتاح المرور"), ...rateLimitOf(err) };
  }
}

/** Passwordless login with a passkey. Never throws. */
export async function loginWithPasskey(): Promise<PasskeyResult> {
  try {
    if (!(await isPasskeySupported())) {
      return { success: false, error: "متصفحك لا يدعم مفاتيح المرور" };
    }
    const start = await apiClient.post<CeremonyStart>(
      apiRoutes.auth.passkeys.loginStart,
      {}
    );
    if (!start?.sessionId || !start?.options) {
      return { success: false, error: "استجابة غير صالحة من الخادم" };
    }
    const assertion = await startAuthentication({ optionsJSON: start.options as never });
    await apiClient.post(apiRoutes.auth.passkeys.loginFinish, {
      sessionId: start.sessionId,
      credential: assertion,
    });
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "NotAllowedError") {
      return { success: false, error: "تم إلغاء العملية" };
    }
    return { success: false, error: toError(err, "فشل تسجيل الدخول بمفتاح المرور"), ...rateLimitOf(err) };
  }
}

/**
 * Deletes a passkey. Backend requires recent password auth:
 * DELETE /:id body { password }.
 */
export async function removePasskey(id: string, password: string): Promise<PasskeyResult> {
  try {
    if (!password) {
      return { success: false, error: "يرجى إدخال كلمة المرور الحالية للتأكيد." };
    }
    await apiClient.delete(apiRoutes.auth.passkeys.remove(id), {
      body: JSON.stringify({ password }),
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: toError(err, "فشل حذف مفتاح المرور"), ...rateLimitOf(err) };
  }
}
