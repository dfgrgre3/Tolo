'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface MiscErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MiscError({ error, reset }: MiscErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'MiscErrorBoundary',
      severity: 'low',
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <ErrorPage
        type="generic"
        title="حدث خطأ"
        message="يرجى المحاولة مرة أخرى."
        errorId={error.digest}
        onRetry={reset}
        onGoHome={() => { window.location.href = '/'; }}
        showDetails={process.env.NODE_ENV === 'development'}
        error={error}
      />
    </div>
  );
}
