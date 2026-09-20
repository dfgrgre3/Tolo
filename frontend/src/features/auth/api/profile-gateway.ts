/**
 * Profile API Gateway
 *
 * المالك الوحيد لاستدعاءات الملف الشخصي: الجلسات، الأنشطة، التصدير،
 * الهاتف، البريد، الحسابات الاجتماعية، MFA، سجل الأمان، حذف الحساب.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 *
 * Raw 1:1 mirrors (حد ترحيل الواجهات F-018): نفس المسار والطريقة
 * والحمولة التي استخدمتها الواجهة — صفر تغيير سلوكي بالتصميم.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { normalizePhoneToE164 } from "@/lib/phone";

type RawPayload = Record<string, unknown>;
type RequestOptions = { signal?: AbortSignal };

// ─── التسجيل وقراءة الجلسة ───────────────────────────────────────────

export function registerUserRaw(payload: RawPayload): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.register, payload);
}

// ─── الجلسات ─────────────────────────────────────────────────────────

export function stopImpersonationRaw(): Promise<unknown> {
  return apiClient.delete(apiRoutes.admin.impersonate);
}

export function fetchSessions<T>(options?: RequestOptions): Promise<T> {
  return apiClient.get<T>(apiRoutes.auth.sessions.list, options);
}

export function revokeSession(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.auth.sessions.revoke(id));
}

export function revokeOtherSessions(): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.sessions.revokeOthers, {});
}

// ─── الملف الشخصي ───────────────────────────────────────────────────

export function fetchUserProfile<T>( ): Promise<T> {
  return apiClient.get<T>(apiRoutes.users.profile);
}

export function updateUserProfile(patch: unknown): Promise<unknown> {
  return apiClient.patch(apiRoutes.users.profile, patch);
}

export function clearAvatar(): Promise<unknown> {
  return apiClient.patch(apiRoutes.users.profile, { avatar: "" });
}

export function setAvatar(publicUrl: string): Promise<unknown> {
  return apiClient.patch(apiRoutes.users.profile, { avatar: publicUrl });
}

export function deleteUploadedFile(fileKey: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.upload.delete, {
    body: JSON.stringify({ fileKey }),
  });
}

export function deleteAccount(password: string, confirmation: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.auth.deleteAccount, {
    body: JSON.stringify({ password, confirmation }),
  });
}

// ─── الأنشطة ─────────────────────────────────────────────────────────

export function markActivityRead(id: string): Promise<unknown> {
  return apiClient.post(apiRoutes.activities.markRead(id), {});
}

export function markAllActivitiesRead(): Promise<unknown> {
  return apiClient.post(apiRoutes.activities.readAll, {});
}

export function fetchActivitiesRecent<T>(query: string, options?: RequestOptions): Promise<T> {
  return apiClient.get<T>(`${apiRoutes.activities.recent}${query}`, options);
}

// ─── التحقق والتصدير ─────────────────────────────────────────────────

export function resendVerificationEmail(): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.resendVerification, {});
}

export function startDataExport<T>(): Promise<T> {
  return apiClient.post<T>(apiRoutes.settings.privacyActions, {
    action: "export-data",
  });
}

export function fetchExportStatus<T>(jobId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.settings.exportJobStatus(jobId));
}

// ─── الهاتف والبريد ──────────────────────────────────────────────────

export function sendPhoneCode(phone: string): Promise<unknown> {
  const normalized = normalizePhoneToE164(phone) ?? phone.trim();
  return apiClient.post(apiRoutes.auth.phone.sendCode, { phone: normalized });
}

export function verifyPhoneCode(code: string): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.phone.verify, { code: code.trim() });
}

export function requestEmailChange(newEmail: string, password: string): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.emailChange.request, {
    newEmail: newEmail.trim(),
    password,
  });
}

export function verifyEmailChange(code: string): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.emailChange.verify, { code: code.trim() });
}

// ─── الحسابات الاجتماعية ─────────────────────────────────────────────

export function fetchLinkedSocialAccounts<T>(options?: RequestOptions): Promise<T> {
  return apiClient.get<T>(apiRoutes.auth.social.accounts, options);
}

export function unlinkSocialProvider(provider: string): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.social.unlink, { provider });
}

// ─── المصادقة الثنائية ───────────────────────────────────────────────

export function fetchMfaRecoveryStatus<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.auth.mfa.recoveryCodes.status);
}

export function setupMfaTotp<T>(): Promise<T> {
  return apiClient.post<T>(apiRoutes.auth.mfa.setup, { method: "totp" });
}

export function enableMfa<T>(code: string): Promise<T> {
  return apiClient.post<T>(apiRoutes.auth.mfa.enable, { code });
}

export function disableMfa(password: string, code: string): Promise<unknown> {
  return apiClient.post(apiRoutes.auth.mfa.disable, { password, code });
}

export function regenerateMfaRecoveryCodes<T>(
  password: string,
  code: string,
): Promise<T> {
  return apiClient.post<T>(apiRoutes.auth.mfa.recoveryCodes.regenerate, {
    password,
    code,
  });
}

// ─── سجل الأمان ──────────────────────────────────────────────────────

export function fetchSecurityEvents<T>(query: string): Promise<T> {
  return apiClient.get<T>(`${apiRoutes.auth.securityEvents}${query}`);
}
