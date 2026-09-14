'use client';

import React from 'react';
import { AlertCircle, Briefcase, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { jobsStrings } from '../labels';

/**
 * Shared empty / error / loading presentations for the Jobs module.
 *
 * These exist as one component rather than per-page markup so every list in
 * the module fails and empties the same way — the spec requires a real state
 * for each surface, and duplicating the markup is how those drift apart.
 */

export function JobsEmptyState({
  title,
  body,
  action,
  icon: Icon = Briefcase,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

/**
 * Every error state carries an explanation and a retry, per the module's
 * error-recovery rule. `onRetry` is wired to react-query's refetch by callers.
 */
export function JobsErrorState({
  title = jobsStrings.errorTitle,
  body = jobsStrings.errorBody,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-2">
            <RefreshCw className="h-4 w-4" />
            {jobsStrings.retry}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Skeleton matching JobCard's layout, so the swap does not shift the page. */
export function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">{jobsStrings.loading}</span>
      {Array.from({ length: count }).map((_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </div>
  );
}
