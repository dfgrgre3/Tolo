/**
 * Notifications API Gateway
 *
 * المالك الوحيد لاستدعاءات الإشعارات.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type { Notification } from "@/types/notification";

// ─── جلب الإشعارات ────────────────────────────────────────────────

export async function fetchNotifications(): Promise<Notification[]> {
  const data = await apiClient.get<
    Notification[] | { notifications: Notification[] }
  >(apiRoutes.teaching.notifications.list);
  return Array.isArray(data) ? data : data.notifications ?? [];
}

// ─── مرايا النقل الخام لموفر التطبيق (F-018) ─────────────────────────
// 1:1 mirrors of the app provider's calls (different routes from the
// teaching notifications above): same path, method and payload.

export function fetchAppNotificationsRaw<T>(query: string): Promise<T> {
  return apiClient.get<T>(`/notifications?${query}`);
}

export function markAppNotificationReadRaw<T>(id: string): Promise<T> {
  return apiClient.post<T>("/notifications/mark-read", { id });
}

// ─── تحديد كقُرئ ─────────────────────────────────────────────────

export async function markNotificationRead(
  id: string,
): Promise<{ success: boolean }> {
  return apiClient.patch<{ success: boolean }>(
    apiRoutes.teaching.notifications.markRead(id),
    {},
  );
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return apiClient.patch<{ success: boolean }>(
    apiRoutes.teaching.notifications.markAllRead,
    {},
  );
}
