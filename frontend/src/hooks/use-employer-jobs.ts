'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapOpenApiPayload } from '@/lib/api/generated-client';
import {
  contractCreateCompany,
  contractCreateJob,
  contractDeleteJob,
  contractDuplicateJob,
  contractGetApplicant,
  contractGetEmployerJob,
  contractListEmployerJobs,
  contractListJobApplicants,
  contractListMyCompanies,
  contractTransitionApplication,
  contractTransitionJob,
  contractUpdateCompany,
  contractUpdateJob,
  type EmployerCompanyInput,
  type EmployerJobInput,
} from '@/services/api/contracts-jobs-service';
import type {
  Company,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobPostingStatus,
  JobsPagination,
} from '@/types/job';

/**
 * Employer console data hooks.
 *
 * Mirrors use-jobs.ts on purpose: same query-key factory discipline, same
 * unwrap/throw contract so react-query owns the error state. The difference
 * is the cache namespace — employer and seeker lists must never share an
 * entry, because the same job id resolves to a different payload on each
 * surface (status counts, allowed transitions, applicant visibility).
 */
export const employerKeys = {
  all: ['employer'] as const,
  companies: () => [...employerKeys.all, 'companies'] as const,
  jobs: (params: EmployerJobsParams) =>
    [...employerKeys.all, 'jobs', params] as const,
  job: (id: string) => [...employerKeys.all, 'job', id] as const,
  applicants: (jobId: string, params: EmployerApplicantsParams) =>
    [...employerKeys.all, 'applicants', jobId, params] as const,
  applicant: (id: string) => [...employerKeys.all, 'applicant', id] as const,
};

interface ListEnvelope<T> {
  items?: T[];
  applications?: T[];
  jobs?: T[];
  companies?: T[];
  statusCounts?: Record<string, number>;
  pagination?: JobsPagination;
}

function unwrap<T>(result: { data?: unknown; error?: unknown }): T {
  if (result.error) throw result.error;
  return unwrapOpenApiPayload<T>(result.data) as T;
}

export interface EmployerJobsParams {
  companyId?: string;
  status?: JobPostingStatus[];
  q?: string;
  page?: number;
  limit?: number;
}

export interface EmployerApplicantsParams {
  status?: JobApplicationStatus[];
  q?: string;
  page?: number;
  limit?: number;
}

// ── Companies ──────────────────────────────────────────────────

export function useMyCompanies() {
  return useQuery({
    queryKey: employerKeys.companies(),
    queryFn: async (): Promise<Company[]> => {
      const payload = unwrap<ListEnvelope<Company>>(await contractListMyCompanies());
      return payload?.items ?? payload?.companies ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployerCompanyInput) =>
      unwrap<{ company: Company }>(await contractCreateCompany(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.companies() });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EmployerCompanyInput }) =>
      unwrap<{ company: Company }>(await contractUpdateCompany(id, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.companies() });
    },
  });
}

// ── Job postings ────────────────────────────────────────────────

export interface EmployerJobsResult {
  items: Job[];
  statusCounts: Record<string, number>;
  pagination?: JobsPagination;
}

export function useEmployerJobs(params: EmployerJobsParams = {}) {
  return useQuery({
    queryKey: employerKeys.jobs(params),
    queryFn: async (): Promise<EmployerJobsResult> => {
      const payload = unwrap<ListEnvelope<Job>>(await contractListEmployerJobs(params));
      const items = payload?.items ?? payload?.jobs ?? [];
      return {
        items,
        statusCounts: payload?.statusCounts ?? {},
        pagination: payload?.pagination,
      };
    },
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export interface EmployerJobDetail {
  job: Job;
  allowedTransitions: JobPostingStatus[];
}

export function useEmployerJob(id: string, enabled = true) {
  return useQuery({
    queryKey: employerKeys.job(id),
    queryFn: async (): Promise<EmployerJobDetail> =>
      unwrap<EmployerJobDetail>(await contractGetEmployerJob(id)),
    enabled,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployerJobInput) =>
      unwrap<EmployerJobDetail>(await contractCreateJob(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EmployerJobInput }) =>
      unwrap<EmployerJobDetail>(await contractUpdateJob(id, input)),
    onSuccess: ({ job }) => {
      qc.invalidateQueries({ queryKey: employerKeys.job(job.id) });
      qc.invalidateQueries({ queryKey: ['employer', 'jobs'] });
    },
  });
}

export function useTransitionJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; status: string; reason?: string }) =>
      unwrap<EmployerJobDetail>(await contractTransitionJob(id, body)),
    onSuccess: ({ job }) => {
      qc.invalidateQueries({ queryKey: employerKeys.job(job.id) });
      qc.invalidateQueries({ queryKey: ['employer', 'jobs'] });
    },
  });
}

export function useDuplicateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap<EmployerJobDetail>(await contractDuplicateJob(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employer', 'jobs'] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap<unknown>(await contractDeleteJob(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employer', 'jobs'] });
    },
  });
}

// ── Applicant pipeline ──────────────────────────────────────────

export interface ApplicantsResult {
  items: JobApplication[];
  statusCounts: Record<string, number>;
  pagination?: JobsPagination;
}

export function useJobApplicants(jobId: string, params: EmployerApplicantsParams = {}) {
  return useQuery({
    queryKey: employerKeys.applicants(jobId, params),
    queryFn: async (): Promise<ApplicantsResult> => {
      const payload = unwrap<ListEnvelope<JobApplication>>(
        await contractListJobApplicants(jobId, params),
      );
      const items = payload?.items ?? payload?.applications ?? [];
      return {
        items,
        statusCounts: payload?.statusCounts ?? {},
        pagination: payload?.pagination,
      };
    },
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export interface ApplicantDetail {
  application: JobApplication;
  allowedTransitions: JobApplicationStatus[];
}

export function useApplicant(id: string, enabled = true) {
  return useQuery({
    queryKey: employerKeys.applicant(id),
    queryFn: async (): Promise<ApplicantDetail> =>
      unwrap<ApplicantDetail>(await contractGetApplicant(id)),
    enabled,
  });
}

export function useTransitionApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; status: string; note?: string }) =>
      unwrap<ApplicantDetail>(await contractTransitionApplication(id, body)),
    onSuccess: ({ application }) => {
      qc.invalidateQueries({ queryKey: employerKeys.applicant(application.id) });
      qc.invalidateQueries({ queryKey: ['employer', 'applicants'] });
    },
  });
}
