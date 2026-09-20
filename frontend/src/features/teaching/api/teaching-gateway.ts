/**
 * Teaching API Gateway
 *
 * المالك الوحيد لاستدعاءات التدريس: لوحة المعلم، الطلاب، التقييمات،
 * الإشعارات، المراسلات، التقويم، المعاملات، التحليلات، الإعدادات، التقديم.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 *
 * Raw 1:1 mirrors (حد ترحيل الواجهات F-018): نفس المسار والطريقة
 * والحمولة التي استخدمتها الواجهة — صفر تغيير سلوكي بالتصميم.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

type RawPayload = Record<string, unknown>;

// ─── لوحة المعلم ─────────────────────────────────────────────────────

export function fetchTeachingStatsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.dashboard.stats);
}

export function fetchTeachingActivitiesRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.activities);
}

export function fetchTeachingStudentsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.students.all);
}

export function fetchTeachingReviewsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.reviews.all);
}

export function replyTeachingReviewRaw<T>(reviewId: string, text: string): Promise<T> {
  return apiClient.post<T>(apiRoutes.teaching.reviews.reply(reviewId), { text });
}

export function fetchTeachingTransactionsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.transactions);
}

export function fetchTeachingAnalyticsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.analytics);
}

// ─── إشعارات المعلم ──────────────────────────────────────────────────

export function fetchTeachingNotificationsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.notifications.list);
}

export function markTeachingNotificationReadRaw<T>(id: string): Promise<T> {
  return apiClient.post<T>(apiRoutes.teaching.notifications.markRead(id), {});
}

export function markAllTeachingNotificationsReadRaw<T>(): Promise<T> {
  return apiClient.post<T>(apiRoutes.teaching.notifications.markAllRead, {});
}

// ─── المراسلات والتقويم ──────────────────────────────────────────────

export function fetchTeachingConversationsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.conversations);
}

export function sendTeachingMessageRaw<T>(convId: string, text: string): Promise<T> {
  return apiClient.post<T>(apiRoutes.teaching.messages(convId), { text });
}

export function fetchTeachingCalendarRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.teaching.calendar);
}

export function addTeachingCalendarEventRaw<T>(event: object): Promise<T> {
  return apiClient.post<T>(apiRoutes.teaching.calendar, event);
}

// ─── إعدادات المعلم ──────────────────────────────────────────────────

export function fetchTeachingSettingsRaw<T>(): Promise<T> {
  return apiClient.get<T>("/api/teaching/settings");
}

export function updateTeachingSettingsRaw<T>(body: unknown): Promise<T> {
  return apiClient.patch<T>("/api/teaching/settings", body);
}

export function regenerateTeachingApiKeyRaw<T>(): Promise<T> {
  return apiClient.post<T>("/api/teaching/settings/api-key", {});
}

// ─── التقديم للتدريس ─────────────────────────────────────────────────

export function submitTeacherApplicationRaw(payload: RawPayload): Promise<unknown> {
  return apiClient.post(apiRoutes.teacherApplications.submit, payload);
}

export function submitTeachingApplicationRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.postJson<T>("/api/teaching/apply", payload);
}

export function fetchTeachingApplicationStatusRaw<T>(code: string): Promise<T> {
  return apiClient.get<T>(
    `/api/teaching/apply/status?code=${encodeURIComponent(code)}`,
  );
}
