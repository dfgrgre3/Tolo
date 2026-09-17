'use client';

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-client';
import { unwrapOpenApiPayload } from '@/lib/api/generated-client';
import {
  contractApplyToJob,
  contractGetCompany,
  contractGetCompanyJobs,
  contractGetJob,
  contractGetJobsOverview,
  contractGetMyApplication,
  contractGetSimilarJobs,
  contractListCompanies,
  contractListJobCategories,
  contractListMyApplications,
  contractListSavedJobs,
  contractSaveJob,
  contractSearchJobs,
  contractUnsaveJob,
  contractWithdrawApplication,
  type JobApplicationInput,
  type JobSearchParams,
} from '@/services/api/contracts-jobs-service';
import type {
  Company,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobCategoryCount,
  JobsOverview,
  JobsPagination,
  SavedJobEntry,
} from '@/types/job';

/**
 * Query key factory.
 *
 * Centralising the keys is what makes the optimistic save/unsave below
 * correct: the mutation has to invalidate every list a job can appear in, and
 * a scattered set of inline key arrays drifts out of sync the moment a new
 * list is added.
 */
export const jobsKeys = {
  all: ['jobs'] as const,
  search: (params: JobSearchParams) => ['jobs', 'search', params] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
  // `limit` participates in the key: two callers sharing a page but requesting
  // different page sizes used to collide on one cache entry while the queryFn
  // closure captured whichever limit mounted first.
  similar: (id: string, limit?: number) => ['jobs', 'similar', id, limit] as const,
  categories: () => ['jobs', 'categories'] as const,
  saved: (page?: number, limit?: number) => ['jobs', 'saved', page ?? 1, limit] as const,
  overview: () => ['jobs', 'overview'] as const,
  applications: (status?: string[], page?: number, limit?: number) =>
    ['jobs', 'applications', status ?? [], page ?? 1, limit] as const,
  application: (id: string) => ['jobs', 'application', id] as const,
  companies: (params?: unknown) => ['jobs', 'companies', params ?? {}] as const,
  company: (id: string) => ['jobs', 'company', id] as const,
  companyJobs: (id: string, page?: number, limit?: number) =>
    ['jobs', 'company', id, 'jobs', page ?? 1, limit] as const,
};

interface ListEnvelope<T> {
  items?: T[];
  pagination?: JobsPagination;
}

/**
 * Re-wraps an openapi-fetch error into the app's ApiError taxonomy.
 *
 * The backend's error envelope carries no HTTP status in the body — it is
 * `{success:false, error:"…"}` (response.Error) or `{success:false, code,
 * message, fieldErrors}` (response.ErrorCode). openapi-fetch hands that parsed
 * body back as `error`, which left consumers unable to tell a 404 from a 500,
 * and made the job-detail not-found branch dead code. The full FetchResponse
 * also resolves `response: Response`, so we recover the status from it and let
 * every jobs error reach a page as an ApiError (isNotFound / isValidation /
 * isRateLimited …) like the rest of the app.
 */
function toJobsError(body: unknown, response?: Response): ApiError {
  const envelope = (body && typeof body === 'object' ? body : {}) as {
    error?: string;
    message?: string;
    code?: string;
  };
  const message =
    envelope.error ??
    envelope.message ??
    (response ? `Server error: ${response.status}` : 'تعذّر تحميل البيانات');
  return new ApiError(message, response?.status ?? 0, envelope.code);
}

/** Throws on transport/API error so react-query surfaces the error state. */
function unwrap<T>(result: {
  data?: unknown;
  error?: unknown;
  response?: Response;
}): T {
  if (result.error) throw toJobsError(result.error, result.response);
  return unwrapOpenApiPayload<T>(result.data) as T;
}

export interface JobSearchResult {
  items: Job[];
  pagination?: JobsPagination;
}

export function useJobSearch(params: JobSearchParams = {}) {
  return useQuery({
    queryKey: jobsKeys.search(params),
    queryFn: async (): Promise<JobSearchResult> => {
      const payload = unwrap<ListEnvelope<Job>>(await contractSearchJobs(params));
      return { items: payload?.items ?? [], pagination: payload?.pagination };
    },
    // Search results are re-fetched constantly as filters change; a short
    // window keeps paging back and forth instant without serving stale posts.
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: jobsKeys.detail(id),
    queryFn: async (): Promise<Job> => {
      const payload = unwrap<{ job: Job }>(await contractGetJob(id));
      return payload.job;
    },
    enabled: !!id,
  });
}

