/**
 * ClerkWithNonce — Server Component
 *
 * Clerk is configured as a path-based proxy on the main domain:
 *   Frontend API URL : https://tolo.com/__clerk
 *   JWKS URL         : https://tolo.com/__clerk/.well-known/jwks.json
 *
 * The clerk-js bundle is served from:
 *   https://tolo.com/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js
 *
 * We pin the exact URL so Next.js can add it to script-src CSP,
 * and the nonce is injected per-request by the middleware.
 */
import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';
import React from 'react';

// The clerk-js bundle served by the Clerk proxy on tolo.com/__clerk
// @clerk/nextjs@7 uses clerk-js@6 — keep in sync with package.json
const CLERK_JS_URL = 'https://tolo.com/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js';

export async function ClerkWithNonce({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <ClerkProvider
      nonce={nonce}
      clerkJsUrl={CLERK_JS_URL}
      // proxyUrl tells Clerk SDK to route all API calls through /__clerk
      // instead of the default accounts.clerk.com
      proxyUrl="/__clerk"
    >
      {children}
    </ClerkProvider>
  );
}
