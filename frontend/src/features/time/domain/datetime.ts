/**
 * Safe wall-clock helpers for the time domain.
 *
 * All schedule math is done in integer minutes-since-midnight to avoid the
 * classic Date-mutation bugs (setHours on shared dates, month-end rollovers,
 * DST double-hours). Conversion to real instants happens exactly once, at the
 * UI/API boundary.
 */

import type { DayOfWeek, TimeWindow } from "./types";

export const MINUTES_PER_DAY = 1440;

/** "HH:mm" → minutes since midnight. Returns null for malformed input (never throws). */
export function parseHHMM(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** minutes since midnight → "HH:mm". Clamps into [0, 1439]. */
export function toHHMM(min: number): string {
  const clamped = Math.min(MINUTES_PER_DAY - 1, Math.max(0, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Local date key "yyyy-mm-dd" (user timezone). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayOfWeek(d: Date): DayOfWeek {
  return d.getDay() as DayOfWeek;
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Whole days from `from` to `to`, ignoring time-of-day (calendar-day diff).
 * Negative when `to` is before `from`.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Do two same-day windows overlap? (Cross-day windows are rejected upstream.) */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;
}

export function overlapMinutes(a: TimeWindow, b: TimeWindow): number {
  if (!windowsOverlap(a, b)) return 0;
  return Math.min(a.endMin, b.endMin) - Math.max(a.startMin, b.startMin);
}

export function windowDurationMin(w: TimeWindow): number {
  return Math.max(0, w.endMin - w.startMin);
}

/** Validate a window; invalid data is filtered out, never silently clamped. */
export function isValidWindow(w: TimeWindow): boolean {
  return (
    Number.isInteger(w.startMin) &&
    Number.isInteger(w.endMin) &&
    w.startMin >= 0 &&
    w.endMin <= MINUTES_PER_DAY &&
    w.startMin < w.endMin
  );
}

/**
 * Subtract busy windows from free windows → remaining free windows.
 * Both lists must be same-day, valid, and sorted is not required.
 */
export function subtractWindows(free: TimeWindow[], busy: TimeWindow[]): TimeWindow[] {
  let result = free.filter(isValidWindow).map((w) => ({ ...w }));
  for (const b of busy) {
    if (!isValidWindow(b)) continue;
    const next: TimeWindow[] = [];
    for (const f of result) {
      if (f.day !== b.day || !windowsOverlap(f, b)) {
        next.push(f);
        continue;
      }
      if (f.startMin < b.startMin) {
        next.push({ day: f.day, startMin: f.startMin, endMin: b.startMin });
      }
      if (b.endMin < f.endMin) {
        next.push({ day: f.day, startMin: b.endMin, endMin: f.endMin });
      }
    }
    result = next;
  }
  return result.filter((w) => w.endMin > w.startMin);
}
