/** Typed Jobs module operations backed by the generated OpenAPI paths. */
import { client, type components } from '@/lib/api/generated-client';

type Schemas = components['schemas'];

export type ContractJobListResponse =
  Schemas['authdto.JobListResponse'];
export type ContractJobDetailResponse =
  Schemas['authdto.JobDetailResponse'];
export type ContractCompanyListResponse =
  Schemas['authdto.CompanyListResponse'];
export type ContractCompanyDetailResponse =
  Schemas['authdto.CompanyDetailResponse'];
export type ContractSavedJobListResponse =
  Schemas['authdto.SavedJobListResponse'];
export type ContractJobApplicationListResponse =
  Schemas['authdto.JobApplicationListResponse'];
export type ContractJobApplicationDetailResponse =
  Schemas['authdto.JobApplicationDetailResponse'];
export type ContractJobsOverviewResponse =
  Schemas['authdto.JobsOverviewResponse'];

/**
 * Search filters, mirroring the backend's accepted query params.
 *
 * Array-valued filters are sent comma-separated; the backend's csvQuery helper
 * accepts both that and repeated keys, and comma form keeps the shareable
 * search URL short.
 */
export interface JobSearchParams {
  keyword?: string;
  location?: string;
  country?: string;
  city?: string;
  remote?: boolean;
  jobType?: string[];
  workplace?: string[];
  experience?: string[];
  category?: string[];
  company?: string[];
  skills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  datePosted?: number;
  sort?: 'relevance' | 'newest' | 'salary_desc' | 'salary_asc';
  page?: number;
  limit?: number;
}

/**
 * Drops empty values and flattens arrays, so an untouched filter never
 * appears in the URL. This keeps query keys stable — two searches that differ
 * only by a cleared filter produce the same cache key.
 */
function toQuery(params: JobSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      query[key] = value.join(',');
    } else {
      query[key] = value as string | number | boolean;
    }
  }

  return query;
}

export function contractSearchJobs(params: JobSearchParams = {}) {
  return client.GET('/api/v1/jobs', { params: { query: toQuery(params) } });
}

export function contractGetJob(id: string) {
  return client.GET('/api/v1/jobs/{id}', { params: { path: { id } } });
}

export function contractGetSimilarJobs(id: string, limit?: number) {
  return client.GET('/api/v1/jobs/{id}/similar', {
    params: { path: { id }, query: limit ? { limit } : undefined },
  });
}

export function contractListJobCategories() {
  return client.GET('/api/v1/jobs/categories', {});
}

export function contractListCompanies(params?: {
  search?: string;
  industry?: string[];
  verified?: boolean;
  page?: number;
  limit?: number;
}) {
  return client.GET('/api/v1/companies', { params: { query: params } });
}

export function contractGetCompany(id: string) {
  return client.GET('/api/v1/companies/{id}', { params: { path: { id } } });
}

export function contractGetCompanyJobs(id: string, params?: { page?: number; limit?: number }) {
  return client.GET('/api/v1/companies/{id}/jobs', {
    params: { path: { id }, query: params },
  });
}

// ── Authenticated seeker surface ──────────────────────────────

export function contractGetJobsOverview() {
  return client.GET('/api/v1/me/jobs/overview', {});
}

export function contractListSavedJobs(params?: { page?: number; limit?: number }) {
  return client.GET('/api/v1/me/jobs/saved', { params: { query: params } });
}

export function contractSaveJob(id: string) {
  return client.POST('/api/v1/me/jobs/saved/{id}', { params: { path: { id } } });
}

export function contractUnsaveJob(id: string) {
  return client.DELETE('/api/v1/me/jobs/saved/{id}', { params: { path: { id } } });
}

export interface JobApplicationInput {
  resumeUrl?: string;
  coverLetter?: string;
  answers?: Record<string, unknown>;
  phone?: string;
  email?: string;
}

export function contractApplyToJob(id: string, body: JobApplicationInput) {
  return client.POST('/api/v1/me/jobs/apply/{id}', {
    params: { path: { id } },
    body: body as never,
  });
}

export function contractListMyApplications(params?: {
  status?: string[];
  page?: number;
  limit?: number;
}) {
  const query: Record<string, string | number> = {};
  if (params?.status?.length) query.status = params.status.join(',');
  if (params?.page) query.page = params.page;
  if (params?.limit) query.limit = params.limit;

  return client.GET('/api/v1/me/jobs/applications', { params: { query } });
}

