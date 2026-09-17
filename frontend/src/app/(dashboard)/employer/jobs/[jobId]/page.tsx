'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useEmployerJob } from '@/hooks/use-employer-jobs';
import {
  useCreateJob,
  useUpdateJob,
  useTransitionJob,
  useDuplicateJob,
  useDeleteJob,
} from '@/hooks/use-employer-jobs';
import { useMyCompanies } from '@/hooks/use-employer-jobs';
import {
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
 * Job edit form + lifecycle actions.
 *
 * Content edits and status moves are deliberately separate surfaces here, the
 * same way they are separate endpoints on the backend: an edit never carries a
 * status, and a transition never carries content. Keeping them apart is what
 * stops a content edit from silently reverting the posting's lifecycle.
 */
export default function EmployerJobEditPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = React.use(params);
  const isCreating = jobId === 'new';
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useEmployerJob(jobId, !isCreating);
  const { data: companies } = useMyCompanies();

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const transitionJob = useTransitionJob();
  const duplicateJob = useDuplicateJob();
  const deleteJob = useDeleteJob();

  if (!isCreating) {
    if (isLoading) return <JobListSkeleton />;
    if (isError) return <JobsErrorState onRetry={() => refetch()} />;
  }

  const job = data?.job;
  const allowed = (data?.allowedTransitions ?? []) as JobPostingStatus[];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">
            {isCreating ? jobsStrings.addJob : job?.title}
          </h1>
          {!isCreating && job ? (
            <div className="mt-1 flex items-center gap-2">
              <Badge className={jobPostingStatusStyles[job.status]}>
                {jobPostingStatusLabels[job.status]}
              </Badge>
              {job.status === 'PENDING_REVIEW' ? (
                <span className="text-xs text-muted-foreground">
                  {jobsStrings.underReviewNote}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isCreating && job ? (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                duplicateJob.mutate(job.id, {
                  onSuccess: ({ job: dup }) => {
                    toast.success(jobsStrings.duplicateJob);
                    router.push(`/employer/jobs/${dup.id}`);
                  },
                  onError: () => toast.error(jobsStrings.transitionFailed),
                });
              }}
            >
              <Copy className="h-4 w-4" />
              {jobsStrings.duplicateJob}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                  {jobsStrings.archiveJob}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{jobsStrings.archiveJob}؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    {jobsStrings.confirmWithdraw}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{jobsStrings.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteJob.mutate(job.id, {
                        onSuccess: () => router.push('/employer/jobs'),
                      });
                    }}
                  >
                    {jobsStrings.confirmWithdraw}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </header>

      <JobForm
        initial={job as JobFormInitial | undefined}
        companies={companies ?? []}
        submitting={createJob.isPending || updateJob.isPending}
        onSubmit={(values) => {
          if (isCreating) {
            createJob.mutate(values, {
              onSuccess: ({ job: created }) => {
                toast.success(jobsStrings.jobSaved);
                router.push(`/employer/jobs/${created.id}`);
              },
              onError: () => toast.error(jobsStrings.transitionFailed),
            });
          } else {
            updateJob.mutate(
              { id: jobId, input: values },
              {
                onSuccess: () => toast.success(jobsStrings.jobSaved),
                onError: () => toast.error(jobsStrings.transitionFailed),
              },
            );
          }
        }}
      />

      {!isCreating && allowed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{jobsStrings.jobStatus}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allowed.map((target) => (
              <Button
                key={target}
                variant="outline"
                size="sm"
                disabled={transitionJob.isPending}
                onClick={() => {
                  transitionJob.mutate(
                    { id: jobId, status: target },
                    {
                      onError: () => toast.error(jobsStrings.transitionFailed),
                    },
                  );
                }}
              >
                {jobPostingStatusLabels[target]}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

interface JobFormValues {
  companyId: string;
  title: string;
  description?: string;
  requirements?: string;
  skills?: string[];
  employmentType?: string;
  workplaceType?: string;
  experienceLevel?: string;
  country?: string;
  city?: string;
  salaryMin?: number;
  salaryMax?: number;
  isSalaryVisible?: boolean;
}

/** The employer-editable slice of a Job the form hydrates from. */
type JobFormInitial = {
  title?: string;
  description?: string;
  companyId?: string;
  employmentType?: string;
  workplaceType?: string;
};

function JobForm({
  initial,
  companies,
  submitting,
  onSubmit,
}: {
  initial?: JobFormInitial;
  companies: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (values: JobFormValues) => void;
}) {
  const [values, setValues] = React.useState<JobFormValues>({
    companyId: initial?.companyId ?? companies[0]?.id ?? '',
    title: initial?.title ?? '',
    description: (initial?.description as string) ?? '',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{jobsStrings.jobFormTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">{jobsStrings.selectCompany}</Label>
          <Select
            value={values.companyId}
            onValueChange={(v) => setValues((s) => ({ ...s, companyId: v }))}
          >
            <SelectTrigger id="company">
              <SelectValue placeholder={jobsStrings.selectCompany} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">{jobsStrings.jobTitle}</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{jobsStrings.jobDescription}</Label>
          <Textarea
            id="description"
            rows={6}
            value={values.description}
            onChange={(e) =>
              setValues((s) => ({ ...s, description: e.target.value }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employmentType">{jobsStrings.jobType}</Label>
            <Select
              value={values.employmentType}
              onValueChange={(v) =>
                setValues((s) => ({ ...s, employmentType: v }))
              }
            >
              <SelectTrigger id="employmentType">
                <SelectValue placeholder={jobsStrings.jobType} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workplaceType">{jobsStrings.workplace}</Label>
            <Select
              value={values.workplaceType}
              onValueChange={(v) =>
                setValues((s) => ({ ...s, workplaceType: v }))
              }
            >
              <SelectTrigger id="workplaceType">
                <SelectValue placeholder={jobsStrings.workplace} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WORKPLACE_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={submitting || !values.companyId || !values.title}
            onClick={() => onSubmit(values)}
          >
            {submitting ? jobsStrings.saving : jobsStrings.saveJob}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  CONTRACT: 'عقد',
  TEMPORARY: 'مؤقت',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'عمل حر',
};

const WORKPLACE_TYPES: Record<string, string> = {
  REMOTE: 'عن بُعد',
  HYBRID: 'هجين',
  ON_SITE: 'من المقر',
};
