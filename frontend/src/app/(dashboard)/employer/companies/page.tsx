'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyCompanies } from '@/hooks/use-employer-jobs';
import {
  JobsEmptyState,
  JobsErrorState,
  JobListSkeleton,
} from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';

export default function MyCompaniesPage() {
  const { data, isLoading, isError, refetch } = useMyCompanies();

  if (isLoading) return <JobListSkeleton />;
  if (isError) return <JobsErrorState onRetry={() => refetch()} />;

  const companies = data ?? [];

  if (companies.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">{jobsStrings.myCompanies}</h1>
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
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{jobsStrings.myCompanies}</h1>
        <Button asChild size="sm">
          <Link href="/employer/companies/new">
            <Plus className="h-4 w-4" />
            {jobsStrings.addCompany}
          </Link>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/employer/companies/${company.id}`}
                  className="font-medium hover:underline"
                >
                  {company.name}
                </Link>
                {company.isVerified ? (
                  <Badge variant="secondary">{jobsStrings.verified}</Badge>
                ) : null}
              </div>
              {company.industry ? (
                <p className="text-sm text-muted-foreground">
                  {company.industry}
                </p>
              ) : null}
              {company.location ? (
                <p className="text-xs text-muted-foreground">
                  {company.location}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