export function useSimilarJobs(id: string, limit?: number) {
  return useQuery({
    queryKey: jobsKeys.similar(id, limit),
    queryFn: async (): Promise<Job[]> => {
      const payload = unwrap<ListEnvelope<Job>>(await contractGetSimilarJobs(id, limit));
      return payload?.items ?? [];
    },
    enabled: !!id,
  });
}

export function useJobCategories() {
  return useQuery({
    queryKey: jobsKeys.categories(),
    queryFn: async (): Promise<JobCategoryCount[]> => {
      const payload = unwrap<ListEnvelope<JobCategoryCount>>(await contractListJobCategories());
      return payload?.items ?? [];
    },
    // Facet counts move slowly; no need to refetch them per search.
    staleTime: 5 * 60_000,
  });
}

export function useCompanies(params?: {
  search?: string;
  industry?: string[];
  verified?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: jobsKeys.companies(params),
    queryFn: async (): Promise<{ items: Company[]; pagination?: JobsPagination }> => {
      const payload = unwrap<ListEnvelope<Company>>(await contractListCompanies(params));
      return { items: payload?.items ?? [], pagination: payload?.pagination };
    },
    placeholderData: (previous) => previous,
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: jobsKeys.company(id),
    queryFn: async (): Promise<Company> => {
      const payload = unwrap<{ company: Company }>(await contractGetCompany(id));
      return payload.company;
    },
    enabled: !!id,
  });
}

export function useCompanyJobs(id: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: jobsKeys.companyJobs(id, params?.page, params?.limit),
    queryFn: async (): Promise<{
      items: Job[];
      company?: Company;
      pagination?: JobsPagination;
    }> => {
      const payload = unwrap<ListEnvelope<Job> & { company?: Company }>(
        await contractGetCompanyJobs(id, params)
      );
      return {
        items: payload?.items ?? [],
        company: payload?.company,
        pagination: payload?.pagination,
      };
    },
    enabled: !!id,
  });
}

export function useJobsOverview(enabled = true) {
  return useQuery({
    queryKey: jobsKeys.overview(),
    queryFn: async (): Promise<JobsOverview> =>
      unwrap<JobsOverview>(await contractGetJobsOverview()),
    enabled,
  });
}

export function useSavedJobs(params?: { page?: number; limit?: number; enabled?: boolean }) {
  const { enabled = true, ...query } = params ?? {};

  return useQuery({
    queryKey: jobsKeys.saved(query.page, query.limit),
    queryFn: async (): Promise<{ items: SavedJobEntry[]; pagination?: JobsPagination }> => {
      const payload = unwrap<ListEnvelope<SavedJobEntry>>(await contractListSavedJobs(query));
      return { items: payload?.items ?? [], pagination: payload?.pagination };
    },
    // Do not make an authenticated-only request while the session is still
    // being resolved (or for a signed-out visitor). Besides avoiding a noisy
    // 401, this lets the page show its deliberate sign-in state immediately.
    enabled,
  });
}

/**
 * Save / unsave with an optimistic flip of the button state.
 *
 * The bookmark icon is the highest-frequency interaction in the module, and a
 * round-trip before the icon moves reads as broken. We therefore patch every
 * cached copy of the job — it can appear in a search page, the detail view,
 * the similar-jobs rail and a company listing at once — then reconcile.
 *
 * On error we restore the exact snapshots rather than flipping the flag back,
 * so a failure that races another update cannot leave a wrong value behind.
 */
