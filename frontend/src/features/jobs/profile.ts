/**
 * Pure logic behind /jobs/profile and the profile → apply-form hand-off.
 *
 * Free of React on purpose: the two rules this module owns — which profile
 * fields become which summary rows, and what the apply form is born prefilled
 * with — are the parts worth pinning down with unit tests.
 */
import {
  COUNTRIES,
  EDUCATION_TYPES,
  GRADE_LEVELS,
  SECTIONS,
} from '@/app/(dashboard)/profile/_components/profile.constants';
import type { UserProfileData } from '@/app/(dashboard)/profile/_components/useProfileData';
import { formatLocation } from './format';
import { jobsStrings } from './labels';

/**
 * The type and the option maps are imported from the profile section
 * deliberately: they are pure constants, and sharing one source means the jobs
 * view can never disagree with the account editor about what a stored value
 * like `THIRD_SECONDARY` is called.
 */

export interface ApplyPrefill {
  email: string;
  phone: string;
  resumeUrl: string;
}

/**
 * Initial values for the apply form.
 *
 * The backend profile carries no CV field (swagger exposes `resumeUrl` only on
 * an application), so the resume is supplied by the caller from the device-local
 * store — see `loadResumeUrl`.
 */
export function prefillApplyForm(
  profile: Pick<UserProfileData, 'email' | 'phone'> | null | undefined,
  resumeUrl = ''
): ApplyPrefill {
  return {
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    resumeUrl,
  };
}

export interface ProfileRow {
  id: string;
  label: string;
  value: string;
}

/** Maps a stored option code to its label; unknown values pass through. */
function labelOf(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Builds the summary rows shown on /jobs/profile.
 *
 * Empty fields are skipped rather than rendered as blank rows: an employer-ish
 * summary that says nothing is better than one that says nothing loudly. The
 * order is contact-first, because that is what matters when the rows are read
 * right before applying.
 *
 * `dateOfBirth` and `gender` are deliberately absent — personal data that has
 * no place on an employer-adjacent surface.
 */
export function buildProfileRows(profile: UserProfileData | null | undefined): ProfileRow[] {
  if (!profile) return [];

  const rows: ProfileRow[] = [];
  const push = (id: string, label: string, value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) rows.push({ id, label, value: trimmed });
  };

  push('email', jobsStrings.email, profile.email);
  push('phone', jobsStrings.phone, profile.phone);
  push(
    'location',
    jobsStrings.location,
    formatLocation({ city: profile.city, country: labelOf(COUNTRIES, profile.country) })
  );
  push('bio', jobsStrings.bio, profile.bio);
  push('experienceYears', jobsStrings.experienceYears, profile.experienceYears);
  push('school', jobsStrings.school, profile.school);
  push('gradeLevel', jobsStrings.gradeLevel, labelOf(GRADE_LEVELS, profile.gradeLevel));
  push('educationType', jobsStrings.educationType, labelOf(EDUCATION_TYPES, profile.educationType));
  push('section', jobsStrings.section, labelOf(SECTIONS, profile.section));
  push('studyGoal', jobsStrings.studyGoal, profile.studyGoal);
  push(
    'subjects',
    jobsStrings.subjects,
    profile.subjectsTaught && profile.subjectsTaught.length > 0
      ? profile.subjectsTaught.join('، ')
      : null
  );

  return rows;
}

/**
 * Accepts an absolute http(s) URL, and accepts empty (the field is optional —
 * this mirrors the server's own rule so both surfaces agree on what passes).
 */
export function isValidHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Device-local CV link.
 *
 * The backend profile has no field for it (swagger's only `resumeUrl` lives on
 * an application), so the value is kept in localStorage instead of being
 * invented as a server write. The trade-off is stated in the UI: the link is
 * restored in this browser and prefills apply forms here — it never reaches the
 * server and is not visible on other devices.
 */
const RESUME_STORAGE_KEY = 'thanawy:jobs:resumeUrl:v1';

export function loadResumeUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(RESUME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Passing an empty string clears the stored link. */
export function saveResumeUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const next = url.trim();
    if (next) {
      window.localStorage.setItem(RESUME_STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(RESUME_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (private mode, quota): the value simply does not
    // persist — the note under the field already says where it lives.
  }
}

