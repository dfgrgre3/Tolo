'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEmployerJobs } from '@/hooks/use-employer-jobs';
import {
  JobsEmptyState,
  JobsErrorState,
  JobListSkeleton,
} from '@/features/jobs/components/JobStates';
import {
  jobPostingStatusLabels,
  jobPostingStatusStyles,
  jobsStrings,
} from '@/features/jobs/labels';
import type { JobPostingStatus } from '@/types/job';

/**
 * Employer's job postings with status tabs.
 *
 * The tab counts come from the statusCounts facet the backend computes over
 * the caller's whole owned set (not just the current page), so the badges
 * stay correct as the user pages through a status.
 */
const STATUS_TABS: { key: JobPostingStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: jobsStrings.all },
  { key: 'DRAFT', label: jobPostingStatusLabels.DRAFT },
  { key: 'PENDING_REVIEW', label: jobPostingStatusLabels.PENDING_REVIEW },
  { key: 'PUBLISHED', label: jobPostingStatusLabels.PUBLISHED },
  { key: 'PAUSED', label: jobPostingStatusLabels.PAUSED },
  { key: 'CLOSED', label: jobPostingStatusLabels.CLOSED },
  { key: 'ARCHIVED', label: jobPostingStatusLabels.ARCHIVED },
];

export default function EmployerJobsPage() {
  const [status, setStatus] = React.useState<JobPostingStatus | 'ALL'>('ALL');
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useEmployerJobs({
    status: status === 'ALL' ? undefined : [status],
    page,
    limit: 20,
  });

  if (isLoading) return <JobListSkeleton />;
  if (isError) return <JobsErrorState onRetry={() => refetch()} />;

  const items = data?.items ?? [];
  const counts = data?.statusCounts ?? {};

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{jobsStrings.myJobs}</h1>
        <Button asChild size="sm">
          <Link href="/employer/jobs/new">
            <Plus className="h-4 w-4" />
            {jobsStrings.addJob}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.key === 'ALL'
              ? items.length
              : counts[tab.key] ?? 0;
          const active = status === tab.key;
          return (
            <Button
              key={tab.key}
              variant={active ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
              <span className="tabular-nums text-xs opacity-70">{count}</span>
            </Button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <JobsEmptyState
          title={jobsStrings.emptyEmployerJobsTitle}
          body={jobsStrings.emptyEmployerJobsBody}
          action={
            <Button asChild size="sm">
              <Link href="/employer/jobs/new">{jobsStrings.addJob}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((job) => (
            <Card key={job.id} className={isFetching ? 'opacity-60' : undefined}>
              <CardContent className="flex items-center gap-3 p-4">
                <Link
                  href={`/employer/jobs/${job.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-medium hover:underline">{job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job.company?.name}
                  </p>
                </Link>
                <Link href={`/employer/jobs/${job.id}/applicants`}>
                  <Badge variant="secondary" className="gap-1.5">
                    {jobsStrings.applicants}
                    <span className="tabular-nums">
                      {job.applicationCount}
                    </span>
                  </Badge>
                </Link>
                <Badge className={jobPostingStatusStyles[job.status]}>
                  {jobPostingStatusLabels[job.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
