import type { Metadata } from 'next';
import { Alexandria } from 'next/font/google';
import { GlobalProviders } from '@/providers';
import { SWRegistration } from '@/components/sw-registration';
import './globals.css';
import Header from '@/components/header/Header';
import { Suspense } from 'react';

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  variable: '--font-alexandria',
  display: 'swap',
  preload: true,
  weight: ['400', '600', '700'],
  adjustFontFallback: true,
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: { default: 'Tolo - منصة تعليمية تفاعلية', template: '%s | Tolo' },
  description: 'منصة تعليمية تفاعلية للثانوية العامة - كورسات، امتحانات، ومدرسين',
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
};

import { cookies } from 'next/headers';
import { ThemeProvider } from '@/providers/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { arSA } from '@clerk/localizations';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const hasAuthToken = cookieStore.has('access_token') || cookieStore.has('refresh_token') || cookieStore.has('session_id');

  return (
    <ClerkProvider localization={arSA}>
      <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://i.ytimg.com" />
          <meta name="theme-color" content="#f97316" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        </head>
        <body className={`${alexandria.variable} font-sans`} suppressHydrationWarning>
          <SWRegistration />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="tolo-theme"
          >
            <GlobalProviders initialAuthHint={hasAuthToken}>
              <Suspense fallback={<div className="h-16 w-full animate-pulse bg-background" />}>
                <Header />
              </Suspense>
              {children}
            </GlobalProviders>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
