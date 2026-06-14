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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkWithNonce>
      <html lang="ar" dir="rtl" data-scroll-behavior="smooth">

        <head>
          {/* ── Preconnect to external origins ─────────────────────────────── */}
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://clerk.tolo.app" crossOrigin="anonymous" />

          {/* Centralized performance detection script */}
          <script id="perf-detect" src="/perf-detect.js" />

          <link rel="dns-prefetch" href="https://i.ytimg.com" />
          <link rel="preload" href="/favicon.svg" as="image" type="image/svg+xml" />
          <meta name="theme-color" content="#f97316" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="format-detection" content="telephone=no" />
          <script
            id="hydration-fix"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const attributesToRemove = [
                    'bis_skin_checked',
                    'bis_register',
                    'data-gr-ext-installed',
                    'data-new-gr-c-s-check-loaded',
                    'data-lastpass-icon',
                    'data-dashlane-rid'
                  ];

                  const clean = () => {
                    try {
                      attributesToRemove.forEach(attr => {
                        document.querySelectorAll('[' + attr + ']').forEach(el => {
                          el.removeAttribute(attr);
                        });
                      });
                      if (document.documentElement.hasAttribute('__processed_id')) {
                        document.documentElement.removeAttribute('__processed_id');
                      }
                    } catch (e) {}
                  };

                  clean();

                  try {
                    const observer = new MutationObserver((mutations) => {
                      let shouldClean = false;
                      for (let i = 0; i < mutations.length; i++) {
                        if (attributesToRemove.includes(mutations[i].attributeName) || mutations[i].attributeName === '__processed_id') {
                          shouldClean = true;
                          break;
                        }
                      }
                      if (shouldClean) clean();
                    });

                    observer.observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: attributesToRemove.concat(['__processed_id'])
                    });

                    const disconnect = () => {
                      try { observer.disconnect(); } catch (e) {}
                    };

                    if (document.readyState === 'complete') {
                      disconnect();
                    } else {
                      window.addEventListener('load', disconnect, { once: true });
                      setTimeout(disconnect, 3000); // safety fallback
                    }
                  } catch (e) {}
                })();
              `
            }}
          />
        </head>
        <body className={`${alexandria.variable} font-sans`}>
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
          <ConditionalAnalytics />
          <ConditionalSpeedInsights />
        </body>
      </html>
    </ClerkWithNonce>
  );
}
