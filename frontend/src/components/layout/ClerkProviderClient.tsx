'use client';

/**
 * ClerkProviderClient — Client Component wrapper for ClerkProvider
 *
 * Clerk v7 reads proxy/domain config from environment variables:
 *   - NEXT_PUBLIC_CLERK_PROXY_URL  → controls the clerk-js API proxy
 *   - NEXT_PUBLIC_CLERK_DOMAIN     → satellite domain support
 *   - NEXT_PUBLIC_CLERK_JS_URL     → custom clerk-js bundle URL
 *
 * The nonce prop is the only runtime value we inject here (required for CSP).
 * All other Clerk configuration is handled via env vars, which Clerk v7 reads
 * automatically without needing explicit props.
 *
 * taskUrls: Maps Clerk "pending task" types to our own pages so Clerk
 * doesn't redirect to the default /login/tasks (which doesn't exist).
 * Instead we redirect to /dashboard and let the app handle incomplete flows.
 */
import { ClerkProvider } from '@clerk/nextjs';
import React from 'react';

interface ClerkProviderClientProps {
  children: React.ReactNode;
  nonce: string | undefined;
}

export function ClerkProviderClient({
  children,
  nonce,
}: ClerkProviderClientProps) {
  const signInForceRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || undefined;
  const signUpForceRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || undefined;
  const signInFallbackRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/dashboard';
  const signUpFallbackRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/dashboard';

  return (
    <ClerkProvider
      nonce={nonce}
      proxyUrl="/__clerk"
      signInForceRedirectUrl={signInForceRedirectUrl}
      signUpForceRedirectUrl={signUpForceRedirectUrl}
      signInFallbackRedirectUrl={signInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
      taskUrls={{
        // Map Clerk pending-task types to our dashboard.
        // Supported keys: choose-organization, reset-password, setup-mfa
        'choose-organization': '/dashboard',
        'reset-password': '/dashboard',
        'setup-mfa': '/dashboard',
      }}
    >
      {children}
    </ClerkProvider>
  );
}
