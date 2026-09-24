/**
 * Schedule conflict detection + deterministic resolution suggestions.
 *
 * Pure: given the day's blocks, report every overlap with actionable options.
 * Locked blocks are never suggested for moving.
 */

import type { ScheduleBlock, ScheduleConflict } from "./types";
import { isValidWindow, overlapMinutes } from "./datetime";

const KIND_LABELS: Record<ScheduleBlock["kind"], string> = {
  study: "جلسة دراسة",
  break: "استراحة",
  fixed: "التزام ثابت",
  sleep: "نوم",
  personal: "وقت شخصي",
  exam: "امتحان",
  buffer: "وقت احتياطي",
};

export function detectConflicts(blocks: ScheduleBlock[]): ScheduleConflict[] {
  const valid = blocks.filter(isValidWindow);
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i]!;
      const b = valid[j]!;
      const overlap = overlapMinutes(a, b);
      if (overlap <= 0) continue;

      const suggestions: string[] = [];
      const movableA = !a.locked && (a.kind === "study" || a.kind === "buffer");
      const movableB = !b.locked && (b.kind === "study" || b.kind === "buffer");

      if (movableA && !movableB) {
        suggestions.push(`انقل "${label(a)}" إلى نافذة دراسة فارغة`);
      } else if (movableB && !movableA) {
        suggestions.push(`انقل "${label(b)}" إلى نافذة دراسة فارغة`);
      } else if (movableA && movableB) {
        suggestions.push(`انقل "${label(a)}" أو "${label(b)}" — كلاهما مرن`);
      } else {
        suggestions.push("كلا الكتلتين ثابتة — راجع الجدول الأسبوعي يدويًا");
      }
      suggestions.push(`قلّص التداخل (${overlap} دقيقة) بتقصير الكتلة الأقل أهمية`);

      conflicts.push({ blockA: a, blockB: b, overlapMin: overlap, suggestions });
    }
  }
  return conflicts;
}

function label(b: ScheduleBlock): string {
  return b.title ?? KIND_LABELS[b.kind];
}

/** True when `candidate` overlaps any existing block on the same day. */
export function hasConflict(candidate: ScheduleBlock, existing: ScheduleBlock[]): boolean {
  return existing.some((b) => overlapMinutes(candidate, b) > 0);
}
