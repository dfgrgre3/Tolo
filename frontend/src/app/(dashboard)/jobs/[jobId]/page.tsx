'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  Share2,
  Wallet,
} from 'lucide-react';
import { ApiError } from '@/lib/api/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useJob, useSimilarJobs, useToggleSaveJob } from '@/hooks/use-jobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobsErrorState } from '@/features/jobs/components/JobStates';
import {
  formatDate,
  formatLocation,
  formatMatchScore,
  formatRelativeDate,
  formatSalary,
} from '@/features/jobs/format';
import {
  employmentTypeLabels,
  experienceLevelLabels,
  jobsStrings,
  workplaceTypeLabels,
} from '@/features/jobs/labels';
import type { Job } from '@/types/job';

/** Renders a description section only when the employer filled it in. */
function Section({ title, body }: { title: string; body?: string | null }) {
  if (!body || !body.trim()) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {/*
        Employer-authored copy is rendered as plain text with preserved line
        breaks — never as HTML. These strings come from an external party, so
        interpolating them as markup would be a stored-XSS vector.
      */}
      <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{body}</p>
    </section>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function ApplyPanel({ job }: { job: Job }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const toggleSave = useToggleSaveJob();
  const [shared, setShared] = React.useState(false);

  const salary = formatSalary(job);
  const location = formatLocation(job);
  const deadline = formatDate(job.expiresAt);

  const requireAuth = () => {
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    // Native share where available (mobile), clipboard elsewhere.
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, url });
        return;
      } catch {
        // User dismissed the share sheet — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context or denied permission); the
      // URL is already in the address bar, so there is nothing to recover.
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/*
          `isApplyOpen` comes from the server's own CanAcceptApplications(),
          the same predicate the apply endpoint guards with. Never recompute
          it here from status/expiresAt — the two could then disagree.
        */}
        {job.hasApplied ? (
          <Button className="w-full" disabled>
            <CheckCircle2 className="me-2 h-4 w-4" />
            {jobsStrings.alreadyApplied}
          </Button>
        ) : !job.isApplyOpen ? (
          <Button className="w-full" disabled>
            {jobsStrings.applyClosed}
          </Button>
        ) : isAuthenticated ? (
          <Button className="w-full" asChild>
            <Link href={`/jobs/${job.slug || job.id}/apply`}>{jobsStrings.applyNow}</Link>
          </Button>
        ) : (
          <Button className="w-full" onClick={requireAuth}>
            {jobsStrings.loginToApply}
          </Button>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            disabled={toggleSave.isPending}
            aria-pressed={job.isSaved}
            onClick={() =>
              isAuthenticated
                ? toggleSave.mutate({ jobId: job.id, isSaved: job.isSaved })
                : requireAuth()
            }
          >
            {job.isSaved ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {job.isSaved ? jobsStrings.unsave : jobsStrings.save}
          </Button>

          <Button variant="outline" className="flex-1 gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            {shared ? 'تم النسخ' : jobsStrings.share}
          </Button>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h2 className="text-sm font-semibold">{jobsStrings.jobSummary}</h2>
          {location ? <SummaryRow icon={MapPin} label="الموقع" value={location} /> : null}
          <SummaryRow
            icon={Building2}
            label={jobsStrings.workplace}
            value={workplaceTypeLabels[job.workplaceType]}
          />
          <SummaryRow
            icon={CalendarClock}
            label={jobsStrings.jobType}
            value={`${employmentTypeLabels[job.employmentType]} · ${experienceLevelLabels[job.experienceLevel]}`}
          />
          <SummaryRow
            icon={Wallet}
            label="الراتب"
            value={salary ?? jobsStrings.salaryHidden}
          />
          {deadline ? (
            <SummaryRow
              icon={CalendarClock}
              label={jobsStrings.applicationDeadline}
              value={deadline}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';

  const { data: job, isLoading, isError, error, refetch } = useJob(jobId);
  const { data: similar } = useSimilarJobs(jobId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !job) {
    // A 404 is an expected outcome here (deleted or never-published posting),
    // so it gets its own recovery path rather than a generic failure.
    if (error instanceof ApiError && error.isNotFound) {
      return (
        <JobsErrorState
          title={jobsStrings.notFoundTitle}
          body={jobsStrings.notFoundBody}
        />
      );
    }
    return <JobsErrorState onRetry={() => refetch()} />;
  }

  const posted = formatRelativeDate(job.publishedAt);
  const location = formatLocation(job);
  const matchScore = formatMatchScore(job.matchScore);

  return (
    <div className="space-y-6">
      <nav aria-label="مسار التنقل" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:text-foreground">
          {jobsStrings.jobs}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <Link href="/jobs/search" className="hover:text-foreground">
          {jobsStrings.findJobs}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-foreground">{job.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {job.company?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external company logos are not in the Next image allowlist
                  <img src={job.company.logoUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold">{job.title}</h1>
                {job.company ? (
                  <Link
                    href={`/jobs/companies/${job.company.slug || job.company.id}`}
                    className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {job.company.name}
                    {job.company.isVerified ? (
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-primary"
                        aria-label={jobsStrings.verified}
                      />
                    ) : null}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
              ) : null}
              {posted ? (
                <span>
                  {jobsStrings.postedAt} {posted}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {matchScore ? (
                <Badge className="bg-primary/10 text-primary">{matchScore}</Badge>
              ) : null}
              <Badge variant="outline">{workplaceTypeLabels[job.workplaceType]}</Badge>
              <Badge variant="outline">{employmentTypeLabels[job.employmentType]}</Badge>
              <Badge variant="outline">{experienceLevelLabels[job.experienceLevel]}</Badge>
              {!job.isApplyOpen ? (
                <Badge variant="secondary">{jobsStrings.applyClosed}</Badge>
              ) : null}
            </div>
          </header>

          {/* On small screens the apply panel belongs above the long copy. */}
          <div className="lg:hidden">
            <ApplyPanel job={job} />
          </div>

          <Section title={jobsStrings.aboutRole} body={job.description} />
          <Section title={jobsStrings.responsibilities} body={job.responsibilities} />
          <Section title={jobsStrings.requirements} body={job.requirements} />
          <Section
            title={jobsStrings.preferredQualifications}
            body={job.preferredQualifications}
          />
          <Section title={jobsStrings.benefits} body={job.benefits} />

          {job.skills.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">{jobsStrings.skills}</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {job.company?.description ? (
            <Section title={jobsStrings.aboutCompany} body={job.company.description} />
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ApplyPanel job={job} />
          </div>
        </aside>
      </div>

      {similar && similar.length > 0 ? (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">{jobsStrings.similarJobs}</h2>
          <div className="space-y-3">
            {similar.map((item) => (
              <JobCard key={item.id} job={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
