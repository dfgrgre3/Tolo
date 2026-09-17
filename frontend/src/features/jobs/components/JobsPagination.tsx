'use client';

import { Button } from '@/components/ui/button';
import { jobsStrings } from '../labels';
import type { JobsPagination as JobsPaginationData } from '@/types/job';

interface JobsPaginationProps {
  pagination?: JobsPaginationData;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** A small, consistent pager shared by every server-paginated Jobs list. */
export function JobsPagination({ pagination, onPageChange, disabled = false }: JobsPaginationProps) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <nav
      aria-label={jobsStrings.paginationLabel}
      className="flex items-center justify-center gap-3 pt-2"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        {jobsStrings.previousPage}
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {pagination.page.toLocaleString('ar-EG')} / {pagination.totalPages.toLocaleString('ar-EG')}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        {jobsStrings.nextPage}
      </Button>
    </nav>
  );
}
