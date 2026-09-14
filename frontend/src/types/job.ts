/**
 * Jobs module domain types.
 *
 * These mirror the Go models in internal/domain/common/job.go. The unions
 * below match the CHECK constraints in migration 0197 exactly — if the
 * backend gains a value, it must be added here too or the UI will render an
 * unmapped label.
 */

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY'
  | 'INTERNSHIP'
  | 'FREELANCE';

export type WorkplaceType = 'REMOTE' | 'HYBRID' | 'ON_SITE';

export type ExperienceLevel =
  | 'ENTRY'
  | 'JUNIOR'
  | 'MID'
  | 'SENIOR'
  | 'LEAD'
  | 'MANAGER'
  | 'DIRECTOR';

export type SalaryPeriod = 'HOURLY' | 'MONTHLY' | 'YEARLY';

export type JobPostingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'CLOSED'
  | 'REJECTED'
  | 'ARCHIVED';

export type JobApplicationStatus =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

/**
 * The applicant-facing pipeline, in the order the timeline renders.
 * REJECTED / WITHDRAWN are terminal branches and deliberately excluded — they
 * end the timeline rather than appearing as a step within it.
 */
export const APPLICATION_TIMELINE: readonly JobApplicationStatus[] = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'ASSESSMENT',
  'OFFER',
  'HIRED',
] as const;

/** Statuses the applicant can no longer act on (hides the Withdraw action). */
export const TERMINAL_APPLICATION_STATUSES: readonly JobApplicationStatus[] = [
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export function isTerminalApplicationStatus(status: JobApplicationStatus): boolean {
  return TERMINAL_APPLICATION_STATUSES.includes(status);
}

export interface Company {
  id: string;
  ownerId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  foundedYear?: number | null;
  location?: string | null;
  isVerified: boolean;
  openPositions: number;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  companyId: string;
  postedBy?: string | null;
  title: string;
  slug: string;
  description: string;
  responsibilities?: string | null;
  requirements?: string | null;
  preferredQualifications?: string | null;
  benefits?: string | null;
  skills: string[];
  category?: string | null;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  experienceLevel: ExperienceLevel;
  country?: string | null;
  city?: string | null;
  salaryMin?: string | number | null;
  salaryMax?: string | number | null;
  salaryCurrency: string;
  salaryPeriod: SalaryPeriod;
  isSalaryVisible: boolean;
  status: JobPostingStatus;
  isFeatured: boolean;
  viewCount: number;
  applicationCount: number;
  publishedAt?: string | null;
  expiresAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  company?: Company | null;

  /**
   * Per-viewer flags resolved server-side for the authenticated caller. They
   * are always present in responses but are never persisted on the row.
   *
   * `isApplyOpen` is the authoritative answer to "can this be applied to" —
   * it comes from the same Job.CanAcceptApplications() the apply handler
   * guards with, so the button state and the server's decision cannot
   * disagree. Never recompute it from status/expiresAt on the client.
   */
  isSaved: boolean;
  hasApplied: boolean;
  isApplyOpen: boolean;
  matchScore?: number | null;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  status: JobApplicationStatus;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  answers: Record<string, unknown>;
  phone?: string | null;
  email?: string | null;
  withdrawnAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  job?: Job | null;
}

export interface SavedJobEntry {
  savedAt: string;
  job: Job;
}

export interface JobCategoryCount {
  category: string;
  count: number;
}

export interface JobsOverview {
  applied: number;
  saved: number;
  interviews: number;
  offers: number;
}

export interface JobsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
