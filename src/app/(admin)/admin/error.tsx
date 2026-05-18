'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'AdminErrorBoundary',
      severity: 'high',
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
      <ErrorPage
        type="server"
        title="خطأ في لوحة التحكم"
        message="حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى."
        errorId={error.digest}
        onRetry={reset}
        onGoHome={() => { window.location.href = '/admin'; }}
        showDetails={process.env.NODE_ENV === 'development'}
        error={error}
      />
    </div>
  );
}
