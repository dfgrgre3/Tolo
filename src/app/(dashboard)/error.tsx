'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'DashboardErrorBoundary',
      severity: 'high',
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <ErrorPage
        type="server"
        title="خطأ في لوحة المستخدم"
        message="حدث خطأ أثناء تحميل لوحة التحكم. يرجى المحاولة مرة أخرى."
        errorId={error.digest}
        onRetry={reset}
        onGoHome={() => { window.location.href = '/dashboard'; }}
        showDetails={process.env.NODE_ENV === 'development'}
        error={error}
      />
    </div>
  );
}
