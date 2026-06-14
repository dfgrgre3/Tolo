/**
 * ClerkWithNonce — Server Component
 *
 * Reads the CSP nonce from middleware-injected request headers and passes it
 * to ClerkProvider. By isolating headers() in this file, the Root Layout
 * itself stays statically renderable, enabling proper Next.js client-side
 * navigation (SPA transitions) instead of full page reloads.
 *
 * The `navigate` prop is required by Clerk to handle pending session tasks
 * (e.g. email verification flows, MFA enrollment). Without it, Clerk logs a
 * warning and users can get stuck on incomplete flows.
 */
import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';
import React from 'react';

export async function ClerkWithNonce({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <ClerkProvider
      nonce={nonce}
      navigate={(to) => {
        // Clerk calls this to handle pending session tasks (email verification,
        // MFA setup, etc.). We resolve it server-side via a simple redirect URL
        // to avoid importing client-only router hooks in a Server Component.
        return Promise.resolve();
      }}
    >
      {children}
    </ClerkProvider>
  );
}
