'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useSavedJobs } from '@/hooks/use-jobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import {
  JobListSkeleton,
  JobsEmptyState,
  JobsErrorState,
} from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';

export default function SavedJobsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError, refetch } = useSavedJobs();

  if (authLoading || isLoading) return <JobListSkeleton />;

  if (!isAuthenticated) {
    return (
      <JobsEmptyState
        title={jobsStrings.loginToContinue}
        body={jobsStrings.emptySavedBody}
        action={
          <Button asChild size="sm">
            <Link href="/login?redirect=/jobs/saved">{jobsStrings.loginToContinue}</Link>
          </Button>
        }
      />
    );
  }

  if (isError) return <JobsErrorState onRetry={() => refetch()} />;

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{jobsStrings.savedJobs}</h1>
        {items.length > 0 ? (
          <span className="text-sm tabular-nums text-muted-foreground">
            {jobsStrings.resultsCount(data?.pagination?.total ?? items.length)}
          </span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <JobsEmptyState
          title={jobsStrings.emptySavedTitle}
          body={jobsStrings.emptySavedBody}
          action={
            <Button asChild size="sm">
              <Link href="/jobs/search">{jobsStrings.findJobs}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <JobCard key={entry.job.id} job={entry.job} savedAt={entry.savedAt} />
          ))}
        </div>
      )}
    </div>
  );
}
