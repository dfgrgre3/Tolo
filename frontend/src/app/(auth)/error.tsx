'use client';

import ErrorPage from '@/components/error-pages';
import { useEffect } from 'react';
import { errorService } from '@/lib/logging/error-service';

interface AuthErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  useEffect(() => {
    errorService.logError(error, {
      source: 'AuthErrorBoundary',
      severity: 'medium',
    });
  }, [error]);

  return (
    <ErrorPage
      type="network"
      title="خطأ في تسجيل الدخول"
      message="حدث خطأ أثناء محاولة الاتصال. يرجى المحاولة مرة أخرى."
      errorId={error.digest}
      onRetry={reset}
      onGoHome={() => { globalThis.location.href = '/'; }}
      showDetails={process.env.NODE_ENV === 'development'}
      error={error}
    />
  );
}
