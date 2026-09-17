'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Briefcase, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useEmployerJobs, useMyCompanies } from '@/hooks/use-employer-jobs';
import {
  JobsEmptyState,
  JobsErrorState,
  JobListSkeleton,
} from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';

/**
 * Employer console landing page.
 *
 * Everything here is scoped server-side by ownership (the /api/v1/employer/*
 * routes filter by the caller's companies), so this page never sees another
 * employer's postings even when it renders unfiltered counts.
 */
export default function EmployerOverviewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    data: companies,
    isLoading: companiesLoading,
    isError: companiesError,
    refetch: refetchCompanies,
  } = useMyCompanies();
  const {
    data: jobs,
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useEmployerJobs({ limit: 5 });

  if (authLoading || companiesLoading || jobsLoading) return <JobListSkeleton />;

  if (!isAuthenticated) {
    return (
      <JobsEmptyState
        title={jobsStrings.loginToContinue}
        body={jobsStrings.employerSubtitle}
        action={
          <Button asChild size="sm">
            <Link href="/login?redirect=/employer">{jobsStrings.loginToContinue}</Link>
          </Button>
        }
      />
    );
  }

  if (companiesError || jobsError) {
    return (
      <JobsErrorState
        onRetry={() => {
          refetchCompanies();
          refetchJobs();
        }}
      />
    );
  }

  const companyList = companies ?? [];
  const statusCounts = jobs?.statusCounts ?? {};
  const activeCount =
    (statusCounts.PUBLISHED ?? 0) + (statusCounts.PAUSED ?? 0);

  if (companyList.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader />
        <JobsEmptyState
          title={jobsStrings.emptyCompaniesMineTitle}
          body={jobsStrings.emptyCompaniesMineBody}
          icon={Building2}
          action={
            <Button asChild size="sm">
              <Link href="/employer/companies/new">{jobsStrings.addCompany}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label={jobsStrings.myCompanies} value={companyList.length} />
        <StatCard icon={Briefcase} label={jobsStrings.activeJobs} value={activeCount} />
        <StatCard
          icon={FileText}
          label={jobsStrings.pendingReview}
          value={statusCounts.PENDING_REVIEW ?? 0}
        />
        <StatCard icon={Users} label={jobsStrings.applicants} value={undefined} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/employer/jobs/new">{jobsStrings.addJob}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/employer/companies">{jobsStrings.myCompanies}</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{jobsStrings.myJobs}</h2>
        {(jobs?.items ?? []).length === 0 ? (
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
            {(jobs?.items ?? []).map((job) => (
              <Card key={job.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <Link
                    href={`/employer/jobs/${job.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {job.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {job.company?.name}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold">{jobsStrings.employerConsole}</h1>
      <p className="text-sm text-muted-foreground">{jobsStrings.employerSubtitle}</p>
    </header>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
}) {
  return (
    <Card>
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
}