export function useToggleSaveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      // `isSaved` is the CURRENT state; we send the opposite action.
      const result = isSaved ? await contractUnsaveJob(jobId) : await contractSaveJob(jobId);
      return unwrap<{ jobId: string; isSaved: boolean }>(result);
    },

    onMutate: async ({ jobId, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: jobsKeys.all });

      const snapshots: Array<[QueryKey, unknown]> = queryClient.getQueriesData({
        queryKey: jobsKeys.all,
      });

      const next = !isSaved;
      const patchJob = (job: Job): Job => (job.id === jobId ? { ...job, isSaved: next } : job);

      for (const [key, data] of snapshots) {
        if (!data || typeof data !== 'object') continue;

        // Similar-jobs queries hold a bare Job[] with no envelope around it.
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, (data as Job[]).map(patchJob));
          continue;
        }

        // Detail queries hold a single Job.
        if ('id' in (data as Job) && (data as Job).id === jobId) {
          queryClient.setQueryData(key, patchJob(data as Job));
          continue;
        }

        // List queries hold { items: Job[] }.
        const listData = data as { items?: unknown[] };
        if (Array.isArray(listData.items)) {
          queryClient.setQueryData(key, {
            ...listData,
            items: listData.items.map((item) => {
              const maybeJob = item as Job;
              if (maybeJob && typeof maybeJob === 'object' && 'isSaved' in maybeJob) {
                return patchJob(maybeJob);
              }
              // Saved-jobs entries nest the job one level down.
              const entry = item as SavedJobEntry;
              if (entry?.job?.id === jobId) {
                return { ...entry, job: patchJob(entry.job) };
              }
              return item;
            }),
          });
        }
      }

      return { snapshots };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => {
      // The saved list's membership and the overview counter both changed;
      // refetch them rather than trying to splice rows in or out by hand.
      // The similar rail is patched optimistically above, but it still
      // reconciles here so a server-side change cannot leave it drifted.
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'similar'] });
      queryClient.invalidateQueries({ queryKey: jobsKeys.overview() });
    },
  });
}

export function useMyApplications(params?: {
  status?: JobApplicationStatus[];
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...query } = params ?? {};

  return useQuery({
    queryKey: jobsKeys.applications(query.status, query.page, query.limit),
    queryFn: async (): Promise<{
      items: JobApplication[];
      statusCounts: Record<string, number>;
      pagination?: JobsPagination;
    }> => {
      const payload = unwrap<ListEnvelope<JobApplication> & { statusCounts?: Record<string, number> }>(
        await contractListMyApplications(query)
      );
      return {
        items: payload?.items ?? [],
        statusCounts: payload?.statusCounts ?? {},
        pagination: payload?.pagination,
      };
    },
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useMyApplication(id: string) {
  return useQuery({
    queryKey: jobsKeys.application(id),
    queryFn: async (): Promise<JobApplication> => {
      const payload = unwrap<{ application: JobApplication }>(await contractGetMyApplication(id));
      return payload.application;
    },
    enabled: !!id,
  });
}

/**
 * Submit an application.
 *
 * Deliberately NOT optimistic: applying is a one-shot, non-idempotent action
 * whose failure modes (job closed, already applied) are exactly the cases a
 * user must see honestly. Showing "Applied" before the server agrees would
 * misreport the single most consequential state in the product.
 */
export function useApplyToJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, input }: { jobId: string; input: JobApplicationInput }) => {
      const result = await contractApplyToJob(jobId, input);
      return unwrap<{ application: JobApplication }>(result);
    },
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applications'] });
      // Every surface that embeds the same Job row carries the hasApplied flag
      // and would otherwise keep offering an already-applied job as available.
      queryClient.invalidateQueries({ queryKey: ['jobs', 'search'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'similar'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: jobsKeys.overview() });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const result = await contractWithdrawApplication(applicationId);
      return unwrap<{ status: JobApplicationStatus }>(result);
    },
    onSuccess: (_data, applicationId) => {
      // Withdrawing re-opens the job, so every cached copy carrying hasApplied
      // must be discarded — the detail page's "already applied" button would
      // otherwise stay disabled and block re-applying forever. The job id is
      // not in the withdraw response, so take it from the cached application.
      const cached = queryClient.getQueryData<JobApplication>(
        jobsKeys.application(applicationId)
      );
      const jobId = cached?.job?.slug || cached?.job?.id;
      if (jobId) queryClient.invalidateQueries({ queryKey: jobsKeys.detail(jobId) });

      queryClient.invalidateQueries({ queryKey: jobsKeys.application(applicationId) });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'search'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'similar'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: jobsKeys.overview() });
    },
  });
}
