/**
 * Recurring-task rule mapper — single bridge between the RecurringTasks UI
 * rule shape and the domain recurrence engine (`generateOccurrences`).
 *
 * Why: the UI previously re-implemented its own `shouldGenerateToday` logic,
 * duplicating (and diverging from) the domain engine. This module is the only
 * place the two shapes meet. Pure and deterministic — `date` is injected.
 */

import {
  generateOccurrences,
  localDateKey,
  type DayOfWeek,
  type RecurrenceRule,
} from '@/features/time/domain';

export type UiRecurrencePattern = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM_DAYS';

export interface UiRecurringRule {
  pattern: UiRecurrencePattern;
  /** 0=Sun..6=Sat; used by WEEKLY / CUSTOM_DAYS. */
  days?: number[];
  /** Local date key the rule became active (yyyy-mm-dd). Missing on legacy rules. */
  startDate?: string;
}

/** أحد–خميس (study days; weekend = جمعة/سبت), matching the existing UI semantics. */
export const STUDY_WEEKDAYS: DayOfWeek[] = [0, 1, 2, 3, 4];

function sanitizeDays(days: number[] | undefined): DayOfWeek[] {
  return (days ?? []).filter(
    (d): d is DayOfWeek => Number.isInteger(d) && d >= 0 && d <= 6,
  );
}

/**
 * Map a UI rule to a domain RecurrenceRule, or null when the rule can never
 * fire (e.g. CUSTOM_DAYS with no valid days selected).
 *
 * WEEKLY maps to WEEKDAYS with the chosen weekday(s) (default: السبت) so the
 * historical UI semantics are preserved — the domain WEEKLY anchors cadence to
 * startDate's weekday, which would silently shift legacy rules.
 */
export function toDomainRule(rule: UiRecurringRule, fallbackStart: Date): RecurrenceRule | null {
  const startDate = rule.startDate ?? localDateKey(fallbackStart);
  switch (rule.pattern) {
    case 'DAILY':
      return { freq: 'DAILY', interval: 1, startDate };
    case 'WEEKDAYS':
      return { freq: 'WEEKDAYS', weekdays: STUDY_WEEKDAYS, startDate };
    case 'WEEKLY': {
      const days = sanitizeDays(rule.days);
      return { freq: 'WEEKDAYS', weekdays: days.length > 0 ? days : [6], startDate };
    }
    case 'CUSTOM_DAYS': {
      const days = sanitizeDays(rule.days);
      if (days.length === 0) return null;
      return { freq: 'WEEKDAYS', weekdays: days, startDate };
    }
  }
}

/** Does this rule produce an occurrence on `date`? Bounded: single-day window. */
export function occursOn(rule: UiRecurringRule, date: Date): boolean {
  const domain = toDomainRule(rule, date);
  if (!domain) return false;
  const key = localDateKey(date);
  return generateOccurrences(domain, date, date).includes(key);
}

/** Legacy storage used a non-padded key ("2026-8-4"); match both to avoid double generation. */
export function legacyDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Idempotency check: was this rule already materialized on `date`? */
export function wasGeneratedOn(lastGenerated: string | undefined, date: Date): boolean {
  if (!lastGenerated) return false;
  return lastGenerated === localDateKey(date) || lastGenerated === legacyDateKey(date);
}
