/** Habit tracking — date-anchored, analyzable, streak-correct.
 *
 * The v1 UI stored `weekLog: boolean[7]` (no dates) which made streaks wrong
 * across week boundaries and the data useless for analysis. Everything here
 * works on local date keys ("yyyy-mm-dd" via localDateKey) so records are
 * canonical, migratable to a server later, and testable with an injected `now`.
 *
 * Streak rule (standard habit semantics): a streak survives until a full day
 * passes with no completion. Counting from `now`: if today is done, count
 * today backwards; if today is NOT done yet, the streak is still alive from
 * yesterday (the day isn't over). Broken only when yesterday is also missing.
 */

import { calendarDaysBetween, localDateKey } from "./datetime";

/** A single habit with its completion history (local date keys). */
export interface HabitEntry {
  id: string;
  title: string;
  /** Local date keys "yyyy-mm-dd" on which the habit was completed. */
  doneDates: string[];
}

export interface HabitStats {
  /** Consecutive days ending today (or yesterday when today is pending). */
  streak: number;
  /** Longest run ever recorded for this habit. */
  bestStreak: number;
  /** Completions within the last 7 days (today inclusive). */
  doneLast7: number;
  /** doneLast7 / 7 * 100, rounded. */
  consistencyPct: number;
  doneToday: boolean;
  /** Done every day of the trailing 7 — streak badge for the week. */
  perfectWeek: boolean;
}

/** One cell of the trailing-week strip rendered by the UI. */
export interface HabitDayCell {
  /** Local date key. */
  key: string;
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  /** Single-letter Arabic label (ح ن ث ر خ ج س). */
  label: string;
  isToday: boolean;
  done: boolean;
}

const DAY_LABELS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

function uniqueSortedKeys(dates: string[]): string[] {
  const set = new Set<string>();
  for (const d of dates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
  }
  return [...set].sort();
}

function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Pure toggle of a date key (idempotent add/remove). */
export function toggleHabitDate(entry: HabitEntry, dateKey: string): HabitEntry {
  const has = entry.doneDates.includes(dateKey);
  return {
    ...entry,
    doneDates: has
      ? entry.doneDates.filter((d) => d !== dateKey)
      : [...entry.doneDates, dateKey],
  };
}

/** Current + best streak, trailing-7 consistency, and today's flag. */
export function habitStats(entry: HabitEntry, now: Date): HabitStats {
  const keys = uniqueSortedKeys(entry.doneDates);
  const todayKey = localDateKey(now);
  const yesterdayKey = localDateKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  );
  const doneToday = keys.includes(todayKey);

  // Current streak: walk back from today (or yesterday if today pending).
  let streak = 0;
  let cursor = doneToday ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  for (;;) {
    const key = localDateKey(cursor);
    if (!keys.includes(key)) break;
    streak++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  // No streak from today or yesterday → 0 (do not count past runs as "current").
  if (!doneToday && !keys.includes(yesterdayKey)) streak = 0;

  // Best streak over all history.
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of keys) {
    const d = parseKey(key);
    if (!d) continue;
    if (prev && calendarDaysBetween(prev, d) === 1) run++;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }

  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  let doneLast7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    if (d < from) continue;
    if (keys.includes(localDateKey(d))) doneLast7++;
  }

  return {
    streak,
    bestStreak: best,
    doneLast7,
    consistencyPct: Math.round((doneLast7 / 7) * 100),
    doneToday,
    perfectWeek: doneLast7 === 7,
  };
}

/** Trailing 7 days, oldest → newest, for the week strip UI. */
export function habitWeekCells(entry: HabitEntry, now: Date): HabitDayCell[] {
  const done = new Set(entry.doneDates);
  const todayKey = localDateKey(now);
  const cells: HabitDayCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = localDateKey(d);
    cells.push({
      key,
      dayOfWeek: d.getDay(),
      label: DAY_LABELS[d.getDay()] ?? "·",
      isToday: key === todayKey,
      done: done.has(key),
    });
  }
  return cells;
}

/**
 * Migrate the legacy v1 shape ({ weekLog: boolean[7] }) onto real dates.
 * Index 6 maps to today, index 0 to 6 days ago (v1 documented "last 7 days").
 * Invalid input degrades to an empty habit — never throws.
 */
export function migrateV1Habit(
  raw: { id?: string; title?: string; weekLog?: unknown },
  now: Date,
): HabitEntry {
  const doneDates: string[] = [];
  const weekLog = Array.isArray(raw.weekLog) ? raw.weekLog : [];
  for (let i = 0; i < 7; i++) {
    if (weekLog[i] !== true) continue;
    const offset = i - 6; // 0 → -6 … 6 → 0
    doneDates.push(localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)));
  }
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `h_${dateKeyFallback(now)}`,
    title: typeof raw.title === "string" && raw.title ? raw.title : "عادة",
    doneDates,
  };
}

/** Stable fallback id for habits imported without one. */
function dateKeyFallback(now: Date): string {
  return `${localDateKey(now)}_${String(now.getTime() % 100000).padStart(5, "0")}`;
}