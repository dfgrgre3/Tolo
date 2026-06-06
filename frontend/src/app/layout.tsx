import type { Metadata } from 'next';
import { Alexandria } from 'next/font/google';
import { GlobalProviders } from '@/providers';
import { SWRegistration } from '@/components/sw-registration';
import './globals.css';
import Header from '@/components/header/Header';
import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/providers/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { arSA } from '@clerk/localizations';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

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
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
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
                      setTimeout(() => observer.disconnect(), 15000);
                    };

                    if (document.readyState === 'complete') {
                      disconnect();
                    } else {
                      window.addEventListener('load', disconnect);
                    }
                  } catch (e) {}
                })();
              `
            }}
          />
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
              <Suspense key="header-suspense" fallback={<div className="h-16 w-full animate-pulse bg-background" />}>
                <Header />
              </Suspense>
              {React.Children.toArray(children)}
            </GlobalProviders>
          </ThemeProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
