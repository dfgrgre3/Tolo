/**
 * ClerkWithNonce — Server Component
 *
 * Clerk is configured as a path-based proxy on the main domain:
 *   Frontend API URL : https://tolo.com/__clerk  (i.e. clerk.tolo.com proxied through tolo.com)
 *   JWKS URL         : https://tolo.com/__clerk/.well-known/jwks.json
 *
 * The clerk-js bundle is served via the /__clerk Next.js rewrite in next.config.js:
 *   source      : /__clerk/:path*
 *   destination : https://clerk.tolo.com/:path*   ← NO double prefix
 *
 * The nonce is injected per-request by the middleware for CSP compliance.
 */
import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';
import React from 'react';

export async function ClerkWithNonce({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // proxyUrl tells Clerk SDK to route all client-side API calls through /__clerk
  // instead of the default clerk.tolo.com directly.
  // Must be the path only (/__clerk) — Clerk resolves it relative to the current origin.
  const proxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL ?? '/__clerk';

  // domain is required when the app is deployed to a hostname other than the Clerk primary
  // domain (tolo.com). It tells Clerk which domain holds the auth state.
  const domain = process.env.NEXT_PUBLIC_CLERK_DOMAIN;

  return (
    <ClerkProvider
      nonce={nonce}
      proxyUrl={proxyUrl}
      {...(domain ? { domain } : {})}
    >
      {children}
    </ClerkProvider>
  );
}
