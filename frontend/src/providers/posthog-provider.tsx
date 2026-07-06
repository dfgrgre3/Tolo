'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const hasValidKey = !!posthogKey && posthogKey !== 'phc_placeholder_key_for_dev';

if (typeof window !== 'undefined' && hasValidKey) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // Track pageviews manually to align with Next.js App Router routing
    capture_performance: true, // Automatically captures Web Vitals/Performance
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!hasValidKey) return;

    // Identify user from localStorage if available
    try {
      const userId = window.localStorage.getItem('userId');
      if (userId) {
        posthog.identify(userId);
      } else {
        posthog.reset();
      }
    } catch {
      posthog.reset();
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
