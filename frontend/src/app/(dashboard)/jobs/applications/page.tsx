'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useMyApplications } from '@/hooks/use-jobs';
import { JobsPagination } from '@/features/jobs/components/JobsPagination';
import {
  JobListSkeleton,
  JobsEmptyState,
  JobsErrorState,
} from '@/features/jobs/components/JobStates';
import { formatRelativeDate } from '@/features/jobs/format';
import { applicationStatusLabels, applicationStatusStyles, jobsStrings } from '@/features/jobs/labels';
import type { JobApplicationStatus } from '@/types/job';

/** Tabs shown above the list. `undefined` is the "all" tab. */
const TABS: Array<{ value: JobApplicationStatus | undefined; label: string }> = [
  { value: undefined, label: jobsStrings.all },
  { value: 'APPLIED', label: applicationStatusLabels.APPLIED },
  { value: 'UNDER_REVIEW', label: applicationStatusLabels.UNDER_REVIEW },
  { value: 'SHORTLISTED', label: applicationStatusLabels.SHORTLISTED },
  { value: 'INTERVIEW', label: applicationStatusLabels.INTERVIEW },
  { value: 'OFFER', label: applicationStatusLabels.OFFER },
  { value: 'REJECTED', label: applicationStatusLabels.REJECTED },
];

export default function MyApplicationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [active, setActive] = React.useState<JobApplicationStatus | undefined>(undefined);
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useMyApplications({
    status: active ? [active] : undefined,
    page,
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) return <JobListSkeleton />;

  if (!isAuthenticated) {
    return (
      <JobsEmptyState
        title={jobsStrings.loginToContinue}
        body={jobsStrings.emptyApplicationsBody}
        action={
          <Button asChild size="sm">
            <Link href="/login?redirect=/jobs/applications">{jobsStrings.loginToContinue}</Link>
          </Button>
        }
      />
    );
  }

  if (isError) return <JobsErrorState onRetry={() => refetch()} />;

  const items = data?.items ?? [];
  const counts = data?.statusCounts ?? {};

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{jobsStrings.applicationsTitle}</h1>

      {/* Horizontally scrollable on mobile rather than wrapping into rows. */}
      <div className="-mx-1 overflow-x-auto pb-1">
        <div role="tablist" aria-label={jobsStrings.applicationsTitle} className="flex gap-2 px-1">
          {TABS.map((tab) => {
            const isActive = active === tab.value;
            const count = tab.value ? counts[tab.value] : undefined;
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActive(tab.value);
                  setPage(1);
                }}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
                {typeof count === 'number' && count > 0 ? (
                  <span className="ms-1.5 tabular-nums">{count.toLocaleString('ar-EG')}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <JobsEmptyState
          title={jobsStrings.emptyApplicationsTitle}
          body={jobsStrings.emptyApplicationsBody}
          action={
            <Button asChild size="sm">
              <Link href="/jobs/search">{jobsStrings.findJobs}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((application) => {
              const applied = formatRelativeDate(application.createdAt);
              return (
                <li key={application.id}>
                <Link
                  href={`/jobs/applications/${application.id}`}
                  className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center gap-4 p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        {application.job?.company?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- external logo host
                          <img
                            src={application.job.company.logoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {application.job?.title ?? '—'}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {application.job?.company?.name}
                          {applied ? ` · ${applied}` : ''}
                        </p>
                      </div>

                      <Badge
                        className={cn(
                          'shrink-0 font-normal',
                          applicationStatusStyles[application.status]
                        )}
                      >
                        {applicationStatusLabels[application.status]}
                      </Badge>

                      <ChevronLeft
                        className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </CardContent>
                  </Card>
                </Link>
                </li>
              );
            })}
          </ul>
          <JobsPagination
            pagination={data?.pagination}
            disabled={isFetching}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
