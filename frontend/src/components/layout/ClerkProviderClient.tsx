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
  return (
    <ClerkProvider nonce={nonce}>
      {children}
    </ClerkProvider>
  );
}
