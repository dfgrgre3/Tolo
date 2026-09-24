/** Formatting helpers for the Jobs module. */
import type { Job, JobQuestion } from '@/types/job';
import { jobsStrings, salaryPeriodLabels } from './labels';

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

/**
 * Fit badge text for the server-computed match score, or null to render nothing.
 *
 * The score is a percentage the API returns only for signed-in viewers, so
 * every caller has to decide what "no score" looks like. Returning null (rather
 * than a placeholder) keeps that decision with the caller:
 *  - absent/null/NaN  → no signal at all;
 *  - 0 (or 0.x)       → the server is saying "nothing in common"; a badge
 *                       reading "توافق 0٪" would present that as a verdict the
 *                       product never meant to advertise;
 *  - above 100        → impossible for a percentage, so it is a server bug and
 *                       printing it would state something untrue.
 */
export function formatMatchScore(score: number | null | undefined): string | null {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;

  const rounded = Math.round(score);
  if (rounded <= 0 || rounded > 100) return null;

  return jobsStrings.matchPercent(rounded);
}

/**
 * Renders one screening answer, or null when there is nothing to show.
 *
 * `answers` is a free-form JSON map (the question set is per-job), so the value
 * can be any JSON type. Each shape is handled explicitly rather than via
 * String(value):
 *  - an unanswered question (null/empty string/empty array) returns null so the
 *    row is skipped instead of rendering a blank line;
 *  - booleans become نعم/لا, because "true" is not an answer an employer reads;
 *  - numbers and nested arrays keep their raw text — an answer may be an
 *    identifier or a phone number, and localising its digits would misreport it;
 *  - an unexpected object is serialised rather than dropped: showing the raw
 *    payload beats hiding an answer the applicant did give.
 */
export function formatAnswerValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا';
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatAnswerValue(item))
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join('، ') : null;
  }

  return JSON.stringify(value);
}

export interface ApplicationAnswerRow {
  /** The question id the answer is keyed by. */
  id: string;
  answer: string;
  /**
   * The question's current text, resolved from the job's question set. Absent
   * when the id no longer matches a question (the employer deleted it after
   * this application was submitted) — the row then renders its id as a
   * fallback label rather than pretending the answer is unidentifiable.
   */
  prompt?: string;
  required?: boolean;
}

/**
 * Turns the application's `answers` map into renderable rows.
 *
 * Key order is preserved exactly as the server sent it — the ids carry no
 * meaning we can sort by, and re-ordering would only be guessing. When the
 * job's question set is supplied, each row also resolves its prompt and
 * required flag from it; answers whose question was since deleted keep their
 * bare id.
 */
export function formatApplicationAnswers(
  answers: Record<string, unknown> | null | undefined,
  questions?: readonly JobQuestion[] | null
): ApplicationAnswerRow[] {
  if (!answers) return [];

  const byId = new Map((questions ?? []).map((question) => [question.id, question]));

  const rows: ApplicationAnswerRow[] = [];
  for (const [id, value] of Object.entries(answers)) {
    const answer = formatAnswerValue(value);
    if (answer === null) continue;
    const question = byId.get(id);
    rows.push({
      id,
      answer,
      ...(question
        ? { prompt: question.prompt, required: question.required ?? false }
        : {}),
    });
  }

  return rows;
}
