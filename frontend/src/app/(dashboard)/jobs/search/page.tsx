'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { useJobSearch } from '@/hooks/use-jobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobFilters } from '@/features/jobs/components/JobFilters';
import {
  JobsDrawer,
  JobsDrawerContent,
  JobsDrawerTrigger,
} from '@/features/jobs/components/JobsDrawer';
import {
  JobListSkeleton,
  JobsEmptyState,
  JobsErrorState,
} from '@/features/jobs/components/JobStates';
import { jobsStrings, sortLabels } from '@/features/jobs/labels';
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';

const ARRAY_KEYS = ['jobType', 'workplace', 'experience', 'category', 'skills', 'company'] as const;
const NUMBER_KEYS = ['salaryMin', 'salaryMax', 'datePosted', 'page'] as const;

/**
 * The URL is the single source of truth for the search state.
 *
 * Parsing from and serialising back to the query string (rather than holding
 * filters only in React state) is what makes a search shareable, bookmarkable
 * and correct under browser back/forward — all of which the spec requires of
 * /jobs/search.
 */
function parseFilters(params: URLSearchParams): JobSearchParams {
  const filters: JobSearchParams = {};

  const keyword = params.get('keyword');
  if (keyword) filters.keyword = keyword;

  const location = params.get('location');
  if (location) filters.location = location;

  if (params.get('remote') === 'true') filters.remote = true;

  for (const key of ARRAY_KEYS) {
    const raw = params.get(key);
    if (raw) filters[key] = raw.split(',').filter(Boolean);
  }

  for (const key of NUMBER_KEYS) {
    const raw = params.get(key);
    if (raw && Number.isFinite(Number(raw))) filters[key] = Number(raw);
  }

  const sort = params.get('sort');
  if (sort && sort in sortLabels) filters.sort = sort as JobSearchParams['sort'];

  return filters;
}

function serialiseFilters(filters: JobSearchParams): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

function JobSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = React.useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  // The keyword and location inputs are typed into, so they are held locally
  // and pushed to the URL on a debounce — writing a history entry per
  // keystroke would make the back button useless.
  const [keyword, setKeyword] = React.useState(filters.keyword ?? '');
  const [location, setLocation] = React.useState(filters.location ?? '');
  const debouncedKeyword = useDebounce(keyword, 400);
  const debouncedLocation = useDebounce(location, 400);

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const pushFilters = React.useCallback(
    (next: JobSearchParams) => {
      const query = serialiseFilters(next);
      router.replace(query ? `/jobs/search?${query}` : '/jobs/search', { scroll: false });
    },
    [router]
  );

  // Sync debounced text inputs into the URL, but only when they actually
  // differ — otherwise this effect would fight the URL it just wrote.
  React.useEffect(() => {
    const current = filters.keyword ?? '';
    const currentLocation = filters.location ?? '';
    if (debouncedKeyword === current && debouncedLocation === currentLocation) return;

    pushFilters({
      ...filters,
      keyword: debouncedKeyword || undefined,
      location: debouncedLocation || undefined,
      page: undefined,
    });
  }, [debouncedKeyword, debouncedLocation, filters, pushFilters]);

  const handleFilterChange = (patch: Partial<JobSearchParams>) => {
    // Any filter change resets to page 1: staying on page 7 of a result set
    // that just shrank to 2 pages shows an empty list for no clear reason.
    pushFilters({ ...filters, ...patch, page: undefined });
  };

  const handleClear = () => {
    setKeyword('');
    setLocation('');
    router.replace('/jobs/search', { scroll: false });
  };

  const { data, isLoading, isError, isFetching, refetch } = useJobSearch(filters);
  const pagination = data?.pagination;
  const results = data?.items ?? [];

  const filterPanel = (
    <JobFilters filters={filters} onChange={handleFilterChange} onClear={handleClear} />
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{jobsStrings.findJobs}</h1>

      <Card>
        <CardContent className="flex flex-col gap-2 p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
            <Label htmlFor="job-keyword" className="sr-only">
              {jobsStrings.searchPlaceholder}
            </Label>
            <Input
              id="job-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={jobsStrings.searchPlaceholder}
              className="ps-9"
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
            <Label htmlFor="job-location" className="sr-only">
              {jobsStrings.locationPlaceholder}
            </Label>
            <Input
              id="job-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={jobsStrings.locationPlaceholder}
              className="ps-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24 rounded-xl border p-4">{filterPanel}</div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {pagination ? jobsStrings.resultsCount(pagination.total) : ' '}
            </p>

            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <JobsDrawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <JobsDrawerTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      {jobsStrings.filters}
                    </Button>
                  </JobsDrawerTrigger>
                  <JobsDrawerContent side="end" title={jobsStrings.filters}>
                    {filterPanel}
                    <Button className="mt-2" onClick={() => setFiltersOpen(false)}>
                      {jobsStrings.applyFilters}
                    </Button>
                  </JobsDrawerContent>
                </JobsDrawer>
              </div>

              <Select
                value={filters.sort ?? 'relevance'}
                onValueChange={(value) =>
                  handleFilterChange({ sort: value as JobSearchParams['sort'] })
                }
              >
                <SelectTrigger className="h-9 w-[170px]" aria-label={jobsStrings.sortBy}>
                  <SelectValue placeholder={jobsStrings.sortBy} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <JobListSkeleton />
          ) : isError ? (
            <JobsErrorState onRetry={() => refetch()} />
          ) : results.length === 0 ? (
            <JobsEmptyState
              title={jobsStrings.emptyJobsTitle}
              body={jobsStrings.emptyJobsBody}
              action={
                <Button variant="outline" size="sm" onClick={handleClear}>
                  {jobsStrings.clearFilters}
                </Button>
              }
            />
          ) : (
            <>
              <div
                className={isFetching ? 'space-y-3 opacity-60 transition-opacity' : 'space-y-3'}
                aria-busy={isFetching}
              >
                {results.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 ? (
                <nav
                  aria-label="التنقل بين الصفحات"
                  className="flex items-center justify-center gap-3 pt-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => handleFilterChangePage(pagination.page - 1)}
                  >
                    السابق
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {pagination.page.toLocaleString('ar-EG')} /{' '}
                    {pagination.totalPages.toLocaleString('ar-EG')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handleFilterChangePage(pagination.page + 1)}
                  >
                    التالي
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Paging keeps every active filter and scrolls back to the top of the list.
  function handleFilterChangePage(page: number) {
    pushFilters({ ...filters, page: page > 1 ? page : undefined });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export default function JobSearchPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<JobListSkeleton />}>
      <JobSearchContent />
    </Suspense>
  );
}
