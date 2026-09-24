/**
 * Recurrence engine — rule-based, bounded occurrence generation.
 *
 * We never materialize infinite rows: occurrences are generated on demand for
 * a [from, to] range (typically a visible calendar window), capped by
 * MAX_OCCURRENCES as a safety valve.
 */

import type { DayOfWeek, RecurrenceRule } from "./types";
import { dayOfWeek, localDateKey } from "./datetime";

export const MAX_OCCURRENCES = 400;

function atDay(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
}

function keyOf(d: Date): string {
  return localDateKey(d);
}

function endKey(rule: RecurrenceRule): string | null {
  return rule.endDate ?? null;
}

/**
 * Generate occurrence date keys for `rule` within [from, to] (inclusive).
 * `skipped` is a set of date keys the user explicitly skipped.
 */
export function generateOccurrences(
  rule: RecurrenceRule,
  from: Date,
  to: Date,
  skipped: ReadonlySet<string> = new Set(),
): string[] {
  if (to < from) return [];
  const out: string[] = [];
  const limit = endKey(rule);
  const start = new Date(rule.startDate);
  if (Number.isNaN(start.getTime())) return [];

  const interval =
    rule.freq === "EVERY_X_DAYS"
      ? Math.max(1, Math.floor(rule.interval))
      : rule.freq === "DAILY" || rule.freq === "WEEKLY"
        ? Math.max(1, Math.floor(rule.interval ?? 1))
        : 1;

  const weekdays: Set<DayOfWeek> | null =
    rule.freq === "WEEKDAYS" ? new Set(rule.weekdays) : null;

  // Iterate calendar days in range — O(range days), bounded and simple.
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  // For interval-based rules, anchor to startDate to keep the cadence stable.
  const anchorDays = Math.floor(
    (new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime() -
      new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) /
      86_400_000,
  );

  for (let d = new Date(cursor); d <= last && out.length < MAX_OCCURRENCES; d = atDay(d, 1)) {
    const key = keyOf(d);
    if (d < new Date(start.getFullYear(), start.getMonth(), start.getDate())) continue;
    if (limit && key > limit) break;
    if (skipped.has(key)) continue;

    const offset = anchorDays + Math.round((d.getTime() - cursor.getTime()) / 86_400_000);

    let occurs = false;
    switch (rule.freq) {
      case "DAILY":
      case "EVERY_X_DAYS":
        occurs = offset % interval === 0;
        break;
      case "WEEKLY":
        // Same weekday as startDate, every `interval` weeks.
        occurs =
          dayOfWeek(d) === dayOfWeek(start) && Math.floor(offset / 7) % interval === 0 && offset % 7 === 0;
        break;
      case "WEEKDAYS":
        occurs = weekdays!.has(dayOfWeek(d));
        break;
    }
    if (occurs) out.push(key);
  }
  return out;
}

/** Next occurrence strictly after `after`, or null if the rule has ended. */
export function nextOccurrence(rule: RecurrenceRule, after: Date): string | null {
  const horizon = atDay(after, 366); // search up to a year ahead
  const keys = generateOccurrences(rule, atDay(after, 1), horizon);
  return keys[0] ?? null;
}
