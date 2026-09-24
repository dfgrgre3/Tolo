'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Briefcase, CalendarCheck, FileText, Pencil } from 'lucide-react';
import { useProfileData } from '@/app/(dashboard)/profile/_components/useProfileData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useJobsOverview } from '@/hooks/use-jobs';
import { JobStatCard } from '@/features/jobs/components/JobStatCard';
import { JobsErrorState } from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';
import {
  buildProfileRows,
  isValidHttpUrl,
  loadResumeUrl,
  saveResumeUrl,
} from '@/features/jobs/profile';

/**
 * The seeker's career profile inside the Jobs module.
 *
 * A read-side view over the same profile the account editor writes: it exists
 * so someone about to apply can see exactly what their summary says, keep the
 * device-local CV link at hand, and reach the four overview counters without
 * leaving the module. Editing belongs to /profile, which stays the single
 * writer — this page never mutates the server.
 */
export default function JobsProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile, isLoading, error, refetch } = useProfileData();
  const { data: overview } = useJobsOverview(isAuthenticated);

  // The profile is personal; anonymous visitors are bounced to login with the
  // destination preserved, same as the apply form.
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/jobs/profile')}`);
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Anonymous visitors get redirected by the effect above; without this early
  // return the (empty) profile would render for a frame first.
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return <JobsErrorState body={error ?? undefined} onRetry={refetch} />;
  }

  const rows = buildProfileRows(profile);
  const displayName = profile.name?.trim() || profile.username || profile.email;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{jobsStrings.careerProfile}</h1>
          <p className="text-sm text-muted-foreground">{displayName}</p>
        </div>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/profile">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {jobsStrings.editProfile}
          </Link>
        </Button>
      </header>

      <section aria-label={jobsStrings.overview} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <JobStatCard
          icon={FileText}
          label={jobsStrings.applied}
          value={overview?.applied}
          href="/jobs/applications"
        />
        <JobStatCard
          icon={CalendarCheck}
          label={jobsStrings.interviews}
          value={overview?.interviews}
        />
        <JobStatCard icon={Briefcase} label={jobsStrings.offers} value={overview?.offers} />
        <JobStatCard icon={Bookmark} label={jobsStrings.saved} value={overview?.saved} href="/jobs/saved" />
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="text-lg font-semibold">{jobsStrings.profileSummary}</h2>

          {rows.length > 0 ? (
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows.map((row) => (
                <div key={row.id} className="border-b border-border/60 pb-2 last:border-0">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="break-words text-sm font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{jobsStrings.emptyProfileBody}</p>
          )}

          <ResumeEditor />
        </CardContent>
      </Card>

      <section className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/jobs/applications">{jobsStrings.myApplications}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/jobs/saved">{jobsStrings.savedJobs}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/jobs/search">{jobsStrings.findJobs}</Link>
        </Button>
      </section>
    </div>
  );
}

/**
 * The CV link, stored on this device (see loadResumeUrl for why it cannot be a
 * server field). The note under the input states the limitation rather than
 * letting the user assume it synced.
 */
function ResumeEditor() {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    // localStorage is browser-only, and reading it during the first render
    // would mismatch the server-rendered empty input. Deferring one tick keeps
    // hydration clean — the setState runs in a callback, not in the effect body.
    const timer = window.setTimeout(() => setValue(loadResumeUrl()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSave = () => {
    const next = value.trim();
    if (!isValidHttpUrl(next)) {
      setError(jobsStrings.invalidUrl);
      return;
    }
    setError(null);
    saveResumeUrl(next);
    setValue(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-1.5 border-t border-border pt-4">
      <Label htmlFor="jobs-resume-url">{jobsStrings.resume}</Label>
      <div className="flex gap-2">
        <Input
          id="jobs-resume-url"
          type="url"
          dir="ltr"
          placeholder="https://"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? 'jobs-resume-error' : 'jobs-resume-note'}
          className="flex-1"
        />
        <Button type="button" onClick={handleSave}>
          {saved ? jobsStrings.resumeSaved : jobsStrings.save}
        </Button>
      </div>
      {error ? (
        <p id="jobs-resume-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <p id="jobs-resume-note" className="text-xs text-muted-foreground">
        {jobsStrings.resumeDeviceNote}
      </p>
    </div>
  );
}
