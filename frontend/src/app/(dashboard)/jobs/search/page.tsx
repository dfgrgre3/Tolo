'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
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
import { useCompanyLabels, useJobCategories, useJobSearch } from '@/hooks/use-jobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobFilters } from '@/features/jobs/components/JobFilters';
import { JobsPagination } from '@/features/jobs/components/JobsPagination';
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
import {
  buildActiveFilterChips,
  parseFilters,
  prettifyFilterValue,
  removeFilterChip,
  serialiseFilters,
  type ActiveFilterChip,
} from '@/features/jobs/search-params';
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';

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

  // Labels for the chips row below. Categories come from the very same cached
  // query the filter panel runs (react-query dedupes it, so this costs no extra
  // request), and companies need a name lookup because the URL stores ids.
  const { data: categoryList } = useJobCategories();
  const companyLabels = useCompanyLabels(filters.company ?? []);

  const pushFilters = React.useCallback(
    (next: JobSearchParams) => {
      const query = serialiseFilters(next);
      router.replace(query ? `/jobs/search?${query}` : '/jobs/search', { scroll: false });
    },
    [router]
  );

  /**
   * One chip per applied filter value, so the results the user is looking at are
   * always explained by something they can undo individually.
   */
  const activeChips = React.useMemo(
    () =>
      buildActiveFilterChips(filters, {
        categories: Object.fromEntries(
          (categoryList ?? []).map((item) => [item.category, prettifyFilterValue(item.category)])
        ),
        companies: companyLabels,
      }),
    [filters, categoryList, companyLabels]
  );

  // Sync debounced text inputs into the URL, but only once the debounce has
  // settled on what the inputs hold and the result differs from the URL. The
  // settle check is what stops a chip that cleared the keyword from being
  // re-written by a debounced value that had not caught up yet.
  React.useEffect(() => {
    if (keyword !== debouncedKeyword || location !== debouncedLocation) return;

    const current = filters.keyword ?? '';
    const currentLocation = filters.location ?? '';
    if (debouncedKeyword === current && debouncedLocation === currentLocation) return;

    pushFilters({
      ...filters,
      keyword: debouncedKeyword || undefined,
      location: debouncedLocation || undefined,
      page: undefined,
    });
  }, [keyword, debouncedKeyword, location, debouncedLocation, filters, pushFilters]);

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

  const handleRemoveChip = (chip: ActiveFilterChip) => {
    // The keyword and location inputs own local state, so clearing them from a
    // chip has to reset those inputs too — otherwise the debounced sync above
    // would write the old text straight back into the URL.
    if (chip.field === 'keyword') setKeyword('');
    if (chip.field === 'location') setLocation('');
    pushFilters(removeFilterChip(filters, chip));
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
          {activeChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleRemoveChip(chip)}
                  aria-label={jobsStrings.removeChip(chip.label)}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 text-xs transition-colors hover:bg-muted"
                >
                  <span className="truncate">{chip.label}</span>
                  <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                </button>
              ))}

              <Button variant="ghost" size="sm" onClick={handleClear}>
                {jobsStrings.clearAll}
              </Button>
            </div>
          ) : null}

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

              <JobsPagination
                pagination={pagination}
                disabled={isFetching}
                onPageChange={handleFilterChangePage}
              />
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
