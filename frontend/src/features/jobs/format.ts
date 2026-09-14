/** Formatting helpers for the Jobs module. */
import type { Job } from '@/types/job';
import { salaryPeriodLabels } from './labels';

/**
 * Salary comes back as a numeric(19,4) — serialised as a string by the Go
 * decimal type, or as a number depending on the driver path. Normalise both.
 */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const compactCurrency = (value: number, currency: string): string => {
  // Arabic-Egyptian locale with the job's own currency; falls back to a plain
  // grouped number when the currency code is not one Intl recognises.
  try {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString('ar-EG')} ${currency}`;
  }
};

/**
 * Renders the salary line, or null when there is nothing honest to show.
 *
 * Returns null (rather than a placeholder) when the employer hid the salary or
 * left it blank, so the caller decides whether to render "غير معلن" or omit
 * the row entirely.
 */
export function formatSalary(job: Job): string | null {
  if (!job.isSalaryVisible) return null;

  const min = toNumber(job.salaryMin);
  const max = toNumber(job.salaryMax);
  if (min === null && max === null) return null;

  const period = salaryPeriodLabels[job.salaryPeriod] ?? '';
  const currency = job.salaryCurrency || 'EGP';

  if (min !== null && max !== null) {
    if (min === max) return `${compactCurrency(min, currency)} ${period}`;
    return `${compactCurrency(min, currency)} – ${compactCurrency(max, currency)} ${period}`;
  }

  const single = (min ?? max) as number;
  const prefix = min !== null ? 'من' : 'حتى';
  return `${prefix} ${compactCurrency(single, currency)} ${period}`;
}

/** "القاهرة، مصر" — omitting whichever half is missing. */
export function formatLocation(job: Pick<Job, 'city' | 'country'>): string | null {
  const parts = [job.city, job.country].filter(Boolean);
  return parts.length > 0 ? parts.join('، ') : null;
}

/**
 * Relative "posted N ago" in Arabic. Uses Intl.RelativeTimeFormat so the
 * plural forms are correct, which hand-rolled Arabic pluralisation gets wrong.
 */
export function formatRelativeDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ];

  let value = diffMinutes;
  for (const [unit, step] of units) {
    if (Math.abs(value) < step) return formatter.format(value, unit);
    value = Math.round(value / step);
  }
  return formatter.format(value, 'year');
}

/** Absolute date for deadlines, where precision matters more than recency. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(date);
}
