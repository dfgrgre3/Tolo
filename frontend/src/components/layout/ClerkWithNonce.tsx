/**
 * ClerkWithNonce — Server Component
 *
 * Reads the CSP nonce from middleware-injected request headers and passes it
 * to ClerkProvider. By isolating headers() in this file, the Root Layout
 * itself stays statically renderable, enabling proper Next.js client-side
 * navigation (SPA transitions) instead of full page reloads.
 */
import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';
import React from 'react';

export async function ClerkWithNonce({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <ClerkProvider nonce={nonce}>
      {children}
    </ClerkProvider>
  );
}
