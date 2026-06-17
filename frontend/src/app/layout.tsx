import type { Metadata } from 'next';
import { Alexandria } from 'next/font/google';
import { GlobalProviders } from '@/providers';
import { SWRegistration } from '@/components/sw-registration';
import { PostHogProvider } from '@/providers/posthog-provider';
import PostHogPageView from '@/components/posthog-pageview';
import './globals.css';
import './ultra-lite.css';
import Header from '@/components/header/Header';
import React, { Suspense } from 'react';
import { ThemeProvider } from '@/providers/theme-provider';
import {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from '@/components/layout/ConditionalAnalytics';
import { FPSMonitor } from '@/components/adaptive/AdaptiveLoading';
import { ClerkWithNonce } from '@/components/layout/ClerkWithNonce';
import { headers } from 'next/headers';

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  variable: '--font-alexandria',
  display: 'swap',
  preload: true,
  weight: ['400', '700'],          // reduced from 3 weights to 2 — saves ~15KB
  adjustFontFallback: true,
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: { default: 'Tolo - منصة تعليمية تفاعلية', template: '%s | Tolo' },
  description: 'منصة تعليمية تفاعلية للثانوية العامة - كورسات، امتحانات، ومدرسين',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Tolo - منصة تعليمية تفاعلية',
    description: 'منصة تعليمية تفاعلية للثانوية العامة',
    type: 'website',
    locale: 'ar_AR',
    siteName: 'Tolo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolo - منصة تعليمية تفاعلية',
    description: 'منصة تعليمية تفاعلية للثانوية العامة',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read nonce for html element (required to allow inline scripts under CSP).
  // ClerkWithNonce reads it independently to pass to ClerkProvider.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="ar" dir="rtl" nonce={nonce} data-scroll-behavior="smooth" suppressHydrationWarning>

        <head>
          {/* ── Preconnect to external origins ─────────────────────────────── */}
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Preconnect to Clerk's frontend API infrastructure (proxied via /__clerk) */}
          <link rel="preconnect" href="https://frontend-api.clerk.services" crossOrigin="anonymous" />

          {/* Centralized performance detection script — nonce required for CSP */}
          <script id="perf-detect" src="/perf-detect.js" nonce={nonce} />

          <link rel="dns-prefetch" href="https://i.ytimg.com" />
          <meta name="theme-color" content="#f97316" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="format-detection" content="telephone=no" />
          {/* Hydration attribute cleanup — nonce required for CSP */}
          <script id="hydration-fix" src="/hydration-fix.js" nonce={nonce} />
        </head>
        <body className={`${alexandria.variable} font-sans`}>
          <ClerkWithNonce>
            <SWRegistration />
            <PostHogProvider>
              <PostHogPageView />
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
                storageKey="tolo-theme"
              >
                <GlobalProviders>
                  <FPSMonitor />
                  <Suspense key="header-suspense" fallback={<div className="h-16 w-full animate-pulse bg-background" />}>
                    <Header />
                  </Suspense>
                  {children}
                </GlobalProviders>
              </ThemeProvider>
            </PostHogProvider>
          </ClerkWithNonce>
          <ConditionalAnalytics />
          <ConditionalSpeedInsights />
        </body>
      </html>
  );
}
