import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // First-load budget: traces/replays are the heaviest JS on cold open.
  // 10% traces + error-only replays keep visibility without slowing FCP/LCP.
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 0.1,
  replaysSessionSampleRate: 0,
});
