'use client';

import React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useApplicant,
  useTransitionApplication,
} from '@/hooks/use-employer-jobs';
import {
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
 * One applicant's submission and the employer's pipeline actions on it.
 *
 * The stage buttons are rendered from allowedTransitions, which the backend
 * derives from the same state machine it validates against — so a button the
 * UI shows is always a move the API will accept, and neither side can drift
 * into offering an illegal transition.
 */
export default function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = React.use(params);
  const { data, isLoading, isError, refetch } = useApplicant(applicationId);
  const transition = useTransitionApplication();
  const [note, setNote] = React.useState('');

  if (isLoading) return <JobListSkeleton />;
  if (isError) return <JobsErrorState onRetry={() => refetch()} />;

  const application = data?.application;
  const allowed = (data?.allowedTransitions ?? []) as JobApplicationStatus[];
  if (!application) return null;

  const applicant = application.applicant;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/employer/jobs" className="hover:underline">
            {jobsStrings.myJobs}
          </Link>
          <span>/</span>
          <Link
            href={`/employer/jobs/${application.jobId}/applicants`}
            className="hover:underline"
          >
            {jobsStrings.applicantsTitle}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {applicant?.name ?? jobsStrings.applicantName}
          </h1>
          <Badge className={applicationStatusStyles[application.status]}>
            {applicationStatusLabels[application.status]}
          </Badge>
        </div>
        {application.job ? (
          <p className="text-sm text-muted-foreground">
            {application.job.title} · {application.job.company?.name}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{jobsStrings.applicantName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {jobsStrings.applicantEmail}
              </p>
              <p>{applicant?.email ?? application.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {jobsStrings.applicantPhone}
              </p>
              <p>{application.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {jobsStrings.appliedDate}
              </p>
              <p>
                {new Date(application.createdAt).toLocaleDateString('ar-EG')}
              </p>
            </div>
            {application.resumeUrl ? (
              <div>
                <p className="text-xs text-muted-foreground">
                  {jobsStrings.resume}
                </p>
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {jobsStrings.resumeUrl}
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{jobsStrings.currentStage}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {allowed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {jobsStrings.noApplicationsYet}
                </p>
              ) : (
                allowed.map((target) => (
                  <Button
                    key={target}
                    variant="outline"
                    size="sm"
                    disabled={transition.isPending}
                    onClick={() => {
                      transition.mutate(
                        { id: application.id, status: target, note: note || undefined },
                        {
                          onSuccess: () => {
                            toast.success(jobsStrings.stageUpdated);
                            setNote('');
                          },
                          onError: () => toast.error(jobsStrings.stageUpdateFailed),
                        },
                      );
                    }}
                  >
                    {applicationStatusLabels[target]}
                  </Button>
                ))
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{jobsStrings.stageNote}</Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={jobsStrings.stageNote}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {application.coverLetter ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{jobsStrings.coverLetter}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {application.coverLetter}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
