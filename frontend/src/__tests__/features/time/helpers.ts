import type { PlannableTask } from "@/features/time/domain";

export const DAY = 86_400_000;
export const NOW = new Date(2026, 8, 24, 10, 0, 0); // Thu 24 Sep 2026, 10:00 local

export function isoIn(days: number): string {
  return new Date(NOW.getTime() + days * DAY).toISOString();
}

export function task(partial: Partial<PlannableTask> & { id: string }): PlannableTask {
  return { title: partial.id, priority: "MEDIUM", status: "PENDING", ...partial };
}
