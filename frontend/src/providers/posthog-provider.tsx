'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_placeholder_key_for_dev', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // Track pageviews manually to align with Next.js App Router routing
    capture_performance: true, // Automatically captures Web Vitals/Performance
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        fullName: user.fullName,
        username: user.username,
      });
    } else if (!isSignedIn) {
      posthog.reset();
    }
  }, [isSignedIn, user]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
