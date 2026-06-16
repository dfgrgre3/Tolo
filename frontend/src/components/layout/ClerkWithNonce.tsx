/**
 * ClerkWithNonce — Server Component
 *
 * Clerk is configured as a path-based proxy on the main domain:
 *   Frontend API URL : https://tolo.com/__clerk
 *   JWKS URL         : https://tolo.com/__clerk/.well-known/jwks.json
 *
 * The clerk-js bundle is served by the Clerk proxy via the __clerk path.
 * The nonce is injected per-request by the middleware for CSP compliance.
 */
import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';
import React from 'react';

export async function ClerkWithNonce({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <ClerkProvider
      nonce={nonce}
      // proxyUrl tells Clerk SDK to route all API calls through /__clerk
      // instead of the default accounts.clerk.com
      proxyUrl="/__clerk"
    >
      {children}
    </ClerkProvider>
  );
}
