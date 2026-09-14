'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Briefcase, CalendarCheck, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useJobSearch, useJobsOverview } from '@/hooks/use-jobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobListSkeleton, JobsEmptyState, JobsErrorState } from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  href?: string;
}) {
  const body = (
    <Card className={href ? 'transition-colors hover:border-primary/40' : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold tabular-nums">
            {value === undefined ? '—' : value.toLocaleString('ar-EG')}
          </p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function JobsOverviewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [keyword, setKeyword] = React.useState('');

  const { data: overview } = useJobsOverview(isAuthenticated);
  const latest = useJobSearch({ sort: 'newest', limit: 6 });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = keyword.trim();
    router.push(query ? `/jobs/search?keyword=${encodeURIComponent(query)}` : '/jobs/search');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{jobsStrings.welcome}</h1>
        <p className="text-sm text-muted-foreground">{jobsStrings.welcomeSubtitle}</p>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={jobsStrings.searchPlaceholder}
            aria-label={jobsStrings.searchPlaceholder}
            className="ps-9"
          />
        </div>
        <Button type="submit" className="gap-2 sm:w-auto">
          <Search className="h-4 w-4" />
          {jobsStrings.search}
        </Button>
      </form>

      {isAuthenticated ? (
        <section aria-label={jobsStrings.overview} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={FileText}
            label={jobsStrings.applied}
            value={overview?.applied}
            href="/jobs/applications"
          />
          <StatCard icon={CalendarCheck} label={jobsStrings.interviews} value={overview?.interviews} />
          <StatCard icon={Briefcase} label={jobsStrings.offers} value={overview?.offers} />
          <StatCard
            icon={Bookmark}
            label={jobsStrings.saved}
            value={overview?.saved}
            href="/jobs/saved"
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{jobsStrings.latestJobs}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/jobs/search">{jobsStrings.browseAll}</Link>
          </Button>
        </div>

        {latest.isLoading ? (
          <JobListSkeleton count={4} />
        ) : latest.isError ? (
          <JobsErrorState onRetry={() => latest.refetch()} />
        ) : latest.data && latest.data.items.length > 0 ? (
          <div className="space-y-3">
            {latest.data.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <JobsEmptyState
            title={jobsStrings.emptyJobsTitle}
            body={jobsStrings.emptyJobsBody}
            action={
              <Button asChild size="sm">
                <Link href="/jobs/search">{jobsStrings.browseAll}</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
