import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Geist } from 'next/font/google';
import { GlobalProviders } from '@/providers';
import { SWRegistration } from '@/components/sw-registration';
import './globals.css';
import './ultra-lite.css';
import React, { Suspense } from 'react';
import { ThemeProvider } from '@/providers/theme-provider';
import {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from '@/components/layout/ConditionalAnalytics';
import { headers } from 'next/headers';
import Script from 'next/script';
import { SITE } from '@thanawy/shared/site-config';

// Dynamic imports for non-critical components to reduce initial bundle size
const Header = React.lazy(() => import('@/components/header/Header').then(mod => ({ default: mod.default })));
import Footer from '@/components/Footer';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700', '900'],
  adjustFontFallback: true,
  fallback: ['system-ui', 'sans-serif'],
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
  preload: false,
});

// إزالة force-dynamic لتمكين Static Generation للصفحات الثابتة وتحسين الأداء
// الصفحات الديناميكية تحدد force-dynamic بنفسها عند الحاجة

export const metadata: Metadata = {
  title: { default: `${SITE.name} - ${SITE.description}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  icons: {
    icon: SITE.favicon,
    shortcut: SITE.favicon,
  },
  openGraph: {
    title: `${SITE.name} - ${SITE.description}`,
    description: SITE.description,
    type: 'website',
    locale: SITE.locale,
    siteName: SITE.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} - ${SITE.description}`,
    description: SITE.description,
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
  // Default to empty string to ensure consistent SSR/CSR rendering
  // (avoids hydration mismatch when nonce prop is undefined).
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="ar" dir="rtl" nonce={nonce} data-scroll-behavior="smooth" suppressHydrationWarning>

      <head>
        {/* ── Preconnect to external origins ─────────────────────────────── */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Centralized performance detection script */}
        <script id="perf-detect" src="/perf-detect.js" defer nonce={nonce} suppressHydrationWarning />

        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <meta name="theme-color" content="#f97316" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        {/* Hydration attribute cleanup */}
        <script id="hydration-fix" src="/hydration-fix.js" defer nonce={nonce} suppressHydrationWarning />

        {/* Structured Data (Schema.org) */}
        <script
          id="structured-data"
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'EducationalOrganization',
              name: SITE.name,
              description: SITE.description,
              url: SITE.url,
              logo: `${SITE.url}/logo.png`,
              sameAs: [],
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EGP',
                eligibilityCriteria: {
                  '@type': 'EducationalOccupationalCredential',
                  credentialCategory: 'certificate',
                },
              },
             hasCourse: [
                {
                  '@type': 'Course',
                  name: 'دورات تدريبية احترافية',
                  description: 'مجموعة واسعة من الدورات التدريبية المتنوعة',
                  provider: {
                    '@type': 'Organization',
                    name: SITE.name,
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${cairo.variable} ${geist.variable} font-sans`} suppressHydrationWarning>
        <div suppressHydrationWarning>
          {/* Skip to main content - WCAG 2.1 AA */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:font-bold focus:shadow-lg focus:outline-none"
          >
            تخطى إلى المحتوى الرئيسي
          </a>

          <SWRegistration />

          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="tolo-theme"
          >
            <GlobalProviders>
              <Suspense key="header-suspense" fallback={<div className="h-16 w-full animate-pulse bg-background" aria-hidden="true" />}>
                <Header />
              </Suspense>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <Footer nonce={nonce} />
            </GlobalProviders>
          </ThemeProvider>

          <ConditionalAnalytics />
          <ConditionalSpeedInsights />
        </div>
      </body>
    </html>
  );
}