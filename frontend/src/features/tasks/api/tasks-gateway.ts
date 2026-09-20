/**
 * Tasks API Gateway
 *
 * المالك الوحيد لاستدعاءات المهام والتذكيرات والجدول الزمني وجلسات المذاكرة.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 *
 * Raw 1:1 mirrors (حد ترحيل الواجهات F-018): نفس المسار والطريقة
 * والحمولة التي استخدمتها الواجهة — صفر تغيير سلوكي بالتصميم.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

type RawPayload = object;

// ─── المهام ──────────────────────────────────────────────────────────

export function createTaskRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.postJson<T>(apiRoutes.tasks.create, payload);
}

export function patchTaskRaw<T>(id: string, payload: RawPayload): Promise<T> {
  return apiClient.patch<T>(apiRoutes.tasks.update(id), payload);
}

export function deleteTaskRaw(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.tasks.delete(id));
}

// ─── التذكيرات ───────────────────────────────────────────────────────

export function createReminderRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.postJson<T>(apiRoutes.reminders.create, payload);
}

export function patchReminderRaw<T>(id: string, payload: RawPayload): Promise<T> {
  return apiClient.patch<T>(apiRoutes.reminders.byId(id), payload);
}

export function deleteReminderRaw(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.reminders.byId(id));
}

// ─── الجدول الزمني ───────────────────────────────────────────────────

export function saveScheduleRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.post<T>(apiRoutes.schedule.update, payload);
}

// ─── جلسات المذاكرة ──────────────────────────────────────────────────

export function createStudySessionRaw(payload: RawPayload): Promise<unknown> {
  return apiClient.postJson(apiRoutes.studySessions.create, payload);
}

export function fetchTaskActualTimeRaw<T>(taskId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.tasks.update(taskId));
}

export function putTaskRaw<T>(taskId: string, payload: RawPayload): Promise<T> {
  return apiClient.put<T>(apiRoutes.tasks.update(taskId), payload);
}
