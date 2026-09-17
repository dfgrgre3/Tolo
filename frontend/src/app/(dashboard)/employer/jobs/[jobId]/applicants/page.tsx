'use client';

import React from 'react';
import Link from 'next/link';
import { useEmployerJob, useJobApplicants } from '@/hooks/use-employer-jobs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  JobsEmptyState,
  JobsErrorState,
  JobListSkeleton,
} from '@/features/jobs/components/JobStates';
import {
  applicationStatusLabels,
  applicationStatusStyles,
  jobsStrings,
} from '@/features/jobs/labels';
import type { JobApplicationStatus } from '@/types/job';

/**
 * Applicants for one posting, filterable by pipeline stage.
 *
 * The list is server-side filtered by ownership: this route only ever returns
 * applications for a job the caller's company posted, so the tab counts here
 * are already the correct scope.
 */
const STAGE_TABS: { key: JobApplicationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: jobsStrings.all },
  { key: 'APPLIED', label: applicationStatusLabels.APPLIED },
  { key: 'UNDER_REVIEW', label: applicationStatusLabels.UNDER_REVIEW },
  { key: 'SHORTLISTED', label: applicationStatusLabels.SHORTLISTED },
  { key: 'INTERVIEW', label: applicationStatusLabels.INTERVIEW },
  { key: 'OFFER', label: applicationStatusLabels.OFFER },
  { key: 'HIRED', label: applicationStatusLabels.HIRED },
  { key: 'REJECTED', label: applicationStatusLabels.REJECTED },
];

export default function JobApplicantsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = React.use(params);
  const [stage, setStage] = React.useState<JobApplicationStatus | 'ALL'>('ALL');

  const { data: jobData, isLoading: jobLoading } = useEmployerJob(jobId);
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useJobApplicants(jobId, {
    status: stage === 'ALL' ? undefined : [stage],
    limit: 50,
  });

  if (jobLoading || isLoading) return <JobListSkeleton />;
  if (isError) return <JobsErrorState onRetry={() => refetch()} />;

  const job = jobData?.job;
  const items = data?.items ?? [];
  const counts = data?.statusCounts ?? {};

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/employer/jobs" className="hover:underline">
            {jobsStrings.myJobs}
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{jobsStrings.applicantsTitle}</h1>
        {job ? (
          <p className="text-sm text-muted-foreground">
            {job.title} · {job.company?.name}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-1.5">
        {STAGE_TABS.map((tab) => {
          const count = tab.key === 'ALL' ? items.length : counts[tab.key] ?? 0;
          const active = stage === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStage(tab.key)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent'
              }`}
            >
              {tab.label}
              <span className="tabular-nums text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <JobsEmptyState
          title={jobsStrings.emptyApplicantsTitle}
          body={jobsStrings.emptyApplicantsBody}
        />
      ) : (
        <div className={isFetching ? 'space-y-2 opacity-60' : 'space-y-2'}>
          {items.map((application) => (
            <Card key={application.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Link
                  href={`/employer/applicants/${application.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-medium hover:underline">
                    {application.applicant?.name ?? jobsStrings.applicantName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {application.applicant?.email}
                  </p>
                </Link>
                <Badge className={applicationStatusStyles[application.status]}>
                  {applicationStatusLabels[application.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
