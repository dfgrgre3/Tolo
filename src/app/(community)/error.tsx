'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface CommunityErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CommunityError({ error, reset }: CommunityErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'CommunityErrorBoundary',
      severity: 'medium',
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <ErrorPage
        type="server"
        title="خطأ في المجتمع"
        message="حدث خطأ أثناء تحميل المحتوى. يرجى المحاولة مرة أخرى."
        errorId={error.digest}
        onRetry={reset}
        onGoHome={() => { window.location.href = '/'; }}
        showDetails={process.env.NODE_ENV === 'development'}
        error={error}
      />
    </div>
  );
}
