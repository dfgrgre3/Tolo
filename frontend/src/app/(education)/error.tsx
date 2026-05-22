'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface EducationErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EducationError({ error, reset }: EducationErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'EducationErrorBoundary',
      severity: 'high',
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <ErrorPage
        type="server"
        title="خطأ في المحتوى التعليمي"
        message="حدث خطأ أثناء تحميل المحتوى التعليمي. يرجى المحاولة مرة أخرى."
        errorId={error.digest}
        onRetry={reset}
        onGoHome={() => { window.location.href = '/'; }}
        showDetails={process.env.NODE_ENV === 'development'}
        error={error}
      />
    </div>
  );
}