export function contractGetMyApplication(id: string) {
  return client.GET('/api/v1/me/jobs/applications/{id}', { params: { path: { id } } });
}

export function contractWithdrawApplication(id: string) {
  return client.POST('/api/v1/me/jobs/applications/{id}/withdraw', {
    params: { path: { id } },
  });
}

// ── Employer surface ──────────────────────────────────────────
//
// These back the employer console. Authorization is ownership: every route
// below is scoped server-side to the companies the caller owns, so the client
// never filters by company itself — it just sends the id and the server
// decides whether the caller may act on it.

export type ContractEmployerJobListResponse =
  Schemas['authdto.EmployerJobListResponse'];
export type ContractEmployerJobDetailResponse =
  Schemas['authdto.EmployerJobDetailResponse'];

export function contractListMyCompanies() {
  return client.GET('/api/v1/employer/companies', {});
}

export function contractCreateCompany(body: EmployerCompanyInput) {
  return client.POST('/api/v1/employer/companies', { body: body as never });
}

export function contractUpdateCompany(id: string, body: EmployerCompanyInput) {
  return client.PATCH('/api/v1/employer/companies/{companyId}', {
    params: { path: { companyId: id } },
    body: body as never,
  });
}

export interface EmployerCompanyInput {
  name: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
  foundedYear?: number;
  location?: string;
}

export interface EmployerJobInput {
  companyId: string;
  title: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  preferredQualifications?: string;
  benefits?: string;
  skills?: string[];
  category?: string;
  employmentType?: string;
  workplaceType?: string;
  experienceLevel?: string;
  country?: string;
  city?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  isSalaryVisible?: boolean;
  expiresAt?: string;
}

export function contractListEmployerJobs(params?: {
  companyId?: string;
  status?: string[];
  q?: string;
  page?: number;
  limit?: number;
}) {
  const query: Record<string, string | number> = {};
  if (params?.companyId) query.companyId = params.companyId;
  if (params?.status?.length) query.status = params.status.join(',');
  if (params?.q) query.q = params.q;
  if (params?.page) query.page = params.page;
  if (params?.limit) query.limit = params.limit;

  return client.GET('/api/v1/employer/jobs', { params: { query } });
}

export function contractGetEmployerJob(id: string) {
  return client.GET('/api/v1/employer/jobs/{jobId}', {
    params: { path: { jobId: id } },
  });
}

export function contractCreateJob(body: EmployerJobInput) {
  return client.POST('/api/v1/employer/jobs', { body: body as never });
}

export function contractUpdateJob(id: string, body: EmployerJobInput) {
  return client.PATCH('/api/v1/employer/jobs/{jobId}', {
    params: { path: { jobId: id } },
    body: body as never,
  });
}

export function contractTransitionJob(
  id: string,
  body: { status: string; reason?: string },
) {
  return client.POST('/api/v1/employer/jobs/{jobId}/transition', {
    params: { path: { jobId: id } },
    body: body as never,
  });
}

export function contractDuplicateJob(id: string) {
  return client.POST('/api/v1/employer/jobs/{jobId}/duplicate', {
    params: { path: { jobId: id } },
  });
}

export function contractDeleteJob(id: string) {
  return client.DELETE('/api/v1/employer/jobs/{jobId}', {
    params: { path: { jobId: id } },
  });
}

// ── Employer applicant pipeline ───────────────────────────────

export function contractListJobApplicants(
  jobId: string,
  params?: { status?: string[]; q?: string; page?: number; limit?: number },
) {
  const query: Record<string, string | number> = {};
  if (params?.status?.length) query.status = params.status.join(',');
  if (params?.q) query.q = params.q;
  if (params?.page) query.page = params.page;
  if (params?.limit) query.limit = params.limit;

  return client.GET('/api/v1/employer/jobs/{jobId}/applications', {
    params: { path: { jobId }, query },
  });
}

export function contractGetApplicant(id: string) {
  return client.GET('/api/v1/employer/applications/{applicationId}', {
    params: { path: { applicationId: id } },
  });
}

export function contractTransitionApplication(
  id: string,
  body: { status: string; note?: string },
) {
  return client.POST('/api/v1/employer/applications/{applicationId}/stage', {
    params: { path: { applicationId: id } },
    body: body as never,
  });
}
