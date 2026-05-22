'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'RootErrorBoundary',
      severity: 'critical',
    });
  }, [error]);

  return (
    <ErrorPage
      type="server"
      title="حدث خطأ غير متوقع"
      message="نعتذر عن هذا الإزعاج. فريقنا يعمل على حل المشكلة."
      errorId={error.digest}
      onRetry={reset}
      onGoHome={() => { window.location.href = '/'; }}
      showDetails={process.env.NODE_ENV === 'development'}
      error={error}
    />
  );
}
