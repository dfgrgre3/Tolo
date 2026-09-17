'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, ChevronLeft, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyApplication, useWithdrawApplication } from '@/hooks/use-jobs';
import { ApiError } from '@/lib/api/api-client';
import { JobsErrorState } from '@/features/jobs/components/JobStates';
import { formatDate } from '@/features/jobs/format';
import {
  applicationStatusLabels,
  applicationStatusStyles,
  jobsStrings,
} from '@/features/jobs/labels';
import {
  APPLICATION_TIMELINE,
  isTerminalApplicationStatus,
  type JobApplicationStatus,
} from '@/types/job';

/**
 * Linear progress through the hiring pipeline.
 *
 * REJECTED and WITHDRAWN are not steps — they end the process from whatever
 * stage it had reached. For those we show the reached steps as complete and
 * render the terminal state as its own final marker, rather than pretending
 * the application is still mid-pipeline.
 */
function ApplicationTimeline({ status }: { status: JobApplicationStatus }) {
  const terminalNegative = status === 'REJECTED' || status === 'WITHDRAWN';
  const currentIndex = terminalNegative
    ? -1
    : APPLICATION_TIMELINE.indexOf(status);

  return (
    <ol className="space-y-0" aria-label={jobsStrings.timeline}>
      {APPLICATION_TIMELINE.map((step, index) => {
        const reached = currentIndex >= index;
        const isCurrent = currentIndex === index;
        const isLast = index === APPLICATION_TIMELINE.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]',
                  reached
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 bg-background text-muted-foreground'
                )}
              >
                {reached ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-px flex-1 min-h-[1.5rem]',
                    currentIndex > index ? 'bg-primary' : 'bg-border'
                  )}
                />
              ) : null}
            </div>

            <div className="pb-5">
              <p
                className={cn(
                  'text-sm',
                  isCurrent ? 'font-semibold' : reached ? 'font-medium' : 'text-muted-foreground'
                )}
              >
                {applicationStatusLabels[step]}
              </p>
            </div>
          </li>
        );
      })}

      {terminalNegative ? (
        <li className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 bg-muted"
          />
          <p className="pb-1 text-sm font-semibold text-muted-foreground">
            {applicationStatusLabels[status]}
          </p>
        </li>
      ) : null}
    </ol>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = params?.applicationId ?? '';

  const { data: application, isLoading, isError, error, refetch } = useMyApplication(applicationId);
  const withdraw = useWithdrawApplication();
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  // AlertDialogAction is also a Radix Dialog.Close, so it asks to close the
  // dialog on the very click that submits — synchronously, before React has
  // re-rendered with `isPending`. Only a mutable flag can gate that request,
  // keeping the dialog open (and the pending / failure state visible) until
  // the server actually answers.
  const withdrawInFlightRef = React.useRef(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !application) {
    // A 404 is an expected outcome (the application was withdrawn, deleted, or
    // the id was never valid), so it gets its own message rather than the
    // generic failure state that implies retrying will help.
    if (error instanceof ApiError && error.isNotFound) {
      return (
        <JobsErrorState
          title={jobsStrings.applicationNotFoundTitle}
          body={jobsStrings.applicationNotFoundBody}
        />
      );
    }
    return <JobsErrorState onRetry={() => refetch()} />;
  }

  const job = application.job;
  const canWithdraw = !isTerminalApplicationStatus(application.status);

  return (
    <div className="space-y-6">
      <nav aria-label="مسار التنقل" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:text-foreground">
          {jobsStrings.jobs}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <Link href="/jobs/applications" className="hover:text-foreground">
          {jobsStrings.myApplications}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-foreground">{job?.title ?? '—'}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold">{job?.title ?? '—'}</h1>
          {job?.company ? (
            <p className="text-sm text-muted-foreground">{job.company.name}</p>
          ) : null}
        </div>
        <Badge className={cn('font-normal', applicationStatusStyles[application.status])}>
          {applicationStatusLabels[application.status]}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardContent className="space-y-4 p-4">
              <h2 className="text-sm font-semibold">{jobsStrings.timeline}</h2>
              <ApplicationTimeline status={application.status} />
            </CardContent>
          </Card>

          {application.coverLetter ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <h2 className="text-sm font-semibold">{jobsStrings.coverLetter}</h2>
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {application.coverLetter}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{jobsStrings.appliedOn}</p>
                <p className="font-medium">{formatDate(application.createdAt) ?? '—'}</p>
              </div>

              {application.resumeUrl ? (
                <div>
                  <p className="text-xs text-muted-foreground">{jobsStrings.resume}</p>
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="block truncate font-medium text-primary hover:underline"
                  >
                    {application.resumeUrl}
                  </a>
                </div>
              ) : null}

              {job ? (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/jobs/${job.slug || job.id}`}>عرض الوظيفة</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {canWithdraw ? (
            <AlertDialog
              open={withdrawOpen}
              onOpenChange={(open) => {
                // Block the close Radix requests on the submit click itself —
                // the dialog has to survive until the mutation settles.
                if (!open && withdrawInFlightRef.current) return;
                // Reopening should never surface a stale failure from a
                // previous attempt.
                if (open) withdraw.reset();
                setWithdrawOpen(open);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  {jobsStrings.withdraw}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{jobsStrings.withdrawConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {jobsStrings.withdrawConfirmBody}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {withdraw.isError ? (
                  <p
                    role="alert"
                    className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {(withdraw.error as ApiError)?.message ?? jobsStrings.withdrawFailed}
                  </p>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={withdraw.isPending}>
                    {jobsStrings.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={withdraw.isPending}
                    onClick={() => {
                      withdrawInFlightRef.current = true;
                      withdraw.mutate(application.id, {
                        onSuccess: () => {
                          withdrawInFlightRef.current = false;
                          setWithdrawOpen(false);
                        },
                        onError: () => {
                          withdrawInFlightRef.current = false;
                        },
                      });
                    }}
                  >
                    {withdraw.isPending ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {jobsStrings.withdrawing}
                      </>
                    ) : (
                      jobsStrings.confirmWithdraw
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
