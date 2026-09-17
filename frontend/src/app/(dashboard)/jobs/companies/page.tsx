'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, CheckCircle2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanies } from '@/hooks/use-jobs';
import { JobsPagination } from '@/features/jobs/components/JobsPagination';
import { JobsEmptyState, JobsErrorState } from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';

export default function CompaniesPage() {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => setPage(1), [debouncedSearch]);

  const { data, isLoading, isError, refetch } = useCompanies({
    search: debouncedSearch || undefined,
    page,
  });

  const companies = data?.items ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{jobsStrings.companies}</h1>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
        <Label htmlFor="company-search" className="sr-only">
          {jobsStrings.companies}
        </Label>
        <Input
          id="company-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث عن شركة"
          className="ps-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <JobsErrorState onRetry={() => refetch()} />
      ) : companies.length === 0 ? (
        <JobsEmptyState
          title={jobsStrings.emptyCompaniesTitle}
          body={jobsStrings.emptyCompaniesBody}
          icon={Building2}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/jobs/companies/${company.slug || company.id}`}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {company.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external logo host
                        <img
                          src={company.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        {company.name}
                        {company.isVerified ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 text-primary"
                            aria-label={jobsStrings.verified}
                          />
                        ) : null}
                      </p>
                      {company.industry ? (
                        <p className="truncate text-xs text-muted-foreground">{company.industry}</p>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-xs tabular-nums text-muted-foreground">
                    {company.openPositions.toLocaleString('ar-EG')} {jobsStrings.openPositions}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <JobsPagination
        pagination={data?.pagination}
        onPageChange={(nextPage) => {
          setPage(nextPage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
