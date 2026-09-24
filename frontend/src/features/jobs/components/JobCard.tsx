'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, Building2, CheckCircle2, MapPin, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToggleSaveJob } from '@/hooks/use-jobs';
import type { Job } from '@/types/job';
import { formatLocation, formatMatchScore, formatRelativeDate, formatSalary } from '../format';
import {
  employmentTypeLabels,
  experienceLevelLabels,
  jobsStrings,
  workplaceTypeLabels,
} from '../labels';

/**
 * The module's single job summary card, used by search, saved, similar-jobs
 * and company listings alike. Keeping one card is what makes the optimistic
 * save in useToggleSaveJob observable everywhere at once.
 */
export function JobCard({ job, savedAt }: { job: Job; savedAt?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const toggleSave = useToggleSaveJob();

  const salary = formatSalary(job);
  const location = formatLocation(job);
  const posted = formatRelativeDate(savedAt ?? job.publishedAt);
  // Server-computed fit. Present only for a signed-in viewer, and null whenever
  // the score would not be worth stating (see formatMatchScore).
  const matchScore = formatMatchScore(job.matchScore);

  const handleToggleSave = (event: React.MouseEvent) => {
    // The card is a link; the bookmark must not navigate.
    event.preventDefault();
    event.stopPropagation();

    // Preserve the intent through login: the spec requires the in-flight
    // action to survive authentication, so we return the user to this exact
    // listing rather than dropping them on a generic page.
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    toggleSave.mutate({ jobId: job.id, isSaved: job.isSaved });
  };

  return (
    <Card className="group transition-colors hover:border-primary/40 focus-within:border-primary/40">
      <CardContent className="flex gap-4 p-4">
        <Link
          href={`/jobs/${job.slug || job.id}`}
          className="flex min-w-0 flex-1 gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {job.company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- company logos are arbitrary external hosts, not in the Next image allowlist
              <img
                src={job.company.logoUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold">{job.title}</h3>
              {job.isFeatured ? (
                <Badge variant="secondary" className="shrink-0">
                  {jobsStrings.featured}
                </Badge>
              ) : null}
              {!job.isApplyOpen ? (
                <Badge variant="outline" className="shrink-0 text-muted-foreground">
                  {jobsStrings.applyClosed}
                </Badge>
              ) : null}
              {matchScore ? (
                <Badge className="shrink-0 bg-primary/10 text-primary">{matchScore}</Badge>
              ) : null}
            </div>

            {job.company ? (
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                {job.company.name}
                {job.company.isVerified ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-primary"
                    aria-label={jobsStrings.verified}
                  />
                ) : null}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              ) : null}
              {salary ? (
                <span className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  {salary}
                </span>
              ) : null}
              {posted ? <span>{posted}</span> : null}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <Badge variant="outline" className="text-xs font-normal">
                {workplaceTypeLabels[job.workplaceType]}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {employmentTypeLabels[job.employmentType]}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {experienceLevelLabels[job.experienceLevel]}
              </Badge>
              {job.hasApplied ? (
                <Badge className="bg-emerald-500/10 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  {jobsStrings.alreadyApplied}
                </Badge>
              ) : null}
            </div>
          </div>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 self-start"
          onClick={handleToggleSave}
          disabled={toggleSave.isPending}
          aria-pressed={job.isSaved}
          aria-label={job.isSaved ? jobsStrings.unsave : jobsStrings.save}
          title={job.isSaved ? jobsStrings.unsave : jobsStrings.save}
        >
          {job.isSaved ? (
            <BookmarkCheck className={cn('h-5 w-5', 'text-primary')} />
          ) : (
            <Bookmark className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
