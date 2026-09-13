'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar">
      <body>
        <main>
          <h2>حدث خطأ غير متوقع</h2>
          <button type="button" onClick={() => reset()}>
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
