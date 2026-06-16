/**
 * ClerkWithNonce — Server Component
 *
 * Clerk v7 configuration is driven entirely by environment variables:
 *   NEXT_PUBLIC_CLERK_PROXY_URL  → routes Clerk API calls through /__clerk
 *   NEXT_PUBLIC_CLERK_DOMAIN     → satellite domain (optional)
 *   NEXT_PUBLIC_CLERK_JS_URL     → direct CDN URL for the clerk-js bundle
 *
 * The /__clerk/* rewrite in next.config.js forwards Clerk API calls to
 * frontend-api.clerk.services, bypassing ad-blockers and ensuring
 * requests originate from the first-party domain.
 *
 * The clerk-js bundle itself is loaded from jsDelivr CDN via NEXT_PUBLIC_CLERK_JS_URL
 * — this avoids the Vercel negative-lookahead rewrite bug that caused 404s on npm paths.
 *
 * The nonce is injected per-request by the middleware for CSP compliance.
 */
import { ClerkProviderClient } from './ClerkProviderClient';
import { headers } from 'next/headers';
import React from 'react';

export async function ClerkWithNonce({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <ClerkProviderClient nonce={nonce}>
      {children}
    </ClerkProviderClient>
  );
}
