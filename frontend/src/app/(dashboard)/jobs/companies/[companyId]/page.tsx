'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, CheckCircle2, ChevronLeft, Globe, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompany, useCompanyJobs } from '@/hooks/use-jobs';
import { ApiError } from '@/lib/api/api-client';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobsPagination } from '@/features/jobs/components/JobsPagination';
import {
  JobListSkeleton,
  JobsEmptyState,
  JobsErrorState,
} from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';

export default function CompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params?.companyId ?? '';
  const [page, setPage] = React.useState(1);

  const { data: company, isLoading, isError, error, refetch } = useCompany(companyId);
  const jobs = useCompanyJobs(companyId, { page });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-8 w-1/3" />
        <JobListSkeleton count={3} />
      </div>
    );
  }

  if (isError || !company) {
    // A missing company (bad link, deleted record) is an expected outcome, so
    // it gets its own message rather than a generic retry-able failure.
    if (error instanceof ApiError && error.isNotFound) {
      return (
        <JobsErrorState
          title={jobsStrings.companyNotFoundTitle}
          body={jobsStrings.companyNotFoundBody}
        />
      );
    }
    return <JobsErrorState onRetry={() => refetch()} />;
  }

  const jobItems = jobs.data?.items ?? [];

  return (
    <div className="space-y-6">
      <nav aria-label="مسار التنقل" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:text-foreground">
          {jobsStrings.jobs}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <Link href="/jobs/companies" className="hover:text-foreground">
          {jobsStrings.companies}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-foreground">{company.name}</span>
      </nav>

      <Card className="overflow-hidden">
        {company.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external cover host
          <img src={company.coverUrl} alt="" className="h-32 w-full object-cover" />
        ) : (
          <div className="h-24 w-full bg-gradient-to-l from-primary/15 to-primary/5" />
        )}

        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-4">
            <span className="-mt-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-background bg-muted">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external logo host
                <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-xl font-bold">
                {company.name}
                {company.isVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-label={jobsStrings.verified} />
                ) : null}
              </h1>
              <p className="text-sm tabular-nums text-muted-foreground">
                {company.openPositions.toLocaleString('ar-EG')} {jobsStrings.openPositions}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {company.industry ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {company.industry}
              </span>
            ) : null}
            {company.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {company.location}
              </span>
            ) : null}
            {company.size ? (
              <span className="flex items-center gap-1.5" dir="ltr">
                <Users className="h-4 w-4" />
                {company.size}
              </span>
            ) : null}
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                dir="ltr"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                {company.website}
              </a>
            ) : null}
          </div>

          {company.description ? (
            <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {company.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{jobsStrings.openPositions}</h2>

        {jobs.isLoading ? (
          <JobListSkeleton count={3} />
        ) : jobs.isError ? (
          <JobsErrorState onRetry={() => jobs.refetch()} />
        ) : jobItems.length === 0 ? (
          <JobsEmptyState title={jobsStrings.emptyJobsTitle} body={jobsStrings.emptyJobsBody} />
        ) : (
          <div className="space-y-3">
            {jobItems.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            <JobsPagination
              pagination={jobs.data?.pagination}
              disabled={jobs.isFetching}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
