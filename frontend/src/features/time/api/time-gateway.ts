/**
 * Time & Productivity API Gateway — server-backed habits + exam plans.
 *
 * Thin transport only: apiClient owns the /api → /api/v1 proxy rewrite,
 * envelope unwrapping, retries, CSRF, and domain errors. The localStorage
 * keys (time-habits-v2, exam-plans) remain the offline cache hydrated by
 * the components; see features/time/api/sync-merge.ts for the merge policy.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type { ExamPlanRecord, HabitEntry } from '@/features/time/domain';

// ─── العادات ───────────────────────────────────────────────────────────────

export function fetchHabits(): Promise<HabitEntry[]> {
  return apiClient.get<HabitEntry[]>(apiRoutes.habits.list);
}

export function createHabit(payload: HabitEntry): Promise<HabitEntry> {
  return apiClient.postJson<HabitEntry>(apiRoutes.habits.create, payload);
}

export function updateHabit(
  id: string,
  payload: Partial<Pick<HabitEntry, 'title' | 'doneDates'>>,
): Promise<HabitEntry> {
  return apiClient.patch<HabitEntry>(apiRoutes.habits.update(id), payload);
}

export function deleteHabit(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.habits.delete(id));
}

// ─── خطط الامتحانات ───────────────────────────────────────────────────────

export function fetchExamPlans(): Promise<ExamPlanRecord[]> {
  return apiClient.get<ExamPlanRecord[]>(apiRoutes.examPlans.list);
}

export function createExamPlan(payload: ExamPlanRecord): Promise<ExamPlanRecord> {
  return apiClient.postJson<ExamPlanRecord>(apiRoutes.examPlans.create, payload);
}

export function updateExamPlan(
  id: string,
  payload: Partial<Pick<ExamPlanRecord, 'title' | 'subject' | 'examAt' | 'topics'>>,
): Promise<ExamPlanRecord> {
  return apiClient.patch<ExamPlanRecord>(apiRoutes.examPlans.update(id), payload);
}

export function deleteExamPlan(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.examPlans.delete(id));
}
